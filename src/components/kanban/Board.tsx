import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useMainStore from '@/stores/useMainStore'
import { Column } from './Column'

import { Badge } from '@/components/ui/badge'

export function Board() {
  const { stages, clients, searchQuery } = useMainStore()

  const filteredClients = clients.filter((c) => {
    const query = searchQuery.toLowerCase()
    return c.nome.toLowerCase().includes(query) || (c.empresa?.toLowerCase() || '').includes(query)
  })

  const verdes = clients.filter(
    (c) => c.status_inatividade === 'verde' || !c.status_inatividade,
  ).length
  const amarelos = clients.filter((c) => c.status_inatividade === 'amarelo').length
  const vermelhos = clients.filter((c) => c.status_inatividade === 'vermelho').length
  const criticos = clients.filter((c) => c.status_inatividade === 'critico').length

  if (!stages.length) return null

  return (
    <div className="flex-1 h-full flex flex-col pt-6 pb-2 px-4 sm:px-6 w-full max-w-[1600px] mx-auto overflow-hidden animate-in fade-in duration-500">
      {/* Dashboard Summary */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        <span className="text-sm font-medium text-slate-500 mr-2 whitespace-nowrap">
          Status de Inatividade:
        </span>
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
        >
          {verdes} verdes
        </Badge>
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 hover:bg-amber-100 whitespace-nowrap"
        >
          {amarelos} amarelos
        </Badge>
        <Badge
          variant="secondary"
          className="bg-rose-100 text-rose-800 hover:bg-rose-100 whitespace-nowrap"
        >
          {vermelhos} vermelhos
        </Badge>
        <Badge
          variant="secondary"
          className="bg-slate-200 text-slate-800 hover:bg-slate-200 whitespace-nowrap border border-slate-300"
        >
          {criticos} críticos
        </Badge>
      </div>

      {/* Mobile Tab View */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue={stages[0].id} className="flex-1 flex flex-col h-full">
          <TabsList className="w-full flex justify-start overflow-x-auto h-12 p-1 bg-slate-100 rounded-lg mb-4 flex-nowrap shrink-0 scrollbar-hide">
            {stages.map((stage) => (
              <TabsTrigger
                key={stage.id}
                value={stage.id}
                className="shrink-0 px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                {stage.nome}
                <span className="ml-2 text-xs opacity-60">
                  ({filteredClients.filter((c) => c.estagio_id === stage.id).length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {stages.map((stage) => (
            <TabsContent
              key={stage.id}
              value={stage.id}
              className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden focus-visible:outline-none"
            >
              <Column
                stage={stage}
                clients={filteredClients.filter((c) => c.estagio_id === stage.id)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop Horizontal Scroll View */}
      <div className="hidden md:flex h-full overflow-x-auto overflow-y-hidden gap-6 pb-4 items-start scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 scrollbar-track-transparent">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            clients={filteredClients.filter((c) => c.estagio_id === stage.id)}
          />
        ))}

        {/* Empty column placeholder to allow overscrolling slightly for UX */}
        <div className="w-4 shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}
