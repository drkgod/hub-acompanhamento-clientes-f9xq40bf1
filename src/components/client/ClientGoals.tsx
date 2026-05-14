import { Goal } from '@/types'
import { Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, string> = {
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-200',
  concluida: 'bg-green-100 text-green-800 border-green-200',
  atrasada: 'bg-red-100 text-red-800 border-red-200',
}

const priorityColors: Record<string, string> = {
  alta: 'bg-red-50 text-red-700 border-red-200',
  media: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  baixa: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function ClientGoals({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed mt-2">
        <Target className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium">Nenhuma meta definida</p>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-2">
      {goals.map((g) => (
        <div
          key={g.id}
          className="p-4 border border-slate-200/60 rounded-xl bg-white space-y-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h4 className="font-semibold text-slate-800 text-sm leading-snug">{g.descricao}</h4>
            <div className="flex gap-2 shrink-0">
              <Badge
                variant="outline"
                className={priorityColors[g.prioridade] || priorityColors.baixa}
              >
                {g.prioridade.toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className={statusColors[g.status] || statusColors.em_andamento}
              >
                {g.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Progresso Atual</span>
              <span>{g.progresso}%</span>
            </div>
            <Progress value={g.progresso} className="h-2.5 bg-slate-100" />
          </div>

          {g.prazo && (
            <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="font-medium">Prazo estimado:</span>
              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {new Date(g.prazo).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
