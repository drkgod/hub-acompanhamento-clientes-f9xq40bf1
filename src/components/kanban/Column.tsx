import { useState, DragEvent } from 'react'
import { Stage, Client } from '@/types'
import { Card } from './Card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useMainStore from '@/stores/useMainStore'
import { cn } from '@/lib/utils'

interface ColumnProps {
  stage: Stage
  clients: Client[]
}

export function Column({ stage, clients }: ColumnProps) {
  const { moveClient } = useMainStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const clientId = e.dataTransfer.getData('clientId')
    if (clientId) {
      moveClient(clientId, stage.id)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-slate-100 rounded-xl h-full min-h-[60vh] md:min-h-0 w-full md:w-[320px] shrink-0 transition-all duration-200 border-2',
        isDragOver ? 'bg-slate-200/80 border-blue-400 border-dashed' : 'border-transparent',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between p-4 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-700 text-sm tracking-wide uppercase">
            {stage.title}
          </h3>
          <Badge
            variant="secondary"
            className="bg-slate-200/70 text-slate-600 border border-slate-200"
          >
            {clients.length}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Renomear coluna</DropdownMenuItem>
            <DropdownMenuItem>Adicionar nova coluna</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
              Remover coluna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {clients.length > 0 ? (
          clients.map((client, idx) => <Card key={client.id} client={client} index={idx} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-32 mt-4 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50 animate-in fade-in">
            <FolderOpen className="h-6 w-6 mb-2 text-slate-400" />
            <p className="text-sm font-medium">Pasta Vazia</p>
            <p className="text-xs mt-1 mb-3">Nenhum cliente neste estágio</p>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-white">
              Adicionar cliente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
