import { Router } from 'express'
import { supabase } from '../config/supabase'
import { syncContactAcademies } from '../services/franqueadora-contacts.service'

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

          console.log(`✅ Vínculo academy_teachers reativado: ${existingLink.id}`)
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
          console.error('Erro ao criar vínculo academy_teachers:', linkError)
        } else {
          console.log(`✅ Novo vínculo academy_teachers criado: ${newLink.id}`)
        }
      }

      // ✅ NOVO: Criar/ativar vínculo em professor_units (nova estrutura)
      // Buscar unit_id correspondente à academy_id
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('academy_legacy_id', academyId)
        .eq('is_active', true)
        .single()

      if (unit) {
        // Verificar se já existe vínculo em professor_units
        const { data: existingProfessorUnit } = await supabase
          .from('professor_units')
          .select('id, active')
          .eq('professor_id', teacherId)
          .eq('unit_id', unit.id)
          .single()

        if (existingProfessorUnit) {
          // Se existe mas está inativo, reativar
          if (!existingProfessorUnit.active) {
            await supabase
              .from('professor_units')
              .update({
                active: true,
                last_association_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProfessorUnit.id)

            console.log(`✅ Vínculo professor_units reativado: ${existingProfessorUnit.id}`)
          }
        } else {
          // Criar novo vínculo em professor_units
          const { data: newProfessorUnit, error: professorUnitError } = await supabase
            .from('professor_units')
            .insert({
              professor_id: teacherId,
              unit_id: unit.id,
              active: true,
              commission_rate: 70.00,
              first_association_at: new Date().toISOString(),
              last_association_at: new Date().toISOString()
            })
            .select()
            .single()

          if (professorUnitError) {
            console.error('Erro ao criar vínculo professor_units:', professorUnitError)
          } else {
            console.log(`✅ Novo vínculo professor_units criado: ${newProfessorUnit.id}`)
          }
        }
      } else {
        console.warn(`⚠️ Unit não encontrada para academy_id: ${academyId}`)
      }
    }

    // Desativar vínculos de academias removidas
    const academiesToRemove = oldAcademyIds.filter((id: string) => !newAcademyIds.includes(id))

    for (const academyId of academiesToRemove) {
      console.log(`Desativando vínculo: professor ${teacherId} → academia ${academyId}`)

      // Desativar vínculo academy_teachers
      await supabase
        .from('academy_teachers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .eq('academy_id', academyId)

      // ✅ NOVO: Desativar vínculo professor_units correspondente
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('academy_legacy_id', academyId)
        .eq('is_active', true)
        .single()

      if (unit) {
        await supabase
          .from('professor_units')
          .update({
            active: false,
            updated_at: new Date().toISOString()
          })
          .eq('professor_id', teacherId)
          .eq('unit_id', unit.id)

        console.log(`✅ Vínculo professor_units desativado: professor ${teacherId} → unit ${unit.id}`)
      }
    }

    try {
      await syncContactAcademies(teacherId, newAcademyIds)
    } catch (syncError) {
      console.warn('Erro ao sincronizar contato da franqueadora para professor:', syncError)
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






