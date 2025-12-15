'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  BarChart3,
  Users,
  GraduationCap,
  LogOut,
  ChevronRight,
  DollarSign,
  Calendar,
  CalendarCheck,
  UserCheck,
  Settings,
  Gift,
  Shield,
  Briefcase
} from 'lucide-react'

interface FranquiaSidebarProps {
  isMobile?: boolean
  onNavigate?: () => void
}

type MenuItem = {
  id: string
  label: string
  icon: any
  href?: string
  subItems?: { label: string; href: string; icon: any }[]
}

type MenuSection = {
  title?: string
  items: MenuItem[]
}

export default function FranquiaSidebar({ isMobile = false, onNavigate }: FranquiaSidebarProps = {}) {
  const { franquiaUser, academy, logout: franquiaLogout } = useFranquiaStore()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['users'])

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

  const menuGroups: MenuSection[] = [
    {
      items: [
        {
          id: 'overview',
          label: 'Visão Geral',
          icon: BarChart3,
          href: '/franquia/dashboard',
        }
      ]
    },
    {
      title: 'Operacional',
      items: [
        {
          id: 'agenda',
          label: 'Agenda Geral',
          icon: Calendar,
          href: '/franquia/dashboard/agenda',
        },
        {
          id: 'historico',
          label: 'Agendamentos',
          icon: CalendarCheck,
          href: '/franquia/dashboard/historico-agendamentos',
        },
        {
          id: 'checkins',
          label: 'Check-ins',
          icon: UserCheck,
          href: '/franquia/dashboard/historico-checkins',
        }
      ]
    },
    {
      title: 'Gestão',
      items: [
        {
          id: 'users',
          label: 'Usuários',
          icon: Users,
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
        }] : []),
        {
          id: 'finance',
          label: 'Financeiro',
          icon: DollarSign,
          href: '/franquia/dashboard/finance',
        }
      ]
    },
    {
      title: 'Configurações',
      items: [
        {
          id: 'politicas',
          label: 'Políticas',
          icon: Shield,
          href: '/franquia/dashboard/politicas',
        },
        {
          id: 'settings',
          label: 'Minha Franquia',
          icon: Settings,
          href: '/franquia/dashboard/configuracoes',
        }
      ]
    }
  ]

  const isActive = (href: string) => pathname === href
  const isGroupActive = (item: MenuItem) => {
    if (item.href && isActive(item.href)) return true
    if (item.subItems?.some(sub => isActive(sub.href))) return true
    return false
  }

  if (!franquiaUser) {
    return null
  }

  return (
    <div className={`${isMobile ? 'w-full h-full' : 'sidebar-desktop w-64 h-screen fixed left-0 top-0 z-50'} bg-meu-primary border-r border-white/5 flex flex-col shadow-2xl transition-all duration-300`}>

      {/* Header do Sidebar */}
      <div className="p-6 pb-2">
        <div className="flex flex-col items-center justify-center text-center gap-1 mb-6">
          <div className="relative w-28 h-28 flex-shrink-0 animate-in fade-in zoom-in duration-500">
            <Image
              src="/images/logo-fundobranco.png"
              alt="Logo Meu Personal"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg leading-tight -mt-8">Painel da Franquia</h2>
            <p className="text-xs text-meu-accent font-medium mt-1 truncate max-w-[200px]">{franquiaUser?.academyName || 'Academia'}</p>
          </div>
        </div>
      </div>

      {/* Menu de Navegação */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-meu-accent/40 hover:scrollbar-thumb-meu-accent/60 scrollbar-track-transparent">
        <nav className="space-y-6">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-2">
                  {group.title}
                </h3>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const expanded = expandedSections.includes(item.id) || isGroupActive(item)

                  return (
                    <div key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive(item.href)
                            ? 'bg-meu-accent text-meu-primary font-medium shadow-md shadow-meu-accent/10'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-meu-primary' : 'text-white/50 group-hover:text-white/80'}`} />
                            <span className="text-sm">{item.label}</span>
                          </div>
                        </Link>
                      ) : (
                        <div>
                          <button
                            onClick={() => toggleSection(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${isGroupActive(item)
                              ? 'text-white'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                              }`}
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className={`h-4 w-4 ${isGroupActive(item) ? 'text-meu-accent' : 'text-white/50 group-hover:text-white/80'}`} />
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 text-white/40 transition-transform duration-200 ${expanded ? 'rotate-90' : ''
                                }`}
                            />
                          </button>

                          {/* Subitems */}
                          {item.subItems && expanded && (
                            <div className="ml-4 mt-1 pl-3 border-l border-white/10 space-y-1">
                              {item.subItems.map((subItem) => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={onNavigate}
                                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${isActive(subItem.href)
                                    ? 'bg-white/5 text-meu-accent font-medium'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                  <span>{subItem.label}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer do Sidebar */}
      <div className="p-4 border-t border-white/5 bg-meu-primary-dark/30 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-4 px-2">
          {franquiaUser.avatar_url ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-meu-accent/50">
              <Image
                src={franquiaUser.avatar_url}
                alt={franquiaUser.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-meu-accent to-meu-accent/50 flex items-center justify-center text-xs font-bold text-meu-primary">
              {franquiaUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{franquiaUser.name}</p>
            <p className="text-xs text-white/40 truncate">
              {franquiaUser.role === 'FRANCHISE_ADMIN' ? 'Admin' : 'Usuário'}
            </p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-2"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="text-sm">Sair do Sistema</span>
        </Button>
      </div>
    </div>
  )
}
