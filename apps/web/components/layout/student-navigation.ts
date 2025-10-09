'use client'

import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  GraduationCap
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
    href: '/aluno/inicio'
  },
  {
    id: 'professores',
    label: 'Professores',
    icon: Users,
    href: '/aluno/inicio?section=professores'
  },
  {
    id: 'agenda',
    label: 'Agendamentos',
    icon: Calendar,
    href: '/aluno/inicio?section=agendamentos'
  },
  {
    id: 'creditos',
    label: 'Comprar Créditos',
    icon: CreditCard,
    href: '/aluno/comprar'
  }
]

export const STUDENT_QUICK_LINKS: StudentQuickLink[] = [
  {
    id: 'aprenda',
    label: 'Como funciona',
    href: '/aluno/inicio?section=professores',
    icon: GraduationCap
  },
  {
    id: 'pacotes',
    label: 'Planos e Pacotes',
    href: '/aluno/comprar',
    icon: CreditCard
  }
]
