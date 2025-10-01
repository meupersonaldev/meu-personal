'use client'

import { useState, useEffect } from 'react'
import ProfessorSidebar from './professor-sidebar'
import ProfessorHeader from './professor-header'

interface ProfessorLayoutProps {
  children: React.ReactNode
}

export default function ProfessorLayout({ children }: ProfessorLayoutProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="hidden md:block min-h-screen">
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
