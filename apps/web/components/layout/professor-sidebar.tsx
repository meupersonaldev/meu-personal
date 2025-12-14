'use client'

import { useState, useEffect, useCallback, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react'
import {
  PROFESSOR_NAV_ITEMS,
  PROFESSOR_QUICK_LINKS
} from '@/components/layout/professor-navigation'
import { cn } from '@/lib/utils'

type ProfessorSidebarProps = {
  variant?: 'desktop' | 'mobile'
  className?: string
  onNavigate?: () => void
  onClose?: () => void
}

export default function ProfessorSidebar({
  variant = 'desktop',
  className,
  onNavigate,
  onClose
}: ProfessorSidebarProps) {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()

  const getInitialExpandedSections = useCallback(() => {
    const sections: string[] = []
    if (pathname.startsWith('/professor/agenda')) sections.push('agenda')
    if (pathname.startsWith('/professor/carteira') || pathname.startsWith('/professor/comprar')) {
      sections.push('financeiro')
    }
    return sections
  }, [pathname])

  const [expandedSections, setExpandedSections] = useState<string[]>(getInitialExpandedSections())

  useEffect(() => {
    const newSections = getInitialExpandedSections()
    setExpandedSections((prev) => {
      const combined = [...new Set([...prev, ...newSections])]
      return combined
    })
  }, [pathname, getInitialExpandedSections])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const handleNavigate = () => {
    if (variant === 'mobile') {
      onClose?.()
    }
    onNavigate?.()
  }

  const handleLogout = () => {
    logout()
    if (variant === 'mobile') {
      onClose?.()
    }
    onNavigate?.()
  }

  const containerClasses = cn(
    variant === 'desktop'
      ? 'sidebar-desktop fixed left-0 top-0 z-50 w-64 h-screen'
      : 'w-64 h-full',
    'bg-meu-primary-dark flex flex-col shadow-2xl',
    className
  )

  const renderNavLink = (
    href: string,
    label: string,
    Icon: ElementType,
    isActive: boolean,
    extraClasses = ''
  ) => (
    <Link
      href={href}
      onClick={() => handleNavigate()}
      className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200',
        isActive
          ? 'bg-white text-meu-primary shadow-lg scale-105'
          : 'text-white/90 hover:bg-white/10 hover:text-white',
        extraClasses
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </Link>
  )

  return (
    <div className={containerClasses}>
      <div className="border-b border-white/20 p-4">
        <div className="flex items-start justify-between">
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
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-xs text-white/70">Personal Trainer</p>
            </div>
          </div>
          {variant === 'mobile' && (
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <nav className="space-y-2">
          {PROFESSOR_NAV_ITEMS.map((item) => {
            const hasSubItems = Boolean(item.subItems && item.subItems.length > 0)
            const isExpanded = hasSubItems && expandedSections.includes(item.id)
            const isActive = item.href ? pathname === item.href : false

            if (item.href && !hasSubItems) {
              return (
                <div key={item.id}>
                  {renderNavLink(item.href, item.label, item.icon, isActive)}
                </div>
              )
            }

            return (
              <div key={item.id}>
                <button
                  onClick={() => hasSubItems && toggleSection(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {hasSubItems && (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  )}
                </button>

                {hasSubItems && isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.subItems!.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={() => handleNavigate()}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm',
                          pathname === subItem.href
                            ? 'bg-white/20 text-white border-l-2 border-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="mt-8 pt-4 border-t border-white/20">
          <div className="space-y-2">
            {PROFESSOR_QUICK_LINKS.map((quickLink) => (
              <Link
                key={quickLink.id}
                href={quickLink.href}
                onClick={() => handleNavigate()}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                <quickLink.icon className="h-5 w-5" />
                <span className="font-medium">{quickLink.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/20 space-y-2">
        <Link href="/professor/configuracoes">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => handleNavigate()}
          >
            <Settings className="h-4 w-4 mr-3" />
            Configurações
          </Button>
        </Link>

        <Button
          onClick={handleLogout}
          variant="default"
          className="w-full justify-start bg-white/20 text-white hover:bg-white/30 transition-all duration-200 font-semibold shadow-md backdrop-blur-sm"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  )
}
