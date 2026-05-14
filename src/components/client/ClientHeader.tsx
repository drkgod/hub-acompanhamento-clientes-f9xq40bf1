import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Building, Mail, Phone, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInactivity } from '@/lib/date-utils'
import { Client } from '@/types'
import { cn } from '@/lib/utils'

export function ClientHeader({ client }: { client: Client }) {
  const inactivity = getInactivity(client.ultimo_contato)
  const stage = client.expand?.estagio_id
  const location = useLocation()
  const isWhatsAppPage = location.pathname.endsWith('/whatsapp')

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-5 border rounded-xl shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{client.nome}</h1>
          <Badge style={{ backgroundColor: stage?.cor || '#64748b' }} className="text-white">
            {stage?.nome}
          </Badge>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            <div className={cn('w-2 h-2 rounded-full', inactivity.color)} />
            {inactivity.text}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm text-slate-600 font-medium">
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
          {client.telefone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" /> {client.telefone}
            </div>
          )}
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
