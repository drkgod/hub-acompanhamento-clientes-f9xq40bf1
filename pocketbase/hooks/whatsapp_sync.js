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

    function isMediaMessage(msg, messageType) {
      const mediaTypes = ['image', 'video', 'document', 'audio', 'myaudio', 'ptt', 'ptv', 'sticker']
      if (mediaTypes.includes(messageType)) return true
      if (msg && msg.fileURL) return true
      if (msg && msg.message) {
        if (
          msg.message.imageMessage ||
          msg.message.documentMessage ||
          msg.message.audioMessage ||
          msg.message.videoMessage ||
          msg.message.stickerMessage
        ) {
          return true
        }
      }
      return false
    }

    function extractMessageText(msg) {
      if (!msg) return ''
      if (msg.text) return msg.text
      if (msg.body) return msg.body
      if (msg.message) {
        if (msg.message.conversation) return msg.message.conversation
        if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text)
          return msg.message.extendedTextMessage.text
        if (msg.message.imageMessage && msg.message.imageMessage.caption)
          return msg.message.imageMessage.caption
        if (msg.message.videoMessage && msg.message.videoMessage.caption)
          return msg.message.videoMessage.caption
        if (msg.message.documentMessage && msg.message.documentMessage.caption)
          return msg.message.documentMessage.caption
      }
      if (msg.content) {
        if (msg.content.text) return msg.content.text
        if (msg.content.caption) return msg.content.caption
      }
      return ''
    }

    function downloadMediaIfNeeded(baseUrl, token, messageId, messageType) {
      try {
        const isAudio =
          messageType === 'audio' || messageType === 'myaudio' || messageType === 'ptt'
        const body = {
          id: messageId,
          return_link: true,
          return_base64: false,
          generate_mp3: true,
          download_quoted: false,
          transcribe: isAudio,
        }
        const res = $http.send({
          url: `${baseUrl}/message/download`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: token,
          },
          body: JSON.stringify(body),
          timeout: 30,
        })
        if (res.statusCode !== 200) {
          return { media_error: 'API returned status ' + res.statusCode }
        }
        const data = res.json || {}
        const responseData = data.data || data
        return {
          fileURL: responseData.fileURL || responseData.file_url || responseData.url,
          mimetype: responseData.mimetype,
          transcription: responseData.transcription || responseData.text || '',
        }
      } catch (err) {
        return { media_error: err.message || String(err) }
      }
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

      let totalChats = 0
      let totalMessagesSaved = 0
      let totalDuplicates = 0
      let historyRequested = 0

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

      const chats = chatsRes.json?.chats || []
      totalChats = chats.length

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
            historyRequested++
          } catch (_) {}
        }
        console.log('totalChats:', totalChats, 'historyRequested:', historyRequested)
        return e.json(200, {
          ok: true,
          message:
            'Histórico solicitado. As mensagens chegarão via webhook ou ficarão disponíveis em nova sincronização.',
        })
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

            if (msgsRes.statusCode === 200 && msgsRes.json?.messages) {
              const msgs = msgsRes.json.messages
              for (const msg of msgs) {
                const messageId = msg.id || (msg.key && msg.key.id) || msg.messageid
                if (!messageId) continue

                try {
                  $app.findFirstRecordByData('whatsapp_messages', 'message_id', messageId)
                  totalDuplicates++
                  continue
                } catch (_) {}

                const phone = chatId.split('@')[0]
                let fromMe = msg.fromMe || (msg.key && msg.key.fromMe) || msg.wa_isFromMe || false
                let timestamp =
                  msg.timestamp ||
                  msg.messageTimestamp ||
                  msg.wa_timestamp ||
                  Math.floor(Date.now() / 1000)
                let msgType = msg.messageType || msg.wa_type || msg.type || 'text'
                let extractedText = extractMessageText(msg)
                let msgBody = extractedText || `[${msgType}]`

                let mediaUrl = ''
                let mediaMimetype = ''
                let mediaTranscription = ''
                let mediaError = ''
                let mediaType = ''

                if (isMediaMessage(msg, msgType)) {
                  mediaType = msgType
                  const mediaData = downloadMediaIfNeeded(baseUrl, token, messageId, msgType)
                  if (mediaData.fileURL) {
                    mediaUrl = mediaData.fileURL
                    mediaMimetype = mediaData.mimetype || ''
                    mediaTranscription = mediaData.transcription || ''
                  } else if (mediaData.media_error) {
                    mediaError = mediaData.media_error
                  }
                }

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

                if (mediaUrl) record.set('media_url', mediaUrl)
                if (mediaMimetype) record.set('media_mimetype', mediaMimetype)
                if (mediaTranscription) record.set('media_transcription', mediaTranscription)
                if (mediaError) record.set('media_error', mediaError)
                if (mediaType) record.set('media_type', mediaType)

                $app.save(record)

                totalMessagesSaved++
              }

              hasMore = msgsRes.json.hasMore === true
              if (msgsRes.json.nextOffset !== undefined) {
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

        console.log(
          'totalChats:',
          totalChats,
          'totalMessagesSaved:',
          totalMessagesSaved,
          'totalDuplicates:',
          totalDuplicates,
        )

        return e.json(200, { ok: true, message: 'Sync completed' })
      }
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireAuth(),
)
