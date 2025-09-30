import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const router = Router()

// GET /api/academies - Listar todas as academias
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academies')
      .select('id, name, city, state')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    res.json({ academies: data || [] })
  } catch (error: any) {
    console.error('Error fetching academies:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/academies/:id - Buscar academia específica
router.get('/:id', async (req, res) => {
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

export default router

// GET /api/academies/:id/available-slots?date=YYYY-MM-DD
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params
    const { date } = req.query as { date?: string }

    if (!date) {
      return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' })
    }

    // Calcular dia da semana (0-6, domingo = 0)
    const reqDate = new Date(`${date}T00:00:00Z`)
    const dow = reqDate.getUTCDay()

    // Buscar slots configurados para a academia nesse dia da semana
    const { data: slots, error: slotsError } = await supabase
      .from('academy_time_slots')
      .select('time, max_capacity, is_available, duration_minutes')
      .eq('academy_id', id)
      .eq('day_of_week', dow)
      .eq('is_available', true)
      .order('time')

    if (slotsError) throw slotsError

    // Buscar bookings do dia para essa academia (não cancelados)
    const startISO = new Date(`${date}T00:00:00Z`).toISOString()
    const endISO = new Date(`${date}T23:59:59Z`).toISOString()

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('date, status')
      .eq('franchise_id', id)
      .gte('date', startISO)
      .lte('date', endISO)

    if (bookingsError) throw bookingsError

    // Mapear ocupação por HH:MM (UTC)
    const occ: Record<string, number> = {}
    for (const b of bookings || []) {
      if (b.status === 'CANCELLED') continue
      const t = new Date(b.date)
      const hhmm = t.toISOString().substring(11, 16) // HH:MM
      occ[hhmm] = (occ[hhmm] || 0) + 1
    }

    const result = (slots || []).map((s: any) => {
      // s.time vem como HH:MM:SS
      const hhmm = String(s.time).substring(0, 5)
      const current = occ[hhmm] || 0
      const max = s.max_capacity ?? 1
      const remaining = Math.max(0, max - current)
      const slot_duration = typeof s.duration_minutes === 'number' && s.duration_minutes > 0 ? s.duration_minutes : 60
      return {
        time: hhmm,
        max_capacity: max,
        current_occupancy: current,
        remaining,
        is_free: remaining > 0,
        slot_duration
      }
    })

    res.json({ slots: result })
  } catch (error: any) {
    console.error('Error fetching available slots:', error)
    res.status(500).json({ error: error.message })
  }
})
