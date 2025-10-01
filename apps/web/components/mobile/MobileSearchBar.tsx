'use client'

import { Search } from 'lucide-react'

interface MobileSearchBarProps {
  placeholder?: string
  onSearch?: (value: string) => void
}

export function MobileSearchBar({ 
  placeholder = 'Procure por personal, treino ou data...', 
  onSearch 
}: MobileSearchBarProps) {
  return (
    <div className="md:hidden px-4 py-3 bg-white">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#002C4E] focus:bg-white transition-all"
        />
      </div>
    </div>
  )
}
