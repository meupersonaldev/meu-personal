'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  PROFESSOR_NAV_ITEMS,
  PROFESSOR_QUICK_LINKS
} from '@/components/layout/professor-navigation'

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  // Navegação específica para cada tipo de usuário
  const getNavItems = () => {
    if (user?.role === 'STUDENT') {
      return [
        { href: '/aluno/inicio', label: 'Início', icon: Home },
        { href: '/aluno/buscar', label: 'Buscar', icon: Search },
        { href: '/aluno/aulas', label: 'Aulas', icon: Calendar },
        { href: '/aluno/perfil', label: 'Perfil', icon: User },
      ]
    }
    
    if (user?.role === 'TEACHER') {
      const baseItems = PROFESSOR_NAV_ITEMS.flatMap((item) => {
        if (item.href && (!item.subItems || item.subItems.length === 0)) {
          return [{ href: item.href, label: item.label, icon: item.icon }]
        }

        if (item.subItems && item.subItems.length > 0) {
          return item.subItems.map((subItem) => ({
            href: subItem.href,
            label: subItem.label,
            icon: subItem.icon
          }))
        }

        return []
      })

      const quickLinks = PROFESSOR_QUICK_LINKS.map((quickLink) => ({
        href: quickLink.href,
        label: quickLink.label,
        icon: quickLink.icon
      }))

      return [
        ...baseItems,
        ...quickLinks,
        { href: '/professor/configuracoes', label: 'Configurações', icon: Settings }
      ]
    }

    // Default para admin ou não logado
    return [
      { href: '/inicio', label: 'Início', icon: Home },
      { href: '/buscar', label: 'Buscar', icon: Search },
      { href: '/aulas', label: 'Aulas', icon: Calendar },
      { href: '/perfil', label: 'Perfil', icon: User },
    ]
  }

  const navItems = getNavItems()

  const justifyClass = navItems.length <= 4 ? 'justify-around' : 'justify-start'

  return (
    <nav className={cn('mobile-tab-bar', justifyClass)}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'mobile-tab-item',
              isActive && 'active'
            )}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
