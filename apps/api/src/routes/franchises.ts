import { Router } from 'express'
import { supabase } from '../lib/supabase'
import bcrypt from 'bcryptjs'
import { requireAuth, requireRole } from '../middleware/auth'
import { auditService } from '../services/audit.service'
import { asaasService } from '../services/asaas.service'
import { validateCpfCnpj } from '../utils/validation'

const router = Router()

// ============================================
// ROTAS DA FRANQUEADORA
// ============================================

// POST /api/franchises/create - Criar franquia com admin
router.post('/create', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { academy, admin } = req.body

    // Validação de datas de contrato (se ambas fornecidas)
    if (academy?.contract_start_date && academy?.contract_end_date) {
      const start = new Date(academy.contract_start_date)
      const end = new Date(academy.contract_end_date)
      if (isFinite(start.getTime()) && isFinite(end.getTime()) && end < start) {
        return res.status(400).json({
          error: 'CONTRACT_DATES_INVALID',
          message: 'Data de término deve ser maior ou igual à data de início'
        })
      }
    }

    // Validação de CPF/CNPJ (obrigatório)
    if (!academy?.cpf_cnpj || academy.cpf_cnpj.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_CPF_CNPJ',
        message: 'CPF/CNPJ é obrigatório para criar uma franquia.'
      })
    }

    if (!validateCpfCnpj(academy.cpf_cnpj)) {
      return res.status(400).json({
        error: 'INVALID_CPF_CNPJ',
        message: 'CPF ou CNPJ inválido. Verifique os dígitos verificadores.'
      })
    }

    // 1. Criar usuário admin
    const hashedPassword = await bcrypt.hash(admin.password, 10)

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name: admin.name,
        email: admin.email,
        password_hash: hashedPassword,
        role: 'FRANCHISE_ADMIN',
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      throw new Error('Erro ao criar usuário admin')
    }

    // Validação dos novos campos obrigatórios
    if (!academy?.address_number || academy.address_number.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_ADDRESS_NUMBER',
        message: 'Número do endereço é obrigatório.'
      })
    }

    if (!academy?.province || academy.province.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_PROVINCE',
        message: 'Bairro é obrigatório.'
      })
    }

    // Sanitizar CPF/CNPJ para determinar se é CPF ou CNPJ
    const cpfCnpjSanitized = academy.cpf_cnpj.replace(/\D/g, '')
    const isCpf = cpfCnpjSanitized.length === 11
    const isCnpj = cpfCnpjSanitized.length === 14

    // Validação condicional: birthDate obrigatório para CPF, companyType obrigatório para CNPJ
    if (isCpf) {
      if (!academy?.birth_date || academy.birth_date.trim() === '') {
        return res.status(400).json({
          error: 'MISSING_BIRTH_DATE',
          message: 'Data de nascimento é obrigatória para pessoa física (CPF).'
        })
      }
      // Validar se a data de nascimento é válida
      const birthDate = new Date(academy.birth_date)
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({
          error: 'INVALID_BIRTH_DATE',
          message: 'Data de nascimento inválida.'
        })
      }
      // Validar se a data não é futura
      if (birthDate > new Date()) {
        return res.status(400).json({
          error: 'INVALID_BIRTH_DATE',
          message: 'Data de nascimento não pode ser futura.'
        })
      }
    }

    if (isCnpj) {
      if (!academy?.company_type || academy.company_type.trim() === '') {
        return res.status(400).json({
          error: 'MISSING_COMPANY_TYPE',
          message: 'Tipo de empresa é obrigatório para pessoa jurídica (CNPJ).'
        })
      }

      if (!['MEI', 'LIMITED', 'ASSOCIATION'].includes(academy.company_type)) {
        return res.status(400).json({
          error: 'INVALID_COMPANY_TYPE',
          message: 'Tipo de empresa inválido. Para CNPJ, deve ser: MEI, LIMITED ou ASSOCIATION.'
        })
      }
    }

    // Validação de campos obrigatórios para criação de conta Asaas
    if (!academy?.address || academy.address.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_ADDRESS',
        message: 'Endereço é obrigatório para criar conta Asaas.'
      })
    }

    if (!academy?.zip_code || academy.zip_code.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_POSTAL_CODE',
        message: 'CEP é obrigatório para criar conta Asaas.'
      })
    }

    if (!academy?.phone || academy.phone.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_PHONE',
        message: 'Telefone é obrigatório para criar conta Asaas.'
      })
    }

    if (!academy?.monthly_revenue || academy.monthly_revenue <= 0) {
      return res.status(400).json({
        error: 'MISSING_OR_INVALID_INCOME_VALUE',
        message: 'Receita mensal é obrigatória e deve ser maior que zero para criar conta Asaas.'
      })
    }

    // CPF/CNPJ já foi sanitizado acima

    // 2. Garantir que franqueadora tem walletId (obrigatório)
    const { data: franqueadora } = await supabase
      .from('franqueadora')
      .select('id, name, email, cnpj, phone, address, city, state, zip_code, asaas_wallet_id')
      .eq('id', academy.franqueadora_id)
      .single()

    if (!franqueadora) {
      return res.status(400).json({
        error: 'FRANQUEADORA_NOT_FOUND',
        message: 'Franqueadora não encontrada.'
      })
    }

    // Garantir que franqueadora tem walletId (obrigatório)
    let franchisorWalletId = franqueadora.asaas_wallet_id
    if (!franchisorWalletId) {
      const franchisorWallet = await asaasService.getFranchisorWalletId(franqueadora.id)
      if (!franchisorWallet.success || !franchisorWallet.walletId) {
        return res.status(500).json({
          error: 'FRANCHISOR_WALLET_ID_FAILED',
          message: 'Não foi possível obter o walletId da franqueadora. A franqueadora deve ter uma conta Asaas configurada.'
        })
      }
      franchisorWalletId = franchisorWallet.walletId
    }

    // 3. Criar conta no Asaas PRIMEIRO (antes de criar no banco)
    const accountData: any = {
      name: academy.name,
      email: academy.email,
      cpfCnpj: cpfCnpjSanitized,
      mobilePhone: academy.phone,
      incomeValue: academy.monthly_revenue,
      address: academy.address,
      addressNumber: academy.address_number,
      province: academy.province,
      postalCode: academy.zip_code,
      phone: academy.phone
    }

    // Adicionar campos condicionais
    if (isCpf && academy.birth_date) {
      accountData.birthDate = academy.birth_date
    }
    if (isCnpj && academy.company_type) {
      accountData.companyType = academy.company_type
    }

    const accountResult = await asaasService.createAccount(accountData)

    if (!accountResult.success || !accountResult.data) {
      console.error('[FRANCHISES] ❌ Erro ao criar conta Asaas:', accountResult.error)
      // Rollback: deletar usuário
      await supabase.from('users').delete().eq('id', user.id)
      return res.status(500).json({
        error: 'ASAAS_ACCOUNT_CREATION_FAILED',
        message: accountResult.error || 'Erro ao criar conta no Asaas. Não foi possível criar a franquia.'
      })
    }

    // Extrair accountId e walletId da resposta
    const asaasAccountId = accountResult.data.id
    const asaasWalletId = accountResult.data.walletId || asaasAccountId // Fallback se walletId não vier

    if (!asaasAccountId || !asaasWalletId) {
      console.error('[FRANCHISES] ❌ Conta Asaas criada mas sem accountId ou walletId:', accountResult.data)
      // Rollback: deletar usuário
      await supabase.from('users').delete().eq('id', user.id)
      return res.status(500).json({
        error: 'ASAAS_ACCOUNT_INCOMPLETE',
        message: 'Conta Asaas criada mas sem accountId ou walletId. Não foi possível criar a franquia.'
      })
    }

    console.log('[FRANCHISES] ✅ Conta Asaas criada:', {
      accountId: asaasAccountId,
      walletId: asaasWalletId
    })

    // 4. Criar academia no banco COM os IDs do Asaas (obrigatórios)
    let { data: newAcademy, error: academyError } = await supabase
      .from('academies')
      .insert({
        franqueadora_id: academy.franqueadora_id,
        name: academy.name,
        email: academy.email,
        phone: academy.phone,
        address: academy.address,
        address_number: academy.address_number,
        province: academy.province,
        city: academy.city,
        state: academy.state,
        zip_code: academy.zip_code,
        cpf_cnpj: cpfCnpjSanitized,
        company_type: academy.company_type || null,
        birth_date: academy.birth_date || null,
        franchise_fee: academy.franchise_fee || 0,
        royalty_percentage: academy.royalty_percentage || 0,
        monthly_revenue: academy.monthly_revenue || 0,
        contract_start_date: academy.contract_start_date,
        contract_end_date: academy.contract_end_date,
        is_active: academy.is_active ?? true,
        // IDs do Asaas (obrigatórios)
        asaas_account_id: asaasAccountId,
        asaas_wallet_id: asaasWalletId
      })
      .select()
      .single()

    if (academyError) {
      console.error('Error creating academy:', academyError)
      // Rollback: deletar usuário
      await supabase.from('users').delete().eq('id', user.id)
      // Nota: Não podemos deletar a conta Asaas criada, mas ela ficará órfã
      throw new Error('Erro ao criar academia')
    }

    // 5. Criar vínculo franchise_admin
    const { error: franchiseAdminError } = await supabase
      .from('franchise_admins')
      .insert({
        user_id: user.id,
        academy_id: newAcademy.id
      })

    if (franchiseAdminError) {
      console.error('Error creating franchise admin link:', franchiseAdminError)
      // Rollback: deletar usuário e academia
      await supabase.from('users').delete().eq('id', user.id)
      await supabase.from('academies').delete().eq('id', newAcademy.id)
      throw new Error('Erro ao vincular admin à academia')
    }

    console.log('[FRANCHISES] ✅ Franquia criada com sucesso:', {
      academyId: newAcademy.id,
      asaasAccountId,
      asaasWalletId
    })

    res.status(201).json({
      academy: newAcademy,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('Error creating franchise with admin:', error)
    res.status(500).json({ error: error.message || 'Erro ao criar franquia' })
  }
})

