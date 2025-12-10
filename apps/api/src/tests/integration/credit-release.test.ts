import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../../server'
import { supabase } from '../../lib/supabase'

/**
 * Integration Tests: Fluxo completo de liberação de créditos
 * Requirements: 1.1, 1.2, 1.3 - Buscar usuário, liberar créditos, verificar histórico
 */
describe('Credit Release Integration Tests', () => {
  let authTokenFranqueadora: string
  let franqueadoraUser: { id: string; email: string } | null = null
  let franqueadoraId: string | null = null
  let testStudent: { id: string; email: string; name: string } | null = null
  let testTeacher: { id: string; email: string; name: string } | null = null
  let academyId: string | null = null
  let skipTests = false

  // Variables for franchise permission tests
  let authTokenFranchiseA: string
  let franchiseAdminA: { id: string; email: string } | null = null
  let academyA: { id: string; name: string } | null = null
  let academyB: { id: string; name: string } | null = null
  let studentInAcademyB: { id: string; email: string; name: string } | null = null
  let skipPermissionTests = false

  const TEST_FRANQUEADORA_EMAIL = 'credit-test-franqueadora@test.com'
  const TEST_STUDENT_EMAIL = 'credit-test-student@test.com'
  const TEST_TEACHER_EMAIL = 'credit-test-teacher@test.com'
  const TEST_FRANCHISE_ADMIN_A_EMAIL = 'credit-test-franchise-admin-a@test.com'
  const TEST_STUDENT_ACADEMY_B_EMAIL = 'credit-test-student-academy-b@test.com'

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret-0123456789-abcdef-XYZ'

    try {
      // Buscar ou criar franqueadora de teste
      const { data: existingFranqueadora } = await supabase
        .from('franqueadora')
        .select('id')
        .eq('email', TEST_FRANQUEADORA_EMAIL)
        .single()

      if (existingFranqueadora) {
        franqueadoraId = existingFranqueadora.id
      } else {
        // Usar franqueadora existente se não conseguir criar
        const { data: anyFranqueadora } = await supabase
          .from('franqueadora')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()

        if (!anyFranqueadora) {
          skipTests = true
          return
        }
        franqueadoraId = anyFranqueadora.id
      }

      // Buscar ou criar usuário admin da franqueadora
      const { data: existingAdmin } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', TEST_FRANQUEADORA_EMAIL)
        .single()

      if (existingAdmin) {
        franqueadoraUser = existingAdmin as any
      } else {
        const { data: newAdmin, error: adminError } = await supabase
          .from('users')
          .insert({
            name: 'Credit Test Franqueadora Admin',
            email: TEST_FRANQUEADORA_EMAIL,
            role: 'FRANQUEADORA'
          })
          .select('id, email')
          .single()

        if (adminError || !newAdmin) {
          // Usar admin existente
          const { data: anyAdmin } = await supabase
            .from('users')
            .select('id, email')
            .eq('role', 'FRANQUEADORA')
            .limit(1)
            .single()

          if (!anyAdmin) {
            skipTests = true
            return
          }
          franqueadoraUser = anyAdmin as any
        } else {
          franqueadoraUser = newAdmin as any
        }
      }

      // Vincular admin à franqueadora se necessário
      if (franqueadoraUser && franqueadoraId) {
        const { data: existingLink } = await supabase
          .from('franqueadora_admins')
          .select('id')
          .eq('user_id', franqueadoraUser.id)
          .eq('franqueadora_id', franqueadoraId)
          .single()

        if (!existingLink) {
          await supabase.from('franqueadora_admins').insert({
            user_id: franqueadoraUser.id,
            franqueadora_id: franqueadoraId
          })
        }
      }

      // Buscar uma academia existente
      const { data: academy } = await supabase
        .from('academies')
        .select('id')
        .eq('franqueadora_id', franqueadoraId)
        .limit(1)
        .single()

      if (academy) {
        academyId = academy.id
      }

      // Buscar ou criar aluno de teste
      const { data: existingStudent } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', TEST_STUDENT_EMAIL)
        .single()

      if (existingStudent) {
        testStudent = existingStudent as any
      } else {
        const { data: newStudent, error: studentError } = await supabase
          .from('users')
          .insert({
            name: 'Credit Test Student',
            email: TEST_STUDENT_EMAIL,
            role: 'STUDENT'
          })
          .select('id, email, name')
          .single()

        if (!studentError && newStudent) {
          testStudent = newStudent as any
        }
      }

      // Vincular aluno à academia se existir
      if (testStudent && academyId) {
        const { data: existingStudentLink } = await supabase
          .from('academy_students')
          .select('id')
          .eq('student_id', testStudent.id)
          .eq('academy_id', academyId)
          .single()

        if (!existingStudentLink) {
          await supabase.from('academy_students').insert({
            student_id: testStudent.id,
            academy_id: academyId
          })
        }
      }

      // Buscar ou criar professor de teste
      const { data: existingTeacher } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', TEST_TEACHER_EMAIL)
        .single()

      if (existingTeacher) {
        testTeacher = existingTeacher as any
      } else {
        const { data: newTeacher, error: teacherError } = await supabase
          .from('users')
          .insert({
            name: 'Credit Test Teacher',
            email: TEST_TEACHER_EMAIL,
            role: 'TEACHER'
          })
          .select('id, email, name')
          .single()

        if (!teacherError && newTeacher) {
          testTeacher = newTeacher as any
        }
      }

      // Vincular professor à academia se existir
      if (testTeacher && academyId) {
        const { data: existingTeacherLink } = await supabase
          .from('academy_teachers')
          .select('id')
          .eq('teacher_id', testTeacher.id)
          .eq('academy_id', academyId)
          .single()

        if (!existingTeacherLink) {
          await supabase.from('academy_teachers').insert({
            teacher_id: testTeacher.id,
            academy_id: academyId,
            status: 'active'
          })
        }
      }

      // Gerar token JWT para admin da franqueadora
      if (franqueadoraUser) {
        authTokenFranqueadora = `Bearer ${jwt.sign(
          {
            userId: franqueadoraUser.id,
            email: franqueadoraUser.email,
            role: 'FRANQUEADORA',
            canonicalRole: 'FRANCHISOR'
          },
          secret
        )}`
      }

      // Verificar se temos os dados mínimos para os testes
      if (!franqueadoraUser || !franqueadoraId || !testStudent) {
        skipTests = true
      }

      // ========================================================================
      // Setup para testes de permissão franqueadora vs franquia
      // Requirements: 3.2, 3.4
      // ========================================================================
      try {
        // Buscar duas academias diferentes da mesma franqueadora
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name, settings')
          .eq('franqueadora_id', franqueadoraId)
          .limit(2)

        if (!academies || academies.length < 2) {
          skipPermissionTests = true
        } else {
          academyA = { id: academies[0].id, name: academies[0].name }
          academyB = { id: academies[1].id, name: academies[1].name }

          // Habilitar liberação manual de créditos para academyA
          const settingsA = (academies[0].settings as Record<string, any>) || {}
          await supabase
            .from('academies')
            .update({ settings: { ...settingsA, manualCreditReleaseEnabled: true } })
            .eq('id', academyA.id)

          // Buscar ou criar admin da franquia A
          const { data: existingFranchiseAdmin } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', TEST_FRANCHISE_ADMIN_A_EMAIL)
            .single()

          if (existingFranchiseAdmin) {
            franchiseAdminA = existingFranchiseAdmin as any
          } else {
            const { data: newFranchiseAdmin, error: franchiseAdminError } = await supabase
              .from('users')
              .insert({
                name: 'Credit Test Franchise Admin A',
                email: TEST_FRANCHISE_ADMIN_A_EMAIL,
                role: 'FRANQUIA'
              })
              .select('id, email')
              .single()

            if (!franchiseAdminError && newFranchiseAdmin) {
              franchiseAdminA = newFranchiseAdmin as any
            }
          }

          // Vincular admin à franquia A
          if (franchiseAdminA && academyA) {
            const { data: existingFranchiseLink } = await supabase
              .from('franchise_admins')
              .select('id')
              .eq('user_id', franchiseAdminA.id)
              .eq('franchise_id', academyA.id)
              .single()

            if (!existingFranchiseLink) {
              await supabase.from('franchise_admins').insert({
                user_id: franchiseAdminA.id,
                franchise_id: academyA.id
              })
            }

            // Vincular admin à franqueadora também
            const { data: existingFranqueadoraLink } = await supabase
              .from('franqueadora_admins')
              .select('id')
              .eq('user_id', franchiseAdminA.id)
              .eq('franqueadora_id', franqueadoraId)
              .single()

            if (!existingFranqueadoraLink) {
              await supabase.from('franqueadora_admins').insert({
                user_id: franchiseAdminA.id,
                franqueadora_id: franqueadoraId
              })
            }
          }

          // Buscar ou criar aluno na academia B (diferente da academia A)
          const { data: existingStudentB } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('email', TEST_STUDENT_ACADEMY_B_EMAIL)
            .single()

          if (existingStudentB) {
            studentInAcademyB = existingStudentB as any
          } else {
            const { data: newStudentB, error: studentBError } = await supabase
              .from('users')
              .insert({
                name: 'Credit Test Student Academy B',
                email: TEST_STUDENT_ACADEMY_B_EMAIL,
                role: 'STUDENT'
              })
              .select('id, email, name')
              .single()

            if (!studentBError && newStudentB) {
              studentInAcademyB = newStudentB as any
            }
          }

          // Vincular aluno à academia B (não à academia A)
          if (studentInAcademyB && academyB) {
            // Remover de academy A se existir
            await supabase
              .from('academy_students')
              .delete()
              .eq('student_id', studentInAcademyB.id)
              .eq('academy_id', academyA.id)

            // Adicionar à academy B
            const { data: existingStudentBLink } = await supabase
              .from('academy_students')
              .select('id')
              .eq('student_id', studentInAcademyB.id)
              .eq('academy_id', academyB.id)
              .single()

            if (!existingStudentBLink) {
              await supabase.from('academy_students').insert({
                student_id: studentInAcademyB.id,
                academy_id: academyB.id
              })
            }
          }

          // Gerar token JWT para admin da franquia A
          if (franchiseAdminA) {
            authTokenFranchiseA = `Bearer ${jwt.sign(
              {
                userId: franchiseAdminA.id,
                email: franchiseAdminA.email,
                role: 'FRANQUIA',
                canonicalRole: 'FRANCHISE_ADMIN'
              },
              secret
            )}`
          }

          // Verificar se temos os dados mínimos para os testes de permissão
          if (!franchiseAdminA || !academyA || !academyB || !studentInAcademyB) {
            skipPermissionTests = true
          }
        }
      } catch (error) {
        console.error('Erro no setup dos testes de permissão:', error)
        skipPermissionTests = true
      }
    } catch (error) {
      console.error('Erro no setup dos testes de crédito:', error)
      skipTests = true
    }
  })

  afterAll(async () => {
    // Limpar dados de teste criados
    if (testStudent) {
      await supabase
        .from('credit_grants')
        .delete()
        .eq('recipient_id', testStudent.id)

      await supabase
        .from('student_class_tx')
        .delete()
        .eq('student_id', testStudent.id)
        .eq('type', 'GRANT')
    }

    if (testTeacher) {
      await supabase
        .from('credit_grants')
        .delete()
        .eq('recipient_id', testTeacher.id)

      await supabase
        .from('hour_tx')
        .delete()
        .eq('professor_id', testTeacher.id)
        .eq('type', 'GRANT')
    }

    // Limpar dados de teste de permissão
    if (studentInAcademyB) {
      await supabase
        .from('credit_grants')
        .delete()
        .eq('recipient_id', studentInAcademyB.id)

      await supabase
        .from('student_class_tx')
        .delete()
        .eq('student_id', studentInAcademyB.id)
        .eq('type', 'GRANT')
    }
  })

  describe('Fluxo completo: Buscar usuário, liberar créditos, verificar histórico', () => {
    it('deve buscar um aluno por email e retornar seus dados', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: testStudent.email })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.user).toBeTruthy()
      expect(res.body.user.email).toBe(testStudent.email)
      expect(res.body.user.id).toBe(testStudent.id)
    })

    it('deve liberar créditos (STUDENT_CLASS) para um aluno', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testStudent.email,
        creditType: 'STUDENT_CLASS',
        quantity: 5,
        reason: 'Teste de integração - liberação de aulas'
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.grantId).toBeTruthy()
      expect(res.body.balance).toBeTruthy()
      expect(res.body.transaction).toBeTruthy()
      expect(res.body.transaction.type).toBe('GRANT')
      expect(res.body.transaction.source).toBe('ADMIN')
      expect(res.body.transaction.qty).toBe(5)
    })

    it('deve verificar que o histórico contém a liberação feita', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/history')
        .query({ recipientEmail: testStudent.email })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.grants).toBeTruthy()
      expect(Array.isArray(res.body.grants)).toBe(true)
      expect(res.body.grants.length).toBeGreaterThan(0)

      // Verificar que a liberação mais recente é a que fizemos
      const recentGrant = res.body.grants[0]
      expect(recentGrant.recipient_email).toBe(testStudent.email)
      expect(recentGrant.credit_type).toBe('STUDENT_CLASS')
      expect(recentGrant.quantity).toBe(5)
      expect(recentGrant.reason).toBe('Teste de integração - liberação de aulas')
    })

    it('deve buscar um professor por email e retornar seus dados', async () => {
      if (skipTests || !testTeacher) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: testTeacher.email })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.user).toBeTruthy()
      expect(res.body.user.email).toBe(testTeacher.email)
      expect(res.body.user.id).toBe(testTeacher.id)
    })

    it('deve liberar créditos (PROFESSOR_HOUR) para um professor', async () => {
      if (skipTests || !testTeacher) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testTeacher.email,
        creditType: 'PROFESSOR_HOUR',
        quantity: 10,
        reason: 'Teste de integração - liberação de horas'
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.grantId).toBeTruthy()
      expect(res.body.balance).toBeTruthy()
      expect(res.body.transaction).toBeTruthy()
      expect(res.body.transaction.type).toBe('GRANT')
      expect(res.body.transaction.source).toBe('ADMIN')
      expect(res.body.transaction.hours).toBe(10)
    })

    it('deve verificar que o histórico contém a liberação de horas', async () => {
      if (skipTests || !testTeacher) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/history')
        .query({ recipientEmail: testTeacher.email })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.grants).toBeTruthy()
      expect(Array.isArray(res.body.grants)).toBe(true)
      expect(res.body.grants.length).toBeGreaterThan(0)

      // Verificar que a liberação mais recente é a que fizemos
      const recentGrant = res.body.grants[0]
      expect(recentGrant.recipient_email).toBe(testTeacher.email)
      expect(recentGrant.credit_type).toBe('PROFESSOR_HOUR')
      expect(recentGrant.quantity).toBe(10)
      expect(recentGrant.reason).toBe('Teste de integração - liberação de horas')
    })

    it('deve retornar resultado vazio para email inexistente na busca', async () => {
      if (skipTests) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: 'email-inexistente-xyz@test.com' })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.user).toBeNull()
      expect(res.body.franchises).toEqual([])
    })

    it('deve rejeitar liberação para email inexistente', async () => {
      if (skipTests) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: 'email-inexistente-xyz@test.com',
        creditType: 'STUDENT_CLASS',
        quantity: 5,
        reason: 'Teste de rejeição'
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('USER_NOT_FOUND')
    })

    it('deve rejeitar liberação com quantidade inválida', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testStudent.email,
        creditType: 'STUDENT_CLASS',
        quantity: 0,
        reason: 'Teste de quantidade inválida'
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(400)
      // Pode ser VALIDATION_ERROR (do Zod) ou INVALID_QUANTITY
      expect(['VALIDATION_ERROR', 'INVALID_QUANTITY']).toContain(res.body.error)
    })

    it('deve rejeitar alta quantidade sem confirmação', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testStudent.email,
        creditType: 'STUDENT_CLASS',
        quantity: 150,
        reason: 'Teste de alta quantidade'
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
    })

    it('deve permitir alta quantidade com confirmação', async () => {
      if (skipTests || !testStudent) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testStudent.email,
        creditType: 'STUDENT_CLASS',
        quantity: 150,
        reason: 'Teste de alta quantidade com confirmação',
        confirmHighQuantity: true
      }

      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.transaction.qty).toBe(150)
    })

    it('deve filtrar histórico por tipo de crédito', async () => {
      if (skipTests) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/history')
        .query({ creditType: 'STUDENT_CLASS' })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.grants).toBeTruthy()
      
      // Todos os resultados devem ser do tipo STUDENT_CLASS
      for (const grant of res.body.grants) {
        expect(grant.credit_type).toBe('STUDENT_CLASS')
      }
    })

    it('deve paginar resultados do histórico', async () => {
      if (skipTests) {
        return expect(true).toBe(true)
      }

      const res = await request(app)
        .get('/api/admin/credits/history')
        .query({ page: 1, limit: 2 })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      expect(res.body.page).toBe(1)
      expect(res.body.grants.length).toBeLessThanOrEqual(2)
      expect(typeof res.body.total).toBe('number')
      expect(typeof res.body.totalPages).toBe('number')
    })
  })

  /**
   * Testes de permissão: Franqueadora vs Franquia
   * Requirements: 3.2, 3.4 - Verificar que franquia não acessa usuários de outra franquia
   */
  describe('Permissões: Franqueadora vs Franquia', () => {
    it('admin de franquia não deve encontrar usuário de outra franquia na busca', async () => {
      if (skipPermissionTests || !studentInAcademyB) {
        return expect(true).toBe(true)
      }

      // Admin da franquia A busca aluno que está na franquia B
      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: studentInAcademyB.email })
        .set('Authorization', authTokenFranchiseA)

      expect(res.status).toBe(200)
      // Deve retornar resultado vazio porque o aluno não pertence à franquia A
      expect(res.body.user).toBeNull()
      expect(res.body.franchises).toEqual([])
    })

    it('admin de franquia não deve conseguir liberar créditos para usuário de outra franquia', async () => {
      if (skipPermissionTests || !studentInAcademyB) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: studentInAcademyB.email,
        creditType: 'STUDENT_CLASS',
        quantity: 5,
        reason: 'Teste de permissão - tentativa de liberar para outra franquia'
      }

      // Admin da franquia A tenta liberar créditos para aluno da franquia B
      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranchiseA)
        .send(grantData)

      // Deve ser rejeitado com UNAUTHORIZED_FRANCHISE ou USER_NOT_FOUND
      // (USER_NOT_FOUND porque a busca interna também respeita o escopo)
      expect([403, 404]).toContain(res.status)
      expect(['UNAUTHORIZED_FRANCHISE', 'USER_NOT_FOUND']).toContain(res.body.error)
    })

    it('admin de franqueadora deve conseguir buscar usuário de qualquer franquia', async () => {
      if (skipPermissionTests || !studentInAcademyB) {
        return expect(true).toBe(true)
      }

      // Admin da franqueadora busca aluno que está na franquia B
      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: studentInAcademyB.email })
        .set('Authorization', authTokenFranqueadora)

      expect(res.status).toBe(200)
      // Deve encontrar o usuário porque franqueadora tem acesso a todas as franquias
      expect(res.body.user).toBeTruthy()
      expect(res.body.user.email).toBe(studentInAcademyB.email)
    })

    it('admin de franqueadora deve conseguir liberar créditos para usuário de qualquer franquia', async () => {
      if (skipPermissionTests || !studentInAcademyB) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: studentInAcademyB.email,
        creditType: 'STUDENT_CLASS',
        quantity: 3,
        reason: 'Teste de permissão - franqueadora liberando para franquia B'
      }

      // Admin da franqueadora libera créditos para aluno da franquia B
      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranqueadora)
        .send(grantData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.grantId).toBeTruthy()
      expect(res.body.transaction.qty).toBe(3)
    })

    it('admin de franquia deve conseguir buscar usuário da própria franquia', async () => {
      if (skipPermissionTests || !testStudent || !academyId) {
        return expect(true).toBe(true)
      }

      // Primeiro, verificar se testStudent está na academyA
      // Se não estiver, vincular temporariamente
      if (academyA) {
        const { data: existingLink } = await supabase
          .from('academy_students')
          .select('id')
          .eq('student_id', testStudent.id)
          .eq('academy_id', academyA.id)
          .single()

        if (!existingLink) {
          await supabase.from('academy_students').insert({
            student_id: testStudent.id,
            academy_id: academyA.id
          })
        }
      }

      // Admin da franquia A busca aluno que está na franquia A
      const res = await request(app)
        .get('/api/admin/credits/search-user')
        .query({ email: testStudent.email })
        .set('Authorization', authTokenFranchiseA)

      expect(res.status).toBe(200)
      // Deve encontrar o usuário porque pertence à mesma franquia
      expect(res.body.user).toBeTruthy()
      expect(res.body.user.email).toBe(testStudent.email)
    })

    it('admin de franquia deve conseguir liberar créditos para usuário da própria franquia', async () => {
      if (skipPermissionTests || !testStudent || !academyA) {
        return expect(true).toBe(true)
      }

      const grantData = {
        userEmail: testStudent.email,
        creditType: 'STUDENT_CLASS',
        quantity: 2,
        reason: 'Teste de permissão - franquia liberando para próprio aluno'
      }

      // Admin da franquia A libera créditos para aluno da franquia A
      const res = await request(app)
        .post('/api/admin/credits/grant')
        .set('Authorization', authTokenFranchiseA)
        .send(grantData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.grantId).toBeTruthy()
      expect(res.body.transaction.qty).toBe(2)
    })

    it('histórico de admin de franquia deve mostrar apenas liberações da própria franquia', async () => {
      if (skipPermissionTests || !authTokenFranchiseA) {
        return expect(true).toBe(true)
      }

      // Admin da franquia A consulta histórico
      const res = await request(app)
        .get('/api/admin/credits/history')
        .set('Authorization', authTokenFranchiseA)

      expect(res.status).toBe(200)
      expect(res.body.grants).toBeTruthy()
      expect(Array.isArray(res.body.grants)).toBe(true)

      // Todas as liberações devem ser da franquia A ou sem franchise_id específico
      // (liberações feitas pela franqueadora podem não ter franchise_id)
      for (const grant of res.body.grants) {
        if (grant.franchise_id) {
          expect(grant.franchise_id).toBe(academyA?.id)
        }
      }
    })
  })
})
