'use client'

import FranquiaSidebar from './franquia-sidebar'
import NotificationsBell from './notifications-bell'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { User } from 'lucide-react'

interface FranquiaLayoutProps {
  children: React.ReactNode
}

export default function FranquiaLayout({ children }: FranquiaLayoutProps) {
  const { franquiaUser } = useFranquiaStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <FranquiaSidebar />

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header Bar - Fixed */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left side - Academy name */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {franquiaUser?.academyName || 'Academia'}
              </h1>
              <p className="text-sm text-gray-500">Painel de Gestão</p>
            </div>

            {/* Right side - Notifications + User */}
            <div className="flex items-center space-x-4">
              {/* Notifications Bell */}
              <NotificationsBell />

              {/* User Info */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {franquiaUser?.name || 'Usuário'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {franquiaUser?.email || ''}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {franquiaUser?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
    </div>
  )
}