import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { addAcademyToContact } from '../services/franqueadora-contacts.service'
import { createNotification, createUserNotification } from './notifications'
import { bookingCanonicalService } from '../services/booking-canonical.service'
import { requireAuth, requireRole } from '../middleware/auth'
import { requireApprovedTeacher } from '../middleware/approval'
import { createUserRateLimit, rateLimitConfig } from '../middleware/rateLimit'
import { asyncErrorHandler } from '../middleware/errorHandler'
import { normalizeBookingStatus } from '../utils/booking-status'
import { parse, format } from 'date-fns'

const router = express.Router()

// Schema de validação para criação de booking canônico
const createBookingSchema = z.object({
  source: z.enum(['ALUNO', 'PROFESSOR']),
  bookingId: z.string().uuid(), // ID do booking existente para atualizar (obrigatório)
  studentId: z.string().uuid().nullable().optional(),
  studentNotes: z.string().optional(),
  professorNotes: z.string().optional()
})

// Schema de validação para atualização de status
const updateBookingSchema = z.object({
  status: z.enum(['RESERVED', 'PAID', 'DONE', 'CANCELED']).optional(),
  notes: z.string().optional()
})

// GET /api/bookings - Listar agendamentos (endpoint canônico)
router.get(
  '/',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const {
      franchise_id,
      academy_id,
      status,
      from,
      to,
      teacher_id,
      student_id
    } = req.query
    const user = req.user

    // franchise_id e academy_id são o mesmo campo, aceitar ambos
    const franchiseId = Array.isArray(franchise_id)
      ? franchise_id[0]
      : franchise_id
    const academyId = Array.isArray(academy_id) ? academy_id[0] : academy_id
    const finalFranchiseId = franchiseId || academyId
    const teacherId = Array.isArray(teacher_id) ? teacher_id[0] : teacher_id
    const studentId = Array.isArray(student_id) ? student_id[0] : student_id

    const formatBooking = (booking: any) => {
      const academy = booking.academy || {}
      const student = booking.student || {}
      const teacher = booking.teacher || {}

      const franchiseName = academy.name || null
      const franchiseAddressParts = [
        academy.address,
        academy.city,
        academy.state
      ].filter(Boolean)

      // Determinar limite de cancelamento (fallback: 4h antes de date)
      const startIso = booking.start_at || booking.date
      const fallbackCutoff = startIso
        ? new Date(
            new Date(startIso).getTime() - 4 * 60 * 60 * 1000
          ).toISOString()
        : undefined

      return {
        id: booking.id,
        studentId: booking.student_id || undefined,
        studentName: student.name || undefined,
        teacherId: booking.teacher_id,
        teacherName: teacher.name || undefined,
        franchiseId: booking.franchise_id || undefined,
        franchiseName,
        franchiseAddress:
          franchiseAddressParts.filter(Boolean).join(', ') || undefined,
        date: booking.date,
        startAt: booking.start_at || undefined,
        endAt: booking.end_at || undefined,
        duration: booking.duration ?? 60,
        status: normalizeBookingStatus(
          booking.status,
          booking.status_canonical
        ),
        notes: booking.notes || undefined,
        creditsCost: booking.credits_cost ?? 0,
        source: booking.source || undefined,
        hourlyRate: booking.hourly_rate || undefined,
        cancellableUntil: booking.cancellable_until || fallbackCutoff,
        updatedAt: booking.updated_at || undefined
      }
    }

    if (!finalFranchiseId && !teacherId && !studentId) {
      return res.status(400).json({
        error:
          'franchise_id ou academy_id é obrigatório (ou teacher_id/student_id)'
      })
    }

    // Compatibilidade: permitir consultas apenas por student_id (legado)
    if (!finalFranchiseId && !teacherId && studentId) {
      if (
        (user.role === 'STUDENT' || user.role === 'ALUNO') &&
        user.userId !== studentId
      ) {
        return res
          .status(403)
          .json({ error: 'Acesso não autorizado a este aluno' })
      }

      // Query ORM equivalente ao SQL fornecido
      // SELECT * FROM bookings b
      // LEFT JOIN users t ON t.id = b.teacher_id
      // LEFT JOIN academies a ON a.id = b.franchise_id
      // WHERE b.student_id = :studentId AND b.status_canonical IN ('PAID', 'RESERVED')
      // ORDER BY COALESCE(b.start_at, b.date::timestamptz) ASC

      // Query ORM equivalente ao SQL fornecido
      // Primeiro buscar os bookings
      const { data: studentBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('student_id', studentId)
        .in('status_canonical', ['PAID', 'RESERVED', 'CANCELED']) // Incluir cancelados também
        .order('start_at', { ascending: true, nullsFirst: false })
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching student bookings:', error)
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
      }

      console.log(
        'Bookings raw from Supabase:',
        JSON.stringify(studentBookings, null, 2)
      )
      let results = studentBookings || []

      if (results.length === 0) {
        console.log('Nenhum booking encontrado para student_id:', studentId)
        return res.json({ bookings: [] })
      }

      // Buscar informações relacionadas (JOIN manual)
      const teacherIds = [
        ...new Set(results.map((b: any) => b.teacher_id).filter(Boolean))
      ]
      const franchiseIds = [
        ...new Set(results.map((b: any) => b.franchise_id).filter(Boolean))
      ]

      const [teachersData, academiesData] = await Promise.all([
        teacherIds.length > 0
          ? supabase
              .from('users')
              .select('id, name, email')
              .in('id', teacherIds)
          : Promise.resolve({ data: [], error: null }),
        franchiseIds.length > 0
          ? supabase
              .from('academies')
              .select('id, name, city, state, address')
              .in('id', franchiseIds)
          : Promise.resolve({ data: [], error: null })
      ])

      const teachersMap = (teachersData.data || []).reduce(
        (acc: any, teacher: any) => {
          acc[teacher.id] = teacher
          return acc
        },
        {}
      )

      const academiesMap = (academiesData.data || []).reduce(
        (acc: any, academy: any) => {
          acc[academy.id] = academy
          return acc
        },
        {}
      )

      console.log('Teachers map:', teachersMap)
      console.log('Academies map:', academiesMap)

      // Aplicar filtros adicionais se fornecidos
      if (status) {
        const statusStr = Array.isArray(status) ? status[0] : String(status)
        const statusTarget = normalizeBookingStatus(statusStr, null)
        results = results.filter((booking: any) => {
          const current = normalizeBookingStatus(
            booking.status,
            booking.status_canonical
          )
          return current === statusTarget
        })
      }

      if (from) {
        const fromDate = new Date(String(from))
        if (!Number.isNaN(fromDate.getTime())) {
          results = results.filter((booking: any) => {
            const bookingTime = booking.start_at
              ? new Date(booking.start_at)
              : new Date(booking.date)
            return bookingTime >= fromDate
          })
        }
      }

      if (to) {
        const toDate = new Date(String(to))
        if (!Number.isNaN(toDate.getTime())) {
          results = results.filter((booking: any) => {
            const bookingTime = booking.start_at
              ? new Date(booking.start_at)
              : new Date(booking.date)
            return bookingTime <= toDate
          })
        }
      }

      // Mapear resultados com os dados relacionados
      const bookings = results.map((booking: any) => {
        const teacher = teachersMap[booking.teacher_id] || {}
        const academy = academiesMap[booking.franchise_id] || {}

        console.log(
          'Processing booking:',
          booking.id,
          'teacher:',
          teacher,
          'academy:',
          academy
        )

        const franchiseName = academy.name || null
        const franchiseAddressParts = academy.id
          ? [academy.address, academy.city, academy.state].filter(Boolean)
          : []

        // Usar start_at se disponível, senão usar date
        const startTime = booking.start_at || booking.date
        const fallbackCutoff = startTime
          ? new Date(
              new Date(startTime).getTime() - 4 * 60 * 60 * 1000
            ).toISOString()
          : undefined

        const mapped = {
          id: booking.id,
          studentId: booking.student_id || undefined,
          teacherId: booking.teacher_id,
          teacherName: teacher.name || undefined,
          franchiseId: booking.franchise_id || undefined,
          franchiseName,
          franchiseAddress: franchiseAddressParts.join(', ') || undefined,
          date: booking.date,
          startAt: booking.start_at || undefined,
          endAt: booking.end_at || undefined,
          duration: booking.duration ?? 60,
          status: normalizeBookingStatus(
            booking.status,
            booking.status_canonical
          ),
          notes: booking.notes || undefined,
          creditsCost: booking.credits_cost ?? 0,
          cancellableUntil: booking.cancellable_until || fallbackCutoff,
          updatedAt: booking.updated_at || undefined
        }

        console.log('Mapped booking:', mapped)
        return mapped
      })

      console.log('Final bookings array:', bookings)
      return res.json({ bookings })
    }

    // Compatibilidade: permitir consultas apenas por teacher_id (legado)
    if (!finalFranchiseId && teacherId) {
      if (
        (user.role === 'TEACHER' || user.role === 'PROFESSOR') &&
        user.userId !== teacherId
      ) {
        return res
          .status(403)
          .json({ error: 'Acesso não autorizado a este professor' })
      }

      // Construir query base para o professor
      let teacherQuery = supabase
        .from('bookings')
        .select(
          `
        id,
        student_id,
        teacher_id,
        franchise_id,
        date,
        start_at,
        end_at,
        duration,
        status,
        status_canonical,
        notes,
        credits_cost,
        source,
        cancellable_until
      `
        )
        .eq('teacher_id', teacherId)

      // Filtro por intervalo de datas (from/to) quando fornecido.
      // Os parâmetros from/to vêm no formato YYYY-MM-DD (data local Brasil, UTC-3).
      // Para manter consistência com a UI (que usa datas locais), convertemos
      // o intervalo local para UTC usando o offset -03:00.
      if (from) {
        const fromStr = String(from)
        // 00:00 local (Brasil) -> UTC
        const fromUtc = new Date(`${fromStr}T00:00:00-03:00`).toISOString()
        teacherQuery = teacherQuery.gte('date', fromUtc)
      } else {
        // Caso não tenha "from", usar apenas bookings futuros para evitar excesso de registros
        const now = new Date().toISOString()
        teacherQuery = teacherQuery.gte('date', now)
      }

      if (to) {
        const toStr = String(to)
        // 23:59:59 local (Brasil) -> UTC
        const toUtc = new Date(`${toStr}T23:59:59.999-03:00`).toISOString()
        teacherQuery = teacherQuery.lte('date', toUtc)
      }

      const { data: teacherBookings, error } = await teacherQuery
        .order('date', { ascending: true })
        .limit(10000)

      if (error) {
        console.error('Error fetching teacher bookings (legacy):', error)
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
      }

      console.log(
        `📊 GET bookings para teacher ${teacherId}: ${
          teacherBookings?.length || 0
        } bookings encontrados`
      )

      let results = teacherBookings || []

      if (status) {
        const statusStr = Array.isArray(status) ? status[0] : String(status)
        const statusTarget = normalizeBookingStatus(statusStr, null)
        results = results.filter((booking: any) => {
          const current = normalizeBookingStatus(
            booking.status,
            booking.status_canonical
          )
          return current === statusTarget
        })
      }

      const studentIds = Array.from(
        new Set(
          results
            .map((booking: any) => booking.student_id)
            .filter((id: string | null | undefined): id is string =>
              Boolean(id)
            )
        )
      )

      const franchiseIds = Array.from(
        new Set(
          results
            .map((booking: any) => booking.franchise_id)
            .filter((id: string | null | undefined): id is string =>
              Boolean(id)
            )
        )
      )

      let studentsMap: Record<string, { id: string; name?: string }> = {}
      let academiesMap: Record<
        string,
        {
          id: string
          name?: string
          city?: string
          state?: string
          address?: string | null
        }
      > = {}
      let studentRatesMap: Record<string, number> = {}
      let professorRateMap: Record<string, number> = {}

      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', studentIds)

        if (studentsData) {
          studentsMap = studentsData.reduce((acc, curr) => {
            acc[curr.id] = curr
            return acc
          }, {} as typeof studentsMap)

          // Buscar hourly_rate dos alunos na tabela teacher_students
          const studentEmails = studentsData.map(s => s.email).filter(Boolean)
          if (studentEmails.length > 0) {
            const { data: teacherStudents } = await supabase
              .from('teacher_students')
              .select('email, hourly_rate')
              .eq('teacher_id', teacherId)
              .in('email', studentEmails)

            if (teacherStudents) {
              // Criar mapa de email -> hourly_rate
              const emailToRate = teacherStudents.reduce(
                (acc: any, ts: any) => {
                  if (ts.hourly_rate) acc[ts.email] = ts.hourly_rate
                  return acc
                },
                {}
              )

              // Mapear user_id -> hourly_rate
              studentsData.forEach(student => {
                if (student.email && emailToRate[student.email]) {
                  studentRatesMap[student.id] = emailToRate[student.email]
                }
              })
            }
          }
        }
      }

      // Buscar hourly_rate do professor
      const { data: profProfile } = await supabase
        .from('teacher_profiles')
        .select('hourly_rate')
        .eq('user_id', teacherId)
        .single()

      const professorHourlyRate = profProfile?.hourly_rate || 0

      if (franchiseIds.length > 0) {
        const { data: academiesData } = await supabase
          .from('academies')
          .select('id, name, city, state, address')
          .in('id', franchiseIds)

        if (academiesData) {
          academiesMap = academiesData.reduce((acc, curr) => {
            acc[curr.id] = curr
            return acc
          }, {} as typeof academiesMap)
        }
      }

      const bookings = results.map((booking: any) => {
        const student = booking.student_id
          ? studentsMap[booking.student_id]
          : undefined
        const academy = booking.franchise_id
          ? academiesMap[booking.franchise_id]
          : undefined

        const franchiseName = academy?.name || null
        const franchiseAddressParts = [
          academy?.address,
          academy?.city,
          academy?.state
        ].filter(Boolean)

        // Determinar hourly_rate baseado no source
        let hourlyRate = undefined
        if (booking.source === 'PROFESSOR' && booking.student_id) {
          // Professor agendou para aluno: usar hourly_rate do aluno
          hourlyRate = studentRatesMap[booking.student_id]
        } else if (booking.source === 'ALUNO') {
          // Aluno agendou: usar hourly_rate do professor
          hourlyRate = professorHourlyRate
        }

        return {
          id: booking.id,
          studentId: booking.student_id || undefined,
          studentName: student?.name || undefined,
          teacherId: booking.teacher_id,
          franchiseId: booking.franchise_id || undefined,
          franchiseName,
          franchiseAddress:
            franchiseAddressParts.filter(Boolean).join(', ') || undefined,
          date: booking.date,
          startAt: booking.start_at || undefined,
          endAt: booking.end_at || undefined,
          duration: booking.duration ?? 60,
          status: normalizeBookingStatus(
            booking.status,
            booking.status_canonical
          ),
          notes: booking.notes || undefined,
          creditsCost: booking.credits_cost ?? 0,
          source: booking.source || undefined,
          hourlyRate,
          cancellableUntil:
            booking.cancellable_until ||
            (booking.date
              ? new Date(
                  new Date(booking.date).getTime() - 4 * 60 * 60 * 1000
                ).toISOString()
              : undefined),
          updatedAt: booking.updated_at || undefined
        }
      })

      return res.json({ bookings })
    }

    // Verificar se o usuário tem acesso à academia/franquia
    if (user.role === 'STUDENT' || user.role === 'ALUNO') {
      const { data: studentAcademies } = await supabase
        .from('academy_students')
        .select('academy_id')
        .eq('student_id', user.userId)
        .eq('academy_id', finalFranchiseId)

      if (!studentAcademies || studentAcademies.length === 0) {
        // Verificar também via academy_teachers se o aluno está vinculado
        const { data: studentBookings } = await supabase
          .from('bookings')
          .select('franchise_id')
          .eq('student_id', user.userId)
          .eq('franchise_id', finalFranchiseId)
          .limit(1)

        if (!studentBookings || studentBookings.length === 0) {
          return res
            .status(403)
            .json({ error: 'Acesso não autorizado a esta academia' })
        }
      }
    }

    if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
      const { data: teacherAcademies } = await supabase
        .from('academy_teachers')
        .select('academy_id')
        .eq('teacher_id', user.userId)
        .eq('academy_id', finalFranchiseId)
        .eq('status', 'active')

      if (!teacherAcademies || teacherAcademies.length === 0) {
        return res
          .status(403)
          .json({ error: 'Acesso não autorizado a esta academia' })
      }
    }

    const { data: franchiseBookings, error } = await supabase
      .from('bookings')
      .select(
        `
      id,
      student_id,
      teacher_id,
      franchise_id,
      date,
      start_at,
      end_at,
      duration,
      status,
      status_canonical,
      notes,
      credits_cost,
      cancellable_until,
      student:users!bookings_student_id_fkey (id, name),
      teacher:users!bookings_teacher_id_fkey (id, name),
      academy:academies!bookings_franchise_id_fkey (id, name, city, state, address)
    `
      )
      .eq('franchise_id', finalFranchiseId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching bookings by franchise:', error)
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
    }

    let results = franchiseBookings || []

    if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
      results = results.filter(
        (booking: any) => booking.teacher_id === user.userId
      )
    }

    if (user.role === 'STUDENT' || user.role === 'ALUNO') {
      results = results.filter(
        (booking: any) => booking.student_id === user.userId
      )
    }

    if (status) {
      const statusStr = Array.isArray(status) ? status[0] : String(status)
      const statusTarget = normalizeBookingStatus(statusStr, null)
      results = results.filter((booking: any) => {
        const current = normalizeBookingStatus(
          booking.status,
          booking.status_canonical
        )
        return current === statusTarget
      })
    }

    if (from) {
      const fromDate = new Date(String(from))
      if (!Number.isNaN(fromDate.getTime())) {
        results = results.filter(
          (booking: any) => new Date(booking.date) >= fromDate
        )
      }
    }

    if (to) {
      const toDate = new Date(String(to))
      if (!Number.isNaN(toDate.getTime())) {
        results = results.filter(
          (booking: any) => new Date(booking.date) <= toDate
        )
      }
    }

    const bookings = results.map(formatBooking)
    res.json({ bookings })
  })
)

