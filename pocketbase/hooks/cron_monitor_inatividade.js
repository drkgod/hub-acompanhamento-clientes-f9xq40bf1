cronAdd('monitor_inatividade', '0 0 * * *', () => {
  const apiKey = $secrets.get('UAZAPI_KEY')
  if (!apiKey) {
    throw new BadRequestError(
      'Configuração da UAZAPI não encontrada. Por favor, configure a chave UAZAPI_KEY.',
    )
  }

  const clients = $app.findRecordsByFilter('clients', '1=1', '', 0, 0)
  const now = new Date()

  for (const client of clients) {
    let dateToUse = null
    const telefone = client.getString('telefone')

    if (telefone) {
      const cleanPhone = telefone.replace(/\D/g, '')
      let retries = 0
      let success = false
      let backoff = 2000 // 2s, 4s, 8s

      while (retries < 3 && !success) {
        try {
          const res = $http.send({
            url: `https://api.uazapi.com/v1/chat/messages/${cleanPhone}`,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10,
          })

          if (res.statusCode >= 500) {
            throw new Error(`UAZAPI 5xx error: ${res.statusCode}`)
          }

          if (
            res.statusCode === 200 &&
            res.json &&
            res.json.messages &&
            res.json.messages.length > 0
          ) {
            const lastMsg = res.json.messages[0]
            if (lastMsg && lastMsg.timestamp) {
              dateToUse = new Date(lastMsg.timestamp)
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
            while (new Date().getTime() - start < backoff) {
              // block for exponential backoff (2s, 4s)
            }
            backoff *= 2
          }
        }
      }
    }

    if (!dateToUse) {
      const ucStr = client.getString('ultimo_contato')
      const createdStr = client.getString('created')
      dateToUse = ucStr ? new Date(ucStr) : new Date(createdStr)
    }

    // Calculate difference in days
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

      // Notifications logic
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
      }
    }
  }
})
