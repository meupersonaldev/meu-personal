import { Router } from 'express'
import { supabase } from '../config/supabase'
import bcrypt from 'bcryptjs'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// ============================================
// ROTAS DA FRANQUEADORA
// ============================================

// POST /api/franchises/create - Criar franquia com admin
router.post('/create', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { academy, admin } = req.body

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

    // 2. Criar academia
    const { data: newAcademy, error: academyError } = await supabase
      .from('academies')
      .insert({
        franqueadora_id: academy.franqueadora_id,
        name: academy.name,
        email: academy.email,
        phone: academy.phone,
        address: academy.address,
        city: academy.city,
        state: academy.state,
        zip_code: academy.zip_code,
        franchise_fee: academy.franchise_fee || 0,
        royalty_percentage: academy.royalty_percentage || 0,
        monthly_revenue: 0,
        contract_start_date: academy.contract_start_date,
        contract_end_date: academy.contract_end_date,
        is_active: true
      })
      .select()
      .single()

    if (academyError) {
      console.error('Error creating academy:', academyError)
      // Rollback: deletar usuário
      await supabase.from('users').delete().eq('id', user.id)
      throw new Error('Erro ao criar academia')
    }

    // 3. Criar vínculo franchise_admin
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
router.get('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
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
      created_at: academy.created_at
    }))

    res.json({ franchises })
  } catch (error: any) {
    console.error('Error fetching franchises:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/franchises/:id - Obter detalhes de uma franquia
router.get('/:id', requireAuth, requireRole(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
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
      city,
      state,
      zip_code,
      franchise_fee,
      royalty_percentage,
      contract_start_date,
      contract_end_date
    } = req.body

    const { data, error } = await supabase
      .from('academies')
      .insert({
        franqueadora_id,
        name,
        email,
        phone,
        address,
        city,
        state,
        zip_code,
        franchise_fee,
        royalty_percentage,
        monthly_revenue: 0,
        contract_start_date,
        contract_end_date,
        is_active: true
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
router.put('/:id', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

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

    // Buscar estatísticas da academia
    const [studentsResult, teachersResult, bookingsResult, plansResult] = await Promise.all([
      supabase
        .from('academy_students')
        .select('status')
        .eq('academy_id', id),

      supabase
        .from('academy_teachers')
        .select('status')
        .eq('academy_id', id),

      supabase
        .from('bookings')
        .select('status, teacher_id')
        .in('teacher_id',
          supabase
            .from('academy_teachers')
            .select('teacher_id')
            .eq('academy_id', id)
        ),

      supabase
        .from('academy_plans')
        .select('*')
        .eq('academy_id', id)
        .eq('is_active', true)
    ])

    const students = studentsResult.data || []
    const teachers = teachersResult.data || []
    const bookings = bookingsResult.data || []
    const plans = plansResult.data || []

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
