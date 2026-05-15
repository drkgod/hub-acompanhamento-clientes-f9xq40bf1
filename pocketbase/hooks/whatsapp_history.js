routerAdd(
  'GET',
  '/backend/v1/clients/{id}/whatsapp-history',
  (e) => {
    try {
      const clientId = e.request.pathValue('id')
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const limit = parseInt(e.request.url.query().get('limit') || '50', 10)

      const records = $app.findRecordsByFilter(
        'whatsapp_messages',
        `client_id = '${clientId}' && user_id = '${userId}'`,
        '-timestamp',
        limit,
        0,
      )

      const messages = records
        .map((r) => ({
          id: r.getString('message_id') || r.id,
          text: r.getString('body'),
          fromMe: r.getBool('from_me'),
          timestamp: r.getInt('timestamp'),
          type: r.getString('type'),
        }))
        .reverse()

      return e.json(200, { messages })
    } catch (err) {
      $app.logger().error('WhatsApp History error', err.message || String(err))
      return e.internalServerError('Falha ao buscar o histórico de mensagens local.')
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/whatsapp/conversations/{chatId}/messages',
  (e) => {
    try {
      let chatId = e.request.pathValue('chatId')
      try {
        chatId = decodeURIComponent(chatId)
      } catch (_) {}

      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const limit = parseInt(e.request.url.query().get('limit') || '150', 10)

      const records = $app.findRecordsByFilter(
        'whatsapp_messages',
        `(chat_id = '${chatId}' || phone = '${chatId}') && user_id = '${userId}'`,
        '-timestamp',
        limit,
        0,
      )

      const messages = records
        .map((r) => ({
          id: r.getString('message_id') || r.id,
          chat_id: r.getString('chat_id'),
          body: r.getString('body'),
          from_me: r.getBool('from_me'),
          timestamp: r.getInt('timestamp'),
          type: r.getString('type'),
          created: r.getString('created'),
        }))
        .reverse()

      return e.json(200, { messages })
    } catch (err) {
      $app.logger().error('WhatsApp History error', err.message || String(err))
      return e.internalServerError('Falha ao buscar o histórico de mensagens local.')
    }
  },
  $apis.requireAuth(),
)
