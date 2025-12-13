'use strict'

import { supabase } from '../lib/supabase'

export interface EffectivePolicy {
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
}

const DEFAULT_POLICY: EffectivePolicy = {
  credits_per_class: 1,
  class_duration_minutes: 60,
  checkin_tolerance_minutes: 30,
  student_min_booking_notice_minutes: 0,
  student_reschedule_min_notice_minutes: 0,
  late_cancel_threshold_minutes: 120,
  late_cancel_penalty_credits: 1,
  no_show_penalty_credits: 1,
  teacher_minutes_per_class: 60,
  teacher_rest_minutes_between_classes: 10,
  teacher_max_daily_classes: 12,
  max_future_booking_days: 30,
  max_cancel_per_month: 0,
}

class PolicyService {
  /**
   * Busca a política efetiva para uma academia (franquia)
   * Faz merge entre política publicada da franqueadora e overrides da academia
   */
  async getEffectivePolicy(academyId: string): Promise<EffectivePolicy> {
    try {
      // Buscar academia e franqueadora
      const { data: academy, error: aErr } = await supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', academyId)
        .single()

      if (aErr || !academy?.franqueadora_id) {
        console.warn(`[PolicyService] Academia ${academyId} não encontrada ou sem franqueadora`)
        return DEFAULT_POLICY
      }

      // Buscar política publicada da franqueadora
      const { data: published } = await supabase
        .from('franchisor_policies')
        .select('*')
        .eq('franqueadora_id', academy.franqueadora_id)
        .eq('status', 'published')
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const base: EffectivePolicy = published ? {
        credits_per_class: published.credits_per_class,
        class_duration_minutes: published.class_duration_minutes,
        checkin_tolerance_minutes: published.checkin_tolerance_minutes,
        student_min_booking_notice_minutes: published.student_min_booking_notice_minutes,
        student_reschedule_min_notice_minutes: published.student_reschedule_min_notice_minutes,
        late_cancel_threshold_minutes: published.late_cancel_threshold_minutes,
        late_cancel_penalty_credits: published.late_cancel_penalty_credits,
        no_show_penalty_credits: published.no_show_penalty_credits,
        teacher_minutes_per_class: published.teacher_minutes_per_class,
        teacher_rest_minutes_between_classes: published.teacher_rest_minutes_between_classes,
        teacher_max_daily_classes: published.teacher_max_daily_classes,
        max_future_booking_days: published.max_future_booking_days,
        max_cancel_per_month: published.max_cancel_per_month,
      } : DEFAULT_POLICY

      // Buscar overrides da academia
      const { data: ov } = await supabase
        .from('academy_policy_overrides')
        .select('overrides')
        .eq('academy_id', academyId)
        .maybeSingle()

      const overrides = (ov?.overrides || {}) as Partial<EffectivePolicy>

      // Merge: overrides sobrescrevem base
      return { ...base, ...overrides }
    } catch (err) {
      console.error('[PolicyService] Erro ao buscar política efetiva:', err)
      return DEFAULT_POLICY
    }
  }

  /**
   * Valida se um agendamento pode ser criado baseado nas políticas
   */
  async validateBookingCreation(params: {
    academyId: string
    startAt: Date
    studentId?: string
  }): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    const policy = await this.getEffectivePolicy(params.academyId)
    const now = new Date()

    // Validar antecedência mínima para agendar
    if (policy.student_min_booking_notice_minutes > 0) {
      const minNoticeMs = policy.student_min_booking_notice_minutes * 60 * 1000
      const minBookingTime = new Date(now.getTime() + minNoticeMs)
      
      if (params.startAt < minBookingTime) {
        const hoursNotice = Math.ceil(policy.student_min_booking_notice_minutes / 60)
        errors.push(`Agendamento requer ${hoursNotice}h de antecedência mínima`)
      }
    }

    // Validar dias máximos no futuro
    if (policy.max_future_booking_days > 0) {
      const maxFutureMs = policy.max_future_booking_days * 24 * 60 * 60 * 1000
      const maxBookingDate = new Date(now.getTime() + maxFutureMs)
      
      if (params.startAt > maxBookingDate) {
        errors.push(`Agendamento não pode ser feito com mais de ${policy.max_future_booking_days} dias de antecedência`)
      }
    }

    // Validar limite de cancelamentos por mês (se studentId fornecido)
    if (params.studentId && policy.max_cancel_per_month > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', params.studentId)
        .eq('franchise_id', params.academyId)
        .eq('status_canonical', 'CANCELED')
        .gte('updated_at', monthStart.toISOString())
        .lte('updated_at', monthEnd.toISOString())

      if ((count || 0) >= policy.max_cancel_per_month) {
        errors.push(`Limite de ${policy.max_cancel_per_month} cancelamentos por mês atingido`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Valida se um cancelamento pode ser feito baseado nas políticas
   * Retorna se é late cancel e a penalidade aplicável
   */
  async validateCancellation(params: {
    academyId: string
    bookingStartAt: Date
    studentId?: string
  }): Promise<{ 
    canCancel: boolean
    isLateCancel: boolean
    penaltyCredits: number
    errors: string[] 
  }> {
    const errors: string[] = []
    const policy = await this.getEffectivePolicy(params.academyId)
    const now = new Date()

    // Verificar se é late cancel
    const lateCancelMs = policy.late_cancel_threshold_minutes * 60 * 1000
    const lateCancelCutoff = new Date(params.bookingStartAt.getTime() - lateCancelMs)
    const isLateCancel = now > lateCancelCutoff

    // Verificar limite de cancelamentos por mês
    if (params.studentId && policy.max_cancel_per_month > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', params.studentId)
        .eq('franchise_id', params.academyId)
        .eq('status_canonical', 'CANCELED')
        .gte('updated_at', monthStart.toISOString())
        .lte('updated_at', monthEnd.toISOString())

      if ((count || 0) >= policy.max_cancel_per_month) {
        errors.push(`Limite de ${policy.max_cancel_per_month} cancelamentos por mês atingido`)
      }
    }

    return {
      canCancel: errors.length === 0,
      isLateCancel,
      penaltyCredits: isLateCancel ? policy.late_cancel_penalty_credits : 0,
      errors
    }
  }

  /**
   * Valida se um professor pode criar mais aulas no dia
   */
  async validateTeacherDailyLimit(params: {
    academyId: string
    teacherId: string
    date: Date
  }): Promise<{ valid: boolean; currentCount: number; maxAllowed: number; error?: string }> {
    const policy = await this.getEffectivePolicy(params.academyId)
    
    if (policy.teacher_max_daily_classes <= 0) {
      return { valid: true, currentCount: 0, maxAllowed: 0 }
    }

    // Contar aulas do professor no dia
    const dayStart = new Date(params.date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(params.date)
    dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', params.teacherId)
      .eq('franchise_id', params.academyId)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', dayStart.toISOString())
      .lte('start_at', dayEnd.toISOString())

    const currentCount = count || 0
    const valid = currentCount < policy.teacher_max_daily_classes

    return {
      valid,
      currentCount,
      maxAllowed: policy.teacher_max_daily_classes,
      error: valid ? undefined : `Professor atingiu o limite de ${policy.teacher_max_daily_classes} aulas por dia`
    }
  }

  /**
   * Retorna a política padrão
   */
  getDefaultPolicy(): EffectivePolicy {
    return { ...DEFAULT_POLICY }
  }
}

export const policyService = new PolicyService()
