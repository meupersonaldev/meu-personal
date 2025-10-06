"use client"

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { toast } from 'sonner'

export default function NotificationsBell() {
  const { franquiaUser } = useFranquiaStore()
  const { notifications, unreadCount, fetchInitial, markRead, markAllRead } = useNotificationsStore()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (franquiaUser?.academyId) fetchInitial({ academyId: franquiaUser.academyId })
  }, [franquiaUser?.academyId, fetchInitial])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m atrás`
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-gray-100 transition-colors"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-meu-cyan' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-meu-error to-red-600 text-white text-xs flex items-center justify-center font-semibold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <Card className="absolute right-0 top-14 w-[420px] max-h-[600px] overflow-hidden z-50 shadow-2xl border-2 border-gray-100 rounded-xl">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-meu-primary/5 to-meu-cyan/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-meu-primary to-meu-cyan flex items-center justify-center shadow-md">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-bold text-meu-primary text-lg">Notificações</h3>
                </div>
                <Button onClick={() => setShowPanel(false)} variant="ghost" size="sm" className="hover:bg-white/60 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {unreadCount > 0 ? (
                    <span className="font-medium text-meu-cyan">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>Tudo em dia! ✅</span>
                  )}
                </p>
                {franquiaUser?.academyId && (
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await markAllRead(franquiaUser.academyId)
                        toast.success('Todas marcadas como lidas')
                      } catch {
                        toast.error('Erro ao marcar todas como lidas')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading || unreadCount === 0}
                    size="sm"
                    variant="ghost"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto p-3 space-y-2 bg-white">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Sem notificações recentes</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div key={n.id} className={`p-3 rounded-lg border ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{n.title}</div>
                      <div className="text-xs text-gray-500">{formatDate(n.created_at)}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                    {!n.read && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                          Marcar como lida
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

