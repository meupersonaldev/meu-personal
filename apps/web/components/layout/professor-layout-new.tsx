'use client'

import { useTheme } from '@/hooks/use-theme'
import ProfessorSidebarNew from './professor-sidebar-new'

interface ProfessorLayoutProps {
  children: React.ReactNode
}

export default function ProfessorLayoutNew({ children }: ProfessorLayoutProps) {
  const { isDarkMode, toggleDarkMode } = useTheme()

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Background principal */}
      <div className={`min-h-screen ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        
        {/* Sidebar */}
        <ProfessorSidebarNew isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        
        {/* Main Content */}
        <div className="ml-64">
          <main className={`min-h-screen ${
            isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
