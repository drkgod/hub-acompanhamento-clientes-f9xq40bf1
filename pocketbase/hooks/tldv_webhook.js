routerAdd('OPTIONS', '/backend/v1/tldv-webhook', (e) => {
  e.response.header().set('Access-Control-Allow-Origin', '*')
  e.response.header().set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  e.response.header().set('Access-Control-Allow-Headers', 'Authorization, apikey, Content-Type')
  return e.noContent(204)
})

routerAdd(
  'POST',
  '/backend/v1/tldv-webhook',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')

    try {
      const userId = e.auth?.id
      if (!userId) {
        return e.badRequestError('Token inválido ou não autenticado.')
      }

      const tldvKey = $secrets.get('TLDV_API_KEY')
      if (!tldvKey) {
        return e.badRequestError('Configure a chave TLDV_API_KEY no Secrets do Skip.')
      }

      const body = e.requestInfo().body || {}
      const payloadData = body.data || body
      const id = payloadData.id || body.id
      const eventName = body.event || 'TranscriptReady'

      if (!id) {
        return e.badRequestError('Payload inválido. O webhook do TLDV deve conter o campo id.')
      }

      let meetingRecord = null
      try {
        meetingRecord = $app.findFirstRecordByData('meetings', 'recording_id', id)
      } catch (_) {}

      if (meetingRecord) {
        if (eventName !== 'TranscriptReady') {
          return e.json(200, { message: 'Reunião já registrada.' })
        } else {
          try {
            $app.findFirstRecordByData('transcripts', 'meeting_id', meetingRecord.id)
            return e.json(200, { message: 'Reunião já registrada.' })
          } catch (_) {}
        }
      }

      let clientRecord = null
      if (meetingRecord) {
        clientRecord = $app.findRecordById('clients', meetingRecord.getString('client_id'))
      } else {
        const titulo_reuniao = payloadData.title || 'Reunião TLDV'
        const data_reuniao = payloadData.createdAt || payloadData.date || new Date().toISOString()
        const duracao_sec = payloadData.duration || 0
        const duracao_minutos = Math.round(Number(duracao_sec) / 60)
        const plataforma = payloadData.platform || ''
        const participantes = payloadData.participants || []

        const participantesStr = Array.isArray(participantes)
          ? participantes.join(' ')
          : String(participantes || '')
        const searchString = (participantesStr + ' ' + titulo_reuniao).toLowerCase()

        const clients = $app.findRecordsByFilter(
          'clients',
          'user_id = {:userId}',
          '-created',
          100,
          0,
          { userId: userId },
        )
        for (const c of clients) {
          const cNome = c.getString('nome').toLowerCase()
          const cEmail = c.getString('email').toLowerCase()
          if (
            (cNome && searchString.includes(cNome)) ||
            (cEmail && searchString.includes(cEmail))
          ) {
            clientRecord = c
            break
          }
        }

        if (!clientRecord) {
          let stageId = ''
          try {
            const stage = $app.findFirstRecordByFilter(
              'pipeline_stages',
              "user_id = {:userId} && nome ~ 'Lead'",
              { userId: userId },
            )
            stageId = stage.id
          } catch (_) {
            try {
              const stages = $app.findRecordsByFilter(
                'pipeline_stages',
                'user_id = {:userId}',
                'ordem',
                1,
                0,
                { userId: userId },
              )
              if (stages.length > 0) stageId = stages[0].id
            } catch (_) {}
          }

          if (!stageId) {
            const stageCol = $app.findCollectionByNameOrId('pipeline_stages')
            const newStage = new Record(stageCol)
            newStage.set('nome', 'Leads')
            newStage.set('ordem', 1)
            newStage.set('user_id', userId)
            $app.save(newStage)
            stageId = newStage.id
          }

          const clientCol = $app.findCollectionByNameOrId('clients')
          clientRecord = new Record(clientCol)
          let extractedName = 'Novo Cliente TLDV'
          if (Array.isArray(participantes) && participantes.length > 0) {
            extractedName = participantes[0]
          } else if (typeof participantes === 'string' && participantes.trim().length > 0) {
            extractedName = participantes.split(',')[0]
          }
          clientRecord.set('nome', extractedName)
          clientRecord.set('estagio_id', stageId)
          clientRecord.set('status_inatividade', 'verde')
          clientRecord.set('user_id', userId)
          $app.save(clientRecord)
        }

        const meetingCol = $app.findCollectionByNameOrId('meetings')
        meetingRecord = new Record(meetingCol)
        meetingRecord.set('recording_id', id)
        meetingRecord.set('titulo', titulo_reuniao)
        if (data_reuniao) meetingRecord.set('data', data_reuniao)
        if (duracao_minutos) meetingRecord.set('duracao_minutos', Number(duracao_minutos))
        if (plataforma) meetingRecord.set('plataforma', plataforma)
        meetingRecord.set('status', 'processando')
        meetingRecord.set('client_id', clientRecord.id)
        meetingRecord.set('user_id', userId)
        $app.save(meetingRecord)
      }

      if (eventName === 'TranscriptReady') {
        let transcriptText = ''
        let fetchError = null
        const delays = [2000, 4000, 8000]
        let attempt = 0

        while (attempt <= 3) {
          try {
            const res = $http.send({
              url: `https://api.tldv.io/v1/meetings/${id}/transcript`,
              method: 'GET',
              headers: {
                'x-api-key': tldvKey,
                Authorization: 'Bearer ' + tldvKey,
              },
              timeout: 15,
            })

            if (res.statusCode >= 500 && res.statusCode < 600) {
              if (attempt < 3) {
                const delay = delays[attempt]
                const start = Date.now()
                while (Date.now() - start < delay) {}
                attempt++
                continue
              } else {
                fetchError = new Error(`TLDV API returned ${res.statusCode}`)
                break
              }
            }

            if (res.statusCode !== 200) {
              fetchError = new Error(`TLDV API returned ${res.statusCode}`)
              break
            }

            const resJson = res.json || {}
            transcriptText = resJson.fullText || resJson.text || resJson.transcript || ''
            break
          } catch (err) {
            if (attempt < 3) {
              const delay = delays[attempt]
              const start = Date.now()
              while (Date.now() - start < delay) {}
              attempt++
              continue
            } else {
              fetchError = err
              break
            }
          }
        }

        if (fetchError || !transcriptText) {
          meetingRecord.set('status', 'erro_processamento')
          $app.save(meetingRecord)
          return e.json(200, {
            success: false,
            message: 'Erro ao buscar transcrição',
            error: fetchError?.message,
          })
        }

        const transcriptCol = $app.findCollectionByNameOrId('transcripts')
        const transcriptRecord = new Record(transcriptCol)
        transcriptRecord.set('meeting_id', meetingRecord.id)
        transcriptRecord.set('client_id', clientRecord.id)
        transcriptRecord.set('texto_original', transcriptText)
        transcriptRecord.set('resumo', '')
        transcriptRecord.set('user_id', userId)
        $app.save(transcriptRecord)

        try {
          const prompt = `Nova transcrição da reunião "${meetingRecord.getString('titulo')}" recebida via TLDV.
ID da transcrição: ${transcriptRecord.id}
ID do cliente: ${clientRecord.id}
ID da reunião: ${meetingRecord.id}
Nome do Cliente: ${clientRecord.getString('nome')}
Data atual: ${new Date().toISOString()}

Texto original da reunião:
${transcriptText}

Por favor, analise a transcrição e use as ferramentas para:
1. Atualizar o resumo e sentimento na transcrição.
2. Criar metas (se houver).
3. Criar pontos de melhoria (se houver).
4. Atualizar o status da reunião para 'processada'.
5. Atualizar o cliente (ultimo_contato = data atual, dias_sem_contato = 0, status_inatividade = 'verde').
6. Criar uma notificação informando que o resumo do cliente está disponível.`

          $ai.agent('meeting-processor').chat({
            user_id: userId,
            message: prompt,
          })
        } catch (agentErr) {
          $app
            .logger()
            .error('Erro no agent meeting-processor via webhook', 'err', agentErr.message)
        }

        return e.json(200, {
          success: true,
          meeting_id: meetingRecord.id,
          transcript_id: transcriptRecord.id,
        })
      }

      return e.json(200, { success: true, meeting_id: meetingRecord.id })
    } catch (err) {
      $app.logger().error('Erro ao processar TLDV webhook', 'err', err.message)
      return e.badRequestError('Erro ao processar o webhook: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
