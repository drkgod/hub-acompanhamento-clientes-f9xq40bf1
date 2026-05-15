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

    let meetingData = null
    let invitee = null

    const tldvHeaders = {
      'x-api-key': apiKey,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Origin: 'https://app.tldv.io',
      Referer: 'https://app.tldv.io/',
    }

    let page = 1
    const limit = 20
    const maxPages = 3

    searchLoop: while (page <= maxPages) {
      let res
      try {
        res = $http.send({
          url: `https://pasta.tldv.io/v1alpha1/meetings?limit=${limit}&page=${page}`,
          method: 'GET',
          headers: tldvHeaders,
          timeout: 30,
        })
      } catch (err) {
        $app.logger().error('tl;dv API transport error', 'error', err.message)
        return e.internalServerError('Error communicating with tl;dv API')
      }

      if (
        res.statusCode !== 200 ||
        !res.json ||
        !Array.isArray(res.json.results) ||
        res.json.results.length === 0
      ) {
        break
      }

      for (const listMeeting of res.json.results) {
        if (!listMeeting.id) continue

        let detailRes
        try {
          detailRes = $http.send({
            url: `https://pasta.tldv.io/v1alpha1/meetings/${listMeeting.id}`,
            method: 'GET',
            headers: tldvHeaders,
            timeout: 30,
          })
        } catch (err) {
          $app.logger().error('tl;dv API meeting detail transport error', 'error', err.message)
          continue
        }

        if (detailRes.statusCode === 200 && detailRes.json) {
          const m = detailRes.json
          if (Array.isArray(m.invitees)) {
            const emails = m.invitees.map((i) => i.email).filter(Boolean)
            $app
              .logger()
              .info(
                'Emails encontrados na reunião',
                'meeting_id',
                m.id,
                'emails',
                emails.join(', '),
              )

            const foundInvitee = m.invitees.find(
              (i) => i.email && i.email.toLowerCase() === email.toLowerCase(),
            )
            if (foundInvitee) {
              meetingData = m
              invitee = foundInvitee
              break searchLoop
            }
          }
        }
      }

      page++
    }

    if (!meetingData) {
      return e.notFoundError(
        `Nenhuma gravação encontrada para o email ${email} nas suas últimas 60 reuniões no tl;dv.`,
      )
    }

    const finalEmail = invitee && invitee.email ? invitee.email : email
    const finalName = invitee && invitee.name ? invitee.name : email.split('@')[0]

    let client
    try {
      client = $app.findFirstRecordByFilter('clients', 'email = {:email} && user_id = {:userId}', {
        email: finalEmail,
        userId,
      })
    } catch (err) {
      const errMsg = err.message ? err.message.toLowerCase() : ''
      if (errMsg.includes('no rows') || errMsg.includes('not found')) {
        const clientsCol = $app.findCollectionByNameOrId('clients')
        client = new Record(clientsCol)
        client.set('nome', finalName)
        client.set('empresa', meetingData.company || 'Empresa Importada')
        client.set('email', finalEmail)
        client.set('estagio_id', firstStage.id)
        client.set('user_id', userId)
        $app.save(client)
      } else {
        throw err
      }
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
    $app.save(meeting)

    let transcriptText = ''
    if (meetingData.id) {
      try {
        const trRes = $http.send({
          url: `https://pasta.tldv.io/v1alpha1/meetings/${meetingData.id}/transcript`,
          method: 'GET',
          headers: tldvHeaders,
          timeout: 30,
        })

        if (trRes.statusCode === 204) {
          transcriptText =
            'Transcricao ainda sendo processada pelo tl;dv. Tente reimportar em alguns minutos.'
        } else if (trRes.statusCode === 200 && trRes.json) {
          if (Array.isArray(trRes.json.data)) {
            if (trRes.json.data.length > 0) {
              transcriptText = trRes.json.data
                .map((seg) => `${seg.speaker}: ${seg.text}`)
                .join('\n')
            } else {
              transcriptText =
                'Transcricao ainda sendo processada pelo tl;dv. Tente reimportar em alguns minutos.'
            }
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
      transcriptText =
        'Transcricao ainda sendo processada pelo tl;dv. Tente reimportar em alguns minutos.'
    }

    const originalLength = transcriptText.length
    if (originalLength > 80000) {
      transcriptText =
        transcriptText.slice(0, 80000) +
        `... [Transcricao truncada. Texto completo tem ${originalLength} caracteres.]`
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
