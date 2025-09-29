'use client'

import FranquiaSidebar from './franquia-sidebar'

interface FranquiaLayoutProps {
  children: React.ReactNode
}

export default function FranquiaLayout({ children }: FranquiaLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">

        {/* Sidebar */}
        <FranquiaSidebar />

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