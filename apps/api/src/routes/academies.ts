import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { auditService } from '../services/audit.service'

const router = Router()

// Helpers de validação de overrides (campos permitidos e faixas)
const POLICY_FIELDS: Record<string, { min?: number; max?: number }> = {
  credits_per_class: { min: 0 },
  class_duration_minutes: { min: 15 },
  checkin_tolerance_minutes: { min: 0, max: 180 },
  student_min_booking_notice_minutes: { min: 0, max: 10080 },
  student_reschedule_min_notice_minutes: { min: 0, max: 10080 },
  late_cancel_threshold_minutes: { min: 0, max: 1440 },
  late_cancel_penalty_credits: { min: 0 },
  no_show_penalty_credits: { min: 0 },
  teacher_minutes_per_class: { min: 0 },
  teacher_rest_minutes_between_classes: { min: 0, max: 180 },
  teacher_max_daily_classes: { min: 0, max: 48 },
  max_future_booking_days: { min: 1, max: 365 },
  max_cancel_per_month: { min: 0 }
}

function validateOverrides(input: any): string[] {
  if (!input || typeof input !== 'object') return ['overrides inválido']
  const errors: string[] = []
  for (const [k, v] of Object.entries(input)) {
    if (!(k in POLICY_FIELDS)) {
      errors.push(`campo não permitido: ${k}`)
      continue
    }
    const n = Number(v)
    if (!Number.isFinite(n)) {
      errors.push(`${k} inválido`)
      continue
    }
    const { min, max } = POLICY_FIELDS[k]
    if (min != null && n < min) errors.push(`${k} deve ser ≥ ${min}`)
    if (max != null && n > max) errors.push(`${k} deve ser ≤ ${max}`)
  }
  return errors
}

