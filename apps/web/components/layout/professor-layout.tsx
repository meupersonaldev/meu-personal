'use client'

import ProfessorSidebar from './professor-sidebar'

interface ProfessorLayoutProps {
  children: React.ReactNode
  onShowQRCode?: () => void
}

export default function ProfessorLayout({ children, onShowQRCode }: ProfessorLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">
        
        {/* Sidebar */}
        <ProfessorSidebar onShowQRCode={onShowQRCode} />
        
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
