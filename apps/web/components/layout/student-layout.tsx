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

      <div className="md:ml-[17rem] flex min-h-screen flex-col">
        {/* Mobile Header */}
        <header className="block md:hidden sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-start justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-lg border border-gray-200 p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-meu-primary focus:ring-offset-2"
              aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex-1" />
            <div className="flex items-start">
              <StudentHeaderActions variant="mobile" />
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <StudentHeader />

        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
