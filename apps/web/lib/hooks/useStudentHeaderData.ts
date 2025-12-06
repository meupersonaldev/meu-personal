'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import api from '@/lib/api'

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


export function useStudentHeaderData(): StudentHeaderData {
  const { user, token } = useAuthStore()
  const [availableCredits, setAvailableCredits] = useState(0)
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setAvailableCredits(0)
      setNotifications([])
      return
    }

    setIsLoading(true)
    try {
      const [balanceData, notificationsData] = await Promise.all([
        api.packages.getStudentBalance(),
        api.notifications.getAll({ user_id: user.id, unread: true }),
      ])

      // A API retorna { balance: { available_classes: number, ... } }
      const available = balanceData?.balance?.available_classes
      setAvailableCredits(typeof available === 'number' && !isNaN(available) ? Math.max(0, available) : 0)

      setNotifications(notificationsData.notifications || [])
    } catch (error) {
      console.error('Failed to fetch student header data:', error)
      setAvailableCredits(0)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleUpdate = () => fetchData()
    if (typeof window !== 'undefined') {
      window.addEventListener('student-credits-updated', handleUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('student-credits-updated', handleUpdate)
      }
    }
  }, [fetchData])

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await api.notifications.markAsRead(notificationId)
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        )
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
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
