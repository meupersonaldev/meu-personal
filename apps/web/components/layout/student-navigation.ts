'use client'

import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Clock,
  History
} from 'lucide-react'

export interface StudentNavItem {
  id: string
  label: string
  icon: typeof LayoutDashboard
  href: string
}

export interface StudentQuickLink {
  id: string
  label: string
  href: string
  icon: typeof LayoutDashboard
}

export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/aluno/dashboard'
  },
  {
    id: 'professores',
    label: 'Professores',
    icon: Users,
    href: '/aluno/professores'
  },
  {
    id: 'creditos',
    label: 'Comprar Créditos',
    icon: CreditCard,
    href: '/aluno/comprar'
  }
  // Histórico de Aulas removido temporariamente
  // {
  //   id: 'historico',
  //   label: 'Histórico de Aulas',
  //   icon: History,
  //   href: '/aluno/historico'
  // }
]

export const STUDENT_QUICK_LINKS: StudentQuickLink[] = [
  {
    id: 'checkin',
    label: 'Check-in',
    href: '/aluno/checkin/scan',
    icon: QrCode
  },
  {
    id: 'checkins',
    label: 'Histórico de Check-ins',
    href: '/aluno/checkins',
    icon: Clock
  }
]
