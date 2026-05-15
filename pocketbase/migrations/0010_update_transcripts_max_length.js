migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transcripts')
    const field = col.fields.getByName('texto_original')
    if (field) {
      field.max = 20000
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transcripts')
    const field = col.fields.getByName('texto_original')
    if (field) {
      field.max = 5000
      app.save(col)
    }
  },
)