// GET /api/bookings/:id - Buscar agendamento por ID (endpoint canônico)
router.get(
  '/:id',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        `
      *,
      student:users!bookings_student_id_fkey (id, name, email, avatar_url),
      professor:users!bookings_professor_id_fkey (id, name, email, avatar_url),
      unit:units (id, name, city, state)
    `
      )
      .eq('id', id)
      .single()

    if (error || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    // Verificar permissão de acesso
    const hasAccess =
      booking.student_id === user.userId ||
      booking.professor_id === user.userId ||
      ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role)

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso não autorizado' })
    }

    res.json({ booking })
  })
)

// Schema para criar disponibilidade (professor)
const createAvailabilitySchema = z.object({
  source: z.literal('PROFESSOR'),
  professorId: z.string().uuid(),
  academyId: z.string().uuid(),
  startAt: z.string().min(1, 'startAt não pode ser vazio'),
  endAt: z.string().min(1, 'endAt não pode ser vazio'),
  status: z.literal('AVAILABLE').optional(),
  professorNotes: z.string().optional()
})

const createBulkAvailabilitySchema = z.object({
  source: z.literal('PROFESSOR'),
  professorId: z.string().uuid(),
  academyId: z.string().uuid(),
  slots: z
    .array(
      z.object({
        startAt: z.string().min(1, 'startAt não pode ser vazio'),
        endAt: z.string().min(1, 'endAt não pode ser vazio'),
        professorNotes: z.string().optional()
      })
    )
    .min(1)
})

