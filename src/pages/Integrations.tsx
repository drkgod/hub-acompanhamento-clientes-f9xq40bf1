import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function Integrations() {
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const token = pb.authStore.token
  const webhookUrl = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/tldv-webhook`

  const handleCopyToken = () => {
    navigator.clipboard.writeText(`Bearer ${token}`)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
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
                Nos cabeçalhos (Headers) do webhook, adicione a chave <code>Authorization</code> com
                o valor do seu token (abaixo)
              </li>
              <li>
                Certifique-se de que os eventos <strong>MeetingReady</strong> e{' '}
                <strong>TranscriptReady</strong> estão selecionados na configuração do webhook no
                tl;dv
              </li>
            </ol>
          </div>

          <div className="space-y-5 border-t pt-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">URL do Webhook</label>
              <div className="flex gap-2 items-center">
                <code className="flex-1 p-2.5 bg-muted rounded-md text-sm break-all font-mono">
                  {webhookUrl}
                </code>
                <Button variant="secondary" size="icon" onClick={handleCopyUrl} title="Copiar URL">
                  {copiedUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Authorization Header Token</label>
              <div className="flex gap-2 items-center">
                <code className="flex-1 p-2.5 bg-muted rounded-md text-sm break-all truncate font-mono">
                  Bearer {token}
                </code>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyToken}
                  title="Copiar Token"
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Para manter a segurança, nunca compartilhe seu token publicamente. Ele é associado à
                sua conta atual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
