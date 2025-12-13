'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
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
  DollarSign,
  Calendar,
  CalendarCheck,
  UserCheck,
  Settings,
  Gift,
  Shield
} from 'lucide-react'

export default function FranquiaSidebar() {
  const { franquiaUser, academy, logout: franquiaLogout } = useFranquiaStore()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview'])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  // Verificar se a funcionalidade de créditos está habilitada
  const isCreditReleaseEnabled = academy?.settings?.manualCreditReleaseEnabled === true

  const menuItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: BarChart3,
      href: '/franquia/dashboard',
      isExpanded: expandedSections.includes('overview')
    },
    {
      id: 'agenda',
      label: 'Agenda da Academia',
      icon: Calendar,
      href: '/franquia/dashboard/agenda',
      isExpanded: expandedSections.includes('agenda')
    },
    {
      id: 'historico',
      label: 'Agendamentos',
      icon: CalendarCheck,
      href: '/franquia/dashboard/historico-agendamentos',
      isExpanded: expandedSections.includes('historico')
    },
    {
      id: 'checkins',
      label: 'Check-ins',
      icon: UserCheck,
      href: '/franquia/dashboard/historico-checkins',
      isExpanded: expandedSections.includes('checkins')
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
    // Créditos - só aparece se funcionalidade estiver habilitada
    ...(isCreditReleaseEnabled ? [{
      id: 'creditos',
      label: 'Créditos',
      icon: Gift,
      href: '/franquia/dashboard/creditos',
      isExpanded: expandedSections.includes('creditos')
    }] : []),
    {
      id: 'finance',
      label: 'Financeiro',
      icon: DollarSign,
      href: '/franquia/dashboard/finance',
      isExpanded: expandedSections.includes('finance')
    },
    {
      id: 'politicas',
      label: 'Políticas',
      icon: Shield,
      href: '/franquia/dashboard/politicas',
      isExpanded: expandedSections.includes('politicas')
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      href: '/franquia/dashboard/configuracoes',
      isExpanded: expandedSections.includes('settings')
    }
  ]

  if (!franquiaUser) {
    return null
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-meu-primary text-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay para mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 h-screen fixed left-0 top-0 z-50 bg-meu-primary border-r border-meu-primary/20 flex flex-col shadow-lg
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

      {/* Header do Sidebar */}
      <div className="p-6 border-b border-meu-primary/20">
        {/* Logo */}
        <div className="mb-2">
          <Logo 
            size="lg" 
            variant="default" 
            showText={false}
            href="/franquia/dashboard"
            className="justify-start"
          />
        </div>
        
        {/* Perfil da Franquia */}
        <div className="space-y-1 text-center" style={{ marginTop: '-77px' }}>
          <div className="text-sm text-white/80">
            Bem-vindo
          </div>
          <div className="font-semibold text-white text-lg">
            {franquiaUser?.name || 'Admin'}
          </div>
          <div className="text-xs text-white/70">
            {franquiaUser?.role === 'FRANCHISE_ADMIN' ? 'Administrador' : franquiaUser?.role}
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
    </>
  )
}
