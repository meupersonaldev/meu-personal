'use client'

import { useState } from 'react'
import { Bell, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfessorNotification } from '@/lib/hooks/useProfessorHeaderData'

interface ProfessorHeaderActionsProps {
  availableHours: number
  notifications: ProfessorNotification[]
  onMarkNotificationAsRead: (notificationId: string) => Promise<void>
  variant?: 'desktop' | 'mobile'
}

export function ProfessorHeaderActions({
  availableHours,
  notifications,
  onMarkNotificationAsRead,
  variant = 'desktop'
}: ProfessorHeaderActionsProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notifications.length

  const creditClasses =
    variant === 'mobile'
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm'

  const creditValueClasses =
    variant === 'mobile' ? 'text-sm' : 'text-lg'

  const notificationButtonClasses =
    variant === 'mobile'
      ? 'p-2'
      : 'p-2'

  const containerClasses =
    variant === 'mobile'
      ? 'flex items-center space-x-3'
      : 'flex items-center space-x-4'

  const handleNotificationClick = async (notificationId: string) => {
    await onMarkNotificationAsRead(notificationId)
    setShowNotifications(false)
  }

  return (
    <div className={containerClasses}>
      <div
        className={cn(
          'flex items-center space-x-2 rounded-lg border border-meu-primary/20 bg-meu-primary/10',
          creditClasses
        )}
      >
        <Clock className="h-5 w-5 text-meu-primary" />
        <div className="flex flex-col leading-tight">
          <span className="text-[0.65rem] uppercase tracking-wide text-gray-600">
            Créditos
          </span>
          <span className={cn('font-bold text-meu-primary', creditValueClasses)}>
            {availableHours}h
          </span>
        </div>
      </div>

      <div className="relative">
        <button
          className={cn(
            'relative rounded-lg transition-colors hover:bg-gray-100',
            notificationButtonClasses
          )}
          onClick={() => setShowNotifications((prev) => !prev)}
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b p-4">
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="flex w-full flex-col items-start border-b p-4 text-left hover:bg-gray-50"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </span>
                      <span className="mt-1 text-xs text-gray-600">
                        {notification.message}
                      </span>
                      <span className="mt-1 text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
