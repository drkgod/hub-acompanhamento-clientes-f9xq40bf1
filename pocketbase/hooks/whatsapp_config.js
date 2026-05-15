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

      const pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
      const webhookUrl = `${pbUrl}/backend/v1/whatsapp-webhook`
      const webhookSecret = $secrets.get('UAZAPI_WEBHOOK_SECRET') || 'secret123'

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
            headers: { token: webhookSecret },
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
          url: `${baseUrl}/instance/connection`,
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

      let result = []
      try {
        result = $app
          .db()
          .newQuery(`
        SELECT 
          m.chat_id,
          m.phone,
          c.id as client_id,
          c.nome,
          c.telefone,
          c.status_inatividade,
          m.body as ultima_mensagem_body,
          m.timestamp as ultima_mensagem_timestamp,
          m.from_me as ultima_mensagem_from_me,
          (SELECT COUNT(*) FROM whatsapp_messages m2 
            WHERE COALESCE(NULLIF(m2.chat_id, ''), m2.phone) = COALESCE(NULLIF(m.chat_id, ''), m.phone)
            AND m2.from_me = 0 
            AND m2.timestamp > (
              SELECT COALESCE(MAX(m3.timestamp), 0) FROM whatsapp_messages m3 
              WHERE COALESCE(NULLIF(m3.chat_id, ''), m3.phone) = COALESCE(NULLIF(m.chat_id, ''), m.phone)
              AND m3.from_me = 1
            )
          ) as total_nao_respondidas
        FROM whatsapp_messages m
        LEFT JOIN clients c ON m.client_id = c.id
        WHERE m.user_id = {:userId}
        AND m.id IN (
          SELECT id FROM (
            SELECT id, MAX(timestamp) FROM whatsapp_messages
            WHERE user_id = {:userId}
            GROUP BY COALESCE(NULLIF(chat_id, ''), phone)
          )
        )
        ORDER BY m.timestamp DESC
      `)
          .bind({ userId: userId })
          .all()
      } catch (err) {
        $app.logger().error('Query Error', err.message)
      }

      const conversations = result.map((r) => ({
        chat_id: r.chat_id || r.phone,
        phone: r.phone,
        client_id: r.client_id,
        nome: r.nome || r.phone,
        telefone: r.telefone || r.phone,
        status_inatividade: r.status_inatividade || 'sem_status',
        ultima_mensagem_body: r.ultima_mensagem_body,
        ultima_mensagem_timestamp: Number(r.ultima_mensagem_timestamp),
        ultima_mensagem_from_me:
          r.ultima_mensagem_from_me === 1 ||
          r.ultima_mensagem_from_me === true ||
          r.ultima_mensagem_from_me === 'true',
        total_nao_respondidas: Number(r.total_nao_respondidas) || 0,
      }))

      return e.json(200, { conversations })
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
