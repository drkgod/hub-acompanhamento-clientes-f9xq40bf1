import { useState, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { updateClientNotes } from '@/services/client-details'
import { Edit3 } from 'lucide-react'

export function ClientNotes({
  clientId,
  initialNotes,
}: {
  clientId: string
  initialNotes?: string
}) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<number | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNotes(val)
    setStatus('saving')
    if (timer.current) window.clearTimeout(timer.current)

    timer.current = window.setTimeout(async () => {
      try {
        await updateClientNotes(clientId, val)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } catch {
        setStatus('error')
      }
    }, 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-slate-400" /> Notas Gerais
        </h3>
        <span
          className={`text-xs font-medium ${
            status === 'saving'
              ? 'text-amber-500 animate-pulse'
              : status === 'saved'
                ? 'text-green-500'
                : status === 'error'
                  ? 'text-red-500'
                  : 'text-transparent'
          }`}
        >
          {status === 'saving' && 'Salvando...'}
          {status === 'saved' && 'Salvo ✓'}
          {status === 'error' && 'Erro ao salvar'}
          {status === 'idle' && 'Salvo'}
        </span>
      </div>
      <Textarea
        value={notes}
        onChange={handleChange}
        placeholder="Adicione anotações contínuas ou de contexto sobre o cliente..."
        className="min-h-[160px] resize-y bg-amber-50/30 focus-visible:ring-amber-200 border-amber-100"
      />
    </div>
  )
}
