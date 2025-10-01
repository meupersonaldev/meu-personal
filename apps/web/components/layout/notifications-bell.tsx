'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import Link from 'next/link'

export default function NotificationsBell() {
  const { unreadNotifications } = useFranquiaStore()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
      </Button>

      {/* Dropdown de notificações (simplificado) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              {unreadNotifications > 0 && (
                <span className="text-xs text-gray-500">{unreadNotifications} não lidas</span>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {unreadNotifications === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="p-2">
                <p className="text-sm text-gray-600 p-4">
                  Você tem {unreadNotifications} notificações não lidas
                </p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-200">
            <Link
              href="/franquia/dashboard/notifications"
              className="text-sm text-meu-primary hover:underline block text-center"
              onClick={() => setIsOpen(false)}
            >
              Ver todas as notificações
            </Link>
          </div>
        </div>
      )}

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
