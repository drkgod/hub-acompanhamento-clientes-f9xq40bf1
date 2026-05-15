routerAdd('POST', '/backend/v1/whatsapp-webhook', (e) => {
  try {
    const expectedToken = $secrets.get('UAZAPI_WEBHOOK_SECRET')
    const headers = e.requestInfo().headers
    const providedToken = headers['token'] || headers['x-api-key']

    if (expectedToken && providedToken !== expectedToken) {
      return e.unauthorizedError('Invalid webhook token')
    }

    const body = e.requestInfo().body || {}
    const event = body.event

    if (event === 'messages.upsert') {
      const messages = body.data?.messages || []
      const instanceName = body.instance

      for (const msg of messages) {
        let phone = msg.key?.remoteJid?.split('@')[0] || ''
        const messageId = msg.key?.id
        const fromMe = msg.key?.fromMe || false
        const timestamp = msg.messageTimestamp

        let msgBody = ''
        const msgType = Object.keys(msg.message || {})[0]
        if (msg.message?.conversation) {
          msgBody = msg.message.conversation
        } else if (msg.message?.extendedTextMessage?.text) {
          msgBody = msg.message.extendedTextMessage.text
        } else {
          msgBody = `[${msgType || 'Mensagem'}]`
        }

        if (!messageId || !phone) continue

        let userId = null
        try {
          const instance = $app.findFirstRecordByData(
            'whatsapp_instances',
            'instance_name',
            instanceName,
          )
          userId = instance.getString('user_id')
        } catch (_) {}

        if (!userId) {
          try {
            const anyInst = $app.findFirstRecordByFilter('whatsapp_instances', '1=1')
            userId = anyInst.getString('user_id')
          } catch (_) {
            continue
          }
        }

        let clientId = ''
        try {
          const shortPhone = phone.substring(Math.max(0, phone.length - 8))
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
          record.set('phone', phone)
          record.set('body', msgBody)
          record.set('timestamp', Number(timestamp) || 0)
          record.set('from_me', fromMe)
          record.set('type', msgType || 'text')
          record.set('user_id', userId)
          if (clientId) {
            record.set('client_id', clientId)
          }
          $app.save(record)
        }
      }
    } else if (event === 'connection.update') {
      const instanceName = body.instance
      const state = body.data?.state
      if (instanceName && state) {
        try {
          const instance = $app.findFirstRecordByData(
            'whatsapp_instances',
            'instance_name',
            instanceName,
          )
          instance.set('connection_status', state)
          $app.save(instance)
        } catch (_) {}
      }
    }

    return e.json(200, { ok: true })
  } catch (err) {
    $app.logger().error('Webhook error', err.message || String(err))
    return e.json(200, { ok: true, error: err.message })
  }
})
