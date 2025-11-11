'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FranqueadoraSidebar from './franqueadora-sidebar'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FranqueadoraLayoutProps {
  children: React.ReactNode
}

export default function FranqueadoraLayout({ children }: FranqueadoraLayoutProps) {
  const { franqueadora, user } = useFranqueadoraStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  // Verificar se o usuário tem permissão para acessar a franqueadora
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/')
    }
  }, [user, router])
  
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
            <h1 className="font-semibold text-lg truncate">{franqueadora?.name || 'Franqueadora'}</h1>
            <p className="text-xs text-white/80 truncate">Bem-vindo, {user?.name || 'Admin'}</p>
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
              <FranqueadoraSidebar isMobile onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <FranqueadoraSidebar />
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
