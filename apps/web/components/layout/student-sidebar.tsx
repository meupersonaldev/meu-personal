'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STUDENT_NAV_ITEMS,
  STUDENT_QUICK_LINKS
} from '@/components/layout/student-navigation'

type StudentSidebarProps = {
  variant?: 'desktop' | 'mobile'
  className?: string
  onClose?: () => void
}

export default function StudentSidebar({
  variant = 'desktop',
  className,
  onClose
}: StudentSidebarProps) {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (variant === 'mobile') {
      setExpanded(true)
    }
  }, [variant])

  const normalizedPath = pathname

  const isItemActive = (href: string) => {
    const [itemPath, query] = href.split('?')
    if (itemPath !== normalizedPath) {
      return false
    }
    if (!query) return true
    const params = new URLSearchParams(query)
    const section = params.get('section')
    if (!section) return true
    return searchParams.get('section') === section
  }

  const containerClasses = cn(
    variant === 'desktop'
      ? 'sidebar-desktop fixed left-0 top-0 z-50 h-screen w-64'
      : 'w-64 h-full',
    'bg-meu-primary-dark flex flex-col shadow-2xl',
    className
  )

  const handleNavigate = () => {
    if (variant === 'mobile') {
      onClose?.()
    }
  }

  return (
    <div className={containerClasses}>
      <div className="border-b border-white/20 p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-white/30">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'Avatar'}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="bg-white text-meu-primary font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name || 'Aluno'}
            </p>
            <p className="text-xs text-white/70">Aluno Meu Personal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <nav className="space-y-2">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleNavigate}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-200',
                  active
                    ? 'bg-white text-meu-primary shadow-lg'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 space-y-2 border-t border-white/20 pt-4">
          {STUDENT_QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={handleNavigate}
                className="flex items-center space-x-3 rounded-xl px-4 py-3 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/20 p-4">
        <Button
          onClick={() => {
            logout()
            handleNavigate()
          }}
          variant="default"
          className="w-full justify-start bg-white/20 text-white hover:bg-white/30 transition-all duration-200 font-semibold shadow-md backdrop-blur-sm"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
