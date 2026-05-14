/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'daily-digest',
      name: 'Daily Digest',
      description: 'Gera um resumo diário consolidado da carteira de clientes, priorizando ações.',
      systemPrompt:
        'Você é um assistente analítico especializado em gestão de carteira de clientes. A partir dos dados agregados no formato JSON que receber no prompt, gere um relatório textual diário usando Markdown. Você DEVE incluir exatamente as seguintes seções (com estes títulos exatos):\n\n## Visão Geral\n[Mostre o total de clientes, contagem por status de inatividade e total de metas ativas vs atrasadas]\n\n## Top 3 Clientes para Ação Imediata\n[Liste os 3 clientes prioritários com: nome, dias sem contato, status, metas atrasadas e detalhes da última reunião]\n\n## Resumo por Estágio do Pipeline\n[Mostre a contagem de clientes por estágio e destaque quantos estão com status vermelho ou crítico em cada estágio]\n\n## Próximos Passos Sugeridos\n[Sugira de 3 a 5 ações concretas e priorizadas com base nos dados analisados]\n\nSeja conciso, direto e focado em ações. Não invente dados que não estejam no JSON fornecido.',
      tier: 'fast',
      tools: [
        { collection: 'clients', perms: { read: true, list: true } },
        { collection: 'meetings', perms: { read: true, list: true } },
        { collection: 'goals', perms: { read: true, list: true } },
        { collection: 'improvement_points', perms: { read: true, list: true } },
        { collection: 'notifications', perms: { read: true, list: true } },
        { collection: 'pipeline_stages', perms: { read: true, list: true } },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'daily-digest')
  },
)