// POST /api/bookings/availability - Criar disponibilidade do professor
router.post(
  '/availability',
  requireAuth,
  requireRole(['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA']),
  requireApprovedTeacher,
  asyncErrorHandler(async (req, res) => {
    console.log(
      '[POST /api/bookings/availability] Criando disponibilidade:',
      JSON.stringify(req.body, null, 2)
    )

    const data = createAvailabilitySchema.parse(req.body)
    const user = req.user

    // Verificar se o professor está criando para si mesmo
    if (
      data.professorId !== user.userId &&
      !['FRANQUIA', 'FRANQUEADORA'].includes(user.role)
    ) {
      return res
        .status(403)
        .json({ error: 'Você só pode criar disponibilidade para si mesmo' })
    }

    // Deduplicação básica: evitar criar mais de um AVAILABLE para o mesmo professor/unidade/start_at
    const { data: existing, error: existingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('teacher_id', data.professorId)
      .eq('franchise_id', data.academyId)
      .eq('status_canonical', 'AVAILABLE')
      .eq('start_at', data.startAt)
      .limit(1)

    if (existingError) {
      console.error(
        '[POST /api/bookings/availability] Erro ao verificar duplicidade:',
        existingError
      )
    }

    if (existing && existing.length > 0) {
      // Já existe disponibilidade para este horário; considerar como sucesso idempotente
      return res.status(200).json({
        booking: existing[0],
        created: false
      })
    }

    const booking = await bookingCanonicalService.createBooking({
      source: 'PROFESSOR',
      professorId: data.professorId,
      franchiseId: data.academyId,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      status: 'AVAILABLE',
      professorNotes: data.professorNotes
    })

    return res.status(201).json({ booking })
  })
)

// POST /api/bookings/availability/bulk - Criar disponibilidades em bulk
router.post(
  '/availability/bulk',
  requireAuth,
  requireRole(['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA']),
  requireApprovedTeacher,
  asyncErrorHandler(async (req, res) => {
    console.log(
      '[POST /api/bookings/availability/bulk] Criando disponibilidades em bulk:',
      JSON.stringify(req.body, null, 2)
    )

    const data = createBulkAvailabilitySchema.parse(req.body)
    const user = req.user

    // Verificar se o professor está criando para si mesmo
    if (
      data.professorId !== user.userId &&
      !['FRANQUIA', 'FRANQUEADORA'].includes(user.role)
    ) {
      return res
        .status(403)
        .json({ error: 'Você só pode criar disponibilidade para si mesmo' })
    }

    const nowIso = new Date().toISOString()

    // Remover duplicados dentro do próprio payload (mesmo startAt repetido)
    // O schema já valida que startAt e endAt não são vazios, então podemos confiar nos valores
    const uniqueSlotsMap = new Map<
      string,
      { startAt: string; endAt: string; professorNotes?: string }
    >()
    for (const slot of data.slots) {
      if (!uniqueSlotsMap.has(slot.startAt)) {
        uniqueSlotsMap.set(slot.startAt, {
          startAt: slot.startAt,
          endAt: slot.endAt,
          professorNotes: slot.professorNotes
        })
      }
    }
    const uniqueSlots = Array.from(uniqueSlotsMap.values())

    // Deduplicação contra o banco: buscar slots AVAILABLE existentes para este professor/unidade
    const startAts = uniqueSlots.map(slot => slot.startAt)
    const { data: existing, error: existingError } = await supabase
      .from('bookings')
      .select('id, start_at')
      .eq('teacher_id', data.professorId)
      .eq('franchise_id', data.academyId)
      .eq('status_canonical', 'AVAILABLE')
      .in('start_at', startAts)

    if (existingError) {
      console.error(
        '[POST /api/bookings/availability/bulk] Erro ao verificar duplicidade:',
        existingError
      )
    }

    const existingSet = new Set((existing || []).map(b => b.start_at as string))

    const rows = uniqueSlots
      .filter(slot => !existingSet.has(slot.startAt))
      .map(slot => {
        const start = new Date(slot.startAt)

        return {
          source: 'PROFESSOR',
          student_id: null,
          teacher_id: data.professorId,
          franchise_id: data.academyId,
          // Usar a mesma convenção dos demais fluxos: date = start_at
          date: start.toISOString(),
          start_at: slot.startAt,
          end_at: slot.endAt,
          duration: Math.max(
            15,
            Math.round(
              (new Date(slot.endAt).getTime() - start.getTime()) / (60 * 1000)
            )
          ),
          status_canonical: 'AVAILABLE',
          status: 'AVAILABLE',
          professor_notes: slot.professorNotes ?? 'Horário disponível',
          cancellable_until: null,
          created_at: nowIso,
          updated_at: nowIso
        }
      })

    if (rows.length === 0) {
      // Nada novo para criar — já existiam todos os horários solicitados
      return res.status(200).json({
        created: 0,
        bookings: [],
        skipped: uniqueSlots.length
      })
    }

    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert(rows)
      .select('id, start_at, end_at')

    if (error) {
      console.error(
        '[POST /api/bookings/availability/bulk] Erro ao criar disponibilidades:',
        error
      )
      return res
        .status(500)
        .json({ error: 'Erro ao criar disponibilidades em bulk' })
    }

    return res.status(201).json({
      created: inserted?.length || 0,
      bookings: inserted || []
    })
  })
)

// POST /api/bookings - Atualizar agendamento existente (aluno reservando slot)
router.post(
  '/',
  requireAuth,
  requireRole([
    'STUDENT',
    'ALUNO',
    'TEACHER',
    'PROFESSOR',
    'FRANQUIA',
    'FRANQUEADORA'
  ]),
  requireApprovedTeacher,
  asyncErrorHandler(async (req, res) => {
    console.log(
      '[POST /api/bookings] Payload recebido:',
      JSON.stringify(req.body, null, 2)
    )

    const bookingData = createBookingSchema.parse(req.body)
    if (bookingData.studentId === null) {
      bookingData.studentId = undefined
    }
    const user = req.user

    // Validar permissões baseado no source
    if (
      bookingData.source === 'ALUNO' &&
      !['STUDENT', 'ALUNO', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)
    ) {
      return res
        .status(403)
        .json({ error: 'Apenas alunos podem criar agendamentos aluno-led' })
    }

    if (
      bookingData.source === 'PROFESSOR' &&
      !['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)
    ) {
      return res.status(403).json({
        error: 'Apenas professores podem criar agendamentos professor-led'
      })
    }

    // Se for ALUNO-led, precisa de student_id
    if (bookingData.source === 'ALUNO' && !bookingData.studentId) {
      bookingData.studentId = user.userId // Aluno está criando para si mesmo
    }

    // Atualizar booking existente usando bookingId
    console.log(
      '[POST /api/bookings] Atualizando booking existente:',
      bookingData.bookingId
    )

    let booking
    try {
      booking = await bookingCanonicalService.updateBookingToStudent({
        bookingId: bookingData.bookingId,
        studentId: bookingData.studentId || user.userId,
        source: bookingData.source,
        studentNotes: bookingData.studentNotes,
        professorNotes: bookingData.professorNotes
      })
    } catch (error) {
      console.error('[POST /api/bookings] Erro ao atualizar booking:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao atualizar agendamento'
      return res.status(400).json({
        error: errorMessage
      })
    }

    try {
      const syncTasks = [
        addAcademyToContact(booking.teacher_id, booking.franchise_id)
      ]
      if (booking.student_id) {
        syncTasks.push(
          addAcademyToContact(booking.student_id, booking.franchise_id)
        )
      }
      await Promise.all(syncTasks)
    } catch (syncError) {
      console.warn(
        'Erro ao sincronizar contato da franqueadora após agendamento:',
        syncError
      )
    }

    return res.status(200).json({ booking })
  })
)

// PATCH /api/bookings/:id - Atualizar status do agendamento (endpoint canônico)
router.patch(
  '/:id',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const { status } = updateBookingSchema.parse(req.body)
    const user = req.user

    // Buscar booking para verificar permissão
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    // Verificar permissão
    const hasPermission =
      booking.student_id === user.userId ||
      booking.teacher_id === user.userId ||
      [
        'FRANQUIA',
        'FRANCHISE_ADMIN',
        'FRANQUEADORA',
        'ADMIN',
        'SUPER_ADMIN'
      ].includes(user.role)

    if (!hasPermission) {
      return res.status(403).json({ error: 'Acesso não autorizado' })
    }

    // Processar diferentes status
    if (status === 'CANCELED') {
      await bookingCanonicalService.cancelBooking(id, user.userId)

      res.json({
        message: 'Agendamento cancelado com sucesso',
        status: 'CANCELED'
      })
    } else if (status === 'PAID') {
      const updatedBooking = await bookingCanonicalService.confirmBooking(id)

      res.json({
        message: 'Agendamento confirmado com sucesso',
        booking: updatedBooking
      })
    } else if (status === 'DONE') {
      const updatedBooking = await bookingCanonicalService.completeBooking(id)

      res.json({
        message: 'Agendamento concluído com sucesso',
        booking: updatedBooking
      })
    } else {
      return res.status(400).json({ error: 'Status inválido' })
    }
  })
)

// DELETE /api/bookings/:id - Cancelar agendamento (endpoint canônico)
router.delete(
  '/:id',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user

    // Buscar booking para verificar permissão
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    // Verificar permissão (professor pode deletar seus próprios horários)
    const hasPermission =
      booking.student_id === user.userId ||
      booking.teacher_id === user.userId ||
      [
        'FRANQUIA',
        'FRANCHISE_ADMIN',
        'FRANQUEADORA',
        'ADMIN',
        'TEACHER',
        'PROFESSOR',
        'SUPER_ADMIN'
      ].includes(user.role)

    if (!hasPermission) {
      return res.status(403).json({ error: 'Acesso não autorizado' })
    }

    console.log('🚀 CÓDIGO ATUALIZADO - VERSÃO NOVA RODANDO!')

    // Se for disponibilidade sem aluno (AVAILABLE, RESERVED, CANCELED, BLOCKED), deletar do banco
    // Se for agendamento com aluno, apenas cancelar
    const isAvailabilitySlot =
      !booking.student_id &&
      ['AVAILABLE', 'RESERVED', 'CANCELED', 'BLOCKED'].includes(
        booking.status_canonical
      )

    console.log('🔍 DEBUG DELETE:', {
      id,
      status_canonical: booking.status_canonical,
      student_id: booking.student_id,
      hasNoStudent: !booking.student_id,
      isAvailabilitySlot,
      willDelete: isAvailabilitySlot
    })

    if (isAvailabilitySlot) {
      console.log('✅ DELETANDO disponibilidade do banco...')
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.log('❌ Erro ao deletar:', deleteError)
        return res
          .status(500)
          .json({ error: 'Erro ao remover disponibilidade' })
      }

      console.log('✅ Disponibilidade DELETADA com sucesso!')
      return res.json({
        message: 'Disponibilidade removida com sucesso',
        status: 'DELETED'
      })
    }

    // Para agendamentos com aluno:
    // - Se for FRANCHISE_ADMIN, FRANQUEADORA ou SUPER_ADMIN, deletar permanentemente
    // - Caso contrário, apenas cancelar
    const canDeletePermanently = [
      'FRANCHISE_ADMIN',
      'FRANQUEADORA',
      'SUPER_ADMIN',
      'ADMIN'
    ].includes(user.role)

    if (canDeletePermanently) {
      console.log('🗑️ Deletando agendamento permanentemente (admin)')
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('❌ Erro ao deletar agendamento:', deleteError)
        return res.status(500).json({ error: 'Erro ao deletar agendamento' })
      }

      console.log('✅ Agendamento DELETADO permanentemente!')
      return res.json({
        message: 'Agendamento excluído permanentemente',
        status: 'DELETED'
      })
    }

    // Para outros usuários, apenas cancelar
    await bookingCanonicalService.cancelBooking(id, user.userId)

    res.json({
      message: 'Agendamento cancelado com sucesso',
      status: 'CANCELED'
    })
  })
)

