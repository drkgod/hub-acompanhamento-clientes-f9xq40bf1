cronAdd('monitor_inatividade', '0 0 * * *', () => {
  const token = $secrets.get('UAZAPI_TOKEN')
  let baseUrl = $secrets.get('UAZAPI_BASE_URL')

  if (!token || !baseUrl) {
    $app
      .logger()
      .error(
        'As chaves UAZAPI_TOKEN e UAZAPI_BASE_URL precisam ser configuradas no Secrets do Skip antes de usar o monitor de inatividade.',
      )
    return
  }

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  const clients = $app.findRecordsByFilter('clients', '1=1', '', 0, 0)
  const now = new Date()

  for (const client of clients) {
    let dateToUse = null
    const telefone = client.getString('telefone')

    if (telefone) {
      let cleanPhone = telefone.replace(/\D/g, '')
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1)
      }
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone
      }

      let retries = 0
      let success = false
      let backoff = 2000

      while (retries < 3 && !success) {
        try {
          const res1 = $http.send({
            url: `${baseUrl}/chats/phone/${cleanPhone}`,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              token: token,
            },
            timeout: 10,
          })

          if (res1.statusCode === 401 || res1.statusCode === 403) {
            $app
              .logger()
              .error('Token da UAZAPI inválido ou sem permissão', 'status', res1.statusCode)
            break
          }

          if (res1.statusCode >= 500) {
            throw new Error(`UAZAPI 5xx error: ${res1.statusCode}`)
          }

          let chatId = null
          if (res1.statusCode === 200 && res1.json) {
            const data = res1.json.data || res1.json
            if (data && data.lastMessage && data.lastMessage.timestamp) {
              const ts = data.lastMessage.timestamp
              const lastMessageBody = data.lastMessage.body || ''
              dateToUse = new Date(typeof ts === 'number' && ts < 1000000000000 ? ts * 1000 : ts)
            } else if (data && data.id) {
              chatId = data.id
            } else if (data && data.chatId) {
              chatId = data.chatId
            }
          }

          if (!dateToUse && chatId) {
            const res2 = $http.send({
              url: `${baseUrl}/chats/${chatId}/messages?limit=50&page=1`,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                token: token,
              },
              timeout: 10,
            })

            if (res2.statusCode === 200 && res2.json) {
              const msgs = res2.json.messages || res2.json.data || res2.json
              if (Array.isArray(msgs) && msgs.length > 0 && msgs[0].timestamp) {
                const ts = msgs[0].timestamp
                const msgBody = msgs[0].body || ''
                dateToUse = new Date(typeof ts === 'number' && ts < 1000000000000 ? ts * 1000 : ts)
              }
            }
          }

          success = true
        } catch (err) {
          retries++
          if (retries >= 3) {
            $app
              .logger()
              .error(
                'UAZAPI sync failed after 3 retries',
                'client',
                client.id,
                'error',
                err.message || String(err),
              )
          } else {
            const start = new Date().getTime()
            while (new Date().getTime() - start < backoff) {}
            backoff *= 2
          }
        }
      }
    }

    if (!dateToUse || isNaN(dateToUse.getTime())) {
      const ucStr = client.getString('ultimo_contato')
      const createdStr = client.getString('created')
      dateToUse = ucStr ? new Date(ucStr) : new Date(createdStr)
    }

    const diffTime = now.getTime() - dateToUse.getTime()
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

    let status = 'verde'
    if (diffDays >= 7 && diffDays <= 14) status = 'amarelo'
    else if (diffDays >= 15 && diffDays <= 30) status = 'vermelho'
    else if (diffDays > 30) status = 'critico'

    const oldStatus = client.getString('status_inatividade')
    const oldDays = client.getInt('dias_sem_contato')

    if (oldDays !== diffDays || oldStatus !== status) {
      client.set('dias_sem_contato', diffDays)
      client.set('status_inatividade', status)
      $app.save(client)

      const userId = client.getString('user_id')

      if (status === 'vermelho' && oldStatus !== 'vermelho') {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('client_id', client.id)
        notif.set('tipo', 'inatividade')
        notif.set('titulo', 'Cliente com inatividade alta')
        notif.set(
          'mensagem',
          `${client.getString('nome')} está há ${diffDays} dias sem contato no WhatsApp.`,
        )
        notif.set('lida', false)
        notif.set('user_id', userId)
        $app.save(notif)
      } else if (status === 'critico' && oldStatus !== 'critico') {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('client_id', client.id)
        notif.set('tipo', 'inatividade_critica')
        notif.set('titulo', 'Alerta crítico de inatividade')
        notif.set(
          'mensagem',
          `${client.getString('nome')} está há ${diffDays} dias sem contato no WhatsApp. Ação imediata recomendada.`,
        )
        notif.set('lida', false)
        notif.set('user_id', userId)
        $app.save(notif)

        // Integracao com o Agente de Follow-up para gerar mensagem proativa
        try {
          const exercises = $app.findRecordsByFilter(
            'exercises_library',
            `user_id = '${userId}'`,
            '-created',
            100,
            0,
          )
          const transcripts = $app.findRecordsByFilter(
            'transcripts',
            `client_id = '${client.id}'`,
            '-created',
            3,
            0,
          )

          let promptMsg = `Gere a mensagem de follow-up para o cliente de ID: ${client.id}, que está há mais de 30 dias sem contato.`

          if (transcripts.length > 0) {
            let transcriptsContext = transcripts.map((t) => `- ${t.getString('resumo')}`).join('\n')
            promptMsg += `\n\nHistórico das últimas reuniões (use para personalizar a mensagem):\n${transcriptsContext}`
          }

          if (exercises.length > 0) {
            let exercisesContext = exercises
              .map(
                (ex) =>
                  `Título: ${ex.getString('titulo')}\nDescrição: ${ex.getString('descricao')}`,
              )
              .join('\n\n')
            promptMsg += `\n\nIMPORTANTE: No final da mensagem, adicione uma seção chamada "*Sugestões de Exercícios*". Selecione 2 ou 3 exercícios relevantes da biblioteca abaixo, baseando-se no histórico do cliente. Liste com o Título em negrito e uma breve descrição.\n\nBiblioteca:\n${exercisesContext}`
          }

          const result = $ai.agent('gerador-followup').chat({
            user_id: userId,
            message: promptMsg,
          })

          const followupNotif = new Record($app.findCollectionByNameOrId('notifications'))
          followupNotif.set('client_id', client.id)
          followupNotif.set('tipo', 'sugestao_followup')
          followupNotif.set('titulo', `Sugestão de mensagem para ${client.getString('nome')}`)
          followupNotif.set('mensagem', result.content)
          followupNotif.set('lida', false)
          followupNotif.set('user_id', userId)
          $app.save(followupNotif)
        } catch (err) {
          $app
            .logger()
            .error(
              'Erro ao gerar follow-up cron',
              'client',
              client.id,
              'err',
              err.message || String(err),
            )
        }
      }
    }
  }
})
