import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { app } from '../../server'
import { supabase } from '../../lib/supabase'

function makeToken(payload: any) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-0123456789-abcdef-XYZ'
  return jwt.sign(payload, secret)
}

describe('Franqueadora Module Integration', () => {
  let authToken: string
  let franqueadora: any
  let academy: any
  let teacher: any
  let student: any
  let packageId: string | null = null
  let leadId: string | null = null

  beforeAll(async () => {
    const uniqueSuffix = randomUUID()
    const numericSuffix = uniqueSuffix.replace(/\D/g, '')
    const cnpjValue = (numericSuffix.length >= 14 ? numericSuffix.slice(0, 14) : (numericSuffix + '00000000000000').slice(0, 14))

    // Create SUPER_ADMIN token
    authToken = `Bearer ${makeToken({ userId: 'test-super-admin', email: 'super@admin.com', role: 'SUPER_ADMIN' })}`

    // Seed franqueadora
    const franqueadoraEmail = `franq-${uniqueSuffix}@test.com`
    const { data: f, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .insert({ name: 'Franqueadora Teste', cnpj: cnpjValue, email: franqueadoraEmail, is_active: true })
      .select('*')
      .single()
    if (franqueadoraError || !f) {
      throw new Error(`Failed to seed franqueadora: ${franqueadoraError?.message || 'unknown error'}`)
    }
    franqueadora = f

    // Seed users
    const teacherEmail = `prof-${uniqueSuffix}@test.com`
    const { data: teacherUser, error: teacherError } = await supabase
      .from('users')
      .insert({ name: 'Prof Test', email: teacherEmail, role: 'TEACHER', is_active: true })
      .select('*')
      .single()
    if (teacherError || !teacherUser) {
      throw new Error(`Failed to seed teacher: ${teacherError?.message || 'unknown error'}`)
    }
    teacher = teacherUser

    const studentEmail = `aluno-${uniqueSuffix}@test.com`
    const { data: studentUser, error: studentError } = await supabase
      .from('users')
      .insert({ name: 'Aluno Test', email: studentEmail, role: 'STUDENT', is_active: true })
      .select('*')
      .single()
    if (studentError || !studentUser) {
      throw new Error(`Failed to seed student: ${studentError?.message || 'unknown error'}`)
    }
    student = studentUser

    // Seed academy
    const { data: a, error: academyError } = await supabase
      .from('academies')
      .insert({
        franqueadora_id: franqueadora.id,
        name: 'Academia Teste',
        email: 'academy@test.com',
        city: 'SP',
        state: 'SP',
        is_active: true,
        monthly_revenue: 0,
      })
      .select('*')
      .single()
    if (academyError || !a) {
      throw new Error(`Failed to seed academy: ${academyError?.message || 'unknown error'}`)
    }
    academy = a

    // Link teacher/student to academy
    await supabase.from('academy_teachers').insert({ academy_id: academy.id, teacher_id: teacher.id, status: 'active' })
    await supabase.from('academy_students').insert({ academy_id: academy.id, student_id: student.id, status: 'active' })

    // Seed bookings
    await supabase.from('bookings').insert([
      { student_id: student.id, teacher_id: teacher.id, academy_id: academy.id, status: 'COMPLETED', status_canonical: 'DONE', date: new Date().toISOString() },
      { student_id: student.id, teacher_id: teacher.id, academy_id: academy.id, status: 'CANCELLED', status_canonical: 'CANCELED', date: new Date().toISOString() },
    ])

    // Seed a lead
    const { data: lead, error: leadError } = await supabase
      .from('franchise_leads')
      .insert({ franqueadora_id: franqueadora.id, name: 'Lead Test', email: `lead-${uniqueSuffix}@test.com`, status: 'NEW' })
      .select('*')
      .single()
    if (leadError || !lead) {
      throw new Error(`Failed to seed lead: ${leadError?.message || 'unknown error'}`)
    }
    leadId = lead?.id || null
  })

  afterAll(async () => {
    // Cleanup (best-effort)
    if (packageId) {
      await supabase.from('franchise_packages').delete().eq('id', packageId)
    }
    if (leadId) {
      await supabase.from('franchise_leads').delete().eq('id', leadId)
    }
    if (academy) {
      await supabase.from('academy_teachers').delete().eq('academy_id', academy.id)
      await supabase.from('academy_students').delete().eq('academy_id', academy.id)
      await supabase.from('academy_time_slots').delete().eq('academy_id', academy.id)
      await supabase.from('bookings').delete().eq('academy_id', academy.id)
      await supabase.from('academies').delete().eq('id', academy.id)
    }
    if (teacher) await supabase.from('users').delete().eq('id', teacher.id)
    if (student) await supabase.from('users').delete().eq('id', student.id)
    if (franqueadora) await supabase.from('franqueadora').delete().eq('id', franqueadora.id)
  })

  describe('GET /api/franqueadora/me', () => {
    it('should resolve franqueadora context for SUPER_ADMIN', async () => {
      const res = await request(app)
        .get('/api/franqueadora/me')
        .set('Authorization', authToken)
        .send()

      expect(res.status).toBe(200)
      expect(res.body.franqueadora?.id).toBeDefined()
    })
  })

  describe('GET /api/franqueadora/academies/:id/stats', () => {
    it('should return aggregated stats with cache disabled on first hit', async () => {
      const res = await request(app)
        .get(`/api/franqueadora/academies/${academy.id}/stats?franqueadora_id=${encodeURIComponent(franqueadora.id)}`)
        .set('Authorization', authToken)
        .send()

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        totalBookings: expect.any(Number),
        completedBookings: expect.any(Number),
        cancelledBookings: expect.any(Number),
      })
    })
  })

  describe('Franqueadora Packages CRUD (sem contexto de franqueadora)', () => {
    it('POST /api/franqueadora/packages deve retornar 400 sem contexto', async () => {
      const res = await request(app)
        .post('/api/franqueadora/packages')
        .set('Authorization', authToken)
        .send({
          franqueadora_id: franqueadora.id,
          name: 'Pacote Franquia Teste',
          description: 'Desc',
          investment_amount: 100000,
          franchise_fee: 5000,
          royalty_percentage: 10,
          territory_size: 'Médio',
          included_features: ['Suporte', 'Marketing']
        })

      expect(res.status).toBe(400)
      expect(res.body?.error || res.body?.message).toBeDefined()
    })

    it('GET /api/franqueadora/packages should list empty data without context', async () => {
      const res = await request(app)
        .get(`/api/franqueadora/packages`)
        .set('Authorization', authToken)
        .send()

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('PUT /api/franqueadora/packages/:id should update a package', async () => {
      if (!packageId) return
      const res = await request(app)
        .put(`/api/franqueadora/packages/${packageId}`)
        .set('Authorization', authToken)
        .send({ name: 'Pacote Atualizado' })

      expect(res.status).toBe(200)
      expect(res.body?.name).toBe('Pacote Atualizado')
    })

    it('DELETE /api/franqueadora/packages/:id should delete/deactivate a package', async () => {
      if (!packageId) return
      const res = await request(app)
        .delete(`/api/franqueadora/packages/${packageId}`)
        .set('Authorization', authToken)
        .send()

      expect([200,204]).toContain(res.status)
    })
  })

  describe('Franqueadora Packages CRUD (com contexto)', () => {
    it('POST /api/franqueadora/packages deve criar pacote com contexto', async () => {
      const res = await request(app)
        .post(`/api/franqueadora/packages?franqueadora_id=${encodeURIComponent(franqueadora.id)}`)
        .set('Authorization', authToken)
        .send({
          name: 'Pacote Franquia Teste',
          description: 'Desc',
          investment_amount: 100000,
          franchise_fee: 5000,
          royalty_percentage: 10,
          territory_size: 'Médio',
          included_features: ['Suporte', 'Marketing']
        })

      expect(res.status).toBe(201)
      expect(res.body?.success).toBe(true)
      expect(res.body?.data?.package?.id).toBeDefined()
      packageId = res.body?.data?.package?.id || null
    })

    it('GET /api/franqueadora/packages deve listar pacotes com contexto', async () => {
      const res = await request(app)
        .get(`/api/franqueadora/packages?franqueadora_id=${encodeURIComponent(franqueadora.id)}`)
        .set('Authorization', authToken)
        .send()

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('PUT /api/franqueadora/packages/:id deve atualizar pacote com contexto', async () => {
      if (!packageId) return
      const res = await request(app)
        .put(`/api/franqueadora/packages/${packageId}?franqueadora_id=${encodeURIComponent(franqueadora.id)}`)
        .set('Authorization', authToken)
        .send({ name: 'Pacote Atualizado' })

      expect(res.status).toBe(200)
      expect(res.body?.success).toBe(true)
      expect(res.body?.data?.package?.name).toBe('Pacote Atualizado')
    })

    it('DELETE /api/franqueadora/packages/:id deve desativar pacote com contexto', async () => {
      if (!packageId) return
      const res = await request(app)
        .delete(`/api/franqueadora/packages/${packageId}?franqueadora_id=${encodeURIComponent(franqueadora.id)}`)
        .set('Authorization', authToken)
        .send()

      expect([200,204]).toContain(res.status)
    })
  })

  describe('Franqueadora Leads (sem contexto de franqueadora)', () => {
    it('GET /api/franqueadora/leads should list empty data without context', async () => {
      const res = await request(app)
        .get(`/api/franqueadora/leads`)
        .set('Authorization', authToken)
        .send()

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('PUT /api/franqueadora/leads/:id should update lead status', async () => {
      if (!leadId) return
      const res = await request(app)
        .put(`/api/franqueadora/leads/${leadId}`)
        .set('Authorization', authToken)
        .send({ status: 'QUALIFIED' })

      // Sem contexto de franqueadora, rota retorna 400
      expect(res.status).toBe(400)
    })
  })
})

