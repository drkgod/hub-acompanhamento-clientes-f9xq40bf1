import { RoadmapItem } from '@/types'
import { Map as MapIcon, CheckCircle2, Circle, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ClientRoadmap({ items }: { items: RoadmapItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
        <MapIcon className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium">Roadmap vazio</p>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Etapa
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pt-4">
      {items.map((item) => {
        const Icon =
          item.status === 'concluido'
            ? CheckCircle2
            : item.status === 'em_andamento'
              ? Clock
              : Circle
        const colorClass =
          item.status === 'concluido'
            ? 'text-emerald-500'
            : item.status === 'em_andamento'
              ? 'text-indigo-500'
              : 'text-slate-300'

        return (
          <div
            key={item.id}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-6 last:mb-0"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <Icon className={cn('h-5 w-5', colorClass)} />
            </div>
            <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Etapa {item.ordem}
                </span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide',
                    item.status === 'concluido'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : item.status === 'em_andamento'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        : 'bg-slate-50 text-slate-600 border border-slate-100',
                  )}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{item.descricao}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
