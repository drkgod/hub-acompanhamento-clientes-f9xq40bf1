routerAdd(
  'POST',
  '/backend/v1/whatsapp/configure',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const body = e.requestInfo().body || {}
      let baseUrl = body.base_url
      const apiToken = body.api_token
      const instanceName = body.instance_name || 'skip_instance'

      if (!baseUrl || !apiToken) return e.badRequestError('Missing base_url or api_token')
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

      let instance
      try {
        instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', userId)
      } catch (_) {
        const col = $app.findCollectionByNameOrId('whatsapp_instances')
        instance = new Record(col)
        instance.set('user_id', userId)
      }
      instance.set('base_url', baseUrl)
      instance.set('api_token', apiToken)
      instance.set('instance_name', instanceName)

      const publicUrl = $secrets.get('SKIP_PUBLIC_URL') || $secrets.get('PB_INSTANCE_URL') || ''
      const webhookSecret = $secrets.get('UAZAPI_WEBHOOK_SECRET') || 'secret123'
      const webhookUrl = `${publicUrl}/backend/v1/whatsapp-webhook?secret=${webhookSecret}`

      try {
        const res = $http.send({
          url: `${baseUrl}/webhook`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: apiToken,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['messages', 'messages_update', 'history', 'connection'],
            excludeMessages: ['wasSentByApi'],
          }),
          timeout: 10,
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          instance.set('webhook_configured', true)
        }
      } catch (err) {
        $app.logger().error('Webhook config fail', err.message)
      }

      $app.save(instance)
      return e.json(200, {
        ok: true,
        instance: { id: instance.id, webhook_configured: instance.getBool('webhook_configured') },
      })
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      let instance
      try {
        instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', userId)
      } catch (_) {
        return e.json(200, { connected: false, status: 'not_configured' })
      }

      const baseUrl = instance.getString('base_url')
      const token = instance.getString('api_token')
      const instanceName = instance.getString('instance_name')

      let state = instance.getString('connection_status')
      try {
        const res = $http.send({
          url: `${baseUrl}/instance/status`,
          method: 'GET',
          headers: { token: token },
          timeout: 5,
        })
        if (res.statusCode === 200 && res.json) {
          state = res.json.state || res.json.instance?.state || 'open'
          instance.set('connection_status', state)
          $app.save(instance)
        }
      } catch (_) {}

      return e.json(200, {
        instance_name: instanceName,
        status: state,
        connected: state === 'open',
      })
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/whatsapp/conversations',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Auth required')

      const messages = $app.findRecordsByFilter(
        'whatsapp_messages',
        'user_id = {:userId}',
        '-timestamp',
        5000,
        0,
        { userId },
      )

      $app.logger().info('whatsapp_conversations fetch', 'totalMessages', messages.length)

      const clients = $app.findRecordsByFilter('clients', 'user_id = {:userId}', '', 5000, 0, {
        userId,
      })

      function normalizePhone(val) {
        if (!val) return ''
        let digits = String(val).replace(/\D/g, '')
        digits = digits.replace(/^0+/, '')
        if (digits.length === 10 || digits.length === 11) {
          digits = '55' + digits
        }
        return digits
      }

      const clientMapById = {}
      const clientMapByPhone = {}
      for (const c of clients) {
        clientMapById[c.id] = c
        const phone = normalizePhone(c.getString('telefone'))
        if (phone) {
          clientMapByPhone[phone] = c
        }
      }

      const groups = {}
      for (const m of messages) {
        const chatId = m.getString('chat_id')
        const phone = m.getString('phone')
        const key = chatId || phone
        if (!key) continue

        if (!groups[key]) groups[key] = []
        groups[key].push(m)
      }

      const groupKeys = Object.keys(groups)
      $app.logger().info('whatsapp_conversations groups', 'totalGroups', groupKeys.length)

      const conversations = []

      for (const key of groupKeys) {
        const msgs = groups[key]
        const latest = msgs[0]

        let client = null
        const msgClientId = latest.getString('client_id')
        if (msgClientId && clientMapById[msgClientId]) {
          client = clientMapById[msgClientId]
        } else {
          const msgPhone = normalizePhone(latest.getString('phone'))
          if (msgPhone && clientMapByPhone[msgPhone]) {
            client = clientMapByPhone[msgPhone]
          }
        }

        let lastSentTimestamp = 0
        for (const m of msgs) {
          if (m.getBool('from_me') && m.getInt('timestamp') > lastSentTimestamp) {
            lastSentTimestamp = m.getInt('timestamp')
          }
        }

        let total_nao_respondidas = 0
        for (const m of msgs) {
          if (!m.getBool('from_me') && m.getInt('timestamp') > lastSentTimestamp) {
            total_nao_respondidas++
          }
        }

        conversations.push({
          chat_id: latest.getString('chat_id') || latest.getString('phone'),
          phone: latest.getString('phone'),
          client_id: client ? client.id : '',
          nome: client ? client.getString('nome') : latest.getString('phone'),
          telefone: client ? client.getString('telefone') : latest.getString('phone'),
          status_inatividade: client ? client.getString('status_inatividade') : 'sem_status',
          ultima_mensagem_body: latest.getString('body'),
          ultima_mensagem_timestamp: latest.getInt('timestamp'),
          ultima_mensagem_from_me: latest.getBool('from_me'),
          total_nao_respondidas: total_nao_respondidas,
        })
      }

      conversations.sort((a, b) => b.ultima_mensagem_timestamp - a.ultima_mensagem_timestamp)

      $app
        .logger()
        .info('whatsapp_conversations returned', 'totalConversations', conversations.length)

      return e.json(200, { conversations })
    } catch (err) {
      $app.logger().error('whatsapp_conversations error', 'message', err.message)
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
