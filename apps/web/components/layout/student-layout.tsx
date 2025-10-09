'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import StudentSidebar from './student-sidebar'
import StudentHeader from './student-header'
import { StudentHeaderActions } from './student-header-actions'

interface StudentLayoutProps {
  children: React.ReactNode
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentSidebar variant="desktop" />

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-[61] h-full w-72 max-w-[80%]">
            <StudentSidebar variant="mobile" className="h-full" onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="md:ml-64 flex min-h-screen flex-col">
        <header className="md:hidden sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-lg border border-gray-200 p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-meu-primary focus:ring-offset-2"
              aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-base font-semibold text-gray-900">Meu Personal</span>
            <StudentHeaderActions variant="mobile" />
          </div>
        </header>

        <div className="hidden md:block">
          <StudentHeader />
        </div>

        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
