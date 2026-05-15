migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('whatsapp_instances')
    instances.fields.add(new DateField({ name: 'last_sync_at' }))
    app.save(instances)

    const messages = app.findCollectionByNameOrId('whatsapp_messages')
    messages.fields.add(new TextField({ name: 'chat_id' }))
    messages.fields.add(new JSONField({ name: 'raw_payload' }))
    app.save(messages)
  },
  (app) => {
    try {
      const instances = app.findCollectionByNameOrId('whatsapp_instances')
      instances.fields.removeByName('last_sync_at')
      app.save(instances)
    } catch (_) {}

    try {
      const messages = app.findCollectionByNameOrId('whatsapp_messages')
      messages.fields.removeByName('chat_id')
      messages.fields.removeByName('raw_payload')
      app.save(messages)
    } catch (_) {}
  },
)
