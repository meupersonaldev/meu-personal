"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { toast } from 'sonner'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR')
}

export default function NotificationsBell() {
  const { franquiaUser } = useFranquiaStore()
  const router = useRouter()
  const { notifications, unreadCount, hydrate, markRead, markAllRead, loadMore, nextCursor, loading: storeLoading } = useNotificationsStore()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (franquiaUser?.academyId) {
      hydrate({ academyId: franquiaUser.academyId })
    }
  }, [franquiaUser?.academyId, hydrate])

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      markRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
      setShowPanel(false)
    }
  }

  const handleMarkAllRead = async () => {
    if (!franquiaUser?.academyId) return
    setLoading(true)
    try {
      await markAllRead(franquiaUser.academyId)
      toast.success('Todas as notificações foram marcadas como lidas')
    } catch (error) {
      toast.error('Erro ao marcar notificações como lidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <Card className="absolute right-0 top-14 w-[420px] max-h-[600px] flex flex-col z-50 shadow-2xl border-2 border-gray-100 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-meu-primary/5 to-meu-cyan/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      disabled={loading}
                      className="text-xs"
                    >
                      Marcar todas como lidas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Sem notificações recentes</div>
              ) : (
                <>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">{n.title}</div>
                        <div className="text-xs text-gray-500">{formatDate(n.created_at)}</div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                      {!n.read && !n.link && (
                        <div className="mt-2 flex justify-end">
                          <span className="text-xs text-meu-primary font-medium">Marcar como lida</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {nextCursor && (
                    <div className="pt-2 pb-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => franquiaUser?.academyId && loadMore({ academyId: franquiaUser.academyId })}
                        disabled={storeLoading}
                        className="w-full text-gray-500"
                      >
                        {storeLoading ? 'Carregando...' : 'Carregar mais'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
