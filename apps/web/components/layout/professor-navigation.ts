'use client'

import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  DollarSign,
  Wallet,
  CreditCard,
  QrCode,
  Clock,
  BookOpen
} from 'lucide-react'

export type IconType = typeof LayoutDashboard

export interface ProfessorSubItem {
  label: string
  href: string
  icon: IconType
}

export interface ProfessorNavItem {
  id: string
  label: string
  icon: IconType
  href?: string
  subItems?: ProfessorSubItem[]
}

export interface ProfessorQuickLink {
  id: string
  label: string
  href: string
  icon: IconType
}

export const PROFESSOR_NAV_ITEMS: ProfessorNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/professor/dashboard'
  },
  {
    id: 'alunos',
    label: 'Alunos',
    icon: Users,
    href: '/professor/alunos'
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    subItems: [
      {
        label: 'Minha Agenda',
        href: '/professor/agenda',
        icon: CalendarCheck
      },
      {
        label: 'Reservar Espaço',
        href: '/professor/agenda/reservar-espaco',
        icon: CalendarPlus
      }
    ]
  },
  {
    id: 'aulas',
    label: 'Aulas',
    icon: BookOpen,
    href: '/professor/aulas'
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    subItems: [
      {
        label: 'Carteira',
        href: '/professor/carteira',
        icon: Wallet
      },
      {
        label: 'Comprar Horas',
        href: '/professor/comprar-horas',
        icon: CreditCard
      }
    ]
  }
]

export const PROFESSOR_QUICK_LINKS: ProfessorQuickLink[] = [
  {
    id: 'checkin',
    label: 'Check-in',
    href: '/professor/checkin/scan',
    icon: QrCode
  },
  {
    id: 'checkins',
    label: 'Histórico de Check-ins',
    href: '/professor/checkins',
    icon: Clock
  }
]
