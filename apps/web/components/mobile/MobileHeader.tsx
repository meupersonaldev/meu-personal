'use client'

import { Bell, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface MobileHeaderProps {
  location?: string
  showNotifications?: boolean
}

export function MobileHeader({ location = 'Juazeiro do Norte, CE', showNotifications = true }: MobileHeaderProps) {
  const { user } = useAuthStore()

  return (
    <header className="md:hidden sticky top-0 bg-white border-b border-gray-200 z-40 safe-area-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <button className="flex items-center space-x-1 text-sm text-gray-700">
            <span className="font-medium">{location}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {showNotifications && (
            <button className="relative p-2 -mr-2">
              <Bell className="h-5 w-5 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#002C4E] to-[#27DFFF] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              Bem vindo, {user?.name?.split(' ')[0] || 'Professor'}
            </h2>
            <div className="flex items-center space-x-1 text-sm text-[#002C4E]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">1500 Créditos</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
