import { useState, DragEvent } from 'react'
import { Client } from '@/types'
import { getInactivity } from '@/lib/date-utils'
import { Building2, GripVertical, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function Card({ client, index }: { client: Client; index: number }) {
  const [isDragging, setIsDragging] = useState(false)
  const inactivity = getInactivity(client.ultimo_contato)

  const isCritico = client.status_inatividade === 'critico'

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('clientId', client.id)
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => setIsDragging(true), 0)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      tabIndex={0}
      aria-label={`Mover cliente ${client.nome}`}
      aria-describedby={`status-inatividade-${client.id}`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
      className={cn(
        'group flex flex-col p-4 bg-white rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 animate-in fade-in zoom-in-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isDragging ? 'opacity-40 rotate-2 scale-95 shadow-lg z-10' : 'opacity-100',
        isCritico
          ? 'border border-zinc-800 bg-zinc-50/50 ring-1 ring-zinc-200'
          : 'border border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 max-w-[85%]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                id={`status-inatividade-${client.id}`}
                className={cn('h-2.5 w-2.5 rounded-full shrink-0 shadow-sm', inactivity.color)}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Último contato {inactivity.text}</p>
            </TooltipContent>
          </Tooltip>
          <h4
            className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1.5"
            title={client.nome}
          >
            {client.nome}
            {isCritico && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-zinc-600 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Status Crítico</TooltipContent>
              </Tooltip>
            )}
          </h4>
        </div>
        <GripVertical className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium">{client.empresa || 'Sem empresa'}</span>
      </div>

      <div className="mt-auto flex items-center">
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-100">
          Contato {inactivity.text}
        </span>
      </div>
    </div>
  )
}
