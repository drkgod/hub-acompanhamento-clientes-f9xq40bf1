import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw, Video, ArrowRightLeft, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Activity {
  id: string
  type: 'meeting' | 'client' | 'goal'
  date: Date
  text: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setError(false)
      const [meetings, clients, goals] = await Promise.all([
        pb
          .collection('meetings')
          .getList(1, 5, {
            filter: `status = "processada"`,
            sort: '-updated',
            expand: 'client_id',
          }),
        pb.collection('clients').getList(1, 5, { sort: '-updated', expand: 'estagio_id' }),
        pb
          .collection('goals')
          .getList(1, 5, { filter: `status = "concluida"`, sort: '-updated', expand: 'client_id' }),
      ])

      const items: Activity[] = []
      meetings.items.forEach((m) => {
        items.push({
          id: m.id,
          type: 'meeting',
          date: new Date(m.updated),
          text: `Reunião com ${m.expand?.client_id?.nome || 'Cliente'} processada`,
        })
      })
      clients.items.forEach((c) => {
        items.push({
          id: c.id + '_c',
          type: 'client',
          date: new Date(c.updated),
          text: `${c.nome} movido para ${c.expand?.estagio_id?.nome || 'novo estágio'}`,
        })
      })
      goals.items.forEach((g) => {
        items.push({
          id: g.id,
          type: 'goal',
          date: new Date(g.updated),
          text: `Meta concluída para ${g.expand?.client_id?.nome || 'Cliente'}`,
        })
      })

      items.sort((a, b) => b.date.getTime() - a.date.getTime())
      setActivities(items.slice(0, 5))
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card className="shadow-sm border-slate-200 h-full">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-10 text-red-500">
            <p className="mb-4">Erro ao carregar feed.</p>
            <Button onClick={load} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : !activities ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-slate-500">Nenhuma atividade recente.</div>
        ) : (
          <div className="space-y-6">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-4">
                <div
                  className={`mt-0.5 shrink-0 h-10 w-10 rounded-full flex items-center justify-center
                  ${act.type === 'meeting' ? 'bg-indigo-100 text-indigo-600' : act.type === 'goal' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}
                >
                  {act.type === 'meeting' && <Video className="h-5 w-5" />}
                  {act.type === 'client' && <ArrowRightLeft className="h-5 w-5" />}
                  {act.type === 'goal' && <CheckCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-slate-800">{act.text}</p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(act.date, { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
