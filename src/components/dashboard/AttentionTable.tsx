import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Client } from '@/types'

interface ClientWithMeta extends Client {
  metas_atrasadas: number
}

const statusColors: Record<string, string> = {
  verde: 'bg-green-100 text-green-700 hover:bg-green-200',
  amarelo: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  vermelho: 'bg-red-100 text-red-700 hover:bg-red-200',
  critico: 'bg-slate-900 text-white hover:bg-slate-800',
}

export function AttentionTable() {
  const [clients, setClients] = useState<ClientWithMeta[] | null>(null)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    try {
      setError(false)
      const allClients = await pb.collection('clients').getFullList<Client>()
      const allGoals = await pb.collection('goals').getFullList({ filter: `status != "concluida"` })

      const now = new Date()
      const goalsByClient: Record<string, number> = {}
      allGoals.forEach((g) => {
        if (g.prazo && new Date(g.prazo) < now) {
          goalsByClient[g.client_id] = (goalsByClient[g.client_id] || 0) + 1
        }
      })

      const weight: Record<string, number> = {
        critico: 4,
        vermelho: 3,
        amarelo: 2,
        verde: 1,
        '': 0,
      }
      allClients.sort((a, b) => {
        const wA = weight[a.status_inatividade || ''] || 0
        const wB = weight[b.status_inatividade || ''] || 0
        if (wA !== wB) return wB - wA
        return (b.dias_sem_contato || 0) - (a.dias_sem_contato || 0)
      })

      const needingAttention = allClients.filter(
        (c) =>
          (c.status_inatividade && c.status_inatividade !== 'verde') || goalsByClient[c.id] > 0,
      )

      const top5 = needingAttention.slice(0, 5).map((c) => ({
        ...c,
        metas_atrasadas: goalsByClient[c.id] || 0,
      }))

      setClients(top5)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card className="shadow-sm border-slate-200 h-full">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800">Clientes que Precisam de Atenção</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-10 text-red-500">
            <p className="mb-4">Erro ao carregar lista de atenção.</p>
            <Button onClick={load} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : !clients ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-slate-900">Todos os clientes estão em dia</p>
            <p className="text-sm text-slate-500 mt-1">
              Nenhum cliente precisa de atenção urgente no momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Dias sem contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Metas atrasadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => navigate(`/clientes/${client.id}`)}
                  >
                    <TableCell className="font-medium text-slate-900">{client.nome}</TableCell>
                    <TableCell className="text-slate-500">{client.empresa || '-'}</TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {client.dias_sem_contato || 0}
                    </TableCell>
                    <TableCell>
                      {client.status_inatividade && (
                        <Badge
                          variant="secondary"
                          className={`capitalize font-semibold ${statusColors[client.status_inatividade]}`}
                        >
                          {client.status_inatividade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.metas_atrasadas > 0 ? (
                        <Badge variant="destructive" className="font-bold">
                          {client.metas_atrasadas}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
