routerAdd(
  'POST',
  '/backend/v1/clients/{id}/followup',
  (e) => {
    const id = e.request.pathValue('id')
    const userId = e.auth?.id

    if (!userId) {
      return e.unauthorizedError('auth required')
    }

    try {
      const exercises = $app.findRecordsByFilter(
        'exercises_library',
        `user_id = '${userId}'`,
        '-created',
        100,
        0,
      )

      const transcripts = $app.findRecordsByFilter(
        'transcripts',
        `client_id = '${id}'`,
        '-created',
        3,
        0,
      )

      let promptMsg = `Gere a mensagem de follow-up para o cliente de ID: ${id}.`

      if (transcripts.length > 0) {
        let transcriptsContext = transcripts.map((t) => `- ${t.getString('resumo')}`).join('\n')
        promptMsg += `\n\nHistórico das últimas reuniões (use para personalizar a mensagem):\n${transcriptsContext}`
      }

      if (exercises.length > 0) {
        let exercisesContext = exercises
          .map((ex) => `Título: ${ex.getString('titulo')}\nDescrição: ${ex.getString('descricao')}`)
          .join('\n\n')
        promptMsg += `\n\nIMPORTANTE: No final da mensagem, adicione uma seção chamada "*Sugestões de Exercícios*". Selecione 2 ou 3 exercícios relevantes da biblioteca abaixo, baseando-se no histórico do cliente. Liste com o Título em negrito e uma breve descrição.\n\nBiblioteca:\n${exercisesContext}`
      }

      const result = $ai.agent('gerador-followup').chat({
        user_id: userId,
        message: promptMsg,
      })

      return e.json(200, { content: result.content })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'AI temporarily unavailable' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'agent request failed' : err.message })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, { error: status >= 500 ? 'AI temporarily unavailable' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
