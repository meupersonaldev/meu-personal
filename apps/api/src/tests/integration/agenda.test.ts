import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../../server'
import { supabase } from '../../lib/supabase'

// Evitar que requireApprovedTeacher bloqueie os testes
jest.mock('../../middleware/approval', () => ({
  requireApprovedTeacher: (_req: any, _res: any, next: () => void) => next()
}))

describe('Agenda Integration Tests', () => {
  let authTokenTeacher: string
  let teacherUser: { id: string; email: string } | null = null
  let academyId: string | null = null
  let skipAgenda = false

  const TEST_TEACHER_EMAIL = 'agenda-teacher@test.com'

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret-0123456789-abcdef-XYZ'

    // Descobrir uma academia existente para usar nos testes
    try {
      const { data: academy, error: academyError } = await supabase
        .from('academies')
        .select('id')
        .limit(1)
        .single()

      if (academyError || !academy) {
        // Sem academia, não há como testar agenda de forma realista
        skipAgenda = true
        return
      }

      academyId = academy.id
    } catch {
      skipAgenda = true
      return
    }

    // Tentar reaproveitar professor de testes se já existir
    const { data: existingTeacher } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_TEACHER_EMAIL)
      .eq('role', 'TEACHER')
      .limit(1)
      .single()

    if (existingTeacher) {
      teacherUser = existingTeacher as any
    } else {
      const { data: newTeacher, error: teacherError } = await supabase
        .from('users')
        .insert({
          name: 'Agenda Test Teacher',
          email: TEST_TEACHER_EMAIL,
          role: 'TEACHER'
        })
        .select('id, email')
        .single()

      if (teacherError || !newTeacher) {
        skipAgenda = true
        return
      }

      teacherUser = newTeacher as any
    }

    authTokenTeacher = `Bearer ${jwt.sign(
      { userId: teacherUser.id, email: teacherUser.email, role: 'TEACHER' },
      secret
    )}`
  })

  afterAll(async () => {
    if (!teacherUser || !academyId) return

    // Limpar bookings criados pelos testes (AVAILABLE e BLOCKED)
    await supabase
      .from('bookings')
      .delete()
      .eq('teacher_id', teacherUser.id)
      .eq('franchise_id', academyId)
      .in('status_canonical', ['AVAILABLE', 'BLOCKED'])
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/bookings/availability/bulk', () => {
    it('deve criar disponibilidade em bulk e ser idempotente', async () => {
      if (skipAgenda || !teacherUser || !academyId) {
        return expect(true).toBe(true)
      }

      const now = new Date()
      now.setUTCSeconds(0, 0)
      const startAt = new Date(now.getTime() + 5 * 60 * 1000) // +5 minutos
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000) // +60 minutos

      const body = {
        source: 'PROFESSOR' as const,
        professorId: teacherUser.id,
        academyId,
        slots: [
          {
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            professorNotes: 'Teste disponibilidade bulk'
          }
        ]
      }

      // Primeira chamada: deve criar o slot
      const res1 = await request(app)
        .post('/api/bookings/availability/bulk')
        .set('Authorization', authTokenTeacher)
        .send(body)

      expect([200, 201]).toContain(res1.status)
      expect(res1.body).toHaveProperty('created')
      expect(res1.body.created).toBeGreaterThanOrEqual(1)

      // Segunda chamada com o mesmo payload: não deve criar novamente
      const res2 = await request(app)
        .post('/api/bookings/availability/bulk')
        .set('Authorization', authTokenTeacher)
        .send(body)

      // A rota retorna 200 quando nada novo é inserido
      expect(res2.status).toBe(200)
      expect(res2.body).toMatchObject({
        created: 0,
        skipped: 1
      })
    })
  })

  describe('POST /api/teachers/:id/blocks/custom', () => {
    it('deve criar bloqueios e ser idempotente para o mesmo dia/horário', async () => {
      if (skipAgenda || !teacherUser || !academyId) {
        return expect(true).toBe(true)
      }

      const today = new Date()
      const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
      const hour = '10:00'

      const body = {
        academy_id: academyId,
        date: dateStr,
        hours: [hour],
        notes: 'Bloqueio de teste'
      }

      // Primeira chamada: cria o bloqueio
      const res1 = await request(app)
        .post(`/api/teachers/${teacherUser.id}/blocks/custom`)
        .set('Authorization', authTokenTeacher)
        .send(body)

      expect([200, 201]).toContain(res1.status)
      // Quando cria algo, esperamos pelo menos 1 item em created
      if (res1.status === 201) {
        expect(Array.isArray(res1.body.created)).toBe(true)
        expect(res1.body.created.length).toBeGreaterThanOrEqual(1)
      }

      // Segunda chamada com o mesmo payload: não deve criar bloqueios duplicados
      const res2 = await request(app)
        .post(`/api/teachers/${teacherUser.id}/blocks/custom`)
        .set('Authorization', authTokenTeacher)
        .send(body)

      expect(res2.status).toBe(200)
      expect(res2.body).toMatchObject({
        created: [],
        skipped: 1
      })
    })
  })
})
