import { useState, useEffect } from 'react'
import { Users, Calendar, Target, AlertTriangle, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export function SummaryCards() {
  const [stats, setStats] = useState<{
    total: number
    meetings: number
    goals: number
    critical: number
  } | null>(null)
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setError(false)
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().replace('T', ' ')
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        .toISOString()
        .replace('T', ' ')

      const [c, m, g, cr] = await Promise.all([
        pb.collection('clients').getList(1, 1),
        pb
          .collection('meetings')
          .getList(1, 1, { filter: `data >= "${start}" && data <= "${end}"` }),
        pb.collection('goals').getList(1, 1, { filter: `status = "em_andamento"` }),
        pb.collection('clients').getList(1, 1, { filter: `status_inatividade = "critico"` }),
      ])
      setStats({
        total: c.totalItems,
        meetings: m.totalItems,
        goals: g.totalItems,
        critical: cr.totalItems,
      })
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
        <p className="text-red-600 mb-4 font-medium">Erro ao carregar métricas</p>
        <Button onClick={load} variant="outline" className="bg-white">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total de Clientes</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.total}</h3>
          </div>
          <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Reuniões este Mês</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.meetings}</h3>
          </div>
          <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Calendar className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Metas em Andamento</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stats.goals}</h3>
          </div>
          <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <Target className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 border-b-4 border-b-red-500">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Clientes Críticos</p>
            <h3 className="text-3xl font-bold text-red-600 tracking-tight">{stats.critical}</h3>
          </div>
          <div className="h-12 w-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