// GET /api/academies - Listar todas as academias (depreciado, usar /units)
router.get('/', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'TEACHER', 'PROFESSOR']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academies')
      .select('id, name, city, state, credits_per_class, class_duration_minutes, checkin_tolerance, franqueadora_id')
      .eq('is_active', true)
      .not('franqueadora_id', 'is', null) // ✅ Apenas academias com franqueadora válida
      .order('name')

    if (error) throw error

    res.json({ academies: data || [] })
  } catch (error: any) {
    console.error('Error fetching academies:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/academies/:id - Buscar academia específica (depreciado, usar /units)
router.get('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'TEACHER', 'PROFESSOR']), async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    res.json({ academy: data })
  } catch (error: any) {
    console.error('Error fetching academy:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/academies/:id - Atualizar academia (depreciado, usar /units)
router.put('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Restringir campos de políticas para perfis que não sejam FRANQUEADORA/SUPER_ADMIN
    const policyFields = ['credits_per_class', 'class_duration_minutes', 'checkin_tolerance'] as const
    // req.user.role pode ser 'FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', etc.
    const role = (req as any)?.user?.role
    if (role !== 'FRANQUEADORA' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      for (const field of policyFields) {
        if (field in updateData) {
          delete updateData[field]
        }
      }
    }

    // Validar ownership: academia precisa pertencer à franqueadora do admin (quando disponível)
    if (req.franqueadoraAdmin?.franqueadora_id) {
      const { data: current } = await supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', id)
        .single()
      if (current && current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    // Buscar valores atuais para audit
    const { data: beforePolicy } = await supabase
      .from('academies')
      .select('credits_per_class, class_duration_minutes, checkin_tolerance')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('academies')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ academy: data, message: 'Academia atualizada com sucesso' })

    // Audit log de mudanças de políticas (somente quando houve alteração por papel autorizado)
    try {
      if (role === 'FRANQUEADORA' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
        const changed: Record<string, any> = {}
        for (const f of policyFields) {
          if ((updateData as any)[f] !== undefined && beforePolicy && data && (beforePolicy as any)[f] !== (data as any)[f]) {
            changed[f] = { old: (beforePolicy as any)[f], new: (data as any)[f] }
          }
        }
        if (Object.keys(changed).length > 0) {
          await auditService.createLog({
            tableName: 'academies',
            recordId: id,
            operation: 'SENSITIVE_CHANGE',
            actorId: (req as any)?.user?.userId,
            actorRole: (req as any)?.user?.role,
            oldValues: beforePolicy || undefined,
            newValues: {
              credits_per_class: (data as any)?.credits_per_class,
              class_duration_minutes: (data as any)?.class_duration_minutes,
              checkin_tolerance: (data as any)?.checkin_tolerance
            },
            metadata: { changedFields: Object.keys(changed) },
            ipAddress: (req as any).ip,
            userAgent: (req as any).headers?.['user-agent']
          })
        }
      }
    } catch (logErr) {
      console.error('Audit log failed (academies update):', logErr)
    }
  } catch (error: any) {
    console.error('Error updating academy:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/academies/:id - Remover academia (depreciado, usar /units)
router.delete('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
  try {
    const { id } = req.params

    // Validar ownership
    if (req.franqueadoraAdmin?.franqueadora_id) {
      const { data: current, error: fetchError } = await supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', id)
        .single()
      if (fetchError || !current) {
        return res.status(404).json({ error: 'Academia não encontrada' })
      }
      if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const { error } = await supabase
      .from('academies')
      .delete()
      .eq('id', id)

    if (error) throw error

    return res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting academy:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/academies/:id/available-slots?date=YYYY-MM-DD
router.get('/:id/available-slots', async (req, res) => {
  try {
    // Desabilitar cache para sempre retornar dados atualizados
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('📍 GET /api/academies/:id/available-slots')
    const { id } = req.params
    const { date, teacher_id } = req.query as { date?: string; teacher_id?: string }
    console.log('Params:', { id, date, teacher_id })

    if (!date) {
      return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' })
    }

    // Calcular dia da semana (0-6, domingo = 0)
    const reqDate = new Date(`${date}T00:00:00Z`)
    const dow = reqDate.getUTCDay()
    console.log('Day of week:', dow)

    // Buscar configurações da academia (horários de funcionamento)
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('schedule, credits_per_class, class_duration_minutes')
      .eq('id', id)
      .single()

    if (academyError) throw academyError

    // Verificar se a academia está aberta neste dia
    console.log('📅 Schedule da academia:', academy?.schedule)
    let daySchedule = null
    let hasSchedule = false
    
    if (academy?.schedule && Array.isArray(academy.schedule) && academy.schedule.length > 0) {
      hasSchedule = true
      try {
        const schedule = typeof academy.schedule === 'string' 
          ? JSON.parse(academy.schedule) 
          : academy.schedule
        console.log('📋 Schedule parseado:', schedule)
        daySchedule = schedule.find((s: any) => s.day === String(dow))
        console.log('🗓️ Schedule do dia', dow, ':', daySchedule)
      } catch (e) {
        console.error('Erro ao parsear schedule:', e)
      }
      
      // Se tem schedule mas está fechado neste dia, retornar vazio
      if (!daySchedule || !daySchedule.isOpen) {
        console.log('🚫 Academia fechada neste dia')
        return res.json({ 
          slots: [], 
          message: 'Academia fechada neste dia',
          isOpen: false 
        })
      }
    } else {
      console.log('⚠️ Academia não tem schedule configurado, buscando slots diretamente')
    }

    // Buscar slots configurados para a academia nesse dia da semana
    console.log('🔍 Buscando slots para academia:', id, 'dia da semana:', dow, 'data:', date)
    const { data: slots, error: slotsError } = await supabase
      .from('academy_time_slots')
      .select('time, max_capacity, is_available')
      .eq('academy_id', id)
      .eq('day_of_week', dow)
      .eq('is_available', true)
      .order('time')

    console.log('📊 Slots encontrados:', slots?.length || 0)
    if (slots && slots.length > 0) {
      console.log('⏰ Horários:', slots.map(s => s.time))
    }
    if (slotsError) {
      console.error('Erro ao buscar slots:', slotsError)
      throw slotsError
    }

    // Filtrar slots dentro do horário de funcionamento (se houver schedule)
    let filteredSlots = slots || []
    if (hasSchedule && daySchedule) {
      filteredSlots = (slots || []).filter((s: any) => {
        const slotTime = String(s.time).substring(0, 5) // HH:MM
        return slotTime >= daySchedule.openingTime && slotTime <= daySchedule.closingTime
      })
      console.log('✂️ Slots filtrados por horário de funcionamento:', filteredSlots.length)
    } else {
      console.log('⏭️ Sem schedule, usando todos os slots encontrados')
    }

    // Buscar bookings do dia para essa academia (não cancelados)
    const startISO = new Date(`${date}T00:00:00Z`).toISOString()
    const endISO = new Date(`${date}T23:59:59Z`).toISOString()

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, date, status, status_canonical, teacher_id, student_id')
      .eq('unit_id', id)
      .gte('date', startISO)
      .lte('date', endISO)
      .neq('status_canonical', 'CANCELED')

    if (bookingsError) throw bookingsError
    

    // Mapear ocupação por HH:MM (UTC)
    // Se teacher_id fornecido: bloquear horários onde o professor já tem agendamento
    // Caso contrário: contar todos os agendamentos (capacidade geral)
    const occ: Record<string, number> = {}
    const teacherOccupiedSlots = new Set<string>() // Horários ocupados pelo professor específico
    
    for (const b of bookings || []) {
      const t = new Date(b.date)
      const hhmm = t.toISOString().substring(11, 16)
      
      // Se estamos buscando para um professor específico
      if (teacher_id) {
        // Bloquear horários onde ESTE professor já tem agendamento ativo ou bloqueio
        if (b.teacher_id === teacher_id) {
          if (b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'PAID' || b.status === 'BLOCKED') {
            teacherOccupiedSlots.add(hhmm)
          }
        }
      } else {
        // Sem teacher_id: contar ocupação geral (capacidade da academia)
        if (b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'PAID') {
          occ[hhmm] = (occ[hhmm] || 0) + 1
        }
      }
    }

    const result = filteredSlots.map((s: any) => {
      // s.time vem como HH:MM:SS
      const hhmm = String(s.time).substring(0, 5)
      
      let isFree: boolean
      let current: number
      let remaining: number
      
      if (teacher_id) {
        // Para professor específico: bloquear se ele já tem agendamento nesse horário
        isFree = !teacherOccupiedSlots.has(hhmm)
        current = teacherOccupiedSlots.has(hhmm) ? 1 : 0
        remaining = isFree ? 1 : 0
      } else {
        // Para busca geral: usar capacidade da academia
        current = occ[hhmm] || 0
        const max = s.max_capacity ?? 1
        remaining = Math.max(0, max - current)
        isFree = remaining > 0
      }
      
      return {
        time: hhmm,
        max_capacity: s.max_capacity ?? 1,
        current_occupancy: current,
        remaining,
        is_free: isFree,
        slot_duration: Math.max(15, academy?.class_duration_minutes ?? 60),
        slot_cost: Math.max(1, academy?.credits_per_class ?? 1)
      }
    })

    res.json({ 
      slots: result,
      isOpen: true,
      daySchedule: daySchedule ? {
        openingTime: daySchedule.openingTime,
        closingTime: daySchedule.closingTime
      } : null
    })
  } catch (error: any) {
    console.error('Error fetching available slots:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================
// Overrides e Política Efetiva
// ========================

// GET overrides da unidade
router.get('/:id/policies-overrides', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('academy_policy_overrides')
      .select('overrides')
      .eq('academy_id', id)
      .maybeSingle()
    if (error) throw error
    return res.json({ success: true, overrides: data?.overrides || {} })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// PUT overrides da unidade (apenas Franqueadora)
router.put('/:id/policies-overrides', requireAuth, requireRole(['FRANQUEADORA']), requireFranqueadoraAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const overrides = req.body?.overrides || {}

    // Validar ownership: academia precisa pertencer à franqueadora do admin
    const { data: academy, error: aErr } = await supabase
      .from('academies')
      .select('franqueadora_id')
      .eq('id', id)
      .single()
    if (aErr || !academy) return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' })
    if (academy.franqueadora_id !== req.franqueadoraAdmin?.franqueadora_id) return res.status(403).json({ error: 'Forbidden' })

    const errors = validateOverrides(overrides)
    if (errors.length) return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors })

    // Upsert overrides
    const { data: current } = await supabase
      .from('academy_policy_overrides')
      .select('id')
      .eq('academy_id', id)
      .maybeSingle()

    if (current) {
      const { data, error } = await supabase
        .from('academy_policy_overrides')
        .update({ overrides, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single()
      if (error) throw error
      return res.json({ success: true, overrides: data.overrides })
    } else {
      const { data, error } = await supabase
        .from('academy_policy_overrides')
        .insert({ academy_id: id, overrides })
        .select()
        .single()
      if (error) throw error
      return res.status(201).json({ success: true, overrides: data.overrides })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// DELETE override específico (apenas Franqueadora)
router.delete('/:id/policies-overrides/:field', requireAuth, requireRole(['FRANQUEADORA']), requireFranqueadoraAdmin, async (req, res) => {
  try {
    const { id, field } = req.params as { id: string; field: string }
    if (!(field in POLICY_FIELDS)) return res.status(400).json({ error: 'FIELD_NOT_ALLOWED' })

    // Validar ownership
    const { data: academy, error: aErr } = await supabase
      .from('academies')
      .select('franqueadora_id')
      .eq('id', id)
      .single()
    if (aErr || !academy) return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' })
    if (academy.franqueadora_id !== req.franqueadoraAdmin?.franqueadora_id) return res.status(403).json({ error: 'Forbidden' })

    const { data: current, error: cErr } = await supabase
      .from('academy_policy_overrides')
      .select('id, overrides')
      .eq('academy_id', id)
      .maybeSingle()
    if (cErr) throw cErr
    if (!current) return res.status(204).send()

    const newOverrides = { ...(current.overrides || {}) }
    delete (newOverrides as any)[field]

    const { error } = await supabase
      .from('academy_policy_overrides')
      .update({ overrides: newOverrides, updated_at: new Date().toISOString() })
      .eq('id', current.id)
    if (error) throw error
    return res.status(204).send()
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// GET política efetiva da unidade (merge entre publicada e overrides)
router.get('/:id/policies-effective', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PROFESSOR']), async (req, res) => {
  try {
    const { id } = req.params
    // Buscar academia e franqueadora
    const { data: academy, error: aErr } = await supabase
      .from('academies')
      .select('franqueadora_id')
      .eq('id', id)
      .single()
    if (aErr || !academy) return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' })

    // Buscar política publicada da franqueadora
    const { data: published, error: pErr } = await supabase
      .from('franchisor_policies')
      .select('*')
      .eq('franqueadora_id', academy.franqueadora_id)
      .eq('status', 'published')
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pErr) throw pErr

    const base: Record<string, any> = published ? {
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
    } : {
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

    // Buscar overrides
    const { data: ov } = await supabase
      .from('academy_policy_overrides')
      .select('overrides')
      .eq('academy_id', id)
      .maybeSingle()
    const overrides = (ov?.overrides || {}) as Record<string, any>

    const effective = { ...base, ...overrides }
    return res.json({ success: true, effective, published: !!published, overrides })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
