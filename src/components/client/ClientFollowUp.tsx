import { useState } from 'react'
import { Sparkles, Copy, AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { generateClientFollowUp } from '@/services/client-details'

export function ClientFollowUp({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await generateClientFollowUp(clientId)
      setContent(res.content || '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast({
      title: 'Mensagem copiada',
      description: 'O texto do follow-up foi copiado para sua área de transferência.',
    })
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" /> Mensagem de Follow-up
        </h3>
        {!content && !loading && !error && (
          <Button
            onClick={handleGenerate}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Gerar Follow-up
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[75%]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="h-5 w-5 mt-0.5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm mb-3">
              Erro ao gerar mensagem. Por favor, tente novamente
            </p>
            <Button
              onClick={handleGenerate}
              size="sm"
              variant="outline"
              className="bg-white hover:bg-red-50 border-red-200 text-red-700"
            >
              <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </div>
        </div>
      ) : content ? (
        <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-300">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] bg-white border-indigo-200 focus-visible:ring-indigo-500 resize-y text-slate-700 leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Regerar
            </Button>
            <Button
              onClick={handleCopy}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Mensagem
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <p className="text-slate-500 text-sm">
            Clique em <span className="font-semibold">Gerar Follow-up</span> para criar uma mensagem
            personalizada.
          </p>
        </div>
      )}
    </div>
  )
}
