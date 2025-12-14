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
// Schema para aluno reservando slot existente
const createBookingSchemaAluno = z.object({
  source: z.literal('ALUNO'),
  bookingId: z.string().uuid(), // ID do booking existente para atualizar (obrigatório)
  studentId: z.string().uuid().nullable().optional(),
  studentNotes: z.string().optional(),
  professorNotes: z.string().optional(),
  isLinkedTeacher: z.boolean().optional(), // Professor vinculado - não requer créditos
  isFirstClass: z.boolean().optional() // Primeira aula grátis - não requer créditos
})

// Schema para professor criando agendamento para aluno
const createBookingSchemaProfessor = z.object({
  source: z.literal('PROFESSOR'),
  professorId: z.string().uuid(),
  studentId: z.string().uuid(),
  academyId: z.string().uuid(),
  startAt: z.string(), // ISO date string
  endAt: z.string(), // ISO date string
  studentNotes: z.string().optional(),
  professorNotes: z.string().optional()
})

// Schema combinado que aceita ambos os fluxos
const createBookingSchema = z.union([createBookingSchemaAluno, createBookingSchemaProfessor])

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
        updatedAt: booking.updated_at || undefined,
        series_id: booking.series_id ?? null,
        is_reserved: booking.is_reserved ?? false
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
      // Primeiro buscar os bookings (incluindo series_id e is_reserved para séries recorrentes)
      // Buscar todos os status exceto os que não devem aparecer (ex: DELETED, se existir)
      const { data: studentBookings, error } = await supabase
        .from('bookings')
        .select('*, series_id, is_reserved')
        .eq('student_id', studentId)
        // Não filtrar por status aqui - deixar o frontend filtrar se necessário
        // O frontend já filtra por status e data
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
          updatedAt: booking.updated_at || undefined,
          series_id: booking.series_id ?? null,
          is_reserved: booking.is_reserved ?? false
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

      // Construir query base para o professor (incluindo series_id e is_reserved para séries recorrentes)
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
        cancellable_until,
        series_id,
        is_reserved
      `
        )
        .eq('teacher_id', teacherId)

      // Filtro por intervalo de datas (from/to) quando fornecido.
      // Os parâmetros from/to vêm no formato YYYY-MM-DD (data local).
      // O campo 'date' é do tipo DATE (apenas data, sem hora), então comparamos diretamente com YYYY-MM-DD.
      if (from) {
        const fromStr = String(from)
        // Campo date é apenas data, então comparamos diretamente com YYYY-MM-DD
        teacherQuery = teacherQuery.gte('date', fromStr)
      } else {
        // Caso não tenha "from", usar apenas bookings futuros para evitar excesso de registros
        // Extrair a data de hoje no fuso de São Paulo (UTC-3)
        const now = new Date()
        const saoPauloNow = new Date(now.getTime() - (3 * 60 * 60 * 1000))
        const todayStr = saoPauloNow.toISOString().split('T')[0] // YYYY-MM-DD em São Paulo
        teacherQuery = teacherQuery.gte('date', todayStr)
      }

      if (to) {
        const toStr = String(to)
        // Campo date é apenas data, então comparamos diretamente com YYYY-MM-DD
        teacherQuery = teacherQuery.lte('date', toStr)
      }

      const { data: teacherBookings, error } = await teacherQuery
        .order('date', { ascending: true })
        .limit(10000)

      if (error) {
        console.error('Error fetching teacher bookings (legacy):', error)
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
      }

      // Log detalhado para debug de séries recorrentes
      const totalBookings = teacherBookings?.length || 0
      const seriesBookings =
        teacherBookings?.filter((b: any) => b.series_id) || []
      const seriesCount = seriesBookings.length
      const uniqueSeries = new Set(seriesBookings.map((b: any) => b.series_id))

      console.log(
        `📊 GET bookings para teacher ${teacherId}: ${totalBookings} bookings encontrados`
      )
      console.log(
        `📋 [DEBUG] Séries recorrentes: ${seriesCount} bookings de ${uniqueSeries.size} séries únicas`
      )
      if (seriesCount > 0) {
        console.log(
          `📋 [DEBUG] Series IDs encontrados: ${Array.from(uniqueSeries).join(
            ', '
          )}`
        )
        // Log das datas dos bookings de séries
        const seriesDates = seriesBookings.map((b: any) => ({
          id: b.id,
          series_id: b.series_id,
          date: b.date,
          start_at: b.start_at,
          student_id: b.student_id
        }))
        console.log(
          `📋 [DEBUG] Detalhes dos bookings de séries:`,
          JSON.stringify(seriesDates, null, 2)
        )
      }

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
          updatedAt: booking.updated_at || undefined,
          series_id: booking.series_id ?? null,
          is_reserved: booking.is_reserved ?? false
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

// POST /api/bookings - Criar/atualizar agendamento
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
    const user = req.user

    // ========== FLUXO DO PROFESSOR ==========
    // Professor criando agendamento para aluno (usa startAt/endAt)
    if (bookingData.source === 'PROFESSOR' && 'startAt' in bookingData) {
      if (!['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
        return res.status(403).json({
          error: 'Apenas professores podem criar agendamentos professor-led'
        })
      }

      console.log('[POST /api/bookings] Fluxo PROFESSOR - criando novo booking')
      
      // Validar e resolver studentId para garantir que seja um user_id válido
      let resolvedStudentId = bookingData.studentId
      
      // Verificar se o studentId existe na tabela users
      const { data: studentUser, error: studentError } = await supabase
        .from('users')
        .select('id')
        .eq('id', bookingData.studentId)
        .single()
      
      if (studentError || !studentUser) {
        // studentId não é um user_id válido, tentar buscar na teacher_students
        console.log(`[POST /api/bookings] studentId ${bookingData.studentId} não encontrado em users, buscando em teacher_students...`)
        
        const { data: teacherStudent } = await supabase
          .from('teacher_students')
          .select('user_id, email')
          .eq('id', bookingData.studentId)
          .single()
        
        if (teacherStudent?.user_id) {
          resolvedStudentId = teacherStudent.user_id
          console.log(`[POST /api/bookings] Resolvido studentId para user_id: ${resolvedStudentId}`)
        } else if (teacherStudent?.email) {
          // Tentar buscar user_id pelo email
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', teacherStudent.email)
            .single()
          
          if (userByEmail) {
            resolvedStudentId = userByEmail.id
            console.log(`[POST /api/bookings] Resolvido studentId pelo email para user_id: ${resolvedStudentId}`)
          } else {
            return res.status(400).json({ error: 'Aluno não encontrado. Verifique se o aluno está cadastrado corretamente.' })
          }
        } else {
          return res.status(400).json({ error: 'Aluno não encontrado. Verifique se o aluno está cadastrado corretamente.' })
        }
      }
      
      try {
        const booking = await bookingCanonicalService.createBooking({
          source: 'PROFESSOR',
          professorId: bookingData.professorId,
          studentId: resolvedStudentId,
          franchiseId: bookingData.academyId,
          startAt: new Date(bookingData.startAt),
          endAt: new Date(bookingData.endAt),
          studentNotes: bookingData.studentNotes,
          professorNotes: bookingData.professorNotes
        })

        console.log('[POST /api/bookings] Booking professor criado:', booking?.id)

        // Marcar first_class_used = true no primeiro agendamento do aluno
        if (booking && resolvedStudentId) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('first_class_used')
            .eq('id', resolvedStudentId)
            .single()
          
          if (currentUser && currentUser.first_class_used === false) {
            console.log(`[POST /api/bookings] Marcando first_class_used = true para aluno ${resolvedStudentId}`)
            
            await supabase
              .from('users')
              .update({ 
                first_class_used: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', resolvedStudentId)
          }
        }

        // Sincronizar contatos
        try {
          const franchiseId = (booking as any).franchise_id || bookingData.academyId
          await Promise.all([
            addAcademyToContact(booking.teacher_id, franchiseId),
            booking.student_id ? addAcademyToContact(booking.student_id, franchiseId) : Promise.resolve()
          ])
        } catch (syncError) {
          console.warn('Erro ao sincronizar contatos:', syncError)
        }

        return res.status(201).json({ booking })
      } catch (error) {
        console.error('[POST /api/bookings] Erro ao criar booking professor:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento'
        return res.status(400).json({ error: errorMessage })
      }
    }

    // ========== FLUXO DO ALUNO ==========
    // Aluno reservando slot existente (usa bookingId)
    if (bookingData.source === 'ALUNO' && 'bookingId' in bookingData) {
      if (!['STUDENT', 'ALUNO', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
        return res.status(403).json({ error: 'Apenas alunos podem criar agendamentos aluno-led' })
      }

      // Se não tiver studentId, usar o userId do aluno logado
      const studentId = bookingData.studentId || user.userId

      // Validar primeira aula grátis por CPF
      let skipBalance = bookingData.isLinkedTeacher || false
      
      console.log('[POST /api/bookings] Fluxo ALUNO - dados recebidos:', {
        isFirstClass: bookingData.isFirstClass,
        isLinkedTeacher: bookingData.isLinkedTeacher,
        source: bookingData.source,
        studentId
      })
    
      if (bookingData.isFirstClass) {
        // Buscar dados do aluno (CPF e first_class_used)
        const { data: student, error: studentError } = await supabase
          .from('users')
          .select('id, cpf, first_class_used')
          .eq('id', studentId)
          .single()
        
        console.log('[POST /api/bookings] Dados do aluno:', {
          studentId,
          cpf: student?.cpf,
          first_class_used: student?.first_class_used,
          error: studentError
        })
        
        if (studentError || !student) {
          return res.status(400).json({ error: 'Aluno não encontrado' })
        }
        
        // Verificar se o aluno já usou a primeira aula
        if (student.first_class_used) {
          console.log('[POST /api/bookings] ❌ Bloqueado: first_class_used = true')
          return res.status(400).json({ 
            error: 'Você já utilizou sua primeira aula gratuita',
            code: 'FIRST_CLASS_ALREADY_USED'
          })
        }
        
        // Verificar se já existe outro usuário com o mesmo CPF que já usou a primeira aula
        if (student.cpf) {
          const { data: existingUsers, error: cpfError } = await supabase
            .from('users')
            .select('id, first_class_used')
            .eq('cpf', student.cpf)
            .eq('first_class_used', true)
            .neq('id', studentId)
            .limit(1)
          
          if (!cpfError && existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ 
              error: 'Já existe uma conta com este CPF que utilizou a primeira aula gratuita',
              code: 'CPF_FIRST_CLASS_ALREADY_USED'
            })
          }
        }
        
        // Verificar se o aluno já tem algum booking PAID ou DONE (já agendou primeira aula)
        const { data: existingBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status_canonical')
          .eq('student_id', studentId)
          .in('status_canonical', ['PAID', 'DONE'])
          .limit(1)
        
        console.log('[POST /api/bookings] Bookings existentes:', {
          count: existingBookings?.length || 0,
          bookings: existingBookings,
          error: bookingsError
        })
        
        if (!bookingsError && existingBookings && existingBookings.length > 0) {
          console.log('[POST /api/bookings] ❌ Bloqueado: já tem booking PAID/DONE')
          return res.status(400).json({ 
            error: 'Você já possui uma aula agendada. A primeira aula gratuita só pode ser usada no primeiro agendamento.',
            code: 'FIRST_CLASS_BOOKING_EXISTS'
          })
        }
        
        // Tudo ok, permitir agendar sem crédito
        skipBalance = true
        console.log(`[POST /api/bookings] Primeira aula grátis aprovada para aluno ${studentId}`)
      }

      // Atualizar booking existente usando bookingId
      console.log('[POST /api/bookings] Atualizando booking existente:', bookingData.bookingId)

      let booking
      try {
        booking = await bookingCanonicalService.updateBookingToStudent({
          bookingId: bookingData.bookingId,
          studentId: studentId,
          source: bookingData.source,
          studentNotes: bookingData.studentNotes,
          professorNotes: bookingData.professorNotes,
          skipBalance // Professor vinculado ou primeira aula grátis - não debita crédito
        })
        
        console.log('[POST /api/bookings] Booking criado com sucesso:', booking?.id)
        
        // Marcar first_class_used = true no primeiro agendamento (independente do tipo)
        if (booking) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('first_class_used')
            .eq('id', studentId)
            .single()
          
          if (currentUser && currentUser.first_class_used === false) {
            console.log(`[POST /api/bookings] Marcando first_class_used = true para aluno ${studentId}`)
            
            await supabase
              .from('users')
              .update({ 
                first_class_used: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', studentId)
          }
        }
      } catch (error) {
        console.error('[POST /api/bookings] Erro ao atualizar booking:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agendamento'
        return res.status(400).json({ error: errorMessage })
      }

      // Sincronizar contatos
      try {
        const franchiseId = (booking as any).franchise_id
        if (franchiseId) {
          await Promise.all([
            addAcademyToContact(booking.teacher_id, franchiseId),
            booking.student_id ? addAcademyToContact(booking.student_id, franchiseId) : Promise.resolve()
          ])
        }
      } catch (syncError) {
        console.warn('Erro ao sincronizar contatos:', syncError)
      }

      return res.status(200).json({ booking })
    }

    // Se chegou aqui, o payload não é válido para nenhum fluxo
    return res.status(400).json({ error: 'Payload inválido. Use source ALUNO com bookingId ou source PROFESSOR com startAt/endAt.' })
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

// POST /api/bookings/checkin/validate - Validar check-in do usuário na academia
router.post(
  '/checkin/validate',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const user = req.user
    if (!user || !user.userId) {
      return res
        .status(401)
        .json({ allowed: false, message: 'Não autenticado' })
    }

    const schema = z.object({
      academy_id: z.string().uuid()
    })

    const { academy_id } = schema.parse(req.body)

    // Buscar configuração da academia (checkin_tolerance)
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('id, name, checkin_tolerance')
      .eq('id', academy_id)
      .single()

    if (academyError || !academy) {
      return res
        .status(404)
        .json({ allowed: false, message: 'Academia não encontrada' })
    }

    const toleranceMinutes = academy.checkin_tolerance ?? 30
    const now = new Date()
    const toleranceMs = toleranceMinutes * 60 * 1000

    // Determinar se é aluno ou professor
    const isStudent = ['STUDENT', 'ALUNO'].includes(user.role)
    const isTeacher = ['TEACHER', 'PROFESSOR'].includes(user.role)

    if (!isStudent && !isTeacher) {
      return res.status(403).json({
        allowed: false,
        message: 'Apenas alunos e professores podem fazer check-in'
      })
    }

    // Buscar bookings válidos do usuário na academia
    let bookingsQuery = supabase
      .from('bookings')
      .select(
        'id, status, status_canonical, date, duration, teacher_id, student_id, franchise_id'
      )
      .eq('franchise_id', academy_id)
      .in('status', ['CONFIRMED', 'PENDING'])
      .neq('status', 'CANCELLED')

    if (isStudent) {
      bookingsQuery = bookingsQuery.eq('student_id', user.userId)
    } else if (isTeacher) {
      bookingsQuery = bookingsQuery.eq('teacher_id', user.userId)
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
      console.error(
        '[checkin/validate] Erro ao buscar bookings:',
        bookingsError
      )
      return res
        .status(500)
        .json({ allowed: false, message: 'Erro ao buscar agendamentos' })
    }

    if (!bookings || bookings.length === 0) {
      // Registrar check-in negado
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id: isTeacher ? user.userId : null,
          student_id: isStudent ? user.userId : null,
          booking_id: null,
          status: 'DENIED',
          reason: 'NO_VALID_BOOKING',
          method: 'QRCODE',
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin/validate] Erro ao registrar check-in negado:', e)
      }

      try {
        await createUserNotification(
          user.userId,
          'checkin',
          'Check-in negado',
          'Você não possui agendamentos válidos nesta unidade.',
          { academy_id }
        )
      } catch (e) {
        console.warn('[checkin/validate] Erro ao criar notificação:', e)
      }

      return res.status(404).json({
        allowed: false,
        message: 'Você não possui agendamentos válidos nesta unidade'
      })
    }

    // Filtrar bookings dentro da janela de tempo
    const validBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.date)
      const bookingEnd = new Date(
        bookingDate.getTime() + (booking.duration || 60) * 60 * 1000
      )

      // Janela: (bookingDate - tolerance) até (bookingEnd + tolerance)
      const windowStart = new Date(bookingDate.getTime() - toleranceMs)
      const windowEnd = new Date(bookingEnd.getTime() + toleranceMs)

      return now >= windowStart && now <= windowEnd
    })

    if (validBookings.length === 0) {
      // Registrar check-in negado - fora da janela de tempo
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id: isTeacher ? user.userId : null,
          student_id: isStudent ? user.userId : null,
          booking_id: bookings[0]?.id || null,
          status: 'DENIED',
          reason: 'OUTSIDE_TIME_WINDOW',
          method: 'QRCODE',
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin/validate] Erro ao registrar check-in negado:', e)
      }

      try {
        await createUserNotification(
          user.userId,
          'checkin',
          'Check-in negado',
          `Check-in fora da janela de tempo permitida (${toleranceMinutes} minutos antes/depois).`,
          { academy_id, booking_id: bookings[0]?.id }
        )
      } catch (e) {
        console.warn('[checkin/validate] Erro ao criar notificação:', e)
      }

      return res.status(400).json({
        allowed: false,
        message: `Check-in fora da janela de tempo permitida (${toleranceMinutes} minutos antes/depois do horário agendado)`
      })
    }

    // Usar o primeiro booking válido (mais próximo do horário atual)
    const selectedBooking = validBookings.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      const nowTime = now.getTime()
      return Math.abs(dateA - nowTime) - Math.abs(dateB - nowTime)
    })[0]

    // Verificar se já não fez check-in para esse booking (evitar duplicatas)
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('id')
      .eq('booking_id', selectedBooking.id)
      .eq('status', 'GRANTED')
      .limit(1)
      .maybeSingle()

    if (existingCheckin) {
      return res.status(200).json({
        allowed: true,
        booking: {
          id: selectedBooking.id,
          start: new Date(selectedBooking.date).toISOString(),
          duration: selectedBooking.duration || 60
        },
        message: 'Check-in já realizado anteriormente',
        alreadyCheckedIn: true
      })
    }

    // Atualizar booking PENDING → CONFIRMED se necessário
    if (selectedBooking.status === 'PENDING') {
      await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', selectedBooking.id)
    }

    // Registrar check-in concedido
    try {
      await supabase.from('checkins').insert({
        academy_id,
        teacher_id:
          selectedBooking.teacher_id || (isTeacher ? user.userId : null),
        student_id:
          selectedBooking.student_id || (isStudent ? user.userId : null),
        booking_id: selectedBooking.id,
        status: 'GRANTED',
        reason: null,
        method: 'QRCODE',
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.warn('[checkin/validate] Erro ao registrar check-in:', e)
    }

    // Notificações via evento de domínio
    try {
      const { onCheckinGranted } = await import('../lib/events')
      await onCheckinGranted(academy_id, selectedBooking)
    } catch (e) {
      console.warn('[checkin/validate] Erro ao disparar evento de check-in:', e)
    }

    return res.status(200).json({
      allowed: true,
      booking: {
        id: selectedBooking.id,
        start: new Date(selectedBooking.date).toISOString(),
        duration: selectedBooking.duration || 60
      },
      message: 'Check-in registrado com sucesso'
    })
  })
)

// Schema for check-in request
const checkinSchema = z.object({
  method: z.enum(['QRCODE', 'MANUAL']).default('MANUAL')
})

// POST /api/bookings/:id/fake-checkin - Fake check-in para testes em desenvolvimento
// APENAS para ambiente de desenvolvimento (localhost)
router.post(
  '/:id/fake-checkin',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user

    // Verificar se é ambiente de desenvolvimento
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev) {
      return res.status(403).json({
        success: false,
        error: 'Fake check-in disponível apenas em ambiente de desenvolvimento',
        code: 'NOT_ALLOWED_IN_PRODUCTION'
      })
    }

    // Buscar booking
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado',
        code: 'NOT_FOUND'
      })
    }

    // Verificar se já foi concluído (idempotência)
    if (booking.status_canonical === 'DONE' || booking.status_canonical === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        message: '🧪 Booking já foi concluído anteriormente',
        booking: {
          id: booking.id,
          status_canonical: booking.status_canonical,
          date: booking.date,
          duration: booking.duration
        },
        credits: {
          hours_credited: 0,
          new_balance: 0
        },
        already_completed: true
      })
    }

    // Verificar se é PAID
    if (booking.status_canonical !== 'PAID') {
      return res.status(400).json({
        success: false,
        error: `Status inválido para check-in. Status atual: ${booking.status_canonical}`,
        code: 'INVALID_STATUS'
      })
    }

    // Simular que a aula foi dada: mover data para o passado (1 hora atrás)
    const now = new Date()
    const pastDate = new Date(now.getTime() - 60 * 60 * 1000) // 1 hora atrás
    
    // O campo 'date' é do tipo DATE (apenas YYYY-MM-DD), não timestamp
    // Usar a data de hoje para que apareça no histórico
    const pastDateStr = pastDate.toISOString().split('T')[0] // YYYY-MM-DD
    const pastDateTimeISO = pastDate.toISOString() // Full ISO para start_at

    // Atualizar booking para DONE com data no passado
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'COMPLETED',
        status_canonical: 'DONE',
        date: pastDateStr, // DATE field: YYYY-MM-DD
        start_at: pastDateTimeISO, // TIMESTAMP field: full ISO
        updated_at: now.toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar booking',
        code: 'UPDATE_ERROR'
      })
    }

    // Registrar check-in fake
    await supabase.from('checkins').insert({
      academy_id: booking.franchise_id,
      teacher_id: booking.teacher_id,
      booking_id: booking.id,
      status: 'COMPLETED',
      reason: 'FAKE_CHECKIN_DEV',
      method: 'MANUAL',
      created_at: pastDateTimeISO
    })

    // Liberar hora do professor (unlock bonus hours)
    // EXCEÇÃO: Para alunos fidelizados, as horas já foram CONSUMIDAS no agendamento
    try {
      // Verificar se é aluno fidelizado (carteira)
      let isPortfolioStudent = false
      if (booking.student_id && booking.teacher_id) {
        const { data: link } = await supabase
          .from('teacher_students')
          .select('id, is_portfolio')
          .eq('teacher_id', booking.teacher_id)
          .eq('user_id', booking.student_id)
          .single()

        if (link?.is_portfolio === true) {
          isPortfolioStudent = true
          console.log(`[fake-checkin] Aluno fidelizado - horas já foram consumidas no agendamento`)
        }
      }

      // Buscar franqueadora_id da academia
      const { data: academy } = await supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', booking.franchise_id)
        .single()

      if (academy?.franqueadora_id && !isPortfolioStudent) {
        const { balanceService } = await import('../services/balance.service')
        await balanceService.unlockProfessorBonusHours(
          booking.teacher_id,
          academy.franqueadora_id,
          1,
          id,
          {
            source: 'SYSTEM',
            metaJson: {
              booking_id: id,
              reason: 'fake_checkin_dev'
            }
          }
        )
      }
    } catch (e) {
      console.warn('[fake-checkin] Erro ao liberar hora do professor:', e)
    }

    console.log(`🧪 [FAKE CHECKIN] Booking ${id} marcado como DONE (dev only)`)

    res.json({
      success: true,
      message: '🧪 Fake Check-in realizado! (apenas para testes)',
      booking: {
        id: updatedBooking.id,
        status_canonical: updatedBooking.status_canonical,
        date: updatedBooking.date,
        duration: updatedBooking.duration
      },
      credits: {
        hours_credited: 1,
        new_balance: 0 // Não calculamos o balance real no fake
      }
    })
  })
)

// POST /api/bookings/:id/checkin - Perform check-in for a booking
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 4.1, 4.2
router.post(
  '/:id/checkin',
  requireAuth,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    const user = req.user
    const { method } = checkinSchema.parse(req.body)

    // 1.1 - Validate booking exists
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        teacher_id,
        franchise_id,
        date,
        start_at,
        duration,
        status,
        status_canonical
      `)
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado',
        code: 'NOT_FOUND'
      })
    }

    // 1.1 - Validate booking belongs to user (teacher or student)
    const isTeacher = booking.teacher_id === user.userId
    const isStudent = booking.student_id === user.userId
    const isAdmin = ['FRANQUIA', 'FRANQUEADORA', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)

    if (!isTeacher && !isStudent && !isAdmin) {
      // Record denied check-in attempt
      try {
        await supabase.from('checkins').insert({
          academy_id: booking.franchise_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'UNAUTHORIZED',
          method,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin] Erro ao registrar check-in negado:', e)
      }

      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para fazer check-in neste agendamento',
        code: 'UNAUTHORIZED'
      })
    }

    // 1.5 - Check if booking is already COMPLETED (idempotency)
    if (booking.status_canonical === 'DONE' || booking.status_canonical === 'COMPLETED' || booking.status === 'COMPLETED') {
      return res.status(409).json({
        success: false,
        error: 'Check-in já foi realizado para este agendamento',
        code: 'ALREADY_COMPLETED'
      })
    }

    // 1.4 - Validate booking status is PAID
    if (booking.status_canonical !== 'PAID') {
      // Record denied check-in attempt
      try {
        await supabase.from('checkins').insert({
          academy_id: booking.franchise_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'INVALID_STATUS',
          method,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin] Erro ao registrar check-in negado:', e)
      }

      return res.status(400).json({
        success: false,
        error: `Status do agendamento inválido para check-in. Status atual: ${booking.status_canonical}`,
        code: 'INVALID_STATUS'
      })
    }

    // Get academy for tolerance check and franqueadora_id
    const { data: academy } = await supabase
      .from('academies')
      .select('id, name, checkin_tolerance, franqueadora_id')
      .eq('id', booking.franchise_id)
      .single()

    const franqueadoraId = academy?.franqueadora_id

    if (!franqueadoraId) {
      return res.status(400).json({
        success: false,
        error: 'Academia não possui franqueadora associada',
        code: 'INVALID_STATUS'
      })
    }

    // 2.4 - Check if booking date is within tolerance window (optional validation)
    const toleranceMinutes = academy?.checkin_tolerance ?? 30
    const now = new Date()
    const bookingDate = new Date(booking.start_at || booking.date)
    const bookingDuration = booking.duration || 60
    const bookingEnd = new Date(bookingDate.getTime() + bookingDuration * 60 * 1000)
    const toleranceMs = toleranceMinutes * 60 * 1000

    const windowStart = new Date(bookingDate.getTime() - toleranceMs)
    const windowEnd = new Date(bookingEnd.getTime() + toleranceMs)

    if (now < windowStart) {
      // Record denied check-in attempt
      try {
        await supabase.from('checkins').insert({
          academy_id: booking.franchise_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'FUTURE_BOOKING',
          method,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin] Erro ao registrar check-in negado:', e)
      }

      return res.status(400).json({
        success: false,
        error: `Check-in só pode ser feito a partir de ${toleranceMinutes} minutos antes do horário agendado`,
        code: 'FUTURE_BOOKING'
      })
    }

    // Start transaction-like operations
    const nowIso = new Date().toISOString()
    const hoursToCredit = (booking.duration || 60) / 60 // Convert minutes to hours

    try {
      // 1.2 - Update booking status to COMPLETED
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'COMPLETED',
          status_canonical: 'DONE',
          updated_at: nowIso
        })
        .eq('id', id)

      if (updateError) {
        console.error('[checkin] Erro ao atualizar status do booking:', updateError)
        throw new Error('Erro ao atualizar status do agendamento')
      }

      // 1.3 & 1.4 - Create CONSUME transaction and update professor balance
      // Import balance service
      const { balanceService } = await import('../services/balance.service')

      // Verificar se é aluno fidelizado (carteira)
      // Para alunos fidelizados, as horas já foram CONSUMIDAS no agendamento, não travadas
      let isPortfolioStudent = false
      if (booking.student_id && booking.teacher_id) {
        const { data: link } = await supabase
          .from('teacher_students')
          .select('id, is_portfolio')
          .eq('teacher_id', booking.teacher_id)
          .eq('user_id', booking.student_id)
          .single()

        if (link?.is_portfolio === true) {
          isPortfolioStudent = true
          console.log(`[checkin] Aluno fidelizado - horas já foram consumidas no agendamento`)
        }
      }

      // Unlock bonus hours that were locked when booking was created
      // This converts locked_hours to available_hours
      // EXCEÇÃO: Para alunos fidelizados, não há horas travadas para liberar
      if (!isPortfolioStudent) {
        await balanceService.unlockProfessorBonusHours(
          booking.teacher_id,
          franqueadoraId,
          hoursToCredit,
          booking.id,
          {
            source: 'SYSTEM',
            metaJson: {
              booking_id: booking.id,
              origin: method === 'QRCODE' ? 'checkin_qrcode' : 'checkin_manual',
              student_id: booking.student_id
            }
          }
        )
      }

      // Get updated balance
      const updatedBalance = await balanceService.getProfessorBalance(
        booking.teacher_id,
        franqueadoraId
      )

      // 1.5 - Record check-in in checkins table
      try {
        await supabase.from('checkins').insert({
          academy_id: booking.franchise_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'GRANTED',
          reason: null,
          method,
          created_at: nowIso
        })
      } catch (e) {
        console.warn('[checkin] Erro ao registrar check-in:', e)
      }

      // Trigger check-in granted event for notifications
      try {
        const { onCheckinGranted } = await import('../lib/events')
        await onCheckinGranted(booking.franchise_id, booking)
      } catch (e) {
        console.warn('[checkin] Erro ao disparar evento de check-in:', e)
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message: `Check-in realizado com sucesso! ${hoursToCredit} hora(s) creditada(s).`,
        booking: {
          id: booking.id,
          status_canonical: 'COMPLETED',
          date: booking.date,
          duration: booking.duration || 60
        },
        credits: {
          hours_credited: hoursToCredit,
          new_balance: updatedBalance.available_hours
        }
      })
    } catch (error: any) {
      console.error('[checkin] Erro durante check-in:', error)

      // Record failed check-in attempt
      try {
        await supabase.from('checkins').insert({
          academy_id: booking.franchise_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'BALANCE_ERROR',
          method,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn('[checkin] Erro ao registrar check-in negado:', e)
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar check-in',
        code: 'BALANCE_ERROR'
      })
    }
  })
)

export default router
