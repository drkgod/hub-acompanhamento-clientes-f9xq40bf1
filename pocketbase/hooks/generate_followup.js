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
      const result = $ai.agent('gerador-followup').chat({
        user_id: userId,
        message: `Gere a mensagem de follow-up para o cliente de ID: ${id}. Busque as informações estritamente para este cliente (3 últimas reuniões, metas em andamento e pontos de melhoria não resolvidos) e redija de 2 a 4 parágrafos.`,
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
