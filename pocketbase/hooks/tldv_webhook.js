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

      const body = e.requestInfo().body || {}

      const recording_id = body.recording_id
      const titulo_reuniao = body.titulo_reuniao
      const data_reuniao = body.data_reuniao
      const duracao_minutos = body.duracao_minutos
      const plataforma = body.plataforma
      const transcricao_completa = body.transcricao_completa || body.transcritcao_completa
      const participantes = body.participantes

      if (!recording_id || !titulo_reuniao || !transcricao_completa) {
        return e.badRequestError(
          'Faltam campos obrigatórios no payload (recording_id, titulo_reuniao, transcricao_completa).',
        )
      }

      try {
        $app.findFirstRecordByData('meetings', 'recording_id', recording_id)
        return e.json(200, { message: 'Reunião já processada.' })
      } catch (_) {}

      let clientRecord = null
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
        if ((cNome && searchString.includes(cNome)) || (cEmail && searchString.includes(cEmail))) {
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
      const meetingRecord = new Record(meetingCol)
      meetingRecord.set('recording_id', recording_id)
      meetingRecord.set('titulo', titulo_reuniao)
      if (data_reuniao) meetingRecord.set('data', data_reuniao)
      if (duracao_minutos) meetingRecord.set('duracao_minutos', Number(duracao_minutos))
      if (plataforma) meetingRecord.set('plataforma', plataforma)
      meetingRecord.set('status', 'processando')
      meetingRecord.set('client_id', clientRecord.id)
      meetingRecord.set('user_id', userId)
      $app.save(meetingRecord)

      const transcriptCol = $app.findCollectionByNameOrId('transcripts')
      const transcriptRecord = new Record(transcriptCol)
      transcriptRecord.set('meeting_id', meetingRecord.id)
      transcriptRecord.set('client_id', clientRecord.id)
      transcriptRecord.set('texto_original', transcricao_completa)
      transcriptRecord.set('resumo', '')
      transcriptRecord.set('user_id', userId)
      $app.save(transcriptRecord)

      try {
        const prompt = `Nova transcrição da reunião "${titulo_reuniao}" recebida via TLDV.
ID da transcrição: ${transcriptRecord.id}
ID do cliente: ${clientRecord.id}
ID da reunião: ${meetingRecord.id}
Nome do Cliente: ${clientRecord.getString('nome')}
Data atual: ${new Date().toISOString()}

Texto original da reunião:
${transcricao_completa}

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
        $app.logger().error('Erro no agent meeting-processor via webhook', 'err', agentErr.message)
      }

      return e.json(200, {
        success: true,
        meeting_id: meetingRecord.id,
        transcript_id: transcriptRecord.id,
      })
    } catch (err) {
      $app.logger().error('Erro ao processar TLDV webhook', 'err', err.message)
      return e.badRequestError('Erro ao processar o webhook: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
