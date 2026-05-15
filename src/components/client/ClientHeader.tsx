import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building, Mail, Phone, MessageCircle, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getInactivity } from '@/lib/date-utils'
import { Client } from '@/types'
import { cn } from '@/lib/utils'

export function ClientHeader({ client }: { client: Client }) {
  const inactivity = getInactivity(client.ultimo_contato)
  const stage = client.expand?.estagio_id
  const location = useLocation()
  const navigate = useNavigate()
  const isWhatsAppPage = location.pathname.endsWith('/whatsapp')

  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [phoneValue, setPhoneValue] = useState(client.telefone || '')
  const { toast } = useToast()

  const handleSavePhone = async () => {
    if (phoneValue !== client.telefone) {
      try {
        await pb.collection('clients').update(client.id, { telefone: phoneValue })
        client.telefone = phoneValue
        toast({ title: 'Número salvo' })
      } catch (e) {
        toast({ title: 'Erro ao salvar', variant: 'destructive' })
        setPhoneValue(client.telefone || '')
      }
    }
    setIsEditingPhone(false)
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 border rounded-xl shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex bg-slate-100 p-1 rounded-lg ml-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-3 text-sm rounded-md', !isWhatsAppPage && 'bg-white shadow-sm')}
              onClick={() => navigate(`/clientes/${client.id}`)}
            >
              Visão Geral
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-3 text-sm rounded-md', isWhatsAppPage && 'bg-white shadow-sm')}
              onClick={() => navigate(`/clientes/${client.id}/whatsapp`)}
            >
              WhatsApp
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{client.nome}</h1>
          <Badge style={{ backgroundColor: stage?.cor || '#64748b' }} className="text-white">
            {stage?.nome}
          </Badge>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            <div className={cn('w-2 h-2 rounded-full', inactivity.color)} />
            {inactivity.text}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-600 font-medium">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            {client.empresa && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-400" /> {client.empresa}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> {client.email}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Phone className="h-4 w-4 text-slate-400" />
            {isEditingPhone ? (
              <Input
                autoFocus
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                onBlur={handleSavePhone}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePhone()
                  if (e.key === 'Escape') {
                    setPhoneValue(client.telefone || '')
                    setIsEditingPhone(false)
                  }
                }}
                className="h-7 w-40 text-sm py-0"
              />
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 -ml-2 rounded"
                onClick={() => setIsEditingPhone(true)}
              >
                <span>{client.telefone || 'Adicionar WhatsApp'}</span>
              </div>
            )}

            {client.telefone && !isEditingPhone && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => navigate(`/clientes/${client.id}/whatsapp`)}
                title="Abrir WhatsApp"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex md:hidden items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-max font-medium">
          <div className={cn('w-2 h-2 rounded-full', inactivity.color)} />
          {inactivity.text}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
        {!isWhatsAppPage ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/clientes/${client.id}/whatsapp`}>
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/clientes/${client.id}`}>Voltar ao Perfil</Link>
          </Button>
        )}
        <Button asChild className="w-full sm:w-auto">
          <Link to="/">Pipeline</Link>
        </Button>
      </div>
    </div>
  )
}
