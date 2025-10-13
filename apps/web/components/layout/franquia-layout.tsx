'use client'

import FranquiaSidebar from './franquia-sidebar'
import NotificationsBell from './notifications-bell'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { User } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FranquiaLayoutProps {
  children: React.ReactNode
}

export default function FranquiaLayout({ children }: FranquiaLayoutProps) {
  const { franquiaUser, isAuthenticated } = useFranquiaStore(state => ({
    franquiaUser: state.franquiaUser,
    isAuthenticated: state.isAuthenticated
  }))
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <FranquiaSidebar />

      {/* Main Content */}
      <div className="lg:ml-64 ml-0">
        {/* Top Header Bar - Fixed */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 pl-16 lg:pl-6">
            {/* Left side - Academy name */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                {franquiaUser?.academyName || 'Academia'}
              </h1>
              <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">Painel de Gestão</p>
            </div>

            {/* Right side - Notifications + User */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Notifications Bell */}
              <NotificationsBell />

              {/* User Info - Desktop */}
              <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {franquiaUser?.name || 'Usuário'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {franquiaUser?.email || ''}
                  </div>
                </div>
                <button
                  onClick={() => router.push('/franquia/dashboard/configuracoes')}
                  className="group relative"
                  title="Ir para Configurações"
                >
                  {franquiaUser?.avatar_url ? (
                    <img
                      src={franquiaUser.avatar_url}
                      alt={franquiaUser.name}
                      className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-meu-cyan/20 transition-all group-hover:ring-4 group-hover:ring-meu-cyan/40 cursor-pointer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-meu-primary to-meu-cyan flex items-center justify-center text-white font-medium shadow-md transition-all group-hover:scale-110 cursor-pointer">
                      {franquiaUser?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                    </div>
                  )}
                </button>
              </div>

              {/* User Avatar - Mobile */}
              <button
                onClick={() => router.push('/franquia/dashboard/configuracoes')}
                className="md:hidden group relative"
                title="Ir para Configurações"
              >
                {franquiaUser?.avatar_url ? (
                  <img
                    src={franquiaUser.avatar_url}
                    alt={franquiaUser.name}
                    className="w-8 h-8 rounded-full object-cover shadow-md ring-2 ring-meu-cyan/20 transition-all group-hover:ring-4 group-hover:ring-meu-cyan/40 cursor-pointer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-meu-primary to-meu-cyan flex items-center justify-center text-white font-medium shadow-md transition-all group-hover:scale-110 cursor-pointer text-xs">
                    {franquiaUser?.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                )}
              </button>
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
