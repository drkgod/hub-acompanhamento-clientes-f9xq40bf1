migrate(
  (app) => {
    const instances = new Collection({
      name: 'whatsapp_instances',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: 'user_id = @request.auth.id',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'instance_name', type: 'text' },
        { name: 'base_url', type: 'text' },
        { name: 'api_token', type: 'text' },
        { name: 'connection_status', type: 'text' },
        { name: 'webhook_configured', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_whatsapp_instances_user ON whatsapp_instances (user_id)'],
    })
    app.save(instances)

    const clientsId = app.findCollectionByNameOrId('clients').id

    const messages = new Collection({
      name: 'whatsapp_messages',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: 'user_id = @request.auth.id',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      fields: [
        { name: 'client_id', type: 'relation', collectionId: clientsId, maxSelect: 1 },
        { name: 'phone', type: 'text' },
        { name: 'body', type: 'text', max: 10000 },
        { name: 'timestamp', type: 'number' },
        { name: 'from_me', type: 'bool' },
        { name: 'type', type: 'text' },
        { name: 'message_id', type: 'text' },
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
      indexes: [
        'CREATE UNIQUE INDEX idx_whatsapp_messages_id ON whatsapp_messages (message_id)',
        'CREATE INDEX idx_whatsapp_messages_client ON whatsapp_messages (client_id)',
        'CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages (timestamp DESC)',
      ],
    })
    app.save(messages)
  },
  (app) => {
    try {
      const instances = app.findCollectionByNameOrId('whatsapp_instances')
      app.delete(instances)
    } catch (_) {}
    try {
      const messages = app.findCollectionByNameOrId('whatsapp_messages')
      app.delete(messages)
    } catch (_) {}
  },
)
