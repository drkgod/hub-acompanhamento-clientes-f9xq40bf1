routerAdd(
  'POST',
  '/backend/v1/import-tldv',
  (e) => {
    const body = e.requestInfo().body || {}
    const email = body.email
    if (!email) return e.badRequestError('Email is required')
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Auth required')

    const apiKey = $secrets.get('TLDV_API_KEY')
    if (!apiKey) return e.badRequestError('TLDV_API_KEY not configured')

    let stages = []
    try {
      stages = $app.findRecordsByFilter('pipeline_stages', 'user_id = {:userId}', 'ordem', 1, 0, {
        userId,
      })
    } catch (_) {}

    if (!stages || stages.length === 0) return e.badRequestError('No pipeline stages found')
    const firstStage = stages[0]

    let res
    try {
      res = $http.send({
        url: `https://pasta.tldv.io/v1alpha1/meetings`,
        method: 'GET',
        headers: { 'x-api-key': apiKey },
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('tl;dv API transport error', 'error', err.message)
      return e.internalServerError('Error communicating with tl;dv API')
    }

    let meetingData = null
    if (
      res.statusCode === 200 &&
      res.json &&
      Array.isArray(res.json.meetings) &&
      res.json.meetings.length > 0
    ) {
      meetingData = res.json.meetings[0]
    }

    if (!meetingData) {
      return e.notFoundError(
        'Nenhuma gravação encontrada na sua conta tl;dv. Verifique se você tem reuniões gravadas.',
      )
    }

    let invitee = null
    if (Array.isArray(meetingData.invitees)) {
      invitee = meetingData.invitees.find(
        (i) => i.email && i.email.toLowerCase() !== email.toLowerCase(),
      )
    }

    const finalEmail = invitee && invitee.email ? invitee.email : ''
    const finalName = invitee && invitee.name ? invitee.name : email.split('@')[0]

    let client
    try {
      if (!finalEmail) throw new Error('No email to search')
      client = $app.findFirstRecordByFilter('clients', 'email = {:email} && user_id = {:userId}', {
        email: finalEmail,
        userId,
      })
    } catch (_) {
      const clientsCol = $app.findCollectionByNameOrId('clients')
      client = new Record(clientsCol)
      client.set('nome', finalName)
      client.set('empresa', meetingData.company || 'Empresa Importada')
      if (finalEmail) {
        client.set('email', finalEmail)
      }
      client.set('estagio_id', firstStage.id)
      client.set('user_id', userId)
      $app.save(client)
    }

    const meetingsCol = $app.findCollectionByNameOrId('meetings')
    const meeting = new Record(meetingsCol)
    meeting.set('client_id', client.id)
    meeting.set('titulo', meetingData.name || 'Reunião Importada (tl;dv)')
    meeting.set('data', meetingData.happenedAt || new Date().toISOString())
    meeting.set(
      'duracao_minutos',
      meetingData.duration ? Math.round(meetingData.duration / 60) : 30,
    )
    meeting.set('plataforma', 'tl;dv')
    meeting.set('status', 'realizada')
    meeting.set('user_id', userId)
    meeting.set('recording_id', meetingData.id || 'tldv_' + $security.randomString(8))
    $app.save(meeting)

    let transcriptText = ''
    if (meetingData.id) {
      try {
        const trRes = $http.send({
          url: `https://pasta.tldv.io/v1alpha1/meetings/${meetingData.id}/transcript`,
          method: 'GET',
          headers: { 'x-api-key': apiKey },
          timeout: 30,
        })

        if (trRes.statusCode === 200 && trRes.json) {
          if (Array.isArray(trRes.json.data) && trRes.json.data.length > 0) {
            transcriptText = trRes.json.data.map((seg) => `${seg.speaker}: ${seg.text}`).join('\n')
          } else if (trRes.json.transcript) {
            transcriptText = trRes.json.transcript
          } else if (trRes.json.fullText) {
            transcriptText = trRes.json.fullText
          }
        }
      } catch (err) {
        $app.logger().error('tl;dv API transcript error', 'error', err.message)
      }
    }

    if (!transcriptText) {
      transcriptText = 'Transcrição pendente de processamento pelo agente.'
    }

    const transcriptsCol = $app.findCollectionByNameOrId('transcripts')
    const transcript = new Record(transcriptsCol)
    transcript.set('meeting_id', meeting.id)
    transcript.set('client_id', client.id)
    transcript.set('texto_original', transcriptText)
    transcript.set('user_id', userId)
    $app.save(transcript)

    try {
      $ai.agent('meeting-processor').chat({
        user_id: userId,
        message: `Uma nova reunião foi importada manualmente para o cliente ${client.getString('nome')} (ID: ${client.id}). ID da reunião: ${meeting.id}. ID da transcrição: ${transcript.id}. Analise a transcrição e crie metas e pontos de melhoria, atualizando o resumo. Transcrição: ${transcript.getString('texto_original')}`,
      })
    } catch (err) {
      $app.logger().error('Meeting processor agent failed', 'error', err.message)
    }

    return e.json(200, { client_id: client.id, meeting_id: meeting.id })
  },
  $apis.requireAuth(),
)
