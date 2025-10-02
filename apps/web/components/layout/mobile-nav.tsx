'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, User, BarChart3, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'

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
      return [
        { href: '/professor/dashboard', label: 'Dashboard', icon: Home },
        { href: '/professor/agenda', label: 'Agenda', icon: Calendar },
        { href: '/professor/aulas', label: 'Aulas', icon: Clock },
        { href: '/professor/configuracoes', label: 'Config', icon: User },
        { href: '/professor/carteira', label: 'Carteira', icon: BarChart3 },
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