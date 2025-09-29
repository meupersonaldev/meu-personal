'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Calendar, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronDown,
  ChevronRight,
  BarChart3,
  FileText,
  User,
  Bell,
  QrCode,
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  DollarSign,
  Wallet,
  TrendingUp
} from 'lucide-react'

interface ProfessorSidebarProps {
  onShowQRCode?: () => void
}

export default function ProfessorSidebar({ onShowQRCode }: ProfessorSidebarProps = {}) {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard'])

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
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      isExpanded: expandedSections.includes('agenda'),
      subItems: [
        { label: 'Minhas Aulas', href: '/professor/agenda/aulas', icon: CalendarCheck },
        { label: 'Horários Livres', href: '/professor/agenda/horarios', icon: CalendarClock },
        { label: 'Reservar Espaço', href: '/professor/agenda/reservar', icon: Calendar }
      ]
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      isExpanded: expandedSections.includes('financeiro'),
      subItems: [
        { label: 'Carteira de Horas', href: '/professor/financeiro/carteira', icon: Wallet },
        { label: 'Comprar Horas', href: '/professor/financeiro/comprar', icon: CreditCard },
        { label: 'Histórico', href: '/professor/financeiro/historico', icon: TrendingUp }
      ]
    }
  ]

  return (
    <div className="w-64 h-screen fixed left-0 top-0 z-50 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      
      {/* Header do Sidebar */}
      <div className="p-6 border-b border-gray-200">
        {/* Perfil do Professor */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 bg-meu-cyan text-meu-primary-dark">
            <AvatarFallback className="bg-meu-cyan text-meu-primary-dark font-semibold text-lg">
              {user?.name?.charAt(0) || 'M'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-lg">
              {user?.name || 'Maria Santos'}
            </div>
            <div className="text-sm text-gray-600">
              Personal Trainer
            </div>
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
        
        {/* Check-in e Histórico */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            <button 
              onClick={onShowQRCode}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-meu-accent/20 hover:text-meu-primary transition-all duration-200"
            >
              <QrCode className="h-5 w-5" />
              <span className="font-medium">Check-in</span>
            </button>
            <Link
              href="/professor/historico"
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                pathname === '/professor/historico'
                  ? 'bg-meu-accent text-meu-primary-dark shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">Histórico</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer do Sidebar */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Toggle Dark/Light Mode - Temporariamente oculto */}
        {/* <Button
          onClick={toggleDarkMode}
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
        >
          <Moon className="h-4 w-4 mr-3" />
          Modo Escuro
        </Button> */}

        {/* Notificações */}
        <Button
          variant="ghost"
          className="w-full justify-start relative text-gray-700 hover:bg-gray-100"
        >
          <Bell className="h-4 w-4 mr-3" />
          Notificações
          <Badge className="ml-auto bg-meu-cyan text-meu-primary-dark text-xs">2</Badge>
        </Button>

        {/* Configurações */}
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
        >
          <Settings className="h-4 w-4 mr-3" />
          Configurações
        </Button>

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
