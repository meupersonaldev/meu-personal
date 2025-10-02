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

// GET /api/time-slots?academy_id=xxx - Listar slots de uma academia
router.get('/', async (req, res) => {
  try {
    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const { data: slots, error } = await supabase
      .from('academy_time_slots')
      .select('*')
      .eq('academy_id', academy_id)
      .order('day_of_week', { ascending: true })
      .order('time', { ascending: true })

    if (error) throw error

    res.json({ slots: slots || [] })
  } catch (error: any) {
    console.error('Error fetching time slots:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/time-slots - Criar slots para uma academia
router.post('/', async (req, res) => {
  try {
    const { academy_id, slots } = req.body

    if (!academy_id || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: 'academy_id e slots são obrigatórios' })
    }

    // Deletar slots existentes da academia
    await supabase
      .from('academy_time_slots')
      .delete()
      .eq('academy_id', academy_id)

    // Inserir novos slots
    const slotsToInsert = slots.map(slot => ({
      academy_id,
      day_of_week: slot.day_of_week,
      time: slot.time,
      is_available: slot.is_available || true,
      max_capacity: slot.max_capacity || 1,
      created_at: new Date().toISOString()
    }))

    const { data: newSlots, error } = await supabase
      .from('academy_time_slots')
      .insert(slotsToInsert)
      .select()

    if (error) throw error

    res.json({ 
      message: 'Slots criados com sucesso',
      slots: newSlots 
    })
  } catch (error: any) {
    console.error('Error creating time slots:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/time-slots/:id - Atualizar um slot específico
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { is_available, max_capacity } = req.body

    const { data: slot, error } = await supabase
      .from('academy_time_slots')
      .update({
        is_available,
        max_capacity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ 
      message: 'Slot atualizado com sucesso',
      slot 
    })
  } catch (error: any) {
    console.error('Error updating time slot:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/time-slots/:id - Deletar um slot específico
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('academy_time_slots')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Slot deletado com sucesso' })
  } catch (error: any) {
    console.error('Error deleting time slot:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/time-slots/generate - Gerar slots automaticamente baseado no schedule
router.post('/generate', async (req, res) => {
  try {
    const { academy_id } = req.body

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    // Buscar configurações da academia
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('schedule, opening_time, closing_time')
      .eq('id', academy_id)
      .single()

    if (academyError) throw academyError

    let schedule = []
    if (academy.schedule) {
      try {
        schedule = typeof academy.schedule === 'string' 
          ? JSON.parse(academy.schedule) 
          : academy.schedule
      } catch (e) {
        console.error('Error parsing schedule:', e)
      }
    }

    // Gerar slots para cada dia aberto
    const slotsToCreate = []
    
    for (const dayConfig of schedule) {
      if (dayConfig.isOpen) {
        const dayOfWeek = parseInt(dayConfig.day)
        const openTime = dayConfig.openingTime || '06:00'
        const closeTime = dayConfig.closingTime || '22:00'
        const slotsPerHour = dayConfig.slotsPerHour || 1
        
        // Gerar slots baseado na quantidade por hora
        const [openHour] = openTime.split(':').map(Number)
        const [closeHour] = closeTime.split(':').map(Number)
        
        for (let hour = openHour; hour < closeHour; hour++) {
          const timeSlot = `${String(hour).padStart(2, '0')}:00`
          
          slotsToCreate.push({
            academy_id,
            day_of_week: dayOfWeek,
            time: timeSlot,
            is_available: true,
            max_capacity: slotsPerHour // Aqui é a capacidade máxima por slot!
          })
        }
      }
    }

    if (slotsToCreate.length === 0) {
      return res.json({ 
        message: 'Nenhum slot gerado - academia não tem dias abertos',
        slots: [] 
      })
    }

    // Deletar slots existentes
    await supabase
      .from('academy_time_slots')
      .delete()
      .eq('academy_id', academy_id)

    // Inserir novos slots
    const { data: newSlots, error } = await supabase
      .from('academy_time_slots')
      .insert(slotsToCreate)
      .select()

    if (error) throw error

    res.json({ 
      message: `${newSlots.length} slots gerados com sucesso`,
      slots: newSlots 
    })
  } catch (error: any) {
    console.error('Error generating time slots:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
