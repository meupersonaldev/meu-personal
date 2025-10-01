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

// GET /api/calendar/events?academy_id=xxx&start_date=2025-01-01&end_date=2025-01-31
router.get('/events', async (req, res) => {
  try {
    const { academy_id, start_date, end_date } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date e end_date são obrigatórios (YYYY-MM-DD)' })
    }

    // Buscar bookings do período
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        duration,
        status,
        notes,
        student:users!bookings_student_id_fkey (
          id,
          name,
          email
        ),
        teacher:users!bookings_teacher_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('franchise_id', academy_id)
      .gte('date', `${start_date}T00:00:00Z`)
      .lte('date', `${end_date}T23:59:59Z`)
      .order('date', { ascending: true })

    if (bookingsError) throw bookingsError

    // Transformar em eventos de calendário
    const events = (bookings || []).map((booking: any) => {
      const startDate = new Date(booking.date)
      const endDate = new Date(startDate.getTime() + (booking.duration || 60) * 60 * 1000)

      return {
        id: booking.id,
        title: `Aula: ${booking.student?.name || 'Aluno'} com ${booking.teacher?.name || 'Professor'}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        status: booking.status,
        studentId: booking.student?.id,
        studentName: booking.student?.name || 'Aluno não encontrado',
        studentEmail: booking.student?.email,
        teacherId: booking.teacher?.id,
        teacherName: booking.teacher?.name || 'Professor não encontrado',
        teacherEmail: booking.teacher?.email,
        duration: booking.duration,
        notes: booking.notes,
        color: getEventColor(booking.status)
      }
    })

    res.json({ events })
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/calendar/availability?academy_id=xxx&date=2025-01-15
router.get('/availability', async (req, res) => {
  try {
    const { academy_id, date } = req.query

    if (!academy_id || !date) {
      return res.status(400).json({ error: 'academy_id e date são obrigatórios' })
    }

    // Buscar configurações da academia (horários)
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('schedule, opening_time, closing_time')
      .eq('id', academy_id)
      .single()

    if (academyError) throw academyError

    // Calcular dia da semana
    const requestDate = new Date(`${date}T00:00:00Z`)
    const dayOfWeek = requestDate.getUTCDay()

    // Verificar se está aberto neste dia
    let isOpen = true
    let openingTime = academy?.opening_time || '06:00:00'
    let closingTime = academy?.closing_time || '22:00:00'

    if (academy?.schedule) {
      try {
        const schedule = typeof academy.schedule === 'string' 
          ? JSON.parse(academy.schedule) 
          : academy.schedule
        
        const daySchedule = schedule.find((s: any) => s.day === String(dayOfWeek))
        
        if (daySchedule) {
          isOpen = daySchedule.isOpen
          openingTime = daySchedule.openingTime
          closingTime = daySchedule.closingTime
        }
      } catch (e) {
        console.error('Error parsing schedule:', e)
      }
    }

    if (!isOpen) {
      return res.json({
        isOpen: false,
        message: 'Academia fechada neste dia',
        slots: []
      })
    }

    // Buscar bookings do dia
    const startISO = new Date(`${date}T00:00:00Z`).toISOString()
    const endISO = new Date(`${date}T23:59:59Z`).toISOString()

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('date, duration, status')
      .eq('franchise_id', academy_id)
      .gte('date', startISO)
      .lte('date', endISO)
      .neq('status', 'CANCELLED')

    if (bookingsError) throw bookingsError

    // Gerar slots de 1 hora entre abertura e fechamento
    const slots = []
    const [openHour, openMinute] = openingTime.split(':').map(Number)
    const [closeHour, closeMinute] = closingTime.split(':').map(Number)

    for (let hour = openHour; hour < closeHour; hour++) {
      const slotTime = `${String(hour).padStart(2, '0')}:00`
      
      // Verificar se há booking neste horário
      const hasBooking = (bookings || []).some((b: any) => {
        const bookingDate = new Date(b.date)
        const bookingHour = bookingDate.getUTCHours()
        return bookingHour === hour
      })

      slots.push({
        time: slotTime,
        available: !hasBooking,
        status: hasBooking ? 'occupied' : 'free'
      })
    }

    res.json({
      isOpen: true,
      openingTime,
      closingTime,
      slots
    })
  } catch (error: any) {
    console.error('Error fetching availability:', error)
    res.status(500).json({ error: error.message })
  }
})

// Helper function
function getEventColor(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return '#10B981' // green
    case 'COMPLETED':
      return '#3B82F6' // blue
    case 'CANCELLED':
      return '#EF4444' // red
    case 'PENDING':
      return '#F59E0B' // yellow
    default:
      return '#6B7280' // gray
  }
}

export default router
