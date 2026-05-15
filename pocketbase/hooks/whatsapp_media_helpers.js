// This module provides helper functions for WhatsApp media processing.
// Skip Cloud hooks execute in isolated VMs. If you need these helpers inside routerAdd or onRecord callbacks,
// you must duplicate them inline in those files as per the VM isolation rules,
// or export them as a module if your bundler or environment is configured to support require('./local').

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

    downloadMediaIfNeeded: function (baseUrl, token, messageId, messageType) {
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
    },
  }
}
