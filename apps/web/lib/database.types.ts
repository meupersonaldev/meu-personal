/**
 * Tipos gerados automaticamente do Supabase
 * Gerado em: 2025-12-07
 * 
 * Para regenerar, use: npx supabase gen types typescript --project-id fstbhakmmznfdeluyexc
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums do banco de dados
export type UserRole = 'STUDENT' | 'TEACHER' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN'
export type GenderEnum = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'AVAILABLE' | 'BLOCKED'
export type BookingStatusEnum = 'RESERVED' | 'PAID' | 'CANCELED' | 'DONE' | 'AVAILABLE'
export type BookingSourceEnum = 'ALUNO' | 'PROFESSOR'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalType = 'teacher_registration' | 'student_registration'
export type AcademyStudentStatus = 'active' | 'inactive'
export type AcademyTeacherStatus = 'active' | 'inactive'
export type TransactionType = 'CREDIT_PURCHASE' | 'BOOKING_PAYMENT' | 'BOOKING_REFUND' | 'PLAN_PURCHASE'
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'CLOSED_WON' | 'CLOSED_LOST'
export type FranchiseAdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST'
export type NotificationType = 'new_teacher' | 'new_student' | 'payment_received' | 'plan_purchased' | 'teacher_approval_needed' | 'student_approval_needed' | 'booking_created' | 'booking_cancelled'
export type PaymentIntentStatusEnum = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED'
export type PaymentIntentTypeEnum = 'STUDENT_PACKAGE' | 'PROF_HOURS'
export type StudentClassTxType = 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE'
export type HourTxType = 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE'
export type TxSourceEnum = 'ALUNO' | 'PROFESSOR' | 'SYSTEM'
export type InvoiceStatusEnum = 'PENDING' | 'ISSUED' | 'CANCELED' | 'ERROR'
export type InvoiceTypeEnum = 'NFE' | 'NFC_E'

// Tipos das tabelas principais
export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  cpf: string | null
  cref: string | null
  cref_card_url: string | null
  gender: GenderEnum | null
  role: UserRole | null
  credits: number | null
  avatar_url: string | null
  is_active: boolean | null
  active: boolean | null
  password: string | null
  password_hash: string | null
  approval_status: string | null
  approved_at: string | null
  approved_by: string | null
  franchisor_id: string | null
  franchise_id: string | null
  asaas_customer_id: string | null
  birth_date: string | null
  first_class_used: boolean | null
  email_verified: boolean | null
  phone_verified: boolean | null
  last_login_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TeacherProfile {
  id: string
  user_id: string | null
  bio: string | null
  specialization: string[] | null
  hourly_rate: number
  rating: number | null
  rating_avg: number
  rating_count: number
  total_reviews: number | null
  total_sessions: number | null
  availability: Json | null
  is_available: boolean | null
  available_online: boolean | null
  available_in_person: boolean | null
  graduation: string | null
  cref: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Booking {
  id: string
  student_id: string | null
  teacher_id: string | null
  academy_id: string | null
  franchise_id: string | null
  unit_id: string | null
  date: string
  start_at: string | null
  end_at: string | null
  duration: number | null
  status: BookingStatus | null
  status_canonical: BookingStatusEnum | null
  source: BookingSourceEnum | null
  notes: string | null
  student_notes: string | null
  professor_notes: string | null
  credits_cost: number
  is_reserved: boolean | null
  cancellable_until: string | null
  time_slot_id: string | null
  series_id: string | null
  payment_intent_id: string | null
  asaas_payment_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Academy {
  id: string
  franqueadora_id: string | null
  name: string
  email: string
  phone: string | null
  address: string | null
  address_number: string
  province: string
  city: string | null
  state: string | null
  zip_code: string | null
  cpf_cnpj: string
  company_type: string | null
  birth_date: string | null
  opening_time: string | null
  closing_time: string | null
  checkin_tolerance: number | null
  schedule: Json | null
  settings: Json | null
  credits_per_class: number
  class_duration_minutes: number
  default_class_duration: number | null
  booking_advance_days: number | null
  franchise_fee: number | null
  royalty_percentage: number | null
  monthly_revenue: number | null
  contract_start_date: string | null
  contract_end_date: string | null
  asaas_account_id: string | null
  asaas_wallet_id: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface Franqueadora {
  id: string
  name: string
  email: string
  phone: string | null
  cnpj: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  asaas_wallet_id: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface Unit {
  id: string
  franchise_id: string | null
  academy_legacy_id: string | null
  name: string
  slug: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  capacity_per_slot: number
  opening_hours_json: Json
  metadata: Json
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StudentClassBalance {
  id: string
  student_id: string
  unit_id: string | null
  franqueadora_id: string
  total_purchased: number
  total_consumed: number
  locked_qty: number
  updated_at: string
}

export interface StudentClassTx {
  id: string
  student_id: string
  unit_id: string | null
  franqueadora_id: string
  type: StudentClassTxType
  source: TxSourceEnum
  qty: number
  booking_id: string | null
  meta_json: Json
  unlock_at: string | null
  created_at: string
}

export interface ProfHourBalance {
  id: string
  professor_id: string
  unit_id: string | null
  franqueadora_id: string
  available_hours: number
  locked_hours: number
  updated_at: string
}

export interface HourTx {
  id: string
  professor_id: string
  unit_id: string | null
  franqueadora_id: string
  type: HourTxType
  source: TxSourceEnum
  hours: number
  booking_id: string | null
  meta_json: Json
  unlock_at: string | null
  created_at: string
}

export interface StudentPackage {
  id: string
  unit_id: string | null
  franqueadora_id: string
  title: string
  classes_qty: number
  price_cents: number
  status: string
  metadata_json: Json
  created_at: string
  updated_at: string
}

export interface HourPackage {
  id: string
  unit_id: string | null
  franqueadora_id: string
  title: string
  hours_qty: number
  price_cents: number
  status: string
  metadata_json: Json
  created_at: string
  updated_at: string
}

export interface PaymentIntent {
  id: string
  type: PaymentIntentTypeEnum
  provider: string
  provider_id: string
  amount_cents: number
  status: PaymentIntentStatusEnum
  checkout_url: string | null
  payload_json: Json
  actor_user_id: string | null
  unit_id: string | null
  franqueadora_id: string
  created_at: string
  updated_at: string
}

export interface BookingSeries {
  id: string
  student_id: string | null
  teacher_id: string | null
  academy_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_type: string
  start_date: string
  end_date: string
  created_by: string | null
  created_by_role: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TeacherStudent {
  id: string
  teacher_id: string
  user_id: string | null
  name: string
  email: string
  phone: string | null
  cpf: string | null
  gender: string | null
  birth_date: string | null
  hourly_rate: number | null
  notes: string | null
  connection_status: string | null
  hide_free_class: boolean | null
  created_at: string
  updated_at: string
}

export interface AcademyTeacher {
  id: string
  academy_id: string | null
  teacher_id: string | null
  status: AcademyTeacherStatus | null
  commission_rate: number | null
  default_availability_seeded_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AcademyStudent {
  id: string
  academy_id: string | null
  student_id: string | null
  status: AcademyStudentStatus | null
  plan_id: string | null
  join_date: string | null
  last_activity: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ProfessorUnit {
  id: string
  professor_id: string
  unit_id: string
  active: boolean | null
  commission_rate: number | null
  first_association_at: string | null
  last_association_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface StudentUnit {
  id: string
  student_id: string
  unit_id: string
  active: boolean | null
  is_active: boolean | null
  first_booking_date: string | null
  last_booking_date: string | null
  total_bookings: number | null
  created_at: string | null
  updated_at: string | null
}

export interface Notification {
  id: string
  academy_id: string
  user_id: string | null
  actor_id: string | null
  type: string
  title: string
  message: string
  data: Json | null
  link: string | null
  role_scope: string | null
  read: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface FranchisorPolicy {
  id: string
  franqueadora_id: string
  status: string
  version: number
  effective_from: string | null
  credits_per_class: number
  class_duration_minutes: number
  checkin_tolerance_minutes: number
  student_min_booking_notice_minutes: number
  student_reschedule_min_notice_minutes: number
  late_cancel_threshold_minutes: number
  late_cancel_penalty_credits: number
  no_show_penalty_credits: number
  teacher_minutes_per_class: number
  teacher_rest_minutes_between_classes: number
  teacher_max_daily_classes: number
  max_future_booking_days: number
  max_cancel_per_month: number
  comment: string | null
  created_by: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

export interface FranqueadoraContact {
  id: string
  franqueadora_id: string | null
  user_id: string | null
  role: string
  status: string
  origin: string
  assigned_academy_ids: string[]
  last_assignment_at: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalRequest {
  id: string
  type: ApprovalType
  user_id: string | null
  academy_id: string | null
  status: ApprovalStatus | null
  requested_data: Json | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string | null
  updated_at: string | null
}

// Helper types para uso com Supabase client
export type Tables = {
  users: User
  teacher_profiles: TeacherProfile
  bookings: Booking
  academies: Academy
  franqueadora: Franqueadora
  units: Unit
  student_class_balance: StudentClassBalance
  student_class_tx: StudentClassTx
  prof_hour_balance: ProfHourBalance
  hour_tx: HourTx
  student_packages: StudentPackage
  hour_packages: HourPackage
  payment_intents: PaymentIntent
  booking_series: BookingSeries
  teacher_students: TeacherStudent
  academy_teachers: AcademyTeacher
  academy_students: AcademyStudent
  professor_units: ProfessorUnit
  student_units: StudentUnit
  notifications: Notification
  franchisor_policies: FranchisorPolicy
  franqueadora_contacts: FranqueadoraContact
  approval_requests: ApprovalRequest
}