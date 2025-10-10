'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Bell } from 'lucide-react'
import { useStudentHeaderData } from '@/lib/hooks/useStudentHeaderData'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StudentHeaderActionsProps {
  variant?: 'desktop' | 'mobile'
}

export function StudentHeaderActions({ variant = 'desktop' }: StudentHeaderActionsProps) {
  const router = useRouter()
  const { availableCredits, notifications, unreadCount, markNotificationAsRead } = useStudentHeaderData()
  const [showNotifications, setShowNotifications] = useState(false)

  const creditsLabel = useMemo(() => {
    if (availableCredits >= 1) {
      return `${availableCredits} credito${availableCredits === 1 ? '' : 's'}`
    }
    return 'Sem creditos'
  }, [availableCredits])

  const containerClasses =
    variant === 'mobile'
      ? 'flex items-center gap-2 w-full'
      : 'flex items-center gap-3'

  const creditClasses =
    variant === 'mobile'
      ? 'flex flex-1 items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm'
      : 'flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm'

  return (
    <div className={containerClasses}>
      {/* Desktop: mostra créditos com botão Comprar */}
      {variant === 'desktop' && (
        <div className={creditClasses}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CreditCard className="text-meu-primary flex-shrink-0 h-5 w-5" />
            <div className="leading-tight min-w-0">
              <p className="font-semibold uppercase text-gray-600 truncate text-[11px]">
                Créditos disponíveis
              </p>
              <p className="font-bold text-gray-900 truncate text-base">{creditsLabel}</p>
            </div>
          </div>
          <Button
            size="default"
            className="bg-meu-primary text-white hover:bg-meu-primary-dark flex-shrink-0 h-9 px-4 text-sm"
            onClick={() => router.push('/aluno/comprar')}
          >
            Comprar
          </Button>
        </div>
      )}

      {/* Mobile: apenas notificações, sem card de créditos */}

      {/* Notificações */}
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'relative rounded-lg transition-colors hover:bg-gray-100 border-gray-200 bg-white',
            variant === 'mobile' ? 'h-9 w-9' : 'h-10 w-10'
          )}
          onClick={() => setShowNotifications((prev) => !prev)}
        >
          <Bell className={cn(
            "text-gray-600",
            variant === 'mobile' ? 'h-4 w-4' : 'h-5 w-5'
          )} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b p-4">
                <h3 className="font-semibold text-gray-900">Notificacoes</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {unreadCount} nao lida{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm">Nenhuma notificacao</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="flex w-full flex-col items-start border-b p-4 text-left hover:bg-gray-50"
                      onClick={() => {
                        markNotificationAsRead(notification.id)
                        setShowNotifications(false)
                      }}
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
