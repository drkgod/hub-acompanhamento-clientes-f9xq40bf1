import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useMainStore from '@/stores/useMainStore'
import { Column } from './Column'

export function Board() {
  const { stages, clients, searchQuery } = useMainStore()

  const filteredClients = clients.filter((c) => {
    const query = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query)
  })

  return (
    <div className="flex-1 h-full flex flex-col pt-6 pb-2 px-4 sm:px-6 w-full max-w-[1600px] mx-auto overflow-hidden animate-in fade-in duration-500">
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
                {stage.title}
                <span className="ml-2 text-xs opacity-60">
                  ({filteredClients.filter((c) => c.stageId === stage.id).length})
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
                clients={filteredClients.filter((c) => c.stageId === stage.id)}
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
            clients={filteredClients.filter((c) => c.stageId === stage.id)}
          />
        ))}

        {/* Empty column placeholder to allow overscrolling slightly for UX */}
        <div className="w-4 shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}
