'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

export default function NotificationsBell() {
  const { franquiaUser } = useFranquiaStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (franquiaUser?.academyId) {
      fetchNotifications()
      // Polling a cada 30 segundos
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [franquiaUser?.academyId])

  const fetchNotifications = async () => {
    if (!franquiaUser?.academyId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(
        `${API_URL}/api/notifications?academy_id=${franquiaUser.academyId}&limit=20`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        // Silenciar erro - API ainda não está pronta ou tabela não existe
        return
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      // Silenciar erro de fetch - API pode não estar rodando ainda
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to mark as read')

      await fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Erro ao marcar como lida')
    }
  }

  const markAllAsRead = async () => {
    if (!franquiaUser?.academyId) return

    setLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academy_id: franquiaUser.academyId }),
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to mark all as read')

      await fetchNotifications()
      toast.success('Todas marcadas como lidas')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erro ao marcar todas como lidas')
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to delete notification')

      await fetchNotifications()
      toast.success('Notificação removida')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Erro ao remover notificação')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
        return '📅'
      case 'booking_cancelled':
        return '❌'
      case 'checkin':
        return '✅'
      case 'new_student':
        return '👤'
      default:
        return '🔔'
    }
  }

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
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />
          <Card className="absolute right-0 top-14 w-[420px] max-h-[600px] overflow-hidden z-50 shadow-2xl border-2 border-gray-100 rounded-xl">
            {/* Header with gradient */}
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-meu-primary/5 to-meu-cyan/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-meu-primary to-meu-cyan flex items-center justify-center shadow-md">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-bold text-meu-primary text-lg">Notificações</h3>
                </div>
                <Button
                  onClick={() => setShowPanel(false)}
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/60 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {unreadCount > 0 ? (
                    <span className="font-medium text-meu-cyan">
                      {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span>Tudo em dia! ✨</span>
                  )}
                </p>
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:bg-white/60 rounded-full"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[480px] bg-gray-50">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Bell className="h-10 w-10 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Nenhuma notificação</h4>
                  <p className="text-sm text-gray-500">Você está em dia! 🎉</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-all duration-200 ${
                        !notification.read
                          ? 'bg-gradient-to-r from-meu-primary/5 to-meu-cyan/5 hover:from-meu-primary/10 hover:to-meu-cyan/10'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon with gradient background */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                          !notification.read
                            ? 'bg-gradient-to-br from-meu-primary to-meu-cyan'
                            : 'bg-gray-200'
                        }`}>
                          <span className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <Badge className="ml-2 bg-gradient-to-r from-meu-primary to-meu-cyan text-white text-xs border-0 shadow-sm">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                            {notification.message}
                          </p>

                          {/* Actions row */}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500 font-medium flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                              {formatDate(notification.created_at)}
                            </span>
                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <Button
                                  onClick={() => markAsRead(notification.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7 hover:bg-white/60 rounded-full"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Marcar lida
                                </Button>
                              )}
                              <Button
                                onClick={() => deleteNotification(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-red-600 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
