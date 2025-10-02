'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronDown,
  ChevronRight,
  QrCode,
  LayoutDashboard,
  CalendarCheck,
  DollarSign,
  Wallet,
  Users
} from 'lucide-react'

export default function ProfessorSidebar() {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  
  // Auto-expandir seções baseado na rota atual
  const getInitialExpandedSections = () => {
    const sections: string[] = []
    if (pathname.startsWith('/professor/agenda')) sections.push('agenda')
    if (pathname.startsWith('/professor/carteira') || pathname.startsWith('/professor/comprar-horas')) {
      sections.push('financeiro')
    }
    return sections
  }
  
  const [expandedSections, setExpandedSections] = useState<string[]>(getInitialExpandedSections())
  const [showComingSoon, setShowComingSoon] = useState(false)

  // Atualizar seções expandidas quando a rota mudar
  useEffect(() => {
    const newSections = getInitialExpandedSections()
    setExpandedSections(prev => {
      // Manter seções já expandidas manualmente + adicionar novas baseadas na rota
      const combined = [...new Set([...prev, ...newSections])]
      return combined
    })
  }, [pathname])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/professor/dashboard',
      isExpanded: expandedSections.includes('dashboard')
    },
    {
      id: 'alunos',
      label: 'Alunos',
      icon: Users,
      href: '/professor/alunos',
      isExpanded: expandedSections.includes('alunos')
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      isExpanded: expandedSections.includes('agenda'),
      subItems: [
        { label: 'Minha Agenda', href: '/professor/agenda', icon: CalendarCheck },
        { label: 'Reservar Espaço', href: '/professor/agenda/reservar-espaco', icon: Calendar }
      ]
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      isExpanded: expandedSections.includes('financeiro'),
      subItems: [
        { label: 'Carteira', href: '/professor/carteira', icon: Wallet },
        { label: 'Comprar Horas', href: '/professor/comprar-horas', icon: CreditCard }
      ]
    }
  ]

  return (
    <div className="w-64 h-screen fixed left-0 top-0 z-50 bg-meu-primary-dark flex flex-col shadow-2xl">
      
      {/* User Profile */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-white/30">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name || 'Avatar'} 
                className="w-full h-full object-cover rounded-full"
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
      </div>

      {/* Menu de Navegação */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.id}>
              {/* Item Principal */}
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-white text-meu-primary shadow-lg scale-105' 
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Subitens */}
              {item.subItems && item.isExpanded && (
                <div className="ml-6 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                        pathname === subItem.href
                          ? 'bg-white/20 text-white border-l-2 border-white' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <subItem.icon className="h-4 w-4" />
                      <span>{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        
        {/* Check-in */}
        <div className="mt-8 pt-4 border-t border-white/20">
          <div className="space-y-2">
            <button 
              onClick={() => setShowComingSoon(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              <QrCode className="h-5 w-5" />
              <span className="font-medium">Check-in</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Em Breve */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-meu-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Em Breve!</h2>
            <p className="text-gray-600 mb-6">
              A funcionalidade de Check-in estará disponível em breve.
            </p>
            <Button
              onClick={() => setShowComingSoon(false)}
              className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white"
            >
              Entendi
            </Button>
          </div>
        </div>
      )}

      {/* Footer do Sidebar */}
      <div className="p-4 border-t border-white/20 space-y-2">
        {/* Configurações */}
        <Link href="/professor/configuracoes">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-4 w-4 mr-3" />
            Configurações
          </Button>
        </Link>

        {/* Logout */}
        <Button
          onClick={logout}
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
