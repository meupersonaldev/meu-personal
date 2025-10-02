import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { createNotification } from './notifications'

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
    const { student_id, teacher_id, franchise_id, status } = req.query

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url),
        franchise:academies!bookings_franchise_id_fkey (id, name, address)
      `)
      .order('date', { ascending: true })

    if (student_id) {
      query = query.eq('student_id', student_id)
    }
    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id)
    }
    if (franchise_id) {
      query = query.eq('franchise_id', franchise_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
      return res.status(500).json({ message: 'Erro ao buscar agendamentos' })
    }

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      studentId: booking.student_id,
      teacherId: booking.teacher_id,
      franchiseId: booking.franchise_id,
      franchiseName: booking.franchise?.name || '',
      franchiseAddress: booking.franchise?.address || '',
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
    console.log('Body recebido:', JSON.stringify(req.body, null, 2))
    
    const bookingData = bookingSchema.parse(req.body)
    console.log('✅ Validação passou. Dados parseados:', JSON.stringify(bookingData, null, 2))

    // Se tem student_id, é um agendamento real - verificar se aluno existe e créditos do professor
    if (bookingData.student_id) {
      // Verificar se aluno existe
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('id')
        .eq('id', bookingData.student_id)
        .single()

      if (studentError || !student) {
        return res.status(404).json({ message: 'Estudante não encontrado' })
      }

      // Verificar créditos do PROFESSOR (quem está reservando o espaço)
      const { data: teacher, error: teacherError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', bookingData.teacher_id)
        .single()

      if (teacherError || !teacher) {
        return res.status(404).json({ message: 'Professor não encontrado' })
      }

      if (teacher.credits < (bookingData.credits_cost || 1)) {
        return res.status(400).json({ message: 'Créditos insuficientes do professor' })
      }

      // Verificar se já existe reserva no mesmo horário e unidade
      const bookingDate = new Date(bookingData.date)
      const startOfHour = new Date(bookingDate)
      startOfHour.setMinutes(0, 0, 0)
      const endOfHour = new Date(bookingDate)
      endOfHour.setMinutes(59, 59, 999)

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('teacher_id', bookingData.teacher_id)
        .eq('franchise_id', bookingData.franchise_id)
        .gte('date', startOfHour.toISOString())
        .lte('date', endOfHour.toISOString())
        .neq('status', 'CANCELLED')

      if (existingBookings && existingBookings.length > 0) {
        return res.status(400).json({ 
          message: 'Você já tem uma reserva neste horário nesta unidade' 
        })
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

      // Debitar créditos do PROFESSOR
      const { error: creditError } = await supabase
        .from('users')
        .update({
          credits: teacher.credits - (bookingData.credits_cost || 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingData.teacher_id)

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

      // Se existir disponibilidade na MESMA unidade, deletar antes de criar nova
      const availableBookings = existingBookings?.filter(b => 
        b.student_id === null && b.franchise_id === bookingData.franchise_id && new Date(b.date).getTime() === new Date(bookingData.date).getTime()
      ) || []
      if (availableBookings.length > 0) {
        console.log('🗑️ Removendo disponibilidades antigas na mesma unidade...')
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

    // Buscar booking antes de atualizar para verificar mudança de status
    const { data: oldBooking } = await supabase
      .from('bookings')
      .select('status, teacher_id, credits_cost')
      .eq('id', id)
      .single()

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

    let refundInfo = null
    if (updateData.status === 'CANCELLED' && oldBooking && oldBooking.status !== 'CANCELLED' && oldBooking.status !== 'COMPLETED') {
      try {
        const creditsCost = oldBooking.credits_cost || 1
        
        if (oldBooking.teacher_id && creditsCost > 0) {
          const { data: teacher, error: creditsError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', oldBooking.teacher_id)
            .single()

          if (!creditsError && teacher) {
            const newCredits = teacher.credits + creditsCost
            
            const { error: updateError } = await supabase
              .from('users')
              .update({
                credits: newCredits,
                updated_at: new Date().toISOString()
              })
              .eq('id', oldBooking.teacher_id)
            
            if (!updateError) {
              refundInfo = {
                refunded: true,
                credits: creditsCost,
                recipient: 'professor',
                newBalance: newCredits
              }
            }
          }
        }
      } catch (refundError) {
        console.error('Erro no reembolso:', refundError)
      }
    }

    res.json({
      message: 'Agendamento atualizado com sucesso',
      booking: updatedBooking,
      refund: refundInfo
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
      .select('student_id, teacher_id, credits_cost, status')
      .eq('id', id)
      .single()
    if (getError || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    // Se NÃO tem aluno OU já está CANCELLED → DELETAR
    if (!booking.student_id || booking.status === 'CANCELLED') {
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

    // Se TEM aluno E não está cancelado → CANCELAR (manter histórico)
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

    if (booking.status !== 'COMPLETED' && booking.teacher_id) {
      const { data: teacher, error: creditsError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', booking.teacher_id)
        .single()

      if (!creditsError && teacher) {
        const newCredits = teacher.credits + booking.credits_cost
        
        await supabase
          .from('users')
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.teacher_id)
      }
    }

    res.json({ message: 'Agendamento cancelado com sucesso' })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/bookings/smart-booking - Criar agendamento inteligente (aluno existente ou externo)
router.post('/smart-booking', async (req, res) => {
  try {
    const smartBookingSchema = z.object({
      teacher_id: z.string().uuid(),
      franchise_id: z.string().uuid(),
      date: z.string(),
      duration: z.number().min(30).max(180).optional().default(60),
      notes: z.string().optional(),

      // Cenário 1: Aluno existente (veio pelo app)
      student_id: z.string().uuid().optional(),

      // Cenário 2: Aluno externo (professor traz)
      external_student: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional()
      }).optional(),

      // Forma de pagamento
      payment_source: z.enum(['student_credits', 'teacher_credits', 'academy_guest']),
      credits_cost: z.number().min(1).optional().default(1)
    })

    const validatedData = smartBookingSchema.parse(req.body)
    const { teacher_id, franchise_id, date, duration, notes, student_id, external_student, payment_source, credits_cost } = validatedData

    // Validação: precisa ter UM dos dois (student_id OU external_student)
    if (!student_id && !external_student) {
      return res.status(400).json({
        error: 'Você deve fornecer student_id (aluno existente) ou external_student (aluno novo)'
      })
    }

    if (student_id && external_student) {
      return res.status(400).json({
        error: 'Forneça apenas student_id OU external_student, não ambos'
      })
    }

    let finalStudentId = student_id

    // CENÁRIO 2: Aluno externo - criar novo usuário
    if (external_student) {
      // Verificar se email já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', external_student.email)
        .single()

      if (existingUser) {
        // Email existe - usar esse usuário
        finalStudentId = existingUser.id

        // Verificar se já está vinculado à academia
        const { data: academyLink } = await supabase
          .from('academy_students')
          .select('id')
          .eq('student_id', existingUser.id)
          .eq('academy_id', franchise_id)
          .single()

        // Se não está vinculado, vincular agora
        if (!academyLink) {
          await supabase
            .from('academy_students')
            .insert({
              student_id: existingUser.id,
              academy_id: franchise_id,
              status: 'active',
              plan_id: null // Aluno externo sem plano
            })
        }
      } else {
        // Email não existe - criar novo usuário
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            name: external_student.name,
            email: external_student.email,
            phone: external_student.phone,
            role: 'STUDENT',
            is_active: true
          })
          .select()
          .single()

        if (userError) {
          console.error('Erro ao criar usuário externo:', userError)
          return res.status(500).json({ error: 'Erro ao criar aluno externo' })
        }

        finalStudentId = newUser.id

        // Vincular à academia (sem plano)
        const { error: academyError } = await supabase
          .from('academy_students')
          .insert({
            student_id: newUser.id,
            academy_id: franchise_id,
            status: 'active',
            plan_id: null
          })

        if (academyError) {
          console.error('Erro ao vincular aluno à academia:', academyError)
          // Rollback: remover usuário criado
          await supabase.from('users').delete().eq('id', newUser.id)
          return res.status(500).json({ error: 'Erro ao vincular aluno à academia' })
        }
      }
    }

    // CENÁRIO 1: Aluno existente - validar créditos se necessário
    if (student_id && payment_source === 'student_credits') {
      const { data: subscription } = await supabase
        .from('student_subscriptions')
        .select('credits_remaining')
        .eq('student_id', student_id)
        .eq('status', 'active')
        .single()

      if (!subscription || subscription.credits_remaining < credits_cost) {
        return res.status(400).json({
          error: 'Aluno não possui créditos suficientes',
          available_credits: subscription?.credits_remaining || 0,
          required_credits: credits_cost
        })
      }
    }

    // Validar disponibilidade do horário na academia
    const startDate = new Date(date)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('franchise_id', franchise_id)
      .eq('teacher_id', teacher_id)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString())
      .neq('status', 'CANCELLED')

    if (conflictError) {
      console.error('Erro ao verificar conflitos:', conflictError)
      return res.status(500).json({ error: 'Erro ao validar disponibilidade' })
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return res.status(409).json({
        error: 'Professor já possui agendamento neste horário nesta academia'
      })
    }

    // Criar booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: finalStudentId,
        teacher_id,
        franchise_id,
        date: startDate.toISOString(),
        duration,
        notes,
        credits_cost,
        status: payment_source === 'student_credits' ? 'PENDING' : 'CONFIRMED',
        payment_source,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, phone),
        teacher:users!bookings_teacher_id_fkey (id, name, email),
        franchise:academies!bookings_franchise_id_fkey (id, name, city)
      `)
      .single()

    if (bookingError) {
      console.error('Erro ao criar booking:', bookingError)
      return res.status(500).json({ error: 'Erro ao criar agendamento' })
    }

    // Se pagamento com créditos do aluno, descontar
    if (payment_source === 'student_credits') {
      await supabase.rpc('decrement_student_credits', {
        p_student_id: finalStudentId,
        p_credits: credits_cost
      })
    }

    // Criar notificação para a academia
    await createNotification(
      franchise_id,
      'new_booking',
      'Novo Agendamento',
      `${booking.student?.name || 'Aluno'} agendou aula com ${booking.teacher?.name || 'Professor'} para ${new Date(booking.date).toLocaleString('pt-BR')}`,
      {
        booking_id: booking.id,
        student_id: finalStudentId,
        teacher_id,
        date: booking.date
      }
    )

    return res.status(201).json({
      booking,
      message: external_student
        ? 'Agendamento criado! Aluno externo cadastrado na academia.'
        : 'Agendamento criado com sucesso!',
      student_was_created: !!external_student
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
    }
    console.error('Erro no smart booking:', err)
    return res.status(500).json({ error: 'Erro interno ao criar agendamento' })
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