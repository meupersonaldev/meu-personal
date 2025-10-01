import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const router = express.Router()

// Schema de validação para agendamento
const bookingSchema = z.object({
  student_id: z.string().uuid().nullable().optional(),
  teacher_id: z.string().uuid(),
  franchise_id: z.string().uuid().optional(),
  date: z.string(),
  duration: z.number().min(30).max(180).optional().default(60),
  notes: z.string().optional(),
  credits_cost: z.number().min(1).optional().default(1),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'AVAILABLE', 'BLOCKED']).optional().default('PENDING')
})

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'AVAILABLE', 'BLOCKED']).optional(),
  notes: z.string().optional()
})

// GET /api/bookings - Listar agendamentos
router.get('/', async (req, res) => {
  try {
    const { student_id, teacher_id, status } = req.query

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
      .order('date', { ascending: true })

    if (student_id) {
      query = query.eq('student_id', student_id)
    }
    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
      return res.status(500).json({ message: 'Erro ao buscar agendamentos' })
    }

    // Formatar dados para compatibilidade com o frontend
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      studentId: booking.student_id,
      teacherId: booking.teacher_id,
      franchiseId: booking.franchise_id,
      teacherName: booking.teacher?.name || '',
      teacherAvatar: booking.teacher?.avatar_url || '',
      studentName: booking.student?.name || '',
      date: booking.date,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      creditsCost: booking.credits_cost,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    }))

    res.json({ bookings: formattedBookings })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// GET /api/bookings/:id - Buscar agendamento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    // Formatar dados
    const formattedBooking = {
      id: booking.id,
      studentId: booking.student_id,
      teacherId: booking.teacher_id,
      franchiseId: booking.franchise_id,
      teacherName: booking.teacher?.name || '',
      teacherAvatar: booking.teacher?.avatar_url || '',
      studentName: booking.student?.name || '',
      date: booking.date,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      creditsCost: booking.credits_cost,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    }

    res.json({ booking: formattedBooking })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/bookings - Criar novo agendamento ou disponibilidade
