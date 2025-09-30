'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Bell, Clock } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export default function ProfessorHeader() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [availableHours, setAvailableHours] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchData()
    }
  }, [user?.id])

  const fetchData = async () => {
    if (!user?.id) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const hoursResponse = await fetch(`${API_URL}/api/teachers/${user.id}/hours`)
      if (hoursResponse.ok) {
        const data = await hoursResponse.json()
        setAvailableHours(data.available_hours || 0)
      }

      const notificationsResponse = await fetch(`${API_URL}/api/notifications?user_id=${user.id}&unread=true`)
      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, { method: 'PUT' })
      setNotifications(notifications.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const unreadCount = notifications.length

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm py-4 px-6">
      <div className="flex items-center justify-end space-x-4">
        
        {/* Créditos/Horas Disponíveis */}
        <div className="flex items-center space-x-2 px-4 py-2 bg-meu-primary/10 rounded-lg border border-meu-primary/20">
          <Clock className="h-5 w-5 text-meu-primary" />
          <div>
            <p className="text-xs text-gray-600 font-medium">Créditos</p>
            <p className="text-lg font-bold text-meu-primary">{availableHours}h</p>
          </div>
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900">Notificações</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => markAsRead(n.id)}
                      >
                        <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
