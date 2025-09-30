import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// ============================================
// ROTAS DA FRANQUEADORA
// ============================================

// GET /api/franchises - Listar todas as franquias (academias)
router.get('/', async (req, res) => {
  try {
    const { franqueadora_id } = req.query

    let query = supabase
      .from('academies')
      .select('*')
      .order('created_at', { ascending: false })

    if (franqueadora_id) {
      query = query.eq('franqueadora_id', franqueadora_id)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data)
  } catch (error: any) {
    console.error('Error fetching franchises:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/franchises/:id - Obter detalhes de uma franquia
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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

// DELETE /api/franchises/:id - Deletar franquia (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('academies')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Franchise not found' })
    }

    res.json({ message: 'Franchise deactivated successfully' })
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