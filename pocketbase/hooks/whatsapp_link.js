routerAdd(
  'POST',
  '/backend/v1/whatsapp/link-conversation',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const { chat_id, phone, client_id } = body
    if (!client_id) return e.badRequestError('client_id is required')
    if (!chat_id && !phone) return e.badRequestError('chat_id or phone is required')

    let client
    try {
      client = $app.findRecordById('clients', client_id)
      if (client.getString('user_id') !== userId) {
        return e.forbiddenError('access denied')
      }
    } catch (err) {
      return e.notFoundError('client not found')
    }

    let updatedCount = 0

    $app.runInTransaction((txApp) => {
      const safeChatId = (chat_id || '').replace(/'/g, "''")
      const safePhone = (phone || '').replace(/'/g, "''")

      let filter = ''
      if (safeChatId) {
        filter = `chat_id = '${safeChatId}' && user_id = '${userId}'`
      } else {
        filter = `phone = '${safePhone}' && user_id = '${userId}'`
      }

      const messages = txApp.findRecordsByFilter('whatsapp_messages', filter, '', 10000, 0)
      for (const msg of messages) {
        msg.set('client_id', client_id)
        txApp.save(msg)
        updatedCount++
      }

      if (!client.getString('telefone') && phone) {
        client.set('telefone', phone)
        txApp.save(client)
      }
    })

    return e.json(200, { ok: true, updated_messages: updatedCount })
  },
  $apis.requireAuth(),
)
