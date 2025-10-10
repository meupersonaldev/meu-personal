'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export interface StudentNotification {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export interface StudentHeaderData {
  availableCredits: number
  notifications: StudentNotification[]
  unreadCount: number
  markNotificationAsRead: (notificationId: string) => Promise<void>
  refetch: () => Promise<void>
  isLoading: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useStudentHeaderData(): StudentHeaderData {
  const { user, token } = useAuthStore()
  const [availableCredits, setAvailableCredits] = useState(0)
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.id || !token) {
      setAvailableCredits(0)
      setNotifications([])
      return
    }

    setIsLoading(true)
    try {
      const [balanceResponse, notificationsResponse] = await Promise.all([
        fetch(`${API_URL}/api/packages/student/balance`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_URL}/api/notifications?user_id=${user.id}&unread=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (balanceResponse.ok) {
        const data = await balanceResponse.json()
        const available = data?.balance?.available_classes ?? data?.available_classes
        setAvailableCredits(typeof available === 'number' ? available : 0)
      } else {
        setAvailableCredits(0)
      }

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json()
        setNotifications(data.notifications || [])
      } else {
        setNotifications([])
      }
    } catch (error) {
      setAvailableCredits(0)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id || !token) return

      try {
        const response = await fetch(
          `${API_URL}/api/notifications/${notificationId}/read`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (response.ok) {
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== notificationId)
          )
        }
      } catch (error) {
      }
    },
    [user?.id, token]
  )

  return {
    availableCredits,
    notifications,
    unreadCount: notifications.length,
    markNotificationAsRead,
    refetch: fetchData,
    isLoading
  }
}
