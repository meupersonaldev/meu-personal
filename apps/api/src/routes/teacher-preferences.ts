import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/teachers/:teacherId/preferences - Buscar preferências do professor
router.get('/:teacherId/preferences', async (req, res) => {
  try {
    const { teacherId } = req.params

    const { data, error } = await supabase
      .from('teacher_preferences')
      .select('*')
      .eq('teacher_id', teacherId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    res.json(data || { academy_ids: [], bio: '' })
  } catch (error: any) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:teacherId/preferences - Atualizar preferências
router.put('/:teacherId/preferences', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { academy_ids, bio } = req.body

    console.log('Atualizando preferências do professor:', teacherId)
    console.log('Academias selecionadas:', academy_ids)

    // Buscar preferências antigas para comparar
    const { data: oldPreferences } = await supabase
      .from('teacher_preferences')
      .select('academy_ids')
      .eq('teacher_id', teacherId)
      .single()

    const oldAcademyIds = oldPreferences?.academy_ids || []
    const newAcademyIds = academy_ids || []

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('teacher_preferences')
      .select('id')
      .eq('teacher_id', teacherId)
      .single()

    if (existing) {
      // Atualizar
      const { data, error } = await supabase
        .from('teacher_preferences')
        .update({
          academy_ids,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .select()
        .single()

      if (error) throw error
    } else {
      // Criar
      const { data, error } = await supabase
        .from('teacher_preferences')
        .insert({
          teacher_id: teacherId,
          academy_ids,
          bio
        })
        .select()
        .single()

      if (error) throw error
    }

    // ✅ NOVA LÓGICA: Sincronizar com academy_teachers
    // Adicionar vínculos para academias novas
    const academiesToAdd = newAcademyIds.filter((id: string) => !oldAcademyIds.includes(id))
    
    for (const academyId of academiesToAdd) {
      console.log(`Criando vínculo: professor ${teacherId} → academia ${academyId}`)
      
      // Verificar se já existe vínculo
      const { data: existingLink } = await supabase
        .from('academy_teachers')
        .select('id, status')
        .eq('teacher_id', teacherId)
        .eq('academy_id', academyId)
        .single()

      if (existingLink) {
        // Se existe mas está inativo, reativar
        if (existingLink.status !== 'active') {
          await supabase
            .from('academy_teachers')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLink.id)
          
          console.log(`✅ Vínculo reativado: ${existingLink.id}`)
        }
      } else {
        // Criar novo vínculo
        const { data: newLink, error: linkError } = await supabase
          .from('academy_teachers')
          .insert({
            teacher_id: teacherId,
            academy_id: academyId,
            status: 'active',
            commission_rate: 70.00
          })
          .select()
          .single()

        if (linkError) {
          console.error('Erro ao criar vínculo:', linkError)
        } else {
          console.log(`✅ Novo vínculo criado: ${newLink.id}`)
        }
      }
    }

    // Desativar vínculos de academias removidas
    const academiesToRemove = oldAcademyIds.filter((id: string) => !newAcademyIds.includes(id))
    
    for (const academyId of academiesToRemove) {
      console.log(`Desativando vínculo: professor ${teacherId} → academia ${academyId}`)
      
      await supabase
        .from('academy_teachers')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .eq('academy_id', academyId)
    }

    res.json({ 
      message: 'Preferências atualizadas com sucesso',
      vinculosAdicionados: academiesToAdd.length,
      vinculosRemovidos: academiesToRemove.length
    })
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/teachers/:teacherId/hours - Buscar horas disponíveis
router.get('/:teacherId/hours', async (req, res) => {
  try {
    const { teacherId } = req.params

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', teacherId)
      .single()

    if (error) throw error

    res.json({ available_hours: data.credits || 0 })
  } catch (error: any) {
    console.error('Error fetching hours:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
