/**
 * Tipos de compatibilidade para as stores Zustand
 * Estes tipos estendem os tipos do banco de dados para adicionar campos
 * específicos usados nas stores e componentes do frontend
 */

import type {
  User as DbUser,
  Booking as DbBooking,
  Academy as DbAcademy,
  TeacherProfile as DbTeacherProfile,
  AcademyTeacher as DbAcademyTeacher,
  AcademyStudent as DbAcademyStudent,
  Notification as DbNotification,
  ApprovalRequest as DbApprovalRequest,
  BookingStatus,
  BookingStatusEnum,
  AcademyTeacherStatus,
  AcademyStudentStatus,
} from '@/lib/database.types'

// ============================================
// Teacher Types (para franquia-store)
// ============================================

/** Teacher com dados do perfil e vínculo com academia */
export interface Teacher {
  id: string
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean | null
  specialties: string[]
  status: AcademyTeacherStatus | 'pending'
  commission_rate?: number | null
  created_at: string | null
  // Dados do perfil de professor
  teacher_profiles?: {
    id: string
    bio?: string | null
    specialization?: string[] | null
    hourly_rate: number
    rating_avg: number
    rating_count: number
    is_available?: boolean | null
  } | null
}

// ============================================
// Student Types (para franquia-store)
// ============================================

/** Student com dados do vínculo com academia */
export interface Student {
  id: string
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  credits: number | null
  is_active?: boolean | null
  status: AcademyStudentStatus
  join_date: string | null
  last_activity: string | null
  planId?: string | null
  plan_id?: string | null
  created_at?: string | null
  // Dados de assinatura (se existir)
  student_subscriptions?: {
    id: string
    plan_id: string
    status: string
  }[] | null
}

// ============================================
// Booking Types (para professor-store e aluno-store)
// ============================================

/** Booking com dados expandidos de student e teacher */
export interface Booking extends Omit<DbBooking, 'date'> {
  date: string
  // Relacionamentos expandidos
  student?: {
    id: string
    name: string
    email: string
    phone?: string | null
    avatar_url?: string | null
  } | null
  teacher?: {
    id: string
    name: string
    email: string
    phone?: string | null
    avatar_url?: string | null
  } | null
  academy?: {
    id: string
    name: string
  } | null
  unit?: {
    id: string
    name: string
  } | null
  // Campo legado para compatibilidade
  otherBookings?: Booking[]
}

// ============================================
// Academy Types
// ============================================

/** Academy para uso nas stores */
export interface Academy extends DbAcademy {
  // Campos adicionais que podem vir de joins
  franqueadora?: {
    id: string
    name: string
  } | null
}

// ============================================
// User Types (para auth e professor stores)
// ============================================

/** User com campos extras para autenticação */
export interface User extends Omit<DbUser, 'password' | 'password_hash'> {
  // Campos extras que podem ser necessários
  teacher_profile?: DbTeacherProfile | null
}

// ============================================
// Notification Types
// ============================================

export interface Notification extends DbNotification {
  // Alias para compatibilidade
  is_read?: boolean
}

// ============================================
// ApprovalRequest Types
// ============================================

export interface ApprovalRequest extends DbApprovalRequest {
  // Relacionamentos expandidos
  user?: User | null
  academy?: Academy | null
  reviewer?: User | null
}

// ============================================
// Helper Types
// ============================================

/** Status de professor na academia (inclui 'pending' para aprovação) */
export type TeacherStatus = AcademyTeacherStatus | 'pending'

/** Status de aluno na academia */
export type StudentStatus = AcademyStudentStatus

/** Status de booking para UI */
export type BookingUIStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending'

/** Converte BookingStatus do banco para status de UI */
export function toBookingUIStatus(status: BookingStatus | BookingStatusEnum | null): BookingUIStatus {
  if (!status) return 'pending'
  
  switch (status) {
    case 'COMPLETED':
    case 'DONE':
    case 'PAID':
      return 'completed'
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled'
    case 'CONFIRMED':
    case 'RESERVED':
      return 'scheduled'
    default:
      return 'pending'
  }
}
