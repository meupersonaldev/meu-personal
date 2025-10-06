"use client"

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { toast } from 'sonner'

export default function FranqueadoraNotificationsDropdown() {
  const { franqueadora } = useFranqueadoraStore()
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationsStore()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

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

  // Usar apenas notificações dinâmicas da API
  const displayNotifications = notifications
  const displayUnreadCount = unreadCount

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-gray-100 transition-colors"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className={`h-5 w-5 ${displayUnreadCount > 0 ? 'text-meu-cyan' : 'text-gray-600'}`} />
        {displayUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-meu-error to-red-600 text-white text-xs flex items-center justify-center font-semibold shadow-lg animate-pulse">
            {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
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
                  {displayUnreadCount > 0 ? (
                    <span className="font-medium text-meu-cyan">{displayUnreadCount} não lida{displayUnreadCount !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>Tudo em dia! ✅</span>
                  )}
                </p>
                {franqueadora?.id && displayUnreadCount > 0 && (
                  <Button
                    onClick={() => {
                      // Marcar todas como lidas para a franqueadora
                      useNotificationsStore.getState().markAllReadFranqueadora(franqueadora.id).then(() => {
                        toast.success('Todas marcadas como lidas')
                        setShowPanel(false)
                      }).catch(() => {
                        toast.error('Erro ao marcar como lidas')
                      })
                    }}
                    disabled={loading}
                    size="sm"
                    variant="ghost"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto p-3 space-y-2 bg-white">
              {displayNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Nenhuma notificação</p>
                  <p className="text-gray-400 text-sm mt-1">Você será notificado sobre eventos importantes</p>
                </div>
              ) : (
                displayNotifications.slice(0, 20).map((n) => (
                  <div key={n.id} className={`p-3 rounded-lg border ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{n.title}</div>
                      <div className="text-xs text-gray-500">{formatDate(n.created_at)}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                    {!n.read && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          markRead(n.id).then(() => {
                            // sucesso
                          }).catch(() => {
                            toast.error('Erro ao marcar como lida')
                          })
                        }}>
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