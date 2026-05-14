import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function NewMeeting() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)

  const [clientId, setClientId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState('')
  const [duracao, setDuracao] = useState('60')
  const [plataforma, setPlataforma] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    pb.collection('clients')
      .getFullList<Client>({ sort: 'nome' })
      .then(setClients)
      .catch(() => toast.error('Erro ao carregar clientes'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !titulo || !texto || !user) {
      toast.error('Preencha todos os campos obrigatórios (Cliente, Título e Transcrição).')
      return
    }

    setIsLoading(true)
    try {
      const meetingData = {
        client_id: clientId,
        titulo,
        data: data ? new Date(data).toISOString().replace('T', ' ') : '',
        duracao_minutos: parseInt(duracao) || 0,
        plataforma,
        status: 'pendente',
        user_id: user.id,
      }

      const meeting = await pb.collection('meetings').create(meetingData)

      await pb.collection('transcripts').create({
        meeting_id: meeting.id,
        client_id: clientId,
        texto_original: texto,
        user_id: user.id,
      })

      toast.success('Reunião registrada e em processamento', {
        description:
          'O agente inteligente está analisando a transcrição e extraindo as metas e ações.',
        action: {
          label: 'Ver Cliente',
          onClick: () => navigate(`/clientes/${clientId}`),
        },
        duration: 8000,
      })

      navigate(`/clientes/${clientId}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar reunião. Tente novamente.')
      setIsLoading(false)
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId)

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        variant="ghost"
        className="mb-6 -ml-4 text-slate-500 hover:text-slate-900"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card className="border-slate-200/60 shadow-lg shadow-slate-200/40">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">Nova Reunião</CardTitle>
              <CardDescription className="text-slate-500 mt-1 text-base">
                Registre uma reunião e deixe nosso agente processar a transcrição automaticamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Cliente *</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className={cn(
                        'w-full justify-between h-11 border-slate-200 bg-white',
                        !clientId && 'text-slate-500',
                      )}
                    >
                      {selectedClient ? selectedClient.nome : 'Buscar cliente...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Digite para buscar..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome + ' ' + (c.empresa || '')}
                              onSelect={() => {
                                setClientId(c.id)
                                setOpenCombobox(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 text-indigo-600',
                                  clientId === c.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">{c.nome}</span>
                                {c.empresa && (
                                  <span className="text-xs text-slate-500">{c.empresa}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label htmlFor="titulo" className="text-sm font-semibold text-slate-700">
                  Título da Reunião *
                </Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Alinhamento de Q3"
                  className="h-11"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="data" className="text-sm font-semibold text-slate-700">
                  Data e Hora
                </Label>
                <Input
                  id="data"
                  type="datetime-local"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="duracao" className="text-sm font-semibold text-slate-700">
                    Duração (minutos)
                  </Label>
                  <Input
                    id="duracao"
                    type="number"
                    min="0"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="plataforma" className="text-sm font-semibold text-slate-700">
                    Plataforma
                  </Label>
                  <Input
                    id="plataforma"
                    value={plataforma}
                    onChange={(e) => setPlataforma(e.target.value)}
                    placeholder="Ex: Google Meet"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="texto" className="text-sm font-semibold text-slate-700">
                  Transcrição da Reunião *
                </Label>
                <Textarea
                  id="texto"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Cole aqui a transcrição completa gerada pela sua ferramenta de gravação..."
                  className="min-h-[280px] resize-y p-4 text-base leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...
                  </>
                ) : (
                  'Salvar Reunião'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
