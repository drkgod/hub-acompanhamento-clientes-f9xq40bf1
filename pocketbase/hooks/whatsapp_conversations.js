routerAdd(
  'GET',
  '/backend/v1/whatsapp/conversations',
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

      const records = $app.findRecordsByFilter(
        'whatsapp_messages',
        `user_id = '${userId}'`,
        '-timestamp',
        5000,
        0,
      )

      const clients = $app.findRecordsByFilter('clients', `user_id = '${userId}'`, '', 1000, 0)

      const groups = new Map()

      for (const r of records) {
        const chatId = r.getString('chat_id')
        const phone = r.getString('phone')
        const groupId = chatId || phone
        if (!groupId) continue

        if (!groups.has(groupId)) {
          groups.set(groupId, {
            chatId: chatId,
            phone: phone,
            messages: [],
          })
        }
        groups.get(groupId).messages.push({
          body: r.getString('body'),
          timestamp: r.getInt('timestamp'),
          fromMe: r.getBool('from_me'),
          clientId: r.getString('client_id'),
        })
      }

      const conversations = []

      for (const [groupId, group] of groups.entries()) {
        const msgs = group.messages
        const latest = msgs[0]

        let client = null

        for (const m of msgs) {
          if (m.clientId) {
            client = clients.find((c) => c.id === m.clientId)
            if (client) break
          }
        }

        if (!client && group.phone) {
          const normPhone = normalizePhone(group.phone)
          const shortPhone =
            normPhone.length > 8 ? normPhone.substring(normPhone.length - 8) : normPhone
          if (shortPhone) {
            client = clients.find((c) => {
              const cp = normalizePhone(c.getString('telefone'))
              return cp.includes(shortPhone)
            })
          }
        }

        let lastSentTs = 0
        for (const m of msgs) {
          if (m.fromMe && m.timestamp > lastSentTs) {
            lastSentTs = m.timestamp
          }
        }

        let unreadCount = 0
        for (const m of msgs) {
          if (!m.fromMe && m.timestamp > lastSentTs) {
            unreadCount++
          }
        }

        conversations.push({
          chat_id: group.chatId || group.phone,
          phone: group.phone || '',
          client_id: client ? client.id : '',
          nome: client ? client.getString('nome') : group.phone || group.chatId || '',
          telefone: client ? client.getString('telefone') : group.phone || '',
          status_inatividade: client ? client.getString('status_inatividade') : '',
          ultima_mensagem_body: latest.body || '',
          ultima_mensagem_timestamp: latest.timestamp || 0,
          ultima_mensagem_from_me: !!latest.fromMe,
          total_nao_respondidas: unreadCount,
        })
      }

      conversations.sort((a, b) => b.ultima_mensagem_timestamp - a.ultima_mensagem_timestamp)

      console.log('totalMessages:', records.length)
      console.log('totalGroups:', groups.size)
      console.log('totalConversations:', conversations.length)

      return e.json(200, { conversations })
    } catch (err) {
      $app.logger().error('WhatsApp Conversations error', err.message || String(err))
      return e.internalServerError('Failed to aggregate conversations.')
    }
  },
  $apis.requireAuth(),
)
