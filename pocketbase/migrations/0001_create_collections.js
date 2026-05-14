migrate(
  (app) => {
    const userRule = 'user_id = @request.auth.id'

    const stages = new Collection({
      name: 'pipeline_stages',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'ordem', type: 'number', required: true },
        { name: 'cor', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(stages)

    const clients = new Collection({
      name: 'clients',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'empresa', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'telefone', type: 'text' },
        {
          name: 'estagio_id',
          type: 'relation',
          required: true,
          collectionId: stages.id,
          maxSelect: 1,
        },
        { name: 'ultimo_contato', type: 'date' },
        { name: 'status_inatividade', type: 'text' },
        { name: 'dias_sem_contato', type: 'number' },
        { name: 'notas_gerais', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(clients)

    const meetings = new Collection({
      name: 'meetings',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'data', type: 'date' },
        { name: 'duracao_minutos', type: 'number' },
        { name: 'plataforma', type: 'text' },
        { name: 'status', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(meetings)

    const transcripts = new Collection({
      name: 'transcripts',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'meeting_id',
          type: 'relation',
          required: true,
          collectionId: meetings.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'texto_original', type: 'text' },
        { name: 'resumo', type: 'text' },
        { name: 'sentimento', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(transcripts)

    const goals = new Collection({
      name: 'goals',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'meeting_id',
          type: 'relation',
          required: true,
          collectionId: meetings.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'prioridade', type: 'text' },
        { name: 'prazo', type: 'date' },
        { name: 'progresso', type: 'number' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(goals)

    const points = new Collection({
      name: 'improvement_points',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'meeting_id',
          type: 'relation',
          required: true,
          collectionId: meetings.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'categoria', type: 'text' },
        { name: 'gravidade', type: 'text' },
        { name: 'status', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(points)

    const exercises = new Collection({
      name: 'exercises_library',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        { name: 'titulo', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'categoria', type: 'text' },
        { name: 'duracao_estimada_minutos', type: 'number' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(exercises)

    const roadmap = new Collection({
      name: 'roadmap_items',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'ordem', type: 'number' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(roadmap)

    const msgs = new Collection({
      name: 'ready_messages',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        { name: 'titulo', type: 'text' },
        { name: 'texto', type: 'text' },
        { name: 'categoria', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(msgs)

    const notes = new Collection({
      name: 'client_notes',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: true,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'texto', type: 'text' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notes)

    const notifications = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: userRule,
      updateRule: userRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'client_id',
          type: 'relation',
          required: false,
          collectionId: clients.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'tipo', type: 'text' },
        { name: 'titulo', type: 'text' },
        { name: 'mensagem', type: 'text' },
        { name: 'lida', type: 'bool' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notifications)
  },
  (app) => {
    const lists = [
      'notifications',
      'client_notes',
      'ready_messages',
      'roadmap_items',
      'exercises_library',
      'improvement_points',
      'goals',
      'transcripts',
      'meetings',
      'clients',
      'pipeline_stages',
    ]
    for (const n of lists) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (_) {}
    }
  },
)
