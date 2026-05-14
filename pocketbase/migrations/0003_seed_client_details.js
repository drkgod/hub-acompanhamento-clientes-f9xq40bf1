migrate(
  (app) => {
    let userId
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'rodrigo@adapta.org')
      userId = admin.id
    } catch (_) {
      return
    }

    let clientId
    try {
      const client = app.findFirstRecordByFilter('clients', `user_id = '${userId}'`)
      clientId = client.id
    } catch (_) {
      return
    }

    const existing = app.findRecordsByFilter('meetings', `client_id = '${clientId}'`, '', 1, 0)
    if (existing.length > 0) return

    const meetingsCol = app.findCollectionByNameOrId('meetings')
    const transcriptsCol = app.findCollectionByNameOrId('transcripts')
    const goalsCol = app.findCollectionByNameOrId('goals')
    const improvementsCol = app.findCollectionByNameOrId('improvement_points')
    const roadmapCol = app.findCollectionByNameOrId('roadmap_items')

    const m1 = new Record(meetingsCol)
    m1.set('client_id', clientId)
    m1.set('titulo', 'Alinhamento Estratégico')
    m1.set('data', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
    m1.set('duracao_minutos', 60)
    m1.set('plataforma', 'Google Meet')
    m1.set('status', 'realizada')
    m1.set('user_id', userId)
    app.save(m1)

    const t1 = new Record(transcriptsCol)
    t1.set('meeting_id', m1.id)
    t1.set('client_id', clientId)
    t1.set(
      'texto_original',
      'O cliente manifestou preocupação com a queda de produtividade da equipe comercial. Acordamos revisar o modelo de incentivos.',
    )
    t1.set('resumo', 'Foco principal na reestruturação dos incentivos de vendas.')
    t1.set('sentimento', 'neutro')
    t1.set('user_id', userId)
    app.save(t1)

    const g1 = new Record(goalsCol)
    g1.set('client_id', clientId)
    g1.set('meeting_id', m1.id)
    g1.set('descricao', 'Revisar estrutura de bônus comercial')
    g1.set('status', 'em_andamento')
    g1.set('prioridade', 'alta')
    g1.set('prazo', new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString())
    g1.set('progresso', 40)
    g1.set('user_id', userId)
    app.save(g1)

    const i1 = new Record(improvementsCol)
    i1.set('client_id', clientId)
    i1.set('meeting_id', m1.id)
    i1.set('descricao', 'Comunicação falha sobre metas trimestrais')
    i1.set('categoria', 'Comunicação')
    i1.set('gravidade', 'media')
    i1.set('status', 'em_tratamento')
    i1.set('user_id', userId)
    app.save(i1)

    const r1 = new Record(roadmapCol)
    r1.set('client_id', clientId)
    r1.set('descricao', 'Onboarding de Consultoria')
    r1.set('status', 'concluido')
    r1.set('ordem', 1)
    r1.set('user_id', userId)
    app.save(r1)

    const r2 = new Record(roadmapCol)
    r2.set('client_id', clientId)
    r2.set('descricao', 'Diagnóstico Operacional')
    r2.set('status', 'em_andamento')
    r2.set('ordem', 2)
    r2.set('user_id', userId)
    app.save(r2)
  },
  (app) => {
    // Safe to leave empty, dev seed
  },
)
