if (typeof module !== 'undefined') {
  module.exports = {
    isMediaMessage: function (msg, messageType) {
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
    },

    extractMessageText: function (msg) {
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
    },

    extractFilename: function (msg) {
      if (!msg) return ''
      if (msg.fileName) return msg.fileName
      if (msg.message && msg.message.documentMessage && msg.message.documentMessage.fileName)
        return msg.message.documentMessage.fileName
      return ''
    },

    downloadMediaIfNeeded: function (baseUrl, token, messageId, messageType) {
      try {
        const isAudio =
          messageType === 'audio' || messageType === 'myaudio' || messageType === 'ptt'

        const body = {
          id: messageId,
          return_link: true,
          return_base64: false,
          generate_mp3: isAudio,
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
          timeout: 45,
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
    },
  }
}
