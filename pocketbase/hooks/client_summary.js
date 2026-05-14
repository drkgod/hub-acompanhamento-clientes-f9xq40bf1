routerAdd(
  'GET',
  '/backend/v1/clients/{id}/summary',
  (e) => {
    try {
      const clientId = e.request.pathValue('id')
      const authId = e.auth?.id
      if (!authId) return e.unauthorizedError('auth required')

      try {
        $app.findFirstRecordByFilter('clients', `id = '${clientId}' && user_id = '${authId}'`)
      } catch (_) {
        return e.notFoundError('Client not found')
      }

      const transcripts = $app.findRecordsByFilter(
        'transcripts',
        `client_id = '${clientId}' && user_id = '${authId}'`,
        '-created',
        3,
        0,
      )

      if (!transcripts || transcripts.length === 0) {
        return e.json(200, {
          summary: 'Nenhuma transcrição de reunião encontrada para gerar resumo.',
        })
      }

      let combinedText = ''
      for (const t of transcripts) {
        combinedText += `Data da Transcrição: ${t.getString('created')}\n`
        combinedText += `Resumo da Reunião: ${t.getString('resumo')}\n`
        combinedText += `Texto: ${t.getString('texto_original')}\n\n`
      }

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente de consultoria especialista em análise de clientes. Escreva um parágrafo único resumindo o status geral, os principais desafios e o histórico recente do cliente com base nas anotações das últimas reuniões fornecidas. Seja claro e objetivo. Responda em Português do Brasil.',
          },
          { role: 'user', content: 'Anotações das últimas reuniões:\n\n' + combinedText },
        ],
      })

      return e.json(200, { summary: reply.choices[0].message.content })
    } catch (err) {
      return e.json(503, { error: 'AI temporarily unavailable', details: err.message })
    }
  },
  $apis.requireAuth(),
)
