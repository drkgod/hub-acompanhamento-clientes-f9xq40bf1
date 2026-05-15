// @deps date-fns@4.1.0
routerAdd(
  'POST',
  '/backend/v1/tldv/import-my-calls',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Auth required')

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (err) {}

    const searchEmail = (body.email || 'Rodrigo@adapta.org').toLowerCase()
    const page = parseInt(body.page || 1, 10)
    const limit = parseInt(body.limit || 25, 10)

    const tldvKey = $secrets.get('TLDV_API_KEY')
    if (!tldvKey) return e.badRequestError('TLDV_API_KEY is missing in secrets.')

    // Verify user has at least one pipeline stage before starting
    let firstStageId = null
    try {
      const stages = $app.findRecordsByFilter(
        'pipeline_stages',
        `user_id = '${userId}'`,
        '+ordem',
        1,
        0,
      )
      if (stages && stages.length > 0) {
        firstStageId = stages[0].id
      }
    } catch (err) {}

    if (!firstStageId) {
      return e.badRequestError(
        'Nenhum estágio de pipeline encontrado para o usuário. Crie um estágio primeiro.',
      )
    }

    const headers = {
      'x-api-key': tldvKey,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Origin: 'https://app.tldv.io',
      Referer: 'https://app.tldv.io/',
    }

    const url = `https://pasta.tldv.io/v1alpha1/meetings?page=${page}&limit=${limit}`
    const res = $http.send({ url, method: 'GET', headers, timeout: 60 })

    if (res.statusCode !== 200) {
      return e.badRequestError(`tl;dv API error: ${res.statusCode}`)
    }

    const payload = res.json || {}
    const results = payload.results || []

    const pages = payload.pages || 1
    const total = payload.total || results.length

    let created_clients = 0
    let created_meetings = 0
    let created_transcripts = 0
    let skipped_not_involving_email = 0
    let skipped_duplicates = 0

    for (const meeting of results) {
      const orgEmail = (meeting.organizer?.email || '').toLowerCase()
      const invitees = meeting.invitees || []

      // Check if search email is involved
      const involvesEmail =
        orgEmail === searchEmail ||
        invitees.some((inv) => (inv.email || '').toLowerCase() === searchEmail)
      if (!involvesEmail) {
        skipped_not_involving_email++
        continue
      }

      // Identify Client
      let clientEmail = null
      let clientName = null

      // Condition 1: Not the search email and does not end with @adapta.org
      for (const inv of invitees) {
        const eMail = (inv.email || '').toLowerCase()
        if (eMail !== searchEmail && !eMail.endsWith('@adapta.org')) {
          clientEmail = eMail
          clientName = inv.name || eMail.split('@')[0]
          break
        }
      }

      // Fallback: Not the search email
      if (!clientEmail) {
        for (const inv of invitees) {
          const eMail = (inv.email || '').toLowerCase()
          if (eMail !== searchEmail) {
            clientEmail = eMail
            clientName = inv.name || eMail.split('@')[0]
            break
          }
        }
      }

      // Fallback 2: Organizer if different
      if (!clientEmail && orgEmail && orgEmail !== searchEmail) {
        clientEmail = orgEmail
        clientName = meeting.organizer?.name || orgEmail.split('@')[0]
      }

      if (!clientEmail) {
        skipped_not_involving_email++
        continue
      }

      let clientRecord = null
      try {
        clientRecord = $app.findFirstRecordByFilter(
          'clients',
          `email = {:email} && user_id = {:userId}`,
          { email: clientEmail, userId: userId },
        )
      } catch (err) {}

      if (!clientRecord) {
        const cCol = $app.findCollectionByNameOrId('clients')
        clientRecord = new Record(cCol)
        clientRecord.set('nome', clientName || clientEmail.split('@')[0])
        clientRecord.set('email', clientEmail)

        const domain = clientEmail.split('@')[1] || ''
        const empresa = domain.split('.')[0] || domain
        clientRecord.set('empresa', empresa)
        clientRecord.set('estagio_id', firstStageId)
        clientRecord.set('status_inatividade', 'verde')
        clientRecord.set('user_id', userId)
        $app.save(clientRecord)
        created_clients++
      }

      let meetingRecord = null
      try {
        meetingRecord = $app.findFirstRecordByFilter('meetings', `recording_id = {:recId}`, {
          recId: meeting.id,
        })
      } catch (err) {}

      if (meetingRecord) {
        skipped_duplicates++
        continue
      }

      const mCol = $app.findCollectionByNameOrId('meetings')
      meetingRecord = new Record(mCol)
      meetingRecord.set('recording_id', meeting.id)
      meetingRecord.set('client_id', clientRecord.id)
      meetingRecord.set('titulo', meeting.name || 'Reunião tl;dv')
      meetingRecord.set('data', meeting.happenedAt || '')
      const durMins = meeting.duration ? Math.round(meeting.duration / 60) : 0
      meetingRecord.set('duracao_minutos', durMins)
      meetingRecord.set('plataforma', 'tl;dv')
      meetingRecord.set('status', 'processando')
      meetingRecord.set('user_id', userId)
      $app.save(meetingRecord)
      created_meetings++

      // Transcript Processing
      const tUrl = `https://pasta.tldv.io/v1alpha1/meetings/${meeting.id}/transcript`
      const tRes = $http.send({ url: tUrl, method: 'GET', headers, timeout: 60 })

      let transcriptText = ''
      if (tRes.statusCode === 200) {
        const tData = tRes.json || []
        if (Array.isArray(tData)) {
          transcriptText = tData
            .map((t) => `${t.speaker || 'Desconhecido'}: ${t.text || ''}`)
            .join('\n')
        }
      } else if (tRes.statusCode === 204) {
        transcriptText =
          'Transcrição ainda sendo processada pelo tl;dv. Tente reimportar em alguns minutos.'
      } else {
        transcriptText = 'Erro ao buscar transcrição do tl;dv (Status: ' + tRes.statusCode + ').'
      }

      if (transcriptText) {
        const origLen = transcriptText.length
        if (origLen > 90000) {
          transcriptText =
            transcriptText.substring(0, 90000) +
            `... [Transcrição truncada. Texto completo tem ${origLen} caracteres.]`
        }

        let transcriptRecord = null
        try {
          transcriptRecord = $app.findFirstRecordByFilter('transcripts', `meeting_id = {:mId}`, {
            mId: meetingRecord.id,
          })
        } catch (err) {}

        if (!transcriptRecord) {
          const trCol = $app.findCollectionByNameOrId('transcripts')
          transcriptRecord = new Record(trCol)
          transcriptRecord.set('meeting_id', meetingRecord.id)
          transcriptRecord.set('client_id', clientRecord.id)
          transcriptRecord.set('texto_original', transcriptText)
          transcriptRecord.set('resumo', '')
          transcriptRecord.set('user_id', userId)
          $app.save(transcriptRecord)
          created_transcripts++

          // Trigger AI Agent to process the meeting
          try {
            const aiContext = JSON.stringify({
              client_id: clientRecord.id,
              meeting_id: meetingRecord.id,
              transcript_id: transcriptRecord.id,
              client_name: clientRecord.getString('nome'),
              client_email: clientRecord.getString('email'),
              meeting_title: meetingRecord.getString('titulo'),
              meeting_date: meetingRecord.getString('data'),
              transcript: transcriptText,
            })

            $ai.agent('meeting-processor').chat({
              user_id: userId,
              message: `Por favor, analise a seguinte transcrição de reunião recém importada:\n\n${aiContext}`,
            })

            meetingRecord.set('status', 'concluido')
            $app.save(meetingRecord)
          } catch (e) {
            $app
              .logger()
              .error(
                'Failed to run meeting-processor agent',
                'error',
                e.message,
                'meeting_id',
                meetingRecord.id,
              )
            meetingRecord.set('status', 'erro')
            $app.save(meetingRecord)
          }
        }
      }
    }

    const isDone = page >= pages || results.length < limit
    const next_page = isDone ? page : page + 1

    return e.json(200, {
      page,
      limit,
      pages,
      total,
      processed_count: results.length,
      created_clients,
      created_meetings,
      created_transcripts,
      skipped_not_involving_email,
      skipped_duplicates,
      next_page,
      done: isDone,
    })
  },
  $apis.requireAuth(),
)
