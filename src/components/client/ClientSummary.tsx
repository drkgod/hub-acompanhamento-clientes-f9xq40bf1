import { useEffect, useState } from 'react'
import { getClientSummary } from '@/services/client-details'
import { Bot, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ClientSummary({
  clientId,
  meetingCount,
}: {
  clientId: string
  meetingCount: number
}) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchSummary = async () => {
    if (meetingCount === 0) return
    setLoading(true)
    setError(false)
    try {
      const res = await getClientSummary(clientId)
      setSummary(res.summary || 'Nenhum resumo gerado.')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [clientId, meetingCount])

  if (meetingCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed">
        <Calendar className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-600 font-medium">Nenhuma reunião registrada ainda</p>
        <Button variant="outline" size="sm">
          Agendar Primeira Reunião
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-800">Resumo Inteligente (Últimas reuniões)</h3>
      </div>
      {loading ? (
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
          Erro ao processar o resumo.{' '}
          <button onClick={fetchSummary} className="font-semibold underline ml-1">
            Tentar novamente
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed bg-gradient-to-r from-indigo-50 to-blue-50/30 p-4 rounded-xl border border-indigo-100/50 shadow-sm">
          {summary}
        </p>
      )}
    </div>
  )
}
