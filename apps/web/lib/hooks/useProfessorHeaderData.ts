'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export interface ProfessorNotification {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export interface ProfessorHeaderData {
  availableHours: number
  notifications: ProfessorNotification[]
  unreadCount: number
  markNotificationAsRead: (notificationId: string) => Promise<void>
  refetch: () => Promise<void>
  isLoading: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useProfessorHeaderData(): ProfessorHeaderData {
  const { user, token } = useAuthStore()
  const [availableHours, setAvailableHours] = useState(0)
  const [notifications, setNotifications] = useState<ProfessorNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setAvailableHours(0)
      setNotifications([])
      return
    }

    setIsLoading(true)
    try {
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const [hoursResponse, notificationsResponse] = await Promise.all([
        fetch(`${API_URL}/api/teachers/${user.id}/hours`, { headers: authHeaders }),
        fetch(`${API_URL}/api/notifications?user_id=${user.id}&unread_only=true`, { headers: authHeaders })
      ])

      if (hoursResponse.ok) {
        const data = await hoursResponse.json()
        setAvailableHours(data.available_hours || 0)
      } else {
        setAvailableHours(0)
      }

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json()
        setNotifications(data.notifications || [])
      } else {
        setNotifications([])
      }
    } catch {
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return

      try {
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(
          `${API_URL}/api/notifications/${notificationId}/read`,
          { method: 'PATCH', headers }
        )

        if (response.ok) {
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== notificationId)
          )
        }
      } catch {
      }
    },
    [user?.id, token]
  )

  return {
    availableHours,
    notifications,
    unreadCount: notifications.length,
    markNotificationAsRead,
    refetch: fetchData,
    isLoading
  }
}