// GET /api/bookings/validate-orphans - Validar e identificar bookings órfãos
router.get(
  '/validate-orphans',
  requireAuth,
  requireRole(['FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { franchise_id, academy_id } = req.query
    const franchiseId = Array.isArray(franchise_id)
      ? franchise_id[0]
      : franchise_id
    const academyId = Array.isArray(academy_id) ? academy_id[0] : academy_id
    const finalFranchiseId = franchiseId || academyId

    if (!finalFranchiseId) {
      return res
        .status(400)
        .json({ error: 'franchise_id ou academy_id é obrigatório' })
    }

    try {
      // Buscar todos os bookings da franquia
      const { data: allBookings, error: fetchError } = await supabase
        .from('bookings')
        .select(
          `
        id,
        date,
        status,
        status_canonical,
        student_id,
        teacher_id,
        franchise_id
      `
        )
        .eq('franchise_id', finalFranchiseId)

      if (fetchError) {
        console.error('[validate-orphans] Erro ao buscar bookings:', fetchError)
        return res.status(500).json({ error: 'Erro ao buscar bookings' })
      }

      // Buscar IDs válidos de alunos e professores
      const studentIds = [
        ...new Set(
          (allBookings || []).map((b: any) => b.student_id).filter(Boolean)
        )
      ]
      const teacherIds = [
        ...new Set(
          (allBookings || []).map((b: any) => b.teacher_id).filter(Boolean)
        )
      ]

      const { data: validStudents } = await supabase
        .from('users')
        .select('id')
        .in(
          'id',
          studentIds.length > 0
            ? studentIds
            : ['00000000-0000-0000-0000-000000000000']
        )

      const { data: validTeachers } = await supabase
        .from('users')
        .select('id')
        .in(
          'id',
          teacherIds.length > 0
            ? teacherIds
            : ['00000000-0000-0000-0000-000000000000']
        )

      const validStudentIds = new Set(
        (validStudents || []).map((u: any) => u.id)
      )
      const validTeacherIds = new Set(
        (validTeachers || []).map((u: any) => u.id)
      )

      // Identificar órfãos
      const orphans = (allBookings || []).filter((booking: any) => {
        // Manter cancelados
        if (
          booking.status_canonical === 'CANCELED' ||
          booking.status === 'CANCELLED'
        ) {
          return false
        }

        // Órfão se não tem aluno válido OU não tem professor válido
        const hasInvalidStudent =
          booking.student_id && !validStudentIds.has(booking.student_id)
        const hasInvalidTeacher =
          booking.teacher_id && !validTeacherIds.has(booking.teacher_id)
        const hasNoStudent = !booking.student_id
        const hasNoTeacher = !booking.teacher_id

        // Considerar órfão se:
        // - Não tem aluno E não tem professor (disponibilidade órfã)
        // - Tem aluno mas o aluno não existe mais
        // - Tem professor mas o professor não existe mais
        return (
          (hasNoStudent && hasNoTeacher) ||
          hasInvalidStudent ||
          hasInvalidTeacher
        )
      })

      const stats = {
        total: allBookings?.length || 0,
        valid: (allBookings?.length || 0) - orphans.length,
        orphans: orphans.length,
        cancelled: (allBookings || []).filter(
          (b: any) =>
            b.status_canonical === 'CANCELED' || b.status === 'CANCELLED'
        ).length,
        byStatus: {
          CONFIRMED: (allBookings || []).filter(
            (b: any) =>
              b.status === 'CONFIRMED' || b.status_canonical === 'PAID'
          ).length,
          COMPLETED: (allBookings || []).filter(
            (b: any) =>
              b.status === 'COMPLETED' || b.status_canonical === 'DONE'
          ).length,
          CANCELLED: (allBookings || []).filter(
            (b: any) =>
              b.status_canonical === 'CANCELED' || b.status === 'CANCELLED'
          ).length
        }
      }

      res.json({
        stats,
        orphans: orphans.map((b: any) => ({
          id: b.id,
          date: b.date,
          status: b.status,
          status_canonical: b.status_canonical,
          student_id: b.student_id,
          teacher_id: b.teacher_id,
          reason:
            !b.student_id && !b.teacher_id
              ? 'Sem aluno e sem professor'
              : !b.student_id
              ? 'Sem aluno'
              : !b.teacher_id
              ? 'Sem professor'
              : !validStudentIds.has(b.student_id)
              ? 'Aluno não existe mais'
              : 'Professor não existe mais'
        })),
        message: `Encontrados ${orphans.length} bookings órfãos (cancelados foram mantidos)`
      })
    } catch (error: any) {
      console.error('[validate-orphans] Erro:', error)
      res.status(500).json({ error: error.message })
    }
  })
)

