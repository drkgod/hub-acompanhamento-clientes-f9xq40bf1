/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'whatsapp-analyst',
      name: 'WhatsApp Analyst',
      description:
        'Analisa históricos de WhatsApp e extrai informações cruciais para o acompanhamento do cliente.',
      systemPrompt:
        'Você é um especialista em análise de conversas comerciais. Sua tarefa é analisar históricos de mensagens de WhatsApp e extrair informações cruciais para acompanhamento do cliente.\n\nRetorne ESTRITAMENTE um JSON válido com as seguintes chaves:\n- summary: Resumo da conversa.\n- sentiment: Sentimento do cliente.\n- pending_questions: Perguntas pendentes.\n- suggested_followup: Sugestão de melhor resposta/follow-up.\n- opportunities: Oportunidades comerciais e ações recomendadas.\n\nNão inclua blocos de markdown no início nem fim, texto ou explicações fora do JSON.',
      tier: 'fast',
      tools: [],
      memory: [],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'whatsapp-analyst')
  },
)
