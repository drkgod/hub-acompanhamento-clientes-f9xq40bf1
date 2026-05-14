onRecordAfterCreateSuccess((e) => {
  const resumo = e.record.getString('resumo')
  const texto = e.record.getString('texto_original')

  if (resumo || !texto) return e.next()

  try {
    const userId = e.record.getString('user_id')
    const clientId = e.record.getString('client_id')
    const meetingId = e.record.getString('meeting_id')

    const client = $app.findRecordById('clients', clientId)
    const meeting = $app.findRecordById('meetings', meetingId)
    const nowStr = new Date().toISOString().replace('T', ' ')

    const prompt = `Nova transcrição inserida! Por favor, processe-a imediatamente.

DADOS DE CONTEXTO:
- ID Transcrição: ${e.record.id}
- ID Reunião: ${meetingId}
- ID Cliente: ${clientId}
- Nome do Cliente: ${client.getString('nome')}
- Data da Reunião: ${meeting.getString('data') || 'N/A'}
- Seu ID de usuário (user_id): ${userId}
- Data/Hora Atual: ${nowStr}

TEXTO DA TRANSCRIÇÃO:
"""
${texto}
"""

Por favor, execute as chamadas de ferramentas de acordo com o seu System Prompt usando os dados de contexto acima.`

    $ai.agent('meeting-processor').chat({
      user_id: userId,
      message: prompt,
    })
  } catch (err) {
    $app
      .logger()
      .error(
        'Erro ao processar transcrição via agent',
        'error',
        err.message,
        'transcript_id',
        e.record.id,
      )
  }

  return e.next()
}, 'transcripts')
