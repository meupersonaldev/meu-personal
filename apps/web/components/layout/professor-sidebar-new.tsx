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
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  CalendarClock,
  DollarSign,
  CreditCard,
  TrendingUp,
  BarChart3,
  FileText,
  PieChart,
  Settings,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  ChevronRight,
  Wallet
} from 'lucide-react'

interface SidebarProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

export default function ProfessorSidebarNew({ isDarkMode, toggleDarkMode }: SidebarProps) {
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
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: BarChart3,
      isExpanded: expandedSections.includes('relatorios'),
      subItems: [
        { label: 'Performance', href: '/professor/relatorios/performance', icon: TrendingUp },
        { label: 'Faturamento', href: '/professor/relatorios/faturamento', icon: PieChart },
        { label: 'Alunos', href: '/professor/relatorios/alunos', icon: FileText }
      ]
    }
  ]

  return (
    <div className={`w-64 h-screen fixed left-0 top-0 z-50 ${
      isDarkMode 
        ? 'bg-meu-primary-dark border-r border-gray-700' 
        : 'bg-white border-r border-gray-200'
    } flex flex-col shadow-lg`}>
      
      {/* Header do Sidebar */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-meu-accent rounded-xl flex items-center justify-center shadow-md">
            <Image 
              src="/images/logo.png" 
              alt="Meu Personal" 
              width={32} 
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
        </div>

        {/* Perfil do Professor */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 bg-meu-cyan text-meu-primary-dark">
            <AvatarFallback className="bg-meu-cyan text-meu-primary-dark font-semibold">
              {user?.name?.charAt(0) || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {user?.name || 'Professor'}
            </div>
            <div className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
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
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  onClick={() => toggleSection(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
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
                          : isDarkMode
                            ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
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
      </div>

      {/* Footer do Sidebar */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Toggle Dark/Light Mode */}
        <Button
          onClick={toggleDarkMode}
          variant="ghost"
          className={`w-full justify-start ${
            isDarkMode 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4 mr-3" />
              Modo Claro
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 mr-3" />
              Modo Escuro
            </>
          )}
        </Button>

        {/* Notificações */}
        <Button
          variant="ghost"
          className={`w-full justify-start relative ${
            isDarkMode 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Bell className="h-4 w-4 mr-3" />
          Notificações
          <Badge className="ml-auto bg-meu-cyan text-meu-primary-dark text-xs">2</Badge>
        </Button>

        {/* Configurações */}
        <Button
          variant="ghost"
          className={`w-full justify-start ${
            isDarkMode 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
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
