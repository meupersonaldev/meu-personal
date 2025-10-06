'use client'

import FranqueadoraSidebar from './franqueadora-sidebar'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { Bell, CheckCheck } from 'lucide-react'

interface FranqueadoraLayoutProps {
  children: React.ReactNode
}

export default function FranqueadoraLayout({ children }: FranqueadoraLayoutProps) {
  const { franqueadora } = useFranqueadoraStore()
  const { unreadCount, markAllReadFranqueadora } = useNotificationsStore()
  const franqueadoraId = franqueadora?.id
  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">

        {/* Sidebar */}
        <FranqueadoraSidebar />

        {/* Main Content */}
        <div className="content-with-sidebar ml-64">
            <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
