'use client'

import { useState } from 'react'
import FranquiaSidebar from './franquia-sidebar'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FranquiaLayoutProps {
  children: React.ReactNode
}

export default function FranquiaLayout({ children }: FranquiaLayoutProps) {
  const { franquiaUser } = useFranquiaStore(state => ({
    franquiaUser: state.franquiaUser
  }))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">

        {/* Mobile Header */}
        <div className="lg:hidden bg-meu-primary text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:bg-white/10 p-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-lg truncate">{franquiaUser?.academyName || 'Academia'}</h1>
            <p className="text-xs text-white/80 truncate">Painel da Franquia</p>
          </div>
          <div className="w-10"> {/* Spacer for balance */}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <div className="relative flex flex-col w-80 max-w-xs bg-meu-primary">
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="text-white hover:bg-white/10 p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <FranquiaSidebar isMobile onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <FranquiaSidebar />
        </div>

        {/* Main Content */}
        <div className="lg:ml-64">
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
