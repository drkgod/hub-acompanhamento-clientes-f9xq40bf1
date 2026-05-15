routerAdd(
  'POST',
  '/backend/v1/whatsapp/analyze-conversation',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const chatId = body.chat_id
    if (!chatId) return e.badRequestError('chat_id is required')

    const messages = $app.findRecordsByFilter(
      'whatsapp_messages',
      'chat_id = {:chatId} && user_id = {:userId}',
      '-timestamp',
      50,
      0,
      { chatId: chatId, userId: userId },
    )

    if (!messages || messages.length === 0) {
      return e.badRequestError('Nenhuma mensagem encontrada para esta conversa')
    }

    messages.reverse()

    let clientId = ''
    let maxTimestamp = 0
    const historyLines = messages.map((m) => {
      if (m.getString('client_id')) clientId = m.getString('client_id')
      const ts = m.getFloat('timestamp')
      if (ts > maxTimestamp) maxTimestamp = ts

      const sender = m.getBool('from_me') ? 'EU' : 'CLIENTE'
      const body = m.getString('body')
      const mediaError = m.getString('media_error')
      const mediaUrl = m.getString('media_url')
      const mediaType = m.getString('media_type') || m.getString('type')
      const mediaCaption = m.getString('media_caption') || body
      const mediaFilename = m.getString('media_filename')
      const mediaMimetype = m.getString('media_mimetype')
      const mediaTranscription = m.getString('media_transcription')

      if (mediaError) {
        return `${sender} enviou mídia, mas o download falhou: ${mediaError}`
      }

      if (mediaUrl || mediaTranscription) {
        if (mediaType === 'image' || mediaType === 'sticker') {
          if (mediaCaption) {
            return `${sender} enviou uma imagem. Legenda: ${mediaCaption}. URL da imagem: ${mediaUrl}`
          }
          return `${sender} enviou uma imagem. URL da imagem: ${mediaUrl}`
        }
        if (mediaType === 'video' || mediaType === 'ptv') {
          if (mediaCaption) {
            return `${sender} enviou um vídeo. Legenda: ${mediaCaption}. URL: ${mediaUrl}`
          }
          return `${sender} enviou um vídeo. URL: ${mediaUrl}`
        }
        if (mediaType === 'document') {
          return `${sender} enviou um documento chamado ${mediaFilename || 'desconhecido'}, tipo ${mediaMimetype || 'desconhecido'}, URL: ${mediaUrl}`
        }
        if (mediaType === 'audio' || mediaType === 'myaudio' || mediaType === 'ptt') {
          if (mediaTranscription) {
            return `${sender} enviou um áudio. Transcrição: ${mediaTranscription}`
          }
          return `${sender} enviou um áudio sem transcrição disponível. URL: ${mediaUrl}`
        }

        return `${sender} enviou mídia (${mediaType}). URL: ${mediaUrl}`
      }

      return `${sender}: ${body}`
    })

    const historyText = historyLines.join('\n\n')

    const result = $ai.agent('whatsapp-analyst').chat({
      user_id: userId,
      message: 'Analise o seguinte histórico de mensagens:\n\n' + historyText,
    })

    let parsed = {}
    try {
      let raw = result.content.trim()
      if (raw.startsWith('```json')) raw = raw.replace(/^```json/, '')
      if (raw.startsWith('```')) raw = raw.replace(/^```/, '')
      if (raw.endsWith('```')) raw = raw.slice(0, -3)
      parsed = JSON.parse(raw.trim())
    } catch (err) {
      $app
        .logger()
        .error('Failed to parse agent response', 'chatId', chatId, 'content', result.content)
      return e.internalServerError('Falha ao analisar a conversa (Formato inválido do agente)')
    }

    let record = null
    try {
      record = $app.findFirstRecordByFilter(
        'whatsapp_analyses',
        'chat_id = {:chatId} && user_id = {:userId}',
        { chatId: chatId, userId: userId },
      )
    } catch (err) {
      const col = $app.findCollectionByNameOrId('whatsapp_analyses')
      record = new Record(col)
    }

    record.set('user_id', userId)
    record.set('chat_id', chatId)
    if (clientId) record.set('client_id', clientId)

    record.set('summary', parsed.summary || '')
    record.set('sentiment', parsed.sentiment || '')
    record.set('pending_questions', parsed.pending_questions || '')
    record.set('suggested_followup', parsed.suggested_followup || '')
    record.set('opportunities', parsed.opportunities || '')
    record.set('last_message_timestamp', maxTimestamp)

    $app.save(record)

    return e.json(200, record)
  },
  $apis.requireAuth(),
)
