migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'rodrigo@adapta.org')
    } catch (_) {
      user = new Record(users)
      user.setEmail('rodrigo@adapta.org')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Rodrigo Adapta')
      app.save(user)
    }

    const userId = user.id
    const stagesCol = app.findCollectionByNameOrId('pipeline_stages')

    const defaultStages = [
      { nome: 'Leads', ordem: 1, cor: 'gray' },
      { nome: 'Em Atendimento', ordem: 2, cor: 'blue' },
      { nome: 'Pos Reuniao', ordem: 3, cor: 'yellow' },
      { nome: 'Acompanhamento', ordem: 4, cor: 'orange' },
      { nome: 'Encerrados', ordem: 5, cor: 'green' },
    ]

    const stageIds = []
    for (const s of defaultStages) {
      let rec
      try {
        rec = app.findFirstRecordByFilter(
          'pipeline_stages',
          `nome = '${s.nome}' && user_id = '${userId}'`,
        )
      } catch (_) {
        rec = new Record(stagesCol)
        rec.set('nome', s.nome)
        rec.set('ordem', s.ordem)
        rec.set('cor', s.cor)
        rec.set('user_id', userId)
        app.save(rec)
      }
      stageIds.push(rec.id)
    }

    const clientsCol = app.findCollectionByNameOrId('clients')
    const demoClients = [
      { nome: 'Ana Silva', empresa: 'Tech Solutions', estagio_idx: 0, days: 2 },
      { nome: 'Bruno Santos', empresa: 'Inova Corp', estagio_idx: 0, days: 10 },
      { nome: 'Carla Mendes', empresa: 'Logistica BR', estagio_idx: 1, days: 20 },
      { nome: 'Daniel Costa', empresa: 'Agro Tech', estagio_idx: 1, days: 45 },
      { nome: 'Eduardo Lima', empresa: 'Educa Mais', estagio_idx: 2, days: 5 },
      { nome: 'Fernanda Alves', empresa: 'Saúde Pro', estagio_idx: 3, days: 12 },
      { nome: 'Gustavo Rocha', empresa: 'Finanças X', estagio_idx: 3, days: 25 },
      { nome: 'Helena Martins', empresa: 'Varejo Y', estagio_idx: 4, days: 2 },
      { nome: 'Igor Dias', empresa: 'Construções Z', estagio_idx: 0, days: 8 },
      { nome: 'Julia Ferreira', empresa: 'Moda Online', estagio_idx: 2, days: 35 },
      { nome: 'Lucas Gomes', empresa: 'Imóveis BR', estagio_idx: 1, days: 4 },
      { nome: 'Mariana Castro', empresa: 'Seguros W', estagio_idx: 4, days: 15 },
    ]

    for (const c of demoClients) {
      try {
        app.findFirstRecordByFilter('clients', `nome = '${c.nome}' && user_id = '${userId}'`)
      } catch (_) {
        const rec = new Record(clientsCol)
        rec.set('nome', c.nome)
        rec.set('empresa', c.empresa)
        rec.set('estagio_id', stageIds[c.estagio_idx])

        const d = new Date()
        d.setDate(d.getDate() - c.days)
        const iso = d.toISOString().replace('T', ' ')
        rec.set('ultimo_contato', iso)
        rec.set('user_id', userId)
        rec.set('status_inatividade', 'verde')
        rec.set('dias_sem_contato', c.days)
        app.save(rec)
      }
    }
  },
  (app) => {},
)
