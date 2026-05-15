routerAdd(
  'POST',
  '/backend/v1/whatsapp/sync-now',
  (e) => {
    function normalizePhone(p) {
      if (!p) return ''
      let cleaned = p.replace(/\D/g, '')
      if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
      if (cleaned.length === 10 || cleaned.length === 11) cleaned = '55' + cleaned
      return cleaned
    }

    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const body = e.requestInfo().body || {}
      const requestHistory = body.request_history === true

      const instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', userId)
      if (!instance) return e.badRequestError('WhatsApp instance not found')

      const baseUrl = instance.getString('base_url')
      const token = instance.getString('api_token')

      const chatsRes = $http.send({
        url: `${baseUrl}/chat/find`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: token },
        body: JSON.stringify({
          operator: 'AND',
          sort: '-wa_lastMsgTimestamp',
          limit: 100,
          offset: 0,
          wa_isGroup: false,
        }),
        timeout: 30,
      })

      if (chatsRes.statusCode !== 200) {
        return e.badRequestError('Failed to fetch chats: ' + chatsRes.statusCode)
      }

      const chats = chatsRes.json?.chats || chatsRes.json?.data || []

      if (requestHistory) {
        for (const chat of chats) {
          const chatId = chat.wa_chatid || chat.wa_fastid || chat.id
          if (!chatId) continue
          try {
            $http.send({
              url: `${baseUrl}/message/history-sync`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                token: token,
              },
              body: JSON.stringify({ number: chatId, mode: 'history', count: 100 }),
              timeout: 10,
            })
          } catch (_) {}
        }
        return e.json(200, { ok: true, message: 'History sync requested' })
      } else {
        const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
        const clients = $app.findRecordsByFilter('clients', `user_id = '${userId}'`, '', 1000, 0)

        for (const chat of chats) {
          const chatId = chat.wa_chatid || chat.wa_fastid || chat.id
          if (!chatId) continue

          let hasMore = true
          let offset = 0
          let totalFetched = 0

          while (hasMore && totalFetched < 500) {
            const msgsRes = $http.send({
              url: `${baseUrl}/message/find`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', token: token },
              body: JSON.stringify({
                chatid: chatId,
                limit: 100,
                offset: offset,
              }),
              timeout: 15,
            })

            if (msgsRes.statusCode === 200 && (msgsRes.json?.messages || msgsRes.json?.data)) {
              const msgs = msgsRes.json.messages || msgsRes.json.data
              for (const msg of msgs) {
                const messageId = msg.id || msg.key?.id || msg.wa_messageid
                if (!messageId) continue

                try {
                  $app.findFirstRecordByData('whatsapp_messages', 'message_id', messageId)
                  continue
                } catch (_) {}

                const phone = chatId.split('@')[0]
                let fromMe = msg.fromMe || msg.key?.fromMe || msg.wa_isFromMe || false
                let timestamp =
                  msg.timestamp ||
                  msg.messageTimestamp ||
                  msg.wa_timestamp ||
                  Math.floor(Date.now() / 1000)
                let msgType = msg.messageType || msg.wa_type || 'text'
                let msgBody =
                  msg.text ||
                  msg.wa_body ||
                  msg.message?.conversation ||
                  msg.message?.extendedTextMessage?.text ||
                  `[${msgType}]`

                let clientId = ''
                const normPhone = normalizePhone(phone)
                const shortPhone = normPhone.substring(Math.max(0, normPhone.length - 8))
                const clientMatch = clients.find((c) => {
                  const cp = normalizePhone(c.getString('telefone'))
                  return cp.includes(shortPhone)
                })
                if (clientMatch) clientId = clientMatch.id

                const record = new Record(msgCol)
                record.set('message_id', messageId)
                record.set('chat_id', chatId)
                record.set('phone', normPhone)
                record.set('body', msgBody)
                record.set('timestamp', Number(timestamp) || 0)
                record.set('from_me', fromMe)
                record.set('type', msgType)
                record.set('user_id', userId)
                if (clientId) record.set('client_id', clientId)
                record.set('raw_payload', msg)
                $app.save(record)
              }

              hasMore = msgsRes.json.hasMore === true
              if (msgsRes.json.nextOffset) {
                offset = msgsRes.json.nextOffset
              } else {
                offset += msgs.length
              }
              totalFetched += msgs.length
              if (msgs.length === 0) hasMore = false
            } else {
              hasMore = false
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