router.post('/', async (req, res) => {
  try {
    console.log('📥 Recebendo requisição POST /api/bookings')
    console.log('Body recebido:', JSON.stringify(req.body, null, 2))
    
    const bookingData = bookingSchema.parse(req.body)
    console.log('✅ Validação passou. Dados parseados:', JSON.stringify(bookingData, null, 2))

    // Se tem student_id, é um agendamento real - verificar créditos
    if (bookingData.student_id) {
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', bookingData.student_id)
        .single()

      if (studentError || !student) {
        return res.status(404).json({ message: 'Estudante não encontrado' })
      }

      if (student.credits < (bookingData.credits_cost || 1)) {
        return res.status(400).json({ message: 'Créditos insuficientes' })
      }

      // Criar agendamento
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single()

      if (bookingError) {
        console.error('Erro ao criar agendamento:', bookingError)
        return res.status(500).json({ message: 'Erro ao criar agendamento' })
      }

      // Debitar créditos do estudante
      const { error: creditError } = await supabase
        .from('users')
        .update({
          credits: student.credits - (bookingData.credits_cost || 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingData.student_id)

      if (creditError) {
        console.error('Erro ao debitar créditos:', creditError)
      }

      return res.status(201).json({
        message: 'Agendamento criado com sucesso',
        booking: newBooking
      })
    } else {
      // Sem student_id = criar disponibilidade (professor marcando horário livre)
      console.log('🔵 Criando DISPONIBILIDADE (sem student_id)')
      console.log('Dados completos:', JSON.stringify(bookingData, null, 2))
      console.log('franchise_id recebido:', bookingData.franchise_id)
      
      // Verificar se já existe agendamento no mesmo horário (qualquer unidade)
      const bookingDate = new Date(bookingData.date)
      const startOfHour = new Date(bookingDate)
      startOfHour.setMinutes(0, 0, 0)
      const endOfHour = new Date(bookingDate)
      endOfHour.setMinutes(59, 59, 999)

      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, franchise_id, date, status, student_id')
        .eq('teacher_id', bookingData.teacher_id)
        .gte('date', startOfHour.toISOString())
        .lte('date', endOfHour.toISOString())
        .neq('status', 'CANCELLED')

      if (checkError) {
        console.error('Erro ao verificar agendamentos existentes:', checkError)
      }

      // Filtrar apenas agendamentos com aluno (PENDING, CONFIRMED, COMPLETED)
      const bookingsWithStudent = existingBookings?.filter(b => b.student_id !== null) || []

      if (bookingsWithStudent.length > 0) {
        // Buscar nome da academia do agendamento existente
        const existingFranchiseId = bookingsWithStudent[0].franchise_id
        let franchiseName = 'outra unidade'
        
        if (existingFranchiseId) {
          const { data: academy } = await supabase
            .from('academies')
            .select('name')
            .eq('id', existingFranchiseId)
            .single()
          
          if (academy) {
            franchiseName = academy.name
          }
        }

        const statusText = bookingsWithStudent[0].status === 'PENDING' ? 'pendente' : 
                          bookingsWithStudent[0].status === 'CONFIRMED' ? 'confirmado' : 'concluído'

        return res.status(400).json({ 
          message: `Você já tem um agendamento ${statusText} neste horário na ${franchiseName}`,
          existingBooking: bookingsWithStudent[0]
        })
      }

      // Se existir apenas disponibilidade (sem aluno), deletar antes de criar nova
      const availableBookings = existingBookings?.filter(b => b.student_id === null) || []
      if (availableBookings.length > 0) {
        console.log('🗑️ Removendo disponibilidades antigas no mesmo horário...')
        for (const oldBooking of availableBookings) {
          await supabase
            .from('bookings')
            .delete()
            .eq('id', oldBooking.id)
        }
      }
      
      console.log('⏳ Tentando inserir no Supabase...')
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single()

      if (bookingError) {
        console.error('❌ ERRO ao criar disponibilidade!')
        console.error('Erro objeto:', bookingError)
        console.error('Erro código:', bookingError.code)
        console.error('Erro mensagem:', bookingError.message)
        console.error('Erro detalhes:', bookingError.details)
        console.error('Erro hint:', bookingError.hint)
        return res.status(500).json({ 
          message: 'Erro ao criar disponibilidade',
          error: bookingError.message,
          code: bookingError.code,
          details: bookingError.details,
          hint: bookingError.hint
        })
      }
      
      console.log('✅ Disponibilidade criada com sucesso!', newBooking)

      return res.status(201).json({
        message: 'Disponibilidade criada com sucesso',
        booking: newBooking
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de validação Zod:', error.errors)
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('❌ ERRO INTERNO CATCH:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

// PUT /api/bookings/:id - Atualizar agendamento
// PATCH /api/bookings/:id - Atualizar agendamento parcialmente
const updateBookingHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params
    const updateData = updateBookingSchema.parse(req.body)

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar agendamento:', error)
      return res.status(500).json({ message: 'Erro ao atualizar agendamento' })
    }

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    res.json({
      message: 'Agendamento atualizado com sucesso',
      booking: updatedBooking
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

router.put('/:id', updateBookingHandler)
router.patch('/:id', updateBookingHandler)

// DELETE /api/bookings/:id - Deletar ou Cancelar agendamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Buscar agendamento
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('student_id, credits_cost, status')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    // Se NÃO tem aluno (disponibilidade vazia ou cancelado sem aluno) → DELETAR
    if (!booking.student_id) {
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Erro ao deletar agendamento:', deleteError)
        return res.status(500).json({ message: 'Erro ao deletar agendamento' })
      }

      return res.json({ message: 'Agendamento removido com sucesso' })
    }

    // Se TEM aluno → CANCELAR (manter histórico)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Erro ao cancelar agendamento:', updateError)
      return res.status(500).json({ message: 'Erro ao cancelar agendamento' })
    }

    // Reembolsar créditos se o agendamento não foi completado
    if (booking.status !== 'COMPLETED') {
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', booking.student_id)
        .single()

      if (!studentError && student) {
        await supabase
          .from('users')
          .update({
            credits: student.credits + booking.credits_cost,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.student_id)
      }
    }

    res.json({ message: 'Agendamento cancelado com sucesso' })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/bookings/checkin/validate - Validar check-in de professores via QR Code
router.post('/checkin/validate', async (req, res) => {
  try {
    const checkinSchema = z.object({
      academy_id: z.string().uuid(),
      teacher_id: z.string().uuid(),
      tolerance_before_min: z.number().int().min(0).max(180).optional().default(30),
      tolerance_after_min: z.number().int().min(0).max(180).optional().default(30)
    })

    const { academy_id, teacher_id, tolerance_before_min, tolerance_after_min } = checkinSchema.parse(req.body)

    const now = new Date()
    const broadWindowStart = new Date(now.getTime() - (tolerance_before_min + 120) * 60000).toISOString()
    const broadWindowEnd = new Date(now.getTime() + (tolerance_after_min + 120) * 60000).toISOString()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, date, duration, status, student_id')
      .eq('teacher_id', teacher_id)
      .eq('franchise_id', academy_id)
      .gte('date', broadWindowStart)
      .lte('date', broadWindowEnd)
      .neq('status', 'CANCELLED')

    if (error) {
      console.error('Erro ao buscar bookings para check-in:', error)
      return res.status(500).json({ allowed: false, message: 'Erro ao validar check-in' })
    }

    const candidate = (bookings || []).filter(b => b.student_id).find(b => {
      const start = new Date(b.date)
      const end = new Date(start.getTime() + ((b.duration || 60) * 60000))
      const startWithTolerance = new Date(start.getTime() - tolerance_before_min * 60000)
      const endWithTolerance = new Date(end.getTime() + tolerance_after_min * 60000)
      return now >= startWithTolerance && now <= endWithTolerance
    })

    if (!candidate) {
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id,
          booking_id: null,
          status: 'DENIED',
          reason: 'NO_VALID_BOOKING_IN_WINDOW',
          method: 'QRCODE',
          created_at: new Date().toISOString()
        })
      } catch (e) {
        // Tabela pode não existir
      }

      return res.status(200).json({
        allowed: false,
        message: 'Professor não possui agendamento válido neste horário desta unidade.'
      })
    }

    try {
      await supabase.from('checkins').insert({
        academy_id,
        teacher_id,
        booking_id: candidate.id,
        status: 'GRANTED',
        reason: null,
        method: 'QRCODE',
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // Tabela pode não existir
    }

    if (candidate.status === 'PENDING') {
      await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', candidate.id)
    }

    return res.status(200).json({
      allowed: true,
      booking: {
        id: candidate.id,
        start: new Date(candidate.date).toISOString(),
        duration: candidate.duration || 60
      },
      message: 'Acesso liberado'
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ allowed: false, message: 'Dados inválidos', errors: err.errors })
    }
    console.error('Erro inesperado no check-in:', err)
    return res.status(500).json({ allowed: false, message: 'Erro interno' })
  }
})

export default router