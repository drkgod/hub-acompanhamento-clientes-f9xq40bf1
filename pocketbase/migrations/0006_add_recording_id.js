migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('meetings')
    col.fields.add(new TextField({ name: 'recording_id' }))
    app.save(col)

    // Remove duplicates before adding unique index
    app
      .db()
      .newQuery(`
    DELETE FROM meetings WHERE id NOT IN (
      SELECT MIN(id) FROM meetings GROUP BY recording_id
    ) AND recording_id IS NOT NULL AND recording_id != ''
  `)
      .execute()

    col.addIndex('idx_meetings_recording_id', true, 'recording_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('meetings')
    col.removeIndex('idx_meetings_recording_id')
    col.fields.removeByName('recording_id')
    app.save(col)
  },
)
