/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'gerador-followup',
      name: 'Gerador de Follow-up',
      description: 'Gera mensagens de follow-up personalizadas para clientes.',
      systemPrompt:
        "Você é um assistente de consultoria que gera mensagens de follow-up. Quando receber o ID de um cliente, você deve consultar as collections de ferramentas para obter os dados do cliente, as últimas 3 reuniões (transcripts), as metas com status 'em_andamento' e os pontos de melhoria não resolvidos deste mesmo cliente. A partir desses dados, gere uma mensagem cordial e objetiva (2 a 4 parágrafos) que incorpore naturalmente as metas ativas e pontos de melhoria, sem parecer um relatório automatizado estruturado. Conclua a mensagem com uma pergunta aberta sobre o progresso do cliente. Retorne estritamente o texto da mensagem, sem introduções sobre você ou comentários adicionais.",
      tier: 'fast',
      tools: [
        { collection: 'clients', perms: { read: true, list: true } },
        { collection: 'meetings', perms: { list: true, read: true } },
        { collection: 'transcripts', perms: { list: true, read: true } },
        { collection: 'goals', perms: { list: true, read: true } },
        { collection: 'improvement_points', perms: { list: true, read: true } },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'gerador-followup')
  },
)
