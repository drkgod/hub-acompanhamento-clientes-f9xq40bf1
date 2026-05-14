import { Outlet } from 'react-router-dom'
import { Search, Plus, LayoutDashboard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import useMainStore from '@/stores/useMainStore'

export default function Layout() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { setSearchQuery } = useMainStore()

  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch, setSearchQuery])

  return (
    <main className="flex flex-col h-screen max-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-6 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2 text-blue-600">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-xl font-bold text-slate-800 hidden lg:block whitespace-nowrap tracking-tight">
              Hub de Acompanhamento
            </h1>
          </div>

          <div className="flex-1 max-w-xl mx-auto relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Buscar cliente ou empresa..."
              className="pl-9 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 h-10 w-full transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar clientes"
            />
          </div>

          <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 h-10 px-4">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline font-medium">Novo Cliente</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative w-full">
        <Outlet />
      </div>
    </main>
  )
}
