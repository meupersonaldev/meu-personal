"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FranqueadoraNotificationsDropdown() {
  const { franqueadora } = useFranqueadoraStore()
  const { notifications, unreadCount, markRead, markAllRead, loadMore, nextCursor, loading: storeLoading } = useNotificationsStore()
  const router = useRouter()
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      markRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
      setShowPanel(false)
    }
  }

  const handleMarkAllRead = () => {
    if (franqueadora?.id) {
      // Assuming markAllRead takes context or we just mark visible ones? 
      // The store definition might just be markAllRead(). 
      // Checking previous usage, it seemed simple.
      markAllRead()
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMM 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </Button>

      {showPanel && (
        <Card className="absolute right-0 mt-2 w-80 sm:w-96 z-50 shadow-xl border-gray-200 flex flex-col max-h-[80vh]">
          <div className="p-3 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-700">Notificações</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-meu-primary hover:text-meu-primary/80" onClick={handleMarkAllRead}>
                  Ler todas
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Nenhuma notificação</p>
                <p className="text-gray-400 text-sm mt-1">Você será notificado sobre eventos importantes</p>
              </div>
            ) : (
              <>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                      <div className="text-[10px] text-gray-500">{formatDate(n.created_at)}</div>
                    </div>
                    <div className="text-xs text-gray-700 mt-1 line-clamp-3">{n.message}</div>
                    {!n.read && !n.link && (
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-meu-primary p-0 hover:bg-transparent" onClick={(e) => {
                          e.stopPropagation()
                          markRead(n.id)
                        }}>
                          Marcar como lida
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {nextCursor && (
                  <div className="pt-2 pb-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => franqueadora?.id && loadMore({ franqueadoraId: franqueadora.id })}
                      disabled={storeLoading}
                      className="w-full text-gray-500 text-xs"
                    >
                      {storeLoading ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}