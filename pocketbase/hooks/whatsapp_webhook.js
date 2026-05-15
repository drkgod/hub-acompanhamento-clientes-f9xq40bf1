routerAdd('POST', '/backend/v1/whatsapp-webhook', (e) => {
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
      const isAudio = messageType === 'audio' || messageType === 'myaudio' || messageType === 'ptt'
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

        let extractedText = extractMessageText(msg)
        msgBody = extractedText || `[${msgType}]`

        let mediaUrl = ''
        let mediaMimetype = ''
        let mediaTranscription = ''
        let mediaError = ''
        let mediaType = ''

        if (isMediaMessage(msg, msgType)) {
          mediaType = msgType
          const instanceBaseUrl = instance.getString('base_url')
          const mediaData = downloadMediaIfNeeded(
            instanceBaseUrl,
            instanceToken,
            messageId,
            msgType,
          )
          if (mediaData.fileURL) {
            mediaUrl = mediaData.fileURL
            mediaMimetype = mediaData.mimetype || ''
            mediaTranscription = mediaData.transcription || ''
          } else if (mediaData.media_error) {
            mediaError = mediaData.media_error
          }
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

          if (mediaUrl) record.set('media_url', mediaUrl)
          if (mediaMimetype) record.set('media_mimetype', mediaMimetype)
          if (mediaTranscription) record.set('media_transcription', mediaTranscription)
          if (mediaError) record.set('media_error', mediaError)
          if (mediaType) record.set('media_type', mediaType)

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
