routerAdd('POST', '/backend/v1/whatsapp-webhook', (e) => {
  function normalizePhone(p) {
    if (!p) return ''
    let cleaned = p.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
    if (cleaned.length === 10 || cleaned.length === 11) cleaned = '55' + cleaned
    return cleaned
  }

  try {
    const expectedToken = $secrets.get('UAZAPI_WEBHOOK_SECRET')
    const headers = e.requestInfo().headers || {}
    const query = e.requestInfo().query || {}
    const providedToken = headers['token'] || headers['x-api-key'] || headers['authorization']
    const providedSecret = query['secret']

    const body = e.requestInfo().body || {}
    const instanceName = body.instance || ''

    if (!instanceName) {
      return e.json(200, { ok: true, ignored: true, reason: 'instance_not_found' })
    }

    let instance = null
    try {
      instance = $app.findFirstRecordByData('whatsapp_instances', 'instance_name', instanceName)
    } catch (_) {
      return e.json(200, { ok: true, ignored: true, reason: 'instance_not_found' })
    }

    const instanceToken = instance.getString('api_token')

    const isSecretValid = expectedToken && providedSecret === expectedToken
    const isTokenValid =
      instanceToken &&
      (providedToken === instanceToken || providedToken === `Bearer ${instanceToken}`)

    if (!isSecretValid && !isTokenValid) {
      return e.unauthorizedError('Invalid webhook token')
    }

    const event = body.event
    const userId = instance.getString('user_id')

    if (
      event === 'messages' ||
      event === 'messages_update' ||
      event === 'history' ||
      event === 'messages.upsert'
    ) {
      let messages = []
      if (body.data?.messages) {
        messages = Array.isArray(body.data.messages) ? body.data.messages : [body.data.messages]
      } else if (Array.isArray(body.data)) {
        messages = body.data
      } else if (body.data) {
        messages = [body.data]
      }

      for (const msg of messages) {
        let phone = ''
        let chatId = ''
        let messageId = ''
        let fromMe = false
        let timestamp = 0
        let msgBody = ''
        let msgType = ''

        if (msg.key) {
          chatId = msg.key.remoteJid || msg.key.chatId || msg.chatId || ''
          phone = chatId.split('@')[0] || ''
          messageId = msg.key.id || msg.messageId || ''
          fromMe = msg.key.fromMe || false
          timestamp = msg.messageTimestamp || msg.timestamp || 0
        } else {
          chatId = msg.remoteJid || msg.chatId || ''
          phone = chatId.split('@')[0] || ''
          messageId = msg.id || msg.messageId || ''
          fromMe = msg.fromMe || false
          timestamp = msg.timestamp || msg.messageTimestamp || 0
        }

        const actualMessage = msg.message || msg
        msgType =
          msg.messageType ||
          Object.keys(actualMessage || {}).find((k) => k !== 'messageContextInfo') ||
          'text'

        if (actualMessage.conversation) {
          msgBody = actualMessage.conversation
        } else if (actualMessage.extendedTextMessage?.text) {
          msgBody = actualMessage.extendedTextMessage.text
        } else if (msg.text) {
          msgBody = msg.text
        } else if (typeof msgBody === 'string' && !msgBody) {
          msgBody = `[${msgType}]`
        }

        if (!messageId || !phone) continue

        let clientId = ''
        const normPhone = normalizePhone(phone)
        try {
          const shortPhone = normPhone.substring(Math.max(0, normPhone.length - 8))
          const clients = $app.findRecordsByFilter(
            'clients',
            `telefone ~ '${shortPhone}' && user_id = '${userId}'`,
            '',
            1,
            0,
          )
          if (clients.length > 0) {
            clientId = clients[0].id
          }
        } catch (_) {}

        try {
          $app.findFirstRecordByData('whatsapp_messages', 'message_id', messageId)
        } catch (_) {
          const msgCol = $app.findCollectionByNameOrId('whatsapp_messages')
          const record = new Record(msgCol)
          record.set('message_id', messageId)
          record.set('chat_id', chatId)
          record.set('phone', normPhone)
          record.set('body', msgBody)
          record.set('timestamp', Number(timestamp) || 0)
          record.set('from_me', fromMe)
          record.set('type', msgType)
          record.set('user_id', userId)
          if (clientId) {
            record.set('client_id', clientId)
          }
          record.set('raw_payload', msg)
          $app.save(record)
        }
      }
    } else if (event === 'connection.update' || event === 'connection') {
      const state = body.data?.state || body.state
      if (state) {
        instance.set('connection_status', state)
        $app.save(instance)
      }
    }

    return e.json(200, { ok: true })
  } catch (err) {
    $app.logger().error('Webhook error', err.message || String(err))
    return e.json(200, { ok: true, error: err.message })
  }
})
