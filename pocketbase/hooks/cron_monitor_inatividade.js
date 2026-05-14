cronAdd('monitor_inatividade', '0 0 * * *', () => {
  const clients = $app.findRecordsByFilter('clients', '1=1', '', 0, 0)
  const now = new Date()

  for (const client of clients) {
    const ucStr = client.getString('ultimo_contato')
    const createdStr = client.getString('created')
    const dateToUse = ucStr ? new Date(ucStr) : new Date(createdStr)

    // Calculate difference in days
    const diffTime = now.getTime() - dateToUse.getTime()
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

    let status = 'verde'
    if (diffDays >= 7 && diffDays <= 14) status = 'amarelo'
    else if (diffDays >= 15 && diffDays <= 30) status = 'vermelho'
    else if (diffDays > 30) status = 'critico'

    const oldStatus = client.getString('status_inatividade')
    const oldDays = client.getInt('dias_sem_contato')

    if (oldDays !== diffDays || oldStatus !== status) {
      client.set('dias_sem_contato', diffDays)
      client.set('status_inatividade', status)
      $app.save(client)

      const userId = client.getString('user_id')

      // Notifications logic
      if (status === 'vermelho' && oldStatus !== 'vermelho') {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('client_id', client.id)
        notif.set('tipo', 'inatividade')
        notif.set('titulo', 'Cliente com inatividade alta')
        notif.set('mensagem', `${client.getString('nome')} está há ${diffDays} dias sem contato.`)
        notif.set('lida', false)
        notif.set('user_id', userId)
        $app.save(notif)
      } else if (status === 'critico' && oldStatus !== 'critico') {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('client_id', client.id)
        notif.set('tipo', 'inatividade_critica')
        notif.set('titulo', 'Alerta crítico de inatividade')
        notif.set(
          'mensagem',
          `${client.getString('nome')} está há ${diffDays} dias sem contato. Ação imediata recomendada.`,
        )
        notif.set('lida', false)
        notif.set('user_id', userId)
        $app.save(notif)
      }
    }
  }
})
