routerAdd(
  'GET',
  '/backend/v1/clients/{id}/whatsapp-history',
  (e) => {
    try {
      const clientId = e.request.pathValue('id')
      const client = $app.findRecordById('clients', clientId)

      const token = $secrets.get('UAZAPI_TOKEN')
      let baseUrl = $secrets.get('UAZAPI_BASE_URL')

      if (!token || !baseUrl) {
        return e.internalServerError('As credenciais UAZAPI não estão configuradas.')
      }
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

      const telefone = client.getString('telefone')
      if (!telefone) return e.json(200, { messages: [] })

      let cleanPhone = telefone.replace(/\D/g, '')
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1)
      if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = '55' + cleanPhone

      const res1 = $http.send({
        url: `${baseUrl}/chats/phone/${cleanPhone}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: token,
        },
        timeout: 10,
      })

      if (res1.statusCode !== 200 || !res1.json) {
        return e.json(200, { messages: [] })
      }

      const data = res1.json.data || res1.json
      let chatId = data.id || data.chatId

      if (!chatId) {
        return e.json(200, { messages: [] })
      }

      const res2 = $http.send({
        url: `${baseUrl}/chats/${chatId}/messages?limit=50&page=1`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          token: token,
        },
        timeout: 10,
      })

      if (res2.statusCode === 200 && res2.json) {
        const msgs = res2.json.messages || res2.json.data || res2.json
        let messagesArray = Array.isArray(msgs) ? msgs : []
        messagesArray = messagesArray.map((msg) => ({
          ...msg,
          text: msg.body !== undefined ? msg.body : msg.text,
        }))
        return e.json(200, { messages: messagesArray })
      }

      return e.json(200, { messages: [] })
    } catch (err) {
      $app.logger().error('WhatsApp History error', 'error', err.message || String(err))
      return e.internalServerError('Falha ao buscar o histórico de mensagens.')
    }
  },
  $apis.requireAuth(),
)
