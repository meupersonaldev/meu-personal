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

      if (!response.ok) throw new Error('Failed to fetch notifications')

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
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
        size="sm"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-h-[500px] overflow-hidden z-50 shadow-xl">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                <p className="text-xs text-gray-600">
                  {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar todas
                  </Button>
                )}
                <Button
                  onClick={() => setShowPanel(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-sm text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <Badge className="ml-2 bg-blue-500 text-white text-xs">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <Button
                                onClick={() => markAsRead(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Marcar lida
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteNotification(notification.id)}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
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
