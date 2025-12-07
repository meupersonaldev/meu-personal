'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import api from '@/lib/api'

export interface StudentNotification {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
  data?: any
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
  const { notifications, unreadCount, markRead, hydrate, connectUser, disconnectAll } = useNotificationsStore()
  const [availableCredits, setAvailableCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCredits = useCallback(async () => {
    if (!user?.id) {
      setAvailableCredits(0)
      return
    }

    try {
      const balanceData = await api.packages.getStudentBalance()
      const available = balanceData?.balance?.available_classes
      setAvailableCredits(typeof available === 'number' && !isNaN(available) ? Math.max(0, available) : 0)
    } catch (error) {
      console.error('Failed to fetch student credits:', error)
      setAvailableCredits(0)
    }
  }, [user?.id, token])

  // Inicialização e conexão real-time
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true)
      // Carrega notificações e créditos
      Promise.all([
        hydrate({ userId: user.id }),
        fetchCredits()
      ]).finally(() => setIsLoading(false))

      // Conecta SSE
      connectUser(user.id)
    } else {
      disconnectAll()
    }
  }, [user?.id, hydrate, connectUser, disconnectAll, fetchCredits])

  useEffect(() => {
    const handleUpdate = () => fetchCredits()
    if (typeof window !== 'undefined') {
      window.addEventListener('student-credits-updated', handleUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('student-credits-updated', handleUpdate)
      }
    }
  }, [fetchCredits])

  return {
    availableCredits,
    notifications: notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      is_read: n.read,
      data: n.data
    })),
    unreadCount,
    markNotificationAsRead: markRead,
    refetch: async () => {
      await fetchCredits()
      if (user?.id) await hydrate({ userId: user.id })
    },
    isLoading
  }
}
