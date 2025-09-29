'use client'

import FranqueadoraSidebar from './franqueadora-sidebar'

interface FranqueadoraLayoutProps {
  children: React.ReactNode
}

export default function FranqueadoraLayout({ children }: FranqueadoraLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">

        {/* Sidebar */}
        <FranqueadoraSidebar />

        {/* Main Content */}
        <div className="ml-64">
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
