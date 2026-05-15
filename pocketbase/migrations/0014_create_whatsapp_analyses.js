migrate(
  (app) => {
    const clientsCol = app.findCollectionByNameOrId('clients')

    const collection = new Collection({
      name: 'whatsapp_analyses',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'client_id',
          type: 'relation',
          required: false,
          collectionId: clientsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'chat_id', type: 'text', required: true },
        { name: 'summary', type: 'text' },
        { name: 'sentiment', type: 'text' },
        { name: 'pending_questions', type: 'text' },
        { name: 'suggested_followup', type: 'text' },
        { name: 'opportunities', type: 'text' },
        { name: 'last_message_timestamp', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_wa_analyses_chat_user ON whatsapp_analyses (chat_id, user_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('whatsapp_analyses')
    app.delete(collection)
  },
)
