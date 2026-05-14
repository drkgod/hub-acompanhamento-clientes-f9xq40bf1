import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, Check, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getNotifications, markNotificationAsRead } from '@/services/notifications'
import type { Notification } from '@/types'
import { cn } from '@/lib/utils'

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const { user } = useAuth()
  const navigate = useNavigate()

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      setError(false)
      const data = await getNotifications()
      setNotifications(data)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useRealtime<Notification>(
    'notifications',
    (e) => {
      if (e.action === 'create' && e.record.user_id === user?.id) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === e.record.id)) return prev
          return [e.record, ...prev]
        })
        setHighlightedId(e.record.id)
        setTimeout(() => setHighlightedId(null), 3000)
      } else if (e.action === 'update' && e.record.user_id === user?.id) {
        setNotifications((prev) => prev.map((n) => (n.id === e.record.id ? e.record : n)))
      } else if (e.action === 'delete') {
        setNotifications((prev) => prev.filter((n) => n.id !== e.record.id))
      }
    },
    !!user?.id,
  )

  const unreadCount = notifications.filter((n) => !n.lida).length

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.lida) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, lida: true } : n)),
        )
      } catch (err) {
        console.error(err)
      }
    }

    if (notification.client_id) {
      setIsOpen(false)
      navigate(`/clientes/${notification.client_id}`)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.lida)
    if (unread.length === 0) return

    try {
      await Promise.all(unread.map((n) => markNotificationAsRead(n.id)))
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative ml-1 h-9 w-9 text-slate-600 hover:text-blue-600 focus-visible:ring-1"
        >
          <Bell className="h-[1.15rem] w-[1.15rem]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 shadow-elevation overflow-hidden" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <h4 className="font-semibold text-slate-900">Notificações</h4>
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-medium"
            >
              {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[380px] bg-white">
          {loading && (
            <div className="p-4 space-y-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2 w-2 rounded-full mt-2 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-1/4 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-500 h-full">
              <AlertCircle className="h-8 w-8 text-red-500/70" />
              <p className="text-sm font-medium">Ocorreu um erro ao carregar as notificações</p>
              <Button variant="outline" size="sm" onClick={loadNotifications} className="mt-2">
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-500 h-[280px]">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Nenhuma notificação</p>
                <p className="text-sm mt-1 max-w-[220px] mx-auto text-slate-500">
                  Notificações sobre inatividade e ações importantes aparecerão aqui.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className="divide-y divide-slate-100 flex flex-col">
              {notifications.map((n) => {
                const date = n.created ? new Date(n.created.replace(' ', 'T')) : new Date()
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'p-4 flex gap-3 cursor-pointer transition-all hover:bg-slate-50 relative group',
                      !n.lida ? 'bg-blue-50/40' : 'bg-white',
                      highlightedId === n.id
                        ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/80 z-10 animate-in fade-in zoom-in-95 duration-300'
                        : '',
                    )}
                  >
                    <div className="mt-1.5 flex-shrink-0 w-2 flex justify-center">
                      {!n.lida && (
                        <div className="h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight truncate',
                          !n.lida ? 'text-slate-900' : 'text-slate-700',
                        )}
                      >
                        {n.titulo || 'Nova Notificação'}
                      </p>
                      {n.mensagem && (
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {n.mensagem}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 pt-1 font-medium">
                        {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {!loading && !error && notifications.length > 0 && (
          <div className="p-2 border-t border-slate-100 bg-slate-50/80">
            <Button
              variant="ghost"
              className="w-full text-sm h-9 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
