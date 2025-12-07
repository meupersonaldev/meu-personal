'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, Book, User, CreditCard } from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  active?: boolean
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: 'Dashboard',
      href: '/professor/dashboard',
      active: pathname === '/professor/dashboard'
    },
    {
      icon: Calendar,
      label: 'Agenda',
      href: '/professor/agenda',
      active: pathname?.startsWith('/professor/agenda')
    },

    {
      icon: User,
      label: 'Config',
      href: '/professor/configuracoes',
      active: pathname === '/professor/configuracoes'
    },
    {
      icon: CreditCard,
      label: 'Carteira',
      href: '/professor/carteira',
      active: pathname === '/professor/carteira'
    }
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${item.active
                ? 'text-[#002C4E]'
                : 'text-gray-500'
                }`}
            >
              <Icon className={`h-5 w-5 ${item.active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-xs ${item.active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