// DELETE /api/bookings/cleanup-orphans - Limpar bookings órfãos (mantém cancelados)
router.delete(
  '/cleanup-orphans',
  requireAuth,
  requireRole(['FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { franchise_id, academy_id, dry_run } = req.query
    const franchiseId = Array.isArray(franchise_id)
      ? franchise_id[0]
      : franchise_id
    const academyId = Array.isArray(academy_id) ? academy_id[0] : academy_id
    const finalFranchiseId = franchiseId || academyId
    const isDryRun = dry_run === 'true'

    if (!finalFranchiseId) {
      return res
        .status(400)
        .json({ error: 'franchise_id ou academy_id é obrigatório' })
    }

    try {
      // Primeiro validar órfãos
      const validateResponse = await fetch(
        `${req.protocol}://${req.get(
          'host'
        )}/api/bookings/validate-orphans?franchise_id=${finalFranchiseId}`,
        {
          headers: {
            Authorization: req.headers.authorization || ''
          }
        }
      )

      if (!validateResponse.ok) {
        return res
          .status(validateResponse.status)
          .json({ error: 'Erro ao validar órfãos' })
      }

      const validateData = (await validateResponse.json()) as {
        orphans?: any[]
      }
      const orphans = validateData.orphans || []

      if (orphans.length === 0) {
        return res.json({
          message: 'Nenhum booking órfão encontrado',
          deleted: 0
        })
      }

      if (isDryRun) {
        return res.json({
          message: `DRY RUN: ${orphans.length} bookings órfãos seriam deletados`,
          wouldDelete: orphans.length,
          orphans: orphans.map((o: any) => o.id)
        })
      }

      // Deletar órfãos
      const orphanIds = orphans.map((o: any) => o.id)
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .in('id', orphanIds)

      if (deleteError) {
        console.error('[cleanup-orphans] Erro ao deletar:', deleteError)
        return res
          .status(500)
          .json({ error: 'Erro ao deletar bookings órfãos' })
      }

      res.json({
        message: `${orphans.length} bookings órfãos deletados com sucesso`,
        deleted: orphans.length,
        cancelledKept: true
      })
    } catch (error: any) {
      console.error('[cleanup-orphans] Erro:', error)
      res.status(500).json({ error: error.message })
    }
  })
)

