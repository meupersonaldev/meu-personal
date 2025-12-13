'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { toast } from 'sonner'
import {
  BarChart3,
  Building,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
  Package,
  GraduationCap,
  Briefcase,
  Settings2,
  BookOpen,
  UserPlus,
  Gift,
  Mail
} from 'lucide-react'

interface FranqueadoraSidebarProps {
  isMobile?: boolean
  onNavigate?: () => void
}

export default function FranqueadoraSidebar({ isMobile = false, onNavigate }: FranqueadoraSidebarProps = {}) {
  const { user, franqueadora, logout: franqueadoraLogout } = useFranqueadoraStore()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview'])
  const isPackagesActive = pathname?.startsWith('/franqueadora/pacotes')

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('franqueadora-auth')
    franqueadoraLogout()
    toast.success('Logout realizado com sucesso')
    router.push('/franqueadora')
  }

  const menuItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: BarChart3,
      href: '/franqueadora/dashboard',
      isExpanded: expandedSections.includes('overview')
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: Users,
      href: '/franqueadora/dashboard/usuarios',
      isExpanded: expandedSections.includes('users')
    },
    {
      id: 'leads',
      label: 'Leads de Franquias',
      icon: UserPlus,
      href: '/franqueadora/dashboard/leads',
      isExpanded: expandedSections.includes('leads')
    },
    {
      id: 'franchises',
      label: 'Franquias',
      icon: Building,
      isExpanded: expandedSections.includes('franchises'),
      subItems: [
        { label: 'Adicionar Franquia', href: '/franqueadora/dashboard/add-franchise', icon: Building },
        { label: 'Dados das Franquias', href: '/franqueadora/dashboard/dados-franquias', icon: BarChart3 }
      ]
    },
    {
      id: 'packages',
      label: 'Pacotes',
      icon: Package,
      isExpanded: expandedSections.includes('packages') || Boolean(isPackagesActive),
      subItems: [
        { label: 'Pacotes aluno', href: '/franqueadora/pacotes/aluno', icon: GraduationCap },
        { label: 'Pacotes professor', href: '/franqueadora/pacotes/professor', icon: Briefcase }
      ]
    },
    {
      id: 'credits',
      label: 'Créditos',
      icon: Gift,
      href: '/franqueadora/dashboard/creditos',
      isExpanded: expandedSections.includes('credits')
    },
    {
      id: 'policies',
      label: 'Políticas',
      icon: Settings2,
      href: '/franqueadora/dashboard/politicas',
      isExpanded: expandedSections.includes('policies')
    },
    {
      id: 'emails',
      label: 'Templates de Email',
      icon: Mail,
      href: '/franqueadora/dashboard/emails',
      isExpanded: expandedSections.includes('emails')
    },
    {
      id: 'docs',
      label: 'Documentação',
      icon: BookOpen,
      href: '/franqueadora/docs',
      isExpanded: expandedSections.includes('docs')
    }
  ]

  if (!user) {
    return null
  }

  return (
    <div className={`${isMobile ? 'w-full h-full' : 'sidebar-desktop w-64 h-screen fixed left-0 top-0 z-50'} bg-meu-primary border-r border-meu-primary/20 flex flex-col shadow-lg`}>

      {/* Header do Sidebar */}
      <div className="p-6 border-b border-meu-primary/20">
        {/* Logo */}
        <div className="mb-4">
          <Logo
            size="lg"
            variant="default"
            showText={false}
            href="/franqueadora/dashboard"
            className="justify-start"
          />
        </div>

        {/* Perfil da Franqueadora */}
        <div className="space-y-1 text-center" style={{ marginTop: '-79px' }}>
          <div className="text-sm text-white">Bem-vindo</div>
          <div className="font-semibold text-white text-lg">
            {user?.name || 'Admin'}
          </div>
          <div className="text-sm text-white">
            {franqueadora?.name || 'Franqueadora'}
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
                  onClick={onNavigate}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${pathname === item.href
                    ? 'bg-white text-meu-primary shadow-md font-semibold'
                    : 'text-white hover:text-white hover:underline hover:bg-meu-primary/80'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
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
                      onClick={onNavigate}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${pathname === subItem.href
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
