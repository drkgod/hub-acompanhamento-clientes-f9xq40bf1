import { ImprovementPoint } from '@/types'
import { TrendingUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const severityColors: Record<string, string> = {
  critica: 'bg-red-500 text-white border-red-600',
  alta: 'bg-orange-500 text-white border-orange-600',
  media: 'bg-amber-400 text-white border-amber-500',
  baixa: 'bg-emerald-500 text-white border-emerald-600',
}

const statusColors: Record<string, string> = {
  identificado: 'bg-slate-100 text-slate-700 border-slate-200',
  em_tratamento: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  resolvido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function ClientImprovementPoints({ points }: { points: ImprovementPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed mt-2">
        <TrendingUp className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium">Nenhum ponto de melhoria registrado</p>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Ponto
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {points.map((p) => (
        <div
          key={p.id}
          className="p-4 border border-slate-200/60 rounded-xl bg-white space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <h4 className="font-semibold text-slate-800 text-sm leading-snug">{p.descricao}</h4>

          <div className="flex flex-wrap gap-2 text-xs pt-2 border-t border-slate-100">
            <span className="bg-slate-50 border px-2 py-0.5 rounded-md font-medium text-slate-600">
              {p.categoria}
            </span>
            <Badge
              variant="outline"
              className={severityColors[p.gravidade] || severityColors.baixa}
            >
              {p.gravidade.toUpperCase()}
            </Badge>
            <Badge
              variant="outline"
              className={statusColors[p.status] || statusColors.identificado}
            >
              {p.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