// GET /api/bookings/:id/rating - Buscar avaliação de um agendamento (se existir)
router.get(
  '/:id/rating',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user

    // Buscar booking para validar acesso
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    if (
      booking.student_id !== user.userId &&
      booking.teacher_id !== user.userId &&
      !['ADMIN', 'FRANQUEADORA', 'FRANQUIA'].includes(user.role)
    ) {
      return res.status(403).json({ error: 'Acesso não autorizado' })
    }

    const { data: ratingRow } = await supabase
      .from('teacher_ratings')
      .select('*')
      .eq('booking_id', id)
      .single()

    if (!ratingRow) return res.json({ rating: null })
    return res.json({ rating: ratingRow })
  })
)

// POST /api/bookings/:id/rating - Avaliar um agendamento concluído
router.post(
  '/:id/rating',
  requireAuth,
  createUserRateLimit(rateLimitConfig.ratings),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user

    // Validar payload
    const ratingSchema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional()
    })
    const { rating, comment } = ratingSchema.parse(req.body)

    // Buscar booking e validar permissões/estado
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id, status, status_canonical, date')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    if (booking.student_id !== user.userId) {
      return res
        .status(403)
        .json({ error: 'Você não pode avaliar este agendamento' })
    }

    const normalized = normalizeBookingStatus(
      booking.status,
      booking.status_canonical
    )
    if (normalized !== 'COMPLETED') {
      return res
        .status(400)
        .json({ error: 'A avaliação só é permitida para aulas concluídas' })
    }

    if (!booking.teacher_id) {
      return res
        .status(400)
        .json({ error: 'Agendamento sem professor associado' })
    }

    // Upsert por booking_id (permite editar avaliação)
    const payload: any = {
      teacher_id: booking.teacher_id,
      student_id: booking.student_id,
      booking_id: booking.id,
      rating,
      comment: comment ?? null
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('teacher_ratings')
      .upsert([payload], { onConflict: 'booking_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Erro ao salvar avaliação:', upsertError)
      return res.status(500).json({ error: 'Erro ao salvar avaliação' })
    }

    // Agregar média e contagem do professor
    const { data: ratingsRows, error: aggError } = await supabase
      .from('teacher_ratings')
      .select('rating')
      .eq('teacher_id', booking.teacher_id)

    if (aggError) {
      console.error('Erro ao calcular média de avaliações:', aggError)
    }
    const rows = ratingsRows || []
    const count = rows.length
    const avg = count
      ? Number(
          (
            rows.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) /
            count
          ).toFixed(2)
        )
      : 0

    // Atualizar cache em teacher_profiles
    try {
      await supabase
        .from('teacher_profiles')
        .update({
          rating_avg: avg,
          rating_count: count,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', booking.teacher_id)
    } catch (e) {
      console.warn('Falha ao atualizar cache de rating em teacher_profiles:', e)
    }

    res.json({
      rating: upserted,
      teacher_summary: { avg, count }
    })
  })
)

export default router
