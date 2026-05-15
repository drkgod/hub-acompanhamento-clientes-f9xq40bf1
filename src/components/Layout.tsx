import { Outlet, useLocation } from 'react-router-dom'
import {
  Search,
  Plus,
  LayoutDashboard,
  LogOut,
  Newspaper,
  MessageSquare,
  Settings,
  Database,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import useMainStore from '@/stores/useMainStore'
import { useAuth } from '@/hooks/use-auth'
import { NotificationsPanel } from './NotificationsPanel'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Layout() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { setSearchQuery } = useMainStore()
  const { user, signOut } = useAuth()
  const location = useLocation()

  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0)

  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch, setSearchQuery])

  const fetchConversations = async () => {
    try {
      const res = await pb.send<{ conversations: any[] }>('/backend/v1/whatsapp/conversations', {
        method: 'GET',
      })
      const count = res.conversations.filter(
        (c) =>
          (c.status_inatividade === 'vermelho' || c.status_inatividade === 'critico') &&
          !c.ultima_mensagem_from_me,
      ).length
      setUnreadBadgeCount(count)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (user) fetchConversations()
  }, [user])

  useRealtime('whatsapp_messages', () => {
    if (user) fetchConversations()
  })

  return (
    <main className="flex flex-col h-screen max-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-6 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-blue-600 mr-2">
              <LayoutDashboard className="h-6 w-6" />
              <h1 className="text-xl font-bold text-slate-800 hidden xl:block whitespace-nowrap tracking-tight">
                Hub de Acompanhamento
              </h1>
              <NotificationsPanel />
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                Dashboard
              </Link>
              <Link
                to="/pipeline"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/pipeline' || location.pathname === '/'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                Pipeline
              </Link>
              <Link
                to="/whatsapp"
                className={cn(
                  'relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  location.pathname.startsWith('/whatsapp')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
                {unreadBadgeCount > 0 && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white shadow-sm">
                    {unreadBadgeCount}
                  </span>
                )}
              </Link>
              <Link
                to="/integrations"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  location.pathname.startsWith('/integrations')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Settings className="h-4 w-4" />
                Integrações
              </Link>
              <Link
                to="/schema"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  location.pathname === '/schema'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Database className="h-4 w-4" />
                Schema
              </Link>
            </nav>
          </div>

          <div className="flex-1 max-w-md mx-auto relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Buscar cliente ou empresa..."
              className="pl-9 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 h-10 w-full transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar clientes"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/digest">
              <Button
                variant="outline"
                className="h-10 px-4 text-slate-700 bg-white border-slate-200 hover:bg-slate-50 transition-all hidden sm:flex"
              >
                <Newspaper className="h-4 w-4 sm:mr-2 text-blue-600" />
                <span className="hidden sm:inline font-medium">Resumo Diário</span>
              </Button>
            </Link>

            <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 h-10 px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">Novo Cliente</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full border border-slate-200 p-0 ml-2"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-slate-100 text-slate-700 font-medium text-sm">
                      {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 mb-1 truncate text-sm text-slate-500 bg-slate-50/50 rounded-sm">
                  {user?.email}
                </div>
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-medium"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative w-full">
        <Outlet />
      </div>
    </main>
  )
}
