'use client'

import { useState } from 'react'
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
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard'])
  const [showComingSoon, setShowComingSoon] = useState(false)

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
    <div className="w-64 h-screen fixed left-0 top-0 z-50 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      
      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 bg-meu-cyan">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name || 'Avatar'} 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <AvatarFallback className="bg-meu-cyan text-meu-primary-dark font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500">Personal Trainer</p>
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
                      ? 'bg-meu-accent text-meu-primary-dark shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
                          ? 'bg-meu-cyan/20 text-meu-cyan border-l-2 border-meu-cyan' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            <button 
              onClick={() => setShowComingSoon(true)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-meu-accent/20 hover:text-meu-primary transition-all duration-200"
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
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Configurações */}
        <Link href="/professor/configuracoes">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
          >
            <Settings className="h-4 w-4 mr-3" />
            Configurações
          </Button>
        </Link>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="default"
          className="w-full justify-start bg-red-500 text-white hover:bg-red-600 transition-all duration-200 font-semibold shadow-md"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  )
}
