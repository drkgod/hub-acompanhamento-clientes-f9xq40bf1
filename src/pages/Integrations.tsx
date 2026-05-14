import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Integrations() {
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [tldvInfo, setTldvInfo] = useState<{ secret: string; instanceUrl: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await pb.send<{ secret: string; instanceUrl: string }>(
          '/backend/v1/tldv-info',
          { method: 'GET' },
        )
        setTldvInfo(res)
      } catch (err) {
        console.error('Failed to load tldv info', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInfo()
  }, [])

  const webhookUrl = tldvInfo?.instanceUrl
    ? `${tldvInfo.instanceUrl}/backend/v1/tldv-webhook`
    : `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/tldv-webhook`

  const handleCopySecret = () => {
    if (!tldvInfo?.secret) return
    navigator.clipboard.writeText(tldvInfo.secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e configure integrações externas com sua conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TLDV Webhook</CardTitle>
          <CardDescription>
            Integre suas reuniões gravadas no TLDV para que sejam automaticamente importadas e
            analisadas pela nossa Inteligência Artificial, gerando resumos e extraindo metas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Instruções de Configuração</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Acesse o painel do TLDV em{' '}
                <a
                  href="https://app.tldv.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  https://app.tldv.io
                </a>
              </li>
              <li>
                Navegue até as configurações (Settings) e selecione <strong>Webhooks</strong>
              </li>
              <li>Adicione a URL do webhook fornecida abaixo</li>
              <li>
                Nos cabeçalhos (Headers) do webhook, adicione a chave <code>x-api-key</code> com o
                valor do seu Webhook Secret (abaixo)
              </li>
              <li>
                Certifique-se de que os eventos <strong>MeetingReady</strong> e{' '}
                <strong>TranscriptReady</strong> estão selecionados na configuração do webhook no
                tl;dv
              </li>
            </ol>
          </div>

          <div className="space-y-5 border-t pt-5">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">URL Pública do Webhook</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 p-2.5 bg-muted rounded-md text-sm break-all font-mono">
                      {webhookUrl}
                    </code>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleCopyUrl}
                      title="Copiar URL"
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">TLDV Webhook Secret (x-api-key)</label>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 p-2.5 bg-muted rounded-md text-sm break-all truncate font-mono">
                      {tldvInfo?.secret || 'Secret não configurado'}
                    </code>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleCopySecret}
                      title="Copiar Secret"
                      disabled={!tldvInfo?.secret}
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilize este secret no cabeçalho x-api-key para autenticar o envio dos dados.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
