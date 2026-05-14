import { useEffect, useState } from 'react'
import { Newspaper, RefreshCw, AlertCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { generateDigest, getLatestDigest } from '@/services/digest'
import type { Notification } from '@/types'

export default function Digest() {
  const [digest, setDigest] = useState<Notification | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadDigest = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getLatestDigest()
      setDigest(data)
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao carregar o digest.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDigest()
  }, [])

  useRealtime('notifications', (e) => {
    if (e.record.tipo === 'daily_digest') {
      if (e.action === 'create' || e.action === 'update') {
        setDigest(e.record as unknown as Notification)
      }
    }
  })

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setError(null)
      await generateDigest()
      toast({
        title: 'Sucesso',
        description: 'Digest gerado com sucesso!',
      })
      await loadDigest()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao gerar o digest. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-slate-800">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold mt-8 mb-4 text-slate-900 border-b pb-2">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={i} className="text-2xl font-bold mt-4 mb-4 text-slate-900">
            {line.replace('# ', '')}
          </h1>
        )
      }
      if (line.startsWith('- ')) {
        const content = line.replace('- ', '')
        const parts = content.split(/(\*\*.*?\*\*)/g)
        return (
          <li key={i} className="ml-5 mb-2 list-disc text-slate-700">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <strong key={j} className="font-semibold text-slate-900">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{p}</span>
              ),
            )}
          </li>
        )
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <p key={i} className="text-slate-700 leading-relaxed mb-2">
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**') ? (
              <strong key={j} className="font-semibold text-slate-900">
                {p.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{p}</span>
            ),
          )}
        </p>
      )
    })
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-blue-600" />
              Daily Digest
            </h1>
            <p className="text-slate-500 mt-1">
              Resumo inteligente da sua carteira de clientes e prioridades do dia.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            {generating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {generating ? 'Gerando...' : 'Gerar Digest Agora'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadDigest} className="mt-2 sm:mt-0">
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : digest ? (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-5">
              <CardTitle className="text-2xl text-slate-800">{digest.titulo}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Calendar className="h-4 w-4" />
                Gerado em{' '}
                {format(new Date(digest.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 prose-slate prose-blue max-w-none">
              {renderMarkdown(digest.mensagem || '')}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm bg-white border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Newspaper className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                Nenhum digest gerado ainda
              </h3>
              <p className="text-slate-500 max-w-sm mb-8">
                Gere seu primeiro resumo diário para obter insights e descobrir quais clientes
                precisam de ação imediata.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                size="lg"
                className="shadow-sm"
              >
                {generating ? (
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Newspaper className="mr-2 h-5 w-5" />
                )}
                Gerar Primeiro Digest
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
