/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_messages')

    if (!col.fields.getByName('media_url')) {
      col.fields.add(new TextField({ name: 'media_url' }))
    }
    if (!col.fields.getByName('media_mimetype')) {
      col.fields.add(new TextField({ name: 'media_mimetype' }))
    }
    if (!col.fields.getByName('media_type')) {
      col.fields.add(new TextField({ name: 'media_type' }))
    }
    if (!col.fields.getByName('media_filename')) {
      col.fields.add(new TextField({ name: 'media_filename' }))
    }
    if (!col.fields.getByName('media_transcription')) {
      col.fields.add(new TextField({ name: 'media_transcription', max: 20000 }))
    }
    if (!col.fields.getByName('media_downloaded_at')) {
      col.fields.add(new DateField({ name: 'media_downloaded_at' }))
    }
    if (!col.fields.getByName('media_error')) {
      col.fields.add(new TextField({ name: 'media_error' }))
    }
    if (!col.fields.getByName('media_caption')) {
      col.fields.add(new TextField({ name: 'media_caption', max: 5000 }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_messages')

    col.fields.removeByName('media_url')
    col.fields.removeByName('media_mimetype')
    col.fields.removeByName('media_type')
    col.fields.removeByName('media_filename')
    col.fields.removeByName('media_transcription')
    col.fields.removeByName('media_downloaded_at')
    col.fields.removeByName('media_error')
    col.fields.removeByName('media_caption')

    app.save(col)
  },
)
