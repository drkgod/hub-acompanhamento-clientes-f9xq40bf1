routerAdd(
  'POST',
  '/backend/v1/whatsapp/sync-now',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const body = e.requestInfo().body || {}
      const requestHistory = body.request_history === true

      const instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', userId)
      if (!instance) return e.badRequestError('WhatsApp instance not found')

      const baseUrl = instance.getString('base_url')
      const token = instance.getString('api_token')

      if (requestHistory) {
        $http.send({
          url: `${baseUrl}/message/history-sync`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: token,
          },
          body: JSON.stringify({ mode: 'history', count: 100 }),
          timeout: 10,
        })
        return e.json(200, { ok: true, message: 'History sync requested' })
      } else {
        const chatsRes = $http.send({
          url: `${baseUrl}/chat/find`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: token },
          body: JSON.stringify({
            operator: 'AND',
            sort: '-wa_lastMsgTimestamp',
            limit: 100,
          }),
          timeout: 30,
        })

        if (chatsRes.statusCode !== 200) {
          return e.badRequestError('Failed to fetch chats: ' + chatsRes.statusCode)
        }

        const chats = chatsRes.json?.data || []

        const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
        const clients = $app.findRecordsByFilter('clients', `user_id = '${userId}'`, '', 1000, 0)

        for (const chat of chats) {
          const chatId = chat.id
          if (!chatId) continue

          const msgsRes = $http.send({
            url: `${baseUrl}/message/find`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', token: token },
            body: JSON.stringify({
              where: { chatId: chatId },
              limit: 50,
            }),
            timeout: 15,
          })

          if (msgsRes.statusCode === 200 && msgsRes.json?.data) {
            const msgs = msgsRes.json.data
            for (const msg of msgs) {
              const messageId = msg.id || msg.key?.id
              if (!messageId) continue

              try {
                $app.findFirstRecordByData('whatsapp_messages', 'message_id', messageId)
                continue
              } catch (_) {}

              const phone = chatId.split('@')[0]
              let fromMe = msg.fromMe || msg.key?.fromMe || false
              let timestamp = msg.timestamp || msg.messageTimestamp || Math.floor(Date.now() / 1000)
              let msgType = msg.messageType || 'text'
              let msgBody =
                msg.text ||
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                `[${msgType}]`

              let clientId = ''
              const shortPhone = phone.substring(Math.max(0, phone.length - 8))
              const clientMatch = clients.find((c) => c.getString('telefone').includes(shortPhone))
              if (clientMatch) clientId = clientMatch.id

              const record = new Record(msgCol)
              record.set('message_id', messageId)
              record.set('chat_id', chatId)
              record.set('phone', phone)
              record.set('body', msgBody)
              record.set('timestamp', Number(timestamp) || 0)
              record.set('from_me', fromMe)
              record.set('type', msgType)
              record.set('user_id', userId)
              if (clientId) record.set('client_id', clientId)
              record.set('raw_payload', msg)
              $app.save(record)
            }
          }
        }

        instance.set('last_sync_at', new Date().toISOString())
        $app.save(instance)

        return e.json(200, { ok: true, message: 'Sync completed' })
      }
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