// GET /api/franchises - Listar todas as franquias (academias)
router.get('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    let { franqueadora_id } = req.query as { franqueadora_id?: string }

    // Se não vier por query, usar o contexto do admin quando existir
    if (!franqueadora_id && req.franqueadoraAdmin?.franqueadora_id) {
      franqueadora_id = req.franqueadoraAdmin.franqueadora_id
    }

    let query = supabase
      .from('academies')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (franqueadora_id) {
      query = query.eq('franqueadora_id', franqueadora_id)
    }

    const { data, error } = await query

    if (error) throw error

    // Mapear para o formato esperado pelo frontend
    const franchises = (data || []).map(academy => ({
      id: academy.id,
      name: academy.name,
      address: academy.address,
      city: academy.city,
      state: academy.state,
      is_active: academy.is_active,
      monthly_revenue: academy.monthly_revenue,
      royalty_percentage: academy.royalty_percentage,
      created_at: academy.created_at,
      // Campos de políticas para consumo no dashboard da Franqueadora
      credits_per_class: academy.credits_per_class,
      class_duration_minutes: academy.class_duration_minutes,
      checkin_tolerance: academy.checkin_tolerance
    }))

    res.json({ franchises })
  } catch (error: any) {
    console.error('Error fetching franchises:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/franchises/:id - Obter detalhes de uma franquia
router.get('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Franchise not found' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Error fetching franchise:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/franchises - Criar nova franquia
router.post('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const {
      franqueadora_id,
      name,
      email,
      phone,
      address,
      address_number,
      province,
      city,
      state,
      zip_code,
      cpf_cnpj,
      company_type,
      birth_date,
      franchise_fee,
      royalty_percentage,
      monthly_revenue,
      contract_start_date,
      contract_end_date,
      is_active
    } = req.body

    // Validação de datas de contrato (se ambas fornecidas)
    if (contract_start_date && contract_end_date) {
      const start = new Date(contract_start_date)
      const end = new Date(contract_end_date)
      if (isFinite(start.getTime()) && isFinite(end.getTime()) && end < start) {
        return res.status(400).json({
          error: 'CONTRACT_DATES_INVALID',
          message: 'Data de término deve ser maior ou igual à data de início'
        })
      }
    }

    // Validação de CPF/CNPJ (obrigatório)
    if (!cpf_cnpj || cpf_cnpj.trim() === '') {
      return res.status(400).json({
        error: 'MISSING_CPF_CNPJ',
        message: 'CPF/CNPJ é obrigatório para criar uma franquia.'
      })
    }

    if (!validateCpfCnpj(cpf_cnpj)) {
      return res.status(400).json({
        error: 'INVALID_CPF_CNPJ',
        message: 'CPF ou CNPJ inválido. Verifique os dígitos verificadores.'
      })
    }

    // Sanitizar CPF/CNPJ (remover formatação)
    const cpfCnpjSanitized = cpf_cnpj.replace(/\D/g, '')
    const isCpf = cpfCnpjSanitized.length === 11
    const isCnpj = cpfCnpjSanitized.length === 14

    // Validação condicional: birthDate obrigatório para CPF, companyType obrigatório para CNPJ
    if (isCpf) {
      if (!birth_date || birth_date.trim() === '') {
        return res.status(400).json({
          error: 'MISSING_BIRTH_DATE',
          message: 'Data de nascimento é obrigatória para pessoa física (CPF).'
        })
      }
      // Validar se a data de nascimento é válida
      const birthDateObj = new Date(birth_date)
      if (isNaN(birthDateObj.getTime())) {
        return res.status(400).json({
          error: 'INVALID_BIRTH_DATE',
          message: 'Data de nascimento inválida.'
        })
      }
      // Validar se a data não é futura
      if (birthDateObj > new Date()) {
        return res.status(400).json({
          error: 'INVALID_BIRTH_DATE',
          message: 'Data de nascimento não pode ser futura.'
        })
      }
    }

    if (isCnpj) {
      if (!company_type || company_type.trim() === '') {
        return res.status(400).json({
          error: 'MISSING_COMPANY_TYPE',
          message: 'Tipo de empresa é obrigatório para pessoa jurídica (CNPJ).'
        })
      }

      if (!['MEI', 'LIMITED', 'ASSOCIATION'].includes(company_type)) {
        return res.status(400).json({
          error: 'INVALID_COMPANY_TYPE',
          message: 'Tipo de empresa inválido. Para CNPJ, deve ser: MEI, LIMITED ou ASSOCIATION.'
        })
      }
    }

    const { data, error } = await supabase
      .from('academies')
      .insert({
        franqueadora_id,
        name,
        email,
        phone,
        address,
        address_number,
        province,
        city,
        state,
        zip_code,
        cpf_cnpj: cpfCnpjSanitized,
        company_type: company_type || null,
        birth_date: birth_date || null,
        franchise_fee,
        royalty_percentage,
        monthly_revenue: monthly_revenue || 0,
        contract_start_date,
        contract_end_date,
        is_active: typeof is_active === 'boolean' ? is_active : true
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Error creating franchise:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/franchises/:id - Atualizar franquia
router.put('/:id', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANQUIA']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Restringir campos de políticas para perfis que não sejam FRANCHISOR/SUPER_ADMIN/ADMIN
    const policyFields = ['credits_per_class', 'class_duration_minutes', 'checkin_tolerance'] as const
    const role = (req as any)?.user?.canonicalRole || (req as any)?.user?.role
    if (role !== 'FRANCHISOR' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      for (const field of policyFields) {
        if (field in updates) {
          delete updates[field]
        }
      }
    }

    // Buscar valores atuais para auditoria
    const { data: beforePolicy } = await supabase
      .from('academies')
      .select('credits_per_class, class_duration_minutes, checkin_tolerance')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('academies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Franchise not found' })
    }

    res.json(data)

    // Audit log de mudanças de políticas
    try {
      if (role === 'FRANCHISOR' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
        const changed: Record<string, any> = {}
        for (const f of policyFields) {
          if ((updates as any)[f] !== undefined && beforePolicy && data && (beforePolicy as any)[f] !== (data as any)[f]) {
            changed[f] = { old: (beforePolicy as any)[f], new: (data as any)[f] }
          }
        }
        if (Object.keys(changed).length > 0) {
          await auditService.createLog({
            tableName: 'academies',
            recordId: id,
            operation: 'SENSITIVE_CHANGE',
            actorId: (req as any)?.user?.userId,
            actorRole: (req as any)?.user?.role,
            oldValues: beforePolicy || undefined,
            newValues: {
              credits_per_class: (data as any)?.credits_per_class,
              class_duration_minutes: (data as any)?.class_duration_minutes,
              checkin_tolerance: (data as any)?.checkin_tolerance
            },
            metadata: { changedFields: Object.keys(changed) },
            ipAddress: (req as any).ip,
            userAgent: (req as any).headers?.['user-agent']
          })
        }
      }
    } catch (logErr) {
      console.error('Audit log failed (franchises update):', logErr)
    }
  } catch (error: any) {
    console.error('Error updating franchise:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/franchises/:id - Deletar franquia (hard delete)
router.delete('/:id', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params

    // 1. Buscar admins da franquia para deletar depois
    const { data: admins } = await supabase
      .from('franchise_admins')
      .select('user_id')
      .eq('academy_id', id)

    // 2. Deletar vínculo franchise_admins
    await supabase
      .from('franchise_admins')
      .delete()
      .eq('academy_id', id)

    // 3. Deletar academy_teachers
    await supabase
      .from('academy_teachers')
      .delete()
      .eq('academy_id', id)

    // 4. Deletar academy_students
    await supabase
      .from('academy_students')
      .delete()
      .eq('academy_id', id)

    // 5. Deletar academy_plans
    await supabase
      .from('academy_plans')
      .delete()
      .eq('academy_id', id)

    // 6. Deletar academy_time_slots
    await supabase
      .from('academy_time_slots')
      .delete()
      .eq('academy_id', id)

    // 7. Deletar a academia
    const { error: academyError } = await supabase
      .from('academies')
      .delete()
      .eq('id', id)

    if (academyError) throw academyError

    // 8. Deletar usuários admin que eram apenas dessa franquia
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        // Verificar se o usuário é admin de outras franquias
        const { data: otherAdminRoles } = await supabase
          .from('franchise_admins')
          .select('id')
          .eq('user_id', admin.user_id)

        // Se não tem outras franquias, deletar usuário
        if (!otherAdminRoles || otherAdminRoles.length === 0) {
          await supabase
            .from('users')
            .delete()
            .eq('id', admin.user_id)
        }
      }
    }

    res.json({ message: 'Franchise deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting franchise:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/franchises/:id/stats - Estatísticas de uma franquia
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params

    const { data: studentsData, error: studentsError } = await supabase
      .from('academy_students')
      .select('status')
      .eq('academy_id', id)

    if (studentsError) throw studentsError

    const { data: teachersData, error: teachersError } = await supabase
      .from('academy_teachers')
      .select('teacher_id, status')
      .eq('academy_id', id)

    if (teachersError) throw teachersError

    const teacherIds = (teachersData || [])
      .map(t => t.teacher_id)
      .filter((value): value is string => Boolean(value))

    let bookings: any[] = []
    if (teacherIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, teacher_id')
        .in('teacher_id', teacherIds)

      if (bookingsError) throw bookingsError
      bookings = bookingsData || []
    }

    const { data: plansData, error: plansError } = await supabase
      .from('academy_plans')
      .select('*')
      .eq('academy_id', id)
      .eq('is_active', true)

    if (plansError) throw plansError

    const students = studentsData || []
    const teachers = teachersData || []
    const plans = plansData || []

    const stats = {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'active').length,
      totalTeachers: teachers.length,
      activeTeachers: teachers.filter(t => t.status === 'active').length,
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
      cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
      plansActive: plans.length
    }

    res.json(stats)
  } catch (error: any) {
    console.error('Error fetching franchise stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// ROTAS DE PACOTES DE FRANQUIA
// ============================================

// GET /api/franchises/packages - Listar pacotes de franquia
router.get('/packages/list', async (req, res) => {
  try {
    const { franqueadora_id } = req.query

    let query = supabase
      .from('franchise_packages')
      .select('*')
      .order('investment_amount', { ascending: true })

    if (franqueadora_id) {
      query = query.eq('franqueadora_id', franqueadora_id)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error fetching franchise packages:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/franchises/packages - Criar pacote de franquia
router.post('/packages', async (req, res) => {
  try {
    const {
      franqueadora_id,
      name,
      description,
      investment_amount,
      franchise_fee,
      royalty_percentage,
      territory_size,
      max_population,
      included_features
    } = req.body

    const { data, error } = await supabase
      .from('franchise_packages')
      .insert({
        franqueadora_id,
        name,
        description,
        investment_amount,
        franchise_fee,
        royalty_percentage,
        territory_size,
        max_population,
        included_features,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Error creating franchise package:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/franchises/packages/:id - Atualizar pacote
router.put('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const { data, error } = await supabase
      .from('franchise_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error updating franchise package:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/franchises/packages/:id - Deletar pacote
router.delete('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('franchise_packages')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ message: 'Package deactivated successfully' })
  } catch (error: any) {
    console.error('Error deleting franchise package:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// ROTAS DE LEADS
// ============================================

// GET /api/franchises/leads - Listar leads
router.get('/leads/list', async (req, res) => {
  try {
    const { franqueadora_id, status } = req.query

    let query = supabase
      .from('franchise_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (franqueadora_id) {
      query = query.eq('franqueadora_id', franqueadora_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error fetching franchise leads:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/franchises/leads - Criar lead
router.post('/leads', async (req, res) => {
  try {
    const {
      franqueadora_id,
      name,
      email,
      phone,
      city,
      investment_capacity,
      message
    } = req.body

    const { data, error } = await supabase
      .from('franchise_leads')
      .insert({
        franqueadora_id,
        name,
        email,
        phone,
        city,
        investment_capacity,
        message,
        status: 'NEW'
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Error creating franchise lead:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/franchises/leads/:id - Atualizar lead
router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const { data, error } = await supabase
      .from('franchise_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error updating franchise lead:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

