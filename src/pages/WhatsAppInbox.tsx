import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { MessageSquare, Search, Phone, User as UserIcon } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Conversation {
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)

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

  useRealtime('whatsapp_messages', () => {
    loadConversations()
    if (selectedClientId) loadMessages(selectedClientId)
  })

  const loadMessages = async (clientId: string) => {
    try {
      const records = await pb.collection('whatsapp_messages').getList<Message>(1, 150, {
        filter: `client_id = '${clientId}'`,
        sort: '-timestamp',
      })
      setMessages(records.items.reverse())
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, 50)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (selectedClientId) {
      loadMessages(selectedClientId)
    }
  }, [selectedClientId])

  const filteredConversations = conversations.filter((c) =>
    c.nome?.toLowerCase().includes(search.toLowerCase()),
  )
  const unreadTotal = conversations.reduce((acc, c) => acc + c.total_nao_respondidas, 0)

  const selectedConv = conversations.find((c) => c.client_id === selectedClientId)

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
      <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
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
        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((c) => (
            <button
              key={c.client_id}
              onClick={() => setSelectedClientId(c.client_id)}
              className={cn(
                'w-full p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left',
                selectedClientId === c.client_id && 'bg-blue-50/50 hover:bg-blue-50/50',
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-slate-100">
                  <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                    {c.nome.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                    getStatusColor(c.status_inatividade),
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-semibold text-sm text-slate-800 truncate">{c.nome}</span>
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#EFEAE2]">
        {selectedConv ? (
          <>
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-slate-100">
                  <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                    {selectedConv.nome.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-slate-800 leading-tight">
                    {selectedConv.nome}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedConv.telefone || 'Sem número'}
                  </div>
                </div>
              </div>
              <Link
                to={`/clientes/${selectedConv.client_id}`}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Perfil</span>
              </Link>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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
                            ? 'bg-[#0B57D0] text-white rounded-[18px] rounded-tr-[4px]'
                            : 'bg-white text-slate-800 rounded-[18px] rounded-tl-[4px]',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        <span
                          className={cn(
                            'text-[10px] float-right mt-2 ml-3 font-medium',
                            m.from_me ? 'text-blue-100' : 'text-slate-400',
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">Selecione uma conversa</p>
            <p className="text-sm mt-1">As mensagens do WhatsApp aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
