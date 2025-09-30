'use client'

import ProfessorSidebar from './professor-sidebar'
import ProfessorHeader from './professor-header'

interface ProfessorLayoutProps {
  children: React.ReactNode
}

export default function ProfessorLayout({ children }: ProfessorLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Background principal */}
      <div className="min-h-screen bg-gray-50">
        
        {/* Sidebar */}
        <ProfessorSidebar />
        
        {/* Main Content */}
        <div className="ml-64">
          {/* Header */}
          <ProfessorHeader />
          
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
