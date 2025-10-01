'use client'

import { ReactNode } from 'react'

interface MobileCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg'
}

export function MobileCard({ 
  children, 
  className = '', 
  onClick,
  padding = 'md'
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${paddingClasses[padding]} ${
        onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
