'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/buscar', label: 'Buscar', icon: Search },
  { href: '/aulas', label: 'Aulas', icon: Calendar },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-tab-bar">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

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