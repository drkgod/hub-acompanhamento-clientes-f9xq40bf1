import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClientHeader } from '@/components/client/ClientHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCcw, MessageSquareOff, Check, CheckCheck, FileText, Download } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Client } from '@/types'
import { getClientDetails } from '@/services/client-details'
import { cn } from '@/lib/utils'

interface WhatsAppMessage {
  id: string
  body?: string
  text?: string
  fromMe: boolean
  timestamp: number
  status?: string
  media_url?: string
  media_mimetype?: string
  media_type?: string
  media_filename?: string
  media_transcription?: string
  media_caption?: string
  media_error?: string
}

export default function ClientWhatsAppPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const details = await getClientDetails(id)
      setClient(details.client)

      const res = await pb.send(`/backend/v1/clients/${id}/whatsapp-history`, {
        method: 'GET',
      })

      let msgs = res.messages || []
      // Revert so newest is at the bottom like standard chats
      msgs = [...msgs].sort((a: WhatsAppMessage, b: WhatsAppMessage) => {
        const tsA =
          typeof a.timestamp === 'number' && a.timestamp < 1000000000000
            ? a.timestamp * 1000
            : a.timestamp
        const tsB =
          typeof b.timestamp === 'number' && b.timestamp < 1000000000000
            ? b.timestamp * 1000
            : b.timestamp
        return tsA - tsB
      })
      setMessages(msgs)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <div className="bg-white border rounded-2xl p-6 shadow-sm min-h-[500px] flex flex-col gap-4 justify-end">
          <Skeleton className="h-16 w-2/3 rounded-2xl rounded-bl-none self-start" />
          <Skeleton className="h-20 w-3/4 rounded-2xl rounded-br-none self-end" />
          <Skeleton className="h-12 w-1/2 rounded-2xl rounded-bl-none self-start" />
          <Skeleton className="h-24 w-2/3 rounded-2xl rounded-br-none self-end" />
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-bl-none self-start" />
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="container mx-auto max-w-2xl py-20 px-4 text-center space-y-6">
        <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Erro ao carregar histórico</h2>
          <p className="text-slate-600 mb-6">
            Não foi possível carregar as conversas do cliente. Verifique sua conexão ou se as
            credenciais estão configuradas.
          </p>
          <Button onClick={loadData} size="lg">
            <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const renderStatus = (status?: string) => {
    if (!status) return null
    const s = status.toUpperCase()
    if (s === 'PENDING' || s === 'SERVER_ACK')
      return <Check className="w-3 h-3 text-emerald-600/60" />
    if (s === 'DELIVERY_ACK') return <CheckCheck className="w-3 h-3 text-emerald-600/60" />
    if (s === 'READ' || s === 'PLAYED') return <CheckCheck className="w-3 h-3 text-blue-500" />
    if (s === 'ERROR') return <span className="text-red-500 text-[10px]">Erro</span>
    return null
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <ClientHeader client={client} />

      <div className="bg-[#efeae2] border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col relative h-[600px]">
        {/* Chat Background Pattern */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10 flex flex-col">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 m-auto">
              <div className="bg-white/70 p-6 rounded-full shadow-sm">
                <MessageSquareOff className="h-12 w-12 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-700">
                  Nenhuma conversa encontrada para este número
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
                  Não foi possível encontrar mensagens para o número deste cliente ou ele ainda não
                  foi contatado.
                </p>
              </div>
              <Button onClick={loadData} variant="outline" className="bg-white hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4 mr-2" /> Verificar Conexão
              </Button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3 mt-auto">
              {messages.map((msg, i) => {
                const ts = msg.timestamp
                const date = new Date(
                  typeof ts === 'number' && ts < 1000000000000 ? ts * 1000 : ts || Date.now(),
                )
                const isSent = msg.fromMe

                const hasMedia = !!msg.media_url || !!msg.media_error
                const content = msg.body || msg.text || ''
                const caption = msg.media_caption || content
                const isPlaceholder = [
                  '[Imagem]',
                  '[Sticker]',
                  '[Vídeo]',
                  '[Áudio]',
                  '[Documento]',
                  '🎵 Áudio',
                  '📷 Imagem',
                  '🎥 Vídeo',
                  '📄 Documento',
                ].includes(caption.trim())
                const showText = !hasMedia || (caption && !isPlaceholder)

                return (
                  <div
                    key={msg.id || i}
                    className={cn(
                      'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative text-[15px] leading-relaxed',
                      isSent
                        ? 'bg-[#d9fdd3] text-slate-800 self-end rounded-tr-sm border border-[#c3ebbc]'
                        : 'bg-white text-slate-800 self-start rounded-tl-sm border border-white',
                    )}
                  >
                    {hasMedia && (
                      <div className="mb-1.5">
                        {msg.media_error ? (
                          <div className="p-2 bg-black/5 rounded text-slate-500 text-[11px] italic">
                            Mídia não disponível para download
                          </div>
                        ) : msg.media_type === 'image' || msg.media_type === 'sticker' ? (
                          <img
                            src={msg.media_url}
                            alt={msg.media_filename || 'Imagem'}
                            className="max-w-full rounded-lg max-h-[300px] object-contain"
                          />
                        ) : msg.media_type === 'video' || msg.media_type === 'ptv' ? (
                          <video
                            src={msg.media_url}
                            controls
                            className="max-w-full rounded-lg max-h-[300px]"
                          />
                        ) : msg.media_type === 'audio' ||
                          msg.media_type === 'myaudio' ||
                          msg.media_type === 'ptt' ? (
                          <div className="min-w-[200px]">
                            <audio src={msg.media_url} controls className="w-full h-10" />
                            {msg.media_transcription && (
                              <div className="text-[11px] bg-black/5 p-2 rounded mt-1.5 italic opacity-80">
                                <span className="font-semibold not-italic">Transcrição:</span>{' '}
                                {msg.media_transcription}
                              </div>
                            )}
                          </div>
                        ) : msg.media_type === 'document' ? (
                          <div className="flex items-center gap-3 p-3 bg-black/5 rounded-lg min-w-[200px]">
                            <div className="bg-red-500/10 text-red-600 p-2 rounded shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {msg.media_filename || 'Documento'}
                              </p>
                              <p className="text-[10px] opacity-70 truncate">
                                {msg.media_mimetype}
                              </p>
                            </div>
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-2 hover:bg-black/10 rounded-full transition-colors"
                              title="Abrir documento"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ) : (
                          <a
                            href={msg.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-2 break-all p-2 bg-black/5 rounded"
                          >
                            <Download className="w-4 h-4 shrink-0" />
                            {msg.media_filename || 'Baixar mídia'}
                          </a>
                        )}
                      </div>
                    )}

                    {showText && (
                      <div className="whitespace-pre-wrap break-words">
                        {hasMedia ? caption : content}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[11px] text-slate-500/80 font-medium">
                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isSent && renderStatus(msg.status)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
