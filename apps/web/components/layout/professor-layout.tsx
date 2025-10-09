'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useProfessorHeaderData } from '@/lib/hooks/useProfessorHeaderData'
import ProfessorSidebar from './professor-sidebar'
import ProfessorHeader from './professor-header'
import { ProfessorHeaderActions } from './professor-header-actions'

interface ProfessorLayoutProps {
  children: React.ReactNode
}

export default function ProfessorLayout({ children }: ProfessorLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const {
    availableHours,
    notifications,
    markNotificationAsRead
  } = useProfessorHeaderData()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  if (!mounted) {
    return null
  }

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfessorSidebar variant="desktop" />

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeSidebar}
          />
          <div className="absolute inset-y-0 left-0 z-[61] h-full w-72 max-w-[80%]">
            <ProfessorSidebar
              variant="mobile"
              className="h-full"
              onClose={closeSidebar}
            />
          </div>
        </div>
      )}

      <div className="md:ml-64 flex min-h-screen flex-col">
        <header className="md:hidden sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className="rounded-lg border border-gray-200 p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-meu-primary focus:ring-offset-2"
                aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <span className="text-base font-semibold text-gray-900">
                Meu Personal
              </span>
            </div>
            <ProfessorHeaderActions
              variant="mobile"
              availableHours={availableHours}
              notifications={notifications}
              onMarkNotificationAsRead={markNotificationAsRead}
            />
          </div>
        </header>

        <div className="hidden md:block">
          <ProfessorHeader
            availableHours={availableHours}
            notifications={notifications}
            onMarkNotificationAsRead={markNotificationAsRead}
          />
        </div>

        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
