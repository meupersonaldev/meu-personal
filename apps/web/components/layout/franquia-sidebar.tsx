'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useFranquiaStore } from '@/lib/stores/franquia-supabase-store'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { toast } from 'sonner'
import {
  BarChart3,
  Users,
  GraduationCap,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  DollarSign,
  Calendar,
  CalendarCheck,
  FileText,
  UserCheck,
  Bell,
  CreditCard,
  Clock
} from 'lucide-react'

export default function FranquiaSidebar() {
  const { franquiaUser, logout: franquiaLogout, unreadNotifications } = useFranquiaStore()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('franquia-auth')
    franquiaLogout()
    toast.success('Logout realizado com sucesso')
    router.push('/franquia')
  }

  const menuItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: BarChart3,
      href: '/franquia/dashboard',
      isExpanded: expandedSections.includes('overview')
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: Bell,
      href: '/franquia/dashboard/notifications',
      isExpanded: expandedSections.includes('notifications'),
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    {
      id: 'approvals',
      label: 'Aprovações',
      icon: Clock,
      href: '/franquia/dashboard/approvals',
      isExpanded: expandedSections.includes('approvals')
    },
    {
      id: 'plans',
      label: 'Gestão de Planos',
      icon: CreditCard,
      href: '/franquia/dashboard/planos',
      isExpanded: expandedSections.includes('plans')
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: Users,
      isExpanded: expandedSections.includes('users'),
      subItems: [
        { label: 'Alunos', href: '/franquia/dashboard/alunos', icon: UserCheck },
        { label: 'Professores', href: '/franquia/dashboard/professores', icon: GraduationCap }
      ]
    },
    {
      id: 'operations',
      label: 'Operações',
      icon: Building2,
      isExpanded: expandedSections.includes('operations'),
      subItems: [
        { label: 'Agenda da Academia', href: '/franquia/dashboard/agenda', icon: Calendar },
        { label: 'Agendamentos', href: '/franquia/dashboard/agendamentos', icon: CalendarCheck },
        { label: 'Financeiro', href: '/franquia/dashboard/finance', icon: DollarSign },
        { label: 'Relatórios', href: '/franquia/dashboard/reports', icon: FileText }
      ]
    }
  ]

  if (!franquiaUser) {
    return null
  }

  return (
    <div className="w-64 h-screen fixed left-0 top-0 z-50 bg-meu-primary border-r border-meu-primary/20 flex flex-col shadow-lg">

      {/* Header do Sidebar */}
      <div className="p-6 border-b border-meu-primary/20">
        {/* Logo */}
        <div className="mb-4">
          <Logo 
            size="sm" 
            variant="default" 
            showText={false}
            href="/franquia/dashboard"
            className="justify-center"
          />
        </div>
        
        {/* Perfil da Franquia */}
        <div className="space-y-1 text-center">
          <div className="text-sm text-white">
            Bem-vindo
          </div>
          <div className="font-semibold text-white text-lg">
            Admin Meu Personal
          </div>
          <div className="text-sm text-white">
            Administrador
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
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-white text-meu-primary shadow-md font-semibold'
                      : 'text-white hover:text-white hover:underline hover:bg-meu-primary/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-white hover:bg-meu-primary/80 hover:text-meu-accent-cyan"
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
                          ? 'bg-white/10 text-white border-l-2 border-meu-accent-cyan font-medium'
                          : 'text-white/90 hover:text-white hover:underline hover:bg-white/5'
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
      <div className="p-4 border-t border-meu-primary/20 space-y-2">
        {/* Logout */}
        <Button
          onClick={handleLogout}
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