cronAdd('generate_daily_digests', '0 8 * * *', () => {
  const users = $app.findRecordsByFilter('users', '', '', 1000, 0)

  for (const u of users) {
    const userId = u.id
    try {
      const clients = $app.findRecordsByFilter('clients', `user_id = '${userId}'`, '', 1000, 0)
      const goals = $app.findRecordsByFilter(
        'goals',
        `user_id = '${userId}' && status = 'em_andamento'`,
        '',
        1000,
        0,
      )
      const points = $app.findRecordsByFilter(
        'improvement_points',
        `user_id = '${userId}'`,
        '',
        1000,
        0,
      )
      const meetings = $app.findRecordsByFilter(
        'meetings',
        `user_id = '${userId}'`,
        '-data',
        1000,
        0,
      )
      const stages = $app.findRecordsByFilter(
        'pipeline_stages',
        `user_id = '${userId}'`,
        'ordem',
        1000,
        0,
      )

      if (clients.length === 0) continue // Skip if user has no clients

      const today = new Date().toISOString().split('T')[0]

      let clientStats = {}
      for (const c of clients) {
        clientStats[c.id] = {
          nome: c.getString('nome'),
          status_inatividade: c.getString('status_inatividade'),
          dias_sem_contato: c.getInt('dias_sem_contato'),
          estagio_id: c.getString('estagio_id'),
          overdueGoals: 0,
          activeGoals: 0,
          unresolvedPoints: 0,
          criticalPoints: 0,
          score: 0,
          lastMeeting: null,
        }
      }

      for (const g of goals) {
        const cid = g.getString('client_id')
        if (!clientStats[cid]) continue
        clientStats[cid].activeGoals++
        const prazo = g.getString('prazo')
        if (prazo && prazo < today) {
          clientStats[cid].overdueGoals++
          clientStats[cid].score += 3
        }
      }

      for (const p of points) {
        if (p.getString('status') === 'resolvido') continue
        const cid = p.getString('client_id')
        if (!clientStats[cid]) continue
        clientStats[cid].unresolvedPoints++
        const grav = p.getString('gravidade')
        if (grav === 'critica' || grav === 'alto') {
          clientStats[cid].criticalPoints++
          clientStats[cid].score += 2
        }
      }

      for (const c of clients) {
        const cid = c.id
        const status = clientStats[cid].status_inatividade
        if (status === 'critico') clientStats[cid].score += 5
        if (status === 'vermelho') clientStats[cid].score += 3
      }

      for (const m of meetings) {
        const cid = m.getString('client_id')
        if (clientStats[cid] && !clientStats[cid].lastMeeting) {
          clientStats[cid].lastMeeting = {
            data: m.getString('data').split(' ')[0],
            titulo: m.getString('titulo'),
          }
        }
      }

      const clientList = Object.values(clientStats)
      clientList.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return b.dias_sem_contato - a.dias_sem_contato
      })

      const top3 = clientList.slice(0, 3)

      const payload = {
        total_clients: clients.length,
        top_3_immediate_action: top3,
        pipeline_stages: stages.map((s) => ({ id: s.id, nome: s.getString('nome') })),
        all_clients: clientList.map((c) => ({
          nome: c.nome,
          estagio_id: c.estagio_id,
          status_inatividade: c.status_inatividade,
          overdueGoals: c.overdueGoals,
          score: c.score,
        })),
      }

      const result = $ai.agent('daily-digest').chat({
        user_id: userId,
        message:
          'Analise os dados JSON fornecidos e gere o relatório diário estritamente com as seções e regras solicitadas no seu system prompt. Dados: ' +
          JSON.stringify(payload),
      })

      const collection = $app.findCollectionByNameOrId('notifications')
      const record = new Record(collection)
      record.set('tipo', 'daily_digest')
      record.set('titulo', 'Resumo Diário da Carteira')
      record.set('mensagem', result.content)
      record.set('user_id', userId)
      $app.save(record)
    } catch (err) {
      $app.logger().error('Error generating digest for user ' + userId, 'err', err.message)
    }
  }
})
