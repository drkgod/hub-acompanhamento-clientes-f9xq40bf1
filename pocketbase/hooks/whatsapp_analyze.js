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
      const prefix = m.getBool('from_me') ? 'EU: ' : 'CLIENTE: '
      return prefix + m.getString('body')
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
