import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  MessageSquare,
  Search,
  Phone,
  User as UserIcon,
  RefreshCcw,
  History,
  Loader2,
  Link2,
  Sparkles,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { Client, WhatsAppAnalysis } from '@/types'

interface Conversation {
  chat_id: string
  phone: string
  client_id: string
  nome: string
  telefone: string
  status_inatividade: string
  ultima_mensagem_body: string
  ultima_mensagem_timestamp: number
  ultima_mensagem_from_me: boolean
  total_nao_respondidas: number
}

interface Message {
  id: string
  message_id: string
  body: string
  from_me: boolean
  timestamp: number
  created: string
}

export default function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [requestHistory, setRequestHistory] = useState(false)
  const { toast } = useToast()

  const [clients, setClients] = useState<Client[]>([])
  const [analysis, setAnalysis] = useState<WhatsAppAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalysisSheetOpen, setIsAnalysisSheetOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  const loadClients = async () => {
    try {
      const res = await pb.collection('clients').getFullList<Client>({ sort: 'nome' })
      setClients(res)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await pb.send<{ conversations: Conversation[] }>(
        '/backend/v1/whatsapp/conversations',
        { method: 'GET' },
      )
      setConversations(res.conversations || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
      if (selectedChatId) {
        loadMessages(selectedChatId)
        loadAnalysis(selectedChatId)
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [selectedChatId])

  const handleLinkClient = async (clientId: string) => {
    if (!selectedConv) return
    try {
      await pb.send('/backend/v1/whatsapp/link-conversation', {
        method: 'POST',
        body: JSON.stringify({
          chat_id: selectedConv.chat_id,
          phone: selectedConv.phone,
          client_id: clientId,
        }),
      })
      toast({ title: 'Conversa vinculada com sucesso!' })
      setIsLinkModalOpen(false)
      loadConversations()
    } catch (err: any) {
      toast({
        title: 'Erro ao vincular cliente',
        description: err.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    }
  }

  const loadAnalysis = async (chatId: string) => {
    try {
      const res = await pb
        .collection('whatsapp_analyses')
        .getFirstListItem<WhatsAppAnalysis>(`chat_id="${chatId}"`)
      setAnalysis(res)
    } catch (err) {
      setAnalysis(null)
    }
  }

  const loadMessages = async (chatId: string) => {
    try {
      const res = await pb.send<{ messages: Message[] }>(
        `/backend/v1/whatsapp/conversations/${encodeURIComponent(chatId)}/messages`,
        {
          method: 'GET',
        },
      )
      setMessages(res.messages || [])
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, 50)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId)
      loadAnalysis(selectedChatId)
    } else {
      setAnalysis(null)
    }
  }, [selectedChatId])

  const handleAnalyze = async () => {
    if (!selectedChatId) return
    try {
      setIsAnalyzing(true)
      setIsAnalysisSheetOpen(true)
      const res = await pb.send<WhatsAppAnalysis>('/backend/v1/whatsapp/analyze-conversation', {
        method: 'POST',
        body: JSON.stringify({ chat_id: selectedChatId }),
      })
      setAnalysis(res)
      toast({ title: 'Análise concluída com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro na análise', description: err.message, variant: 'destructive' })
      setIsAnalysisSheetOpen(false)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      await pb.send('/backend/v1/whatsapp/sync-now', {
        method: 'POST',
        body: JSON.stringify({ request_history: requestHistory }),
      })
      toast({
        title: requestHistory
          ? 'Solicitação de histórico enviada'
          : 'Sincronização concluída com sucesso',
      })
      loadConversations()
      if (selectedChatId) loadMessages(selectedChatId)
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  const filteredConversations = conversations.filter(
    (c) =>
      (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search),
  )
  const unreadTotal = conversations.reduce((acc, c) => acc + c.total_nao_respondidas, 0)

  const selectedConv = conversations.find((c) => c.chat_id === selectedChatId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verde':
        return 'bg-green-500'
      case 'amarelo':
        return 'bg-yellow-500'
      case 'vermelho':
        return 'bg-orange-500'
      case 'critico':
        return 'bg-red-500'
      default:
        return 'bg-slate-300'
    }
  }

  const formatMessageTime = (ts: number) => {
    if (!ts) return ''
    const date = new Date(ts < 1000000000000 ? ts * 1000 : ts)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return 'Ontem'
    return format(date, 'dd/MM/yy')
  }

  const groupMessages = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    msgs.forEach((m) => {
      const d = new Date(m.timestamp < 1000000000000 ? m.timestamp * 1000 : m.timestamp)
      const dateStr = isToday(d)
        ? 'Hoje'
        : isYesterday(d)
          ? 'Ontem'
          : format(d, "dd 'de' MMMM", { locale: ptBR })
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.date === dateStr) lastGroup.messages.push(m)
      else groups.push({ date: dateStr, messages: [m] })
    })
    return groups
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar */}
      <div className="w-[340px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            WhatsApp
          </h2>
          {unreadTotal > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              {unreadTotal} não lidas
            </span>
          )}
        </header>

        <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full flex-1"
              variant="secondary"
              size="sm"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-2" />
              )}
              Sincronizar Agora
            </Button>
          </div>
          <div className="flex items-center space-x-2 px-1">
            <Checkbox
              id="history"
              checked={requestHistory}
              onCheckedChange={(c) => setRequestHistory(!!c)}
            />
            <Label
              htmlFor="history"
              className="text-xs text-slate-600 cursor-pointer flex items-center gap-1"
            >
              <History className="w-3 h-3" /> Buscar histórico antigo
            </Label>
          </div>
        </div>

        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((c) => (
            <button
              key={c.chat_id}
              onClick={() => setSelectedChatId(c.chat_id)}
              className={cn(
                'w-full p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left',
                selectedChatId === c.chat_id && 'bg-blue-50/50 hover:bg-blue-50/50',
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-slate-100">
                  <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                    {c.nome?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {c.client_id && (
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                      getStatusColor(c.status_inatividade),
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-semibold text-sm text-slate-800 truncate">
                    {c.nome || c.phone}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {formatMessageTime(c.ultima_mensagem_timestamp)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-slate-500 truncate flex-1">
                    {c.ultima_mensagem_from_me && (
                      <span className="text-slate-400 font-medium">Você: </span>
                    )}
                    {c.ultima_mensagem_body}
                  </p>
                  {c.total_nao_respondidas > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shrink-0 font-bold shadow-sm">
                      {c.total_nao_respondidas}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#EFEAE2] relative">
        {/* Chat Background Pattern */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {selectedConv ? (
          <>
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-slate-100">
                  <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                    {selectedConv.nome?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-slate-800 leading-tight">
                    {selectedConv.nome}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedConv.telefone || selectedConv.phone || 'Sem número'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (analysis) {
                      setIsAnalysisSheetOpen(true)
                    } else {
                      handleAnalyze()
                    }
                  }}
                  disabled={isAnalyzing}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 shadow-sm flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {analysis ? 'Ver Análise' : 'Analisar Conversa'}
                  </span>
                </Button>

                {selectedConv.client_id ? (
                  <Link
                    to={`/clientes/${selectedConv.client_id}`}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Ver Perfil</span>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="text-slate-700 bg-white shadow-sm flex items-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Vincular</span>
                  </Button>
                )}
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10">
              {groupMessages(messages).map((group) => (
                <div key={group.date} className="space-y-4">
                  <div className="flex justify-center">
                    <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[11px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                      {group.date}
                    </span>
                  </div>

                  {group.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn('flex w-full', m.from_me ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] sm:max-w-[60%] px-4 py-2.5 shadow-sm text-[15px] relative',
                          m.from_me
                            ? 'bg-[#d9fdd3] text-slate-800 rounded-[18px] rounded-tr-[4px] border border-[#c3ebbc]'
                            : 'bg-white text-slate-800 rounded-[18px] rounded-tl-[4px] border border-white',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        <span
                          className={cn(
                            'text-[10px] float-right mt-2 ml-3 font-medium text-slate-400',
                          )}
                        >
                          {format(
                            new Date(
                              m.timestamp < 1000000000000 ? m.timestamp * 1000 : m.timestamp,
                            ),
                            'HH:mm',
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm z-10 m-6 rounded-2xl border border-white">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">Selecione uma conversa</p>
            <p className="text-sm mt-1">As mensagens do WhatsApp aparecerão aqui.</p>
          </div>
        )}
      </div>

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vincular Cliente</DialogTitle>
            <DialogDescription>
              Selecione o cliente para associar a esta conversa ({selectedConv?.phone}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {clients
                .filter(
                  (c) =>
                    c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (c.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase()),
                )
                .map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleLinkClient(client.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{client.nome}</p>
                      <p className="text-xs text-slate-500">
                        {client.empresa || client.email || 'Sem empresa/email'}
                      </p>
                    </div>
                  </button>
                ))}
              {clients.filter(
                (c) =>
                  c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  (c.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                  (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase()),
              ).length === 0 && (
                <div className="text-center text-sm text-slate-500 py-4">
                  Nenhum cliente encontrado.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isAnalysisSheetOpen} onOpenChange={setIsAnalysisSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-slate-50 p-0">
          <SheetHeader className="p-6 pb-4 bg-white border-b border-slate-200 sticky top-0 z-10">
            <SheetTitle className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="w-5 h-5" />
              Análise com IA
            </SheetTitle>
            <SheetDescription>
              Resumo inteligente e insights extraídos da conversa.
            </SheetDescription>
          </SheetHeader>

          <div className="p-6 space-y-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                <p className="font-medium text-slate-700">Analisando histórico...</p>
                <p className="text-sm text-center mt-2 max-w-[250px]">
                  Lendo mensagens, processando sentimentos e gerando insights.
                </p>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Resumo
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {analysis.summary}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Sentimento
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{analysis.sentiment}</p>
                </div>

                {analysis.pending_questions && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Perguntas Pendentes
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {analysis.pending_questions}
                    </p>
                  </div>
                )}

                {analysis.suggested_followup && (
                  <div className="bg-indigo-50 rounded-xl p-4 shadow-sm border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2">
                      Sugestão de Follow-up
                    </h4>
                    <p className="text-indigo-900/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {analysis.suggested_followup}
                    </p>
                  </div>
                )}

                {analysis.opportunities && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Oportunidades & Ações
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {analysis.opportunities}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Atualizar Análise
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">Nenhuma análise disponível.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
