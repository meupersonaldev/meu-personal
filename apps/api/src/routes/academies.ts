import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /api/academies - Listar todas as academias (depreciado, usar /units)
router.get('/', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academies')
      .select('id, name, city, state, credits_per_class, class_duration_minutes')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    res.json({ academies: data || [] })
  } catch (error: any) {
    console.error('Error fetching academies:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/academies/:id - Buscar academia específica (depreciado, usar /units)
router.get('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
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
router.put('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

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
      .select('id, date, status, teacher_id, student_id')
      .eq('franchise_id', id)
      .gte('date', startISO)
      .lte('date', endISO)

    if (bookingsError) throw bookingsError
    
    console.log('📋 Reservas encontradas para este dia:', bookings?.length || 0)
    if (bookings && bookings.length > 0) {
      bookings.forEach(b => {
        const t = new Date(b.date)
        const hhmm = t.toISOString().substring(11, 16)
        console.log(`  - ${hhmm}: ID=${b.id.substring(0, 8)}..., status=${b.status}, teacher=${b.teacher_id?.substring(0, 8)}...`)
      })
    }

    // Mapear ocupação por HH:MM (UTC)
    // Contar: CONFIRMED, PENDING e BLOCKED do próprio professor (se teacher_id fornecido)
    const occ: Record<string, number> = {}
    for (const b of bookings || []) {
      // Contar CONFIRMED e PENDING de qualquer professor
      if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
        const t = new Date(b.date)
        const hhmm = t.toISOString().substring(11, 16)
        occ[hhmm] = (occ[hhmm] || 0) + 1
      }
      // Contar BLOCKED apenas do próprio professor (para não mostrar como disponível)
      else if (b.status === 'BLOCKED' && teacher_id && b.teacher_id === teacher_id) {
        const t = new Date(b.date)
        const hhmm = t.toISOString().substring(11, 16)
        occ[hhmm] = (occ[hhmm] || 0) + 999 // Marcar como totalmente ocupado
      }
    }
    console.log('🔢 Ocupação por horário (CONFIRMED + PENDING + BLOCKED do professor):', occ)

    const result = filteredSlots.map((s: any) => {
      // s.time vem como HH:MM:SS
      const hhmm = String(s.time).substring(0, 5)
      const current = occ[hhmm] || 0
      const max = s.max_capacity ?? 1
      const remaining = Math.max(0, max - current)
      return {
        time: hhmm,
        max_capacity: max,
        current_occupancy: current,
        remaining,
        is_free: remaining > 0,
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

export default router
