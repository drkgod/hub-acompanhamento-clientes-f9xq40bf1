import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Copy, Check, MessageSquare, Link as LinkIcon, Loader2, Unplug } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

export default function Integrations() {
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [tldvInfo, setTldvInfo] = useState<{ secret: string; instanceUrl: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const [waBaseUrl, setWaBaseUrl] = useState('')
  const [waApiToken, setWaApiToken] = useState('')
  const [waStatus, setWaStatus] = useState<{
    connected: boolean
    status: string
    instance_name: string
    webhook_configured?: boolean
    base_url?: string
  } | null>(null)
  const [isWaLoading, setIsWaLoading] = useState(false)

  const fetchWaInfo = async () => {
    try {
      const res = await pb.send<{
        connected: boolean
        status: string
        instance_name: string
        webhook_configured?: boolean
        base_url?: string
      }>('/backend/v1/whatsapp/status', { method: 'GET' })
      setWaStatus(res)
      if (res?.connected && res.base_url) {
        setWaBaseUrl(res.base_url)
      }
    } catch (err) {
      console.error('Failed to load whatsapp info', err)
    }
  }

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
    fetchWaInfo()
  }, [])

  const handleSaveWa = async () => {
    try {
      setIsWaLoading(true)
      await pb.send('/backend/v1/whatsapp/configure', {
        method: 'POST',
        body: JSON.stringify({
          base_url: waBaseUrl,
          api_token: waApiToken,
          instance_name: 'skip_instance',
        }),
      })
      toast({ title: 'Conectado com sucesso' })
      setWaApiToken('')
      await fetchWaInfo()
    } catch (err: any) {
      toast({
        title: 'Erro ao conectar',
        description: err.message || 'Verifique suas credenciais',
        variant: 'destructive',
      })
    } finally {
      setIsWaLoading(false)
    }
  }

  const handleDisconnectWa = async () => {
    try {
      setIsWaLoading(true)
      await pb.send('/backend/v1/whatsapp/configure', {
        method: 'POST',
        body: JSON.stringify({
          base_url: '',
          api_token: '',
          instance_name: '',
        }),
      })
      toast({ title: 'Desconectado com sucesso' })
      setWaBaseUrl('')
      setWaApiToken('')
      await fetchWaInfo()
    } catch (err: any) {
      toast({
        title: 'Erro ao desconectar',
        description: err.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setIsWaLoading(false)
    }
  }

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
    <div className="container max-w-4xl mx-auto py-8 px-4 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e configure integrações externas com sua conta.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Integração UAZAPI (WhatsApp)
            </CardTitle>
            <CardDescription>
              Conecte sua instância da UAZAPI para sincronizar as mensagens do WhatsApp em tempo
              real diretamente no seu Inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <h3 className="font-medium mb-2">Instruções de Configuração</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>
                  Acesse o <strong>Painel UAZAPI &gt; Instâncias &gt; Token</strong> para obter suas
                  credenciais.
                </li>
                <li>
                  Após a conexão, o webhook será configurado automaticamente em sua instância.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Webhook:</span> Recebe mensagens
                  novas automaticamente em tempo real.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Sincronizar agora:</span> Importa
                  chats e mensagens que a UAZAPI já conhece localmente (Sync) usando os endpoints{' '}
                  <code>/chat/find</code> e <code>/message/find</code>.
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Buscar histórico antigo:</span>{' '}
                  Solicita ao WhatsApp mensagens anteriores que chegarão via webhook.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da instância (Identificador)</label>
                <Input
                  placeholder="Minha Empresa WA"
                  value={waStatus?.instance_name || ''}
                  disabled={true}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Base da instância</label>
                <Input
                  placeholder="https://minhainstancia.uazapi.com"
                  value={waBaseUrl}
                  onChange={(e) => setWaBaseUrl(e.target.value)}
                  disabled={waStatus?.connected}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token da instância</label>
                <Input
                  type="password"
                  placeholder={waStatus?.connected ? '••••••••••••••••' : 'Seu token de acesso'}
                  value={waApiToken}
                  onChange={(e) => setWaApiToken(e.target.value)}
                  disabled={waStatus?.connected}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      waStatus?.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Status: {waStatus?.connected ? 'Conectado' : 'Desconectado'}
                    {waStatus?.instance_name && waStatus.connected
                      ? ` (${waStatus.instance_name})`
                      : ''}
                  </span>
                </div>
                {waStatus?.connected && (
                  <span className="text-xs text-slate-500 ml-6">
                    Webhook: {waStatus.webhook_configured ? 'Configurado' : 'Pendente'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {waStatus?.connected ? (
                  <Button variant="destructive" onClick={handleDisconnectWa} disabled={isWaLoading}>
                    {isWaLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4 mr-2" />
                    )}
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveWa}
                    disabled={isWaLoading || !waBaseUrl || !waApiToken}
                  >
                    {isWaLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4 mr-2" />
                    )}
                    Conectar e Salvar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <strong>TranscriptReady</strong> estão selecionados
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
    </div>
  )
}
