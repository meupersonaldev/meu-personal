import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const router = Router()

// GET /api/checkins?academy_id=xxx - Listar check-ins de uma academia
router.get('/', async (req, res) => {
  try {
    const { academy_id, teacher_id } = req.query as { academy_id?: string; teacher_id?: string }

    let query = supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (academy_id) {
      query = query.eq('academy_id', academy_id)
    }
    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id)
    }

    if (!academy_id && !teacher_id) {
      return res.status(400).json({ error: 'academy_id ou teacher_id é obrigatório' })
    }

    const { data, error } = await query

    if (error) {
      // Se tabela não existe, retorna array vazio
      if (error.code === '42P01') {
        return res.json({ checkins: [] })
      }
      throw error
    }

    res.json({ checkins: data || [] })
  } catch (error: any) {
    console.error('Error fetching checkins:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/checkins/stats?academy_id=xxx - Estatísticas de check-ins
router.get('/stats', async (req, res) => {
  try {
    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    // Buscar check-ins dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('checkins')
      .select('status, created_at')
      .eq('academy_id', academy_id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      if (error.code === '42P01') {
        return res.json({ 
          total: 0,
          granted: 0,
          denied: 0,
          today: 0,
          week: 0,
          month: 0
        })
      }
      throw error
    }

    const checkins = data || []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats = {
      total: checkins.length,
      granted: checkins.filter(c => c.status === 'GRANTED').length,
      denied: checkins.filter(c => c.status === 'DENIED').length,
      today: checkins.filter(c => new Date(c.created_at) >= todayStart).length,
      week: checkins.filter(c => new Date(c.created_at) >= weekAgo).length,
      month: checkins.length
    }

    res.json(stats)
  } catch (error: any) {
    console.error('Error fetching checkin stats:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
