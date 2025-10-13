import request from 'supertest'
import { app } from '../../server'
import { supabase } from '../../lib/supabase'
import { asaasService } from '../../services/asaas.service'

// Mock do AsaasService
jest.mock('../../services/asaas.service')
const mockAsaasService = asaasService as jest.Mocked<typeof asaasService>

describe('Packages Integration Tests', () => {
  let authToken: string
  let studentUser: any
  let teacherUser: any
  let studentPackage: any
  let hourPackage: any

  beforeAll(async () => {
    // Setup test data
    const { data: testStudent } = await supabase
      .from('users')
      .insert({
        name: 'Test Student',
        email: 'student@test.com',
        role: 'STUDENT',
        cpf: '12345678901'
      })
      .select()
      .single()
    
    studentUser = testStudent

    const { data: testTeacher } = await supabase
      .from('users')
      .insert({
        name: 'Test Teacher', 
        email: 'teacher@test.com',
        role: 'TEACHER',
        cpf: '98765432100'
      })
      .select()
      .single()
    
    teacherUser = testTeacher

    // Create test packages
    const { data: testStudentPackage } = await supabase
      .from('student_packages')
      .insert({
        franqueadora_id: 'test-franqueadora-id',
        title: 'Test Package',
        classes_qty: 10,
        price_cents: 10000,
        status: 'active'
      })
      .select()
      .single()
    
    studentPackage = testStudentPackage

    const { data: testHourPackage } = await supabase
      .from('hour_packages')
      .insert({
        franqueadora_id: 'test-franqueadora-id',
        title: 'Test Hour Package',
        hours_qty: 5,
        price_cents: 15000,
        status: 'active'
      })
      .select()
      .single()
    
    hourPackage = testHourPackage

    // Generate auth token (mock JWT)
    authToken = 'Bearer test-token'
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('users').delete().eq('email', 'student@test.com')
    await supabase.from('users').delete().eq('email', 'teacher@test.com')
    await supabase.from('student_packages').delete().eq('id', studentPackage?.id)
    await supabase.from('hour_packages').delete().eq('id', hourPackage?.id)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/packages/student/checkout', () => {
    it('should create payment intent successfully', async () => {
      // Mock Asaas responses
      mockAsaasService.createCustomer.mockResolvedValue({
        success: true,
        data: { id: 'asaas-customer-id' }
      })

      mockAsaasService.createPayment.mockResolvedValue({
        success: true,
        data: {
          id: 'asaas-payment-id',
          invoiceUrl: 'https://asaas.com/invoice',
          payload: 'pix-code-123'
        }
      })

      mockAsaasService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          paymentUrl: 'https://asaas.com/payment',
          bankSlipUrl: 'https://asaas.com/boleto',
          pixCode: 'pix-code-123'
        }
      })

      const response = await request(app)
        .post('/api/packages/student/checkout')
        .set('Authorization', authToken)
        .send({
          package_id: studentPackage.id,
          payment_method: 'PIX'
        })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        message: 'Pagamento criado com sucesso',
        payment_intent: {
          id: expect.any(String),
          type: 'STUDENT_PACKAGE',
          status: 'PENDING',
          checkout_url: expect.any(String)
        },
        package: {
          title: 'Test Package',
          classes_qty: 10,
          price_cents: 10000
        }
      })
    })

    it('should return 400 when CPF is required in production', async () => {
      // Mock production environment
      process.env.ASAAS_ENV = 'production'

      // Create user without CPF
      const { data: userWithoutCpf } = await supabase
        .from('users')
        .insert({
          name: 'User Without CPF',
          email: 'nocpf@test.com',
          role: 'STUDENT'
        })
        .select()
        .single()

      mockAsaasService.createCustomer.mockResolvedValue({
        success: false,
        error: 'CPF obrigatório para pagamento'
      })

      const response = await request(app)
        .post('/api/packages/student/checkout')
        .set('Authorization', authToken)
        .send({
          package_id: studentPackage.id,
          payment_method: 'PIX'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('CPF')

      // Cleanup
      await supabase.from('users').delete().eq('id', userWithoutCpf.id)
      delete process.env.ASAAS_ENV
    })

    it('should handle Asaas service timeout', async () => {
      mockAsaasService.createCustomer.mockResolvedValue({
        success: true,
        data: { id: 'asaas-customer-id' }
      })

      mockAsaasService.createPayment.mockRejectedValue(
        new Error('Request timeout')
      )

      const response = await request(app)
        .post('/api/packages/student/checkout')
        .set('Authorization', authToken)
        .send({
          package_id: studentPackage.id,
          payment_method: 'PIX'
        })

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/packages/professor/checkout', () => {
    it('should create payment intent for teacher successfully', async () => {
      mockAsaasService.createCustomer.mockResolvedValue({
        success: true,
        data: { id: 'asaas-customer-id' }
      })

      mockAsaasService.createPayment.mockResolvedValue({
        success: true,
        data: {
          id: 'asaas-payment-id',
          invoiceUrl: 'https://asaas.com/invoice',
          payload: 'pix-code-123'
        }
      })

      mockAsaasService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          paymentUrl: 'https://asaas.com/payment',
          bankSlipUrl: 'https://asaas.com/boleto', 
          pixCode: 'pix-code-123'
        }
      })

      const response = await request(app)
        .post('/api/packages/professor/checkout')
        .set('Authorization', authToken)
        .send({
          package_id: hourPackage.id,
          payment_method: 'PIX'
        })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        message: 'Pagamento criado com sucesso',
        payment_intent: {
          id: expect.any(String),
          type: 'PROF_HOURS',
          status: 'PENDING'
        },
        package: {
          title: 'Test Hour Package',
          hours_qty: 5,
          price_cents: 15000
        }
      })
    })
  })

  describe('PATCH /api/users/:id - CPF Update', () => {
    it('should update user CPF successfully', async () => {
      const response = await request(app)
        .patch(`/api/users/${studentUser.id}`)
        .set('Authorization', authToken)
        .send({
          cpf: '11122233344'
        })

      expect(response.status).toBe(200)
      expect(response.body.user.cpf).toBe('11122233344')
    })

    it('should validate CPF in production', async () => {
      process.env.ASAAS_ENV = 'production'

      const response = await request(app)
        .patch(`/api/users/${studentUser.id}`)
        .set('Authorization', authToken)
        .send({
          cpf: '123' // CPF inválido
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('CPF inválido')

      delete process.env.ASAAS_ENV
    })
  })
})

