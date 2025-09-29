import express from 'express'
import { supabase } from '../lib/supabase'
import { createNotification } from './notifications'

const router = express.Router()

// PLANOS PARA PROFESSORES

// Buscar planos de professores
router.get('/teacher', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw error

    res.json({ plans: data || [] })
  } catch (error) {
    console.error('Error fetching teacher plans:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar plano para professores
router.post('/teachers', async (req, res) => {
  try {
    const { name, description, price, hours_included, validity_days, commission_rate, features = [] } = req.body

    if (!name || !price || !commission_rate) {
      return res.status(400).json({
        error: 'name, price e commission_rate são obrigatórios'
      })
    }

    const { data, error } = await supabase
      .from('teacher_plans')
      .insert({
        name,
        description,
        price,
        hours_included,
        validity_days,
        commission_rate,
        features
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating teacher plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Atualizar plano de professor
router.put('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, hours_included, validity_days, commission_rate, features, is_active } = req.body

    const { data, error } = await supabase
      .from('teacher_plans')
      .update({
        name,
        description,
        price,
        hours_included,
        validity_days,
        commission_rate,
        features,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error('Error updating teacher plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Excluir plano de professor
router.delete('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error} = await supabase
      .from('teacher_plans')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Plano excluído com sucesso' })
  } catch (error) {
    console.error('Error deleting teacher plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Buscar assinaturas de professores
router.get('/teachers/subscriptions', async (req, res) => {
  try {
    const { teacher_id, status } = req.query

    let query = supabase
      .from('teacher_subscriptions')
      .select(`
        *,
        teacher:teacher_id(id, name, email),
        plan:plan_id(name, price, commission_rate)
      `)
      .order('created_at', { ascending: false })

    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error('Error fetching teacher subscriptions:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar assinatura de professor
router.post('/teachers/subscriptions', async (req, res) => {
  try {
    const { teacher_id, plan_id } = req.body

    if (!teacher_id || !plan_id) {
      return res.status(400).json({
        error: 'teacher_id e plan_id são obrigatórios'
      })
    }

    // Verificar se já existe uma assinatura ativa
    const { data: existingSubscription } = await supabase
      .from('teacher_subscriptions')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return res.status(400).json({
        error: 'Professor já possui uma assinatura ativa'
      })
    }

    const { data, error } = await supabase
      .from('teacher_subscriptions')
      .insert({
        teacher_id,
        plan_id,
        status: 'pending'
      })
      .select(`
        *,
        teacher:teacher_id(name, email),
        plan:plan_id(name, price)
      `)
      .single()

    if (error) throw error

    // Buscar admin da franquia para notificar
    const { data: franchiseAdmin } = await supabase
      .from('franqueadora_admins')
      .select('user_id')
      .limit(1)
      .single()

    if (franchiseAdmin) {
      await createNotification(
        franchiseAdmin.user_id,
        'plan_purchased',
        'Nova Assinatura de Professor',
        `${data.teacher?.name} adquiriu o plano ${data.plan?.name}`,
        {
          teacher_id,
          plan_id,
          subscription_id: data.id,
          amount: data.plan?.price
        }
      )
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating teacher subscription:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PLANOS PARA ALUNOS

// Buscar planos de alunos
router.get('/student', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw error

    res.json({ plans: data || [] })
  } catch (error) {
    console.error('Error fetching student plans:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar plano para alunos
router.post('/students', async (req, res) => {
  try {
    const { name, description, price, credits_included, validity_days, features = [] } = req.body

    if (!name || !price || !credits_included || !validity_days) {
      return res.status(400).json({
        error: 'name, price, credits_included e validity_days são obrigatórios'
      })
    }

    const { data, error } = await supabase
      .from('student_plans')
      .insert({
        name,
        description,
        price,
        credits_included,
        validity_days,
        features
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Atualizar plano de aluno
router.put('/students/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, credits_included, validity_days, features, is_active } = req.body

    const { data, error } = await supabase
      .from('student_plans')
      .update({
        name,
        description,
        price,
        credits_included,
        validity_days,
        features,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error('Error updating student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Excluir plano de aluno
router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('student_plans')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Plano excluído com sucesso' })
  } catch (error) {
    console.error('Error deleting student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Buscar assinaturas de alunos
router.get('/students/subscriptions', async (req, res) => {
  try {
    const { student_id, academy_id, status } = req.query

    let query = supabase
      .from('student_subscriptions')
      .select(`
        *,
        student:student_id(id, name, email),
        plan:plan_id(name, price, credits_included),
        academy:academy_id(name)
      `)
      .order('created_at', { ascending: false })

    if (student_id) {
      query = query.eq('student_id', student_id)
    }

    if (academy_id) {
      query = query.eq('academy_id', academy_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error('Error fetching student subscriptions:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar assinatura de aluno
router.post('/students/subscriptions', async (req, res) => {
  try {
    const { student_id, plan_id, academy_id } = req.body

    if (!student_id || !plan_id || !academy_id) {
      return res.status(400).json({
        error: 'student_id, plan_id e academy_id são obrigatórios'
      })
    }

    // Buscar detalhes do plano
    const { data: plan } = await supabase
      .from('student_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' })
    }

    const { data, error } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id,
        plan_id,
        academy_id,
        status: 'pending',
        credits_remaining: plan.credits_included
      })
      .select(`
        *,
        student:student_id(name, email),
        plan:plan_id(name, price),
        academy:academy_id(name)
      `)
      .single()

    if (error) throw error

    // Buscar admin da franquia para notificar
    const { data: franchiseAdmin } = await supabase
      .from('franqueadora_admins')
      .select('user_id')
      .limit(1)
      .single()

    if (franchiseAdmin) {
      await createNotification(
        franchiseAdmin.user_id,
        'plan_purchased',
        'Nova Assinatura de Aluno',
        `${data.student?.name} adquiriu o plano ${data.plan?.name} na academia ${data.academy?.name}`,
        {
          student_id,
          plan_id,
          academy_id,
          subscription_id: data.id,
          amount: data.plan?.price
        }
      )
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating student subscription:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Atualizar status de assinatura (para webhooks do Asaas)
router.put('/subscriptions/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, asaas_data = {} } = req.body

    if (!status) {
      return res.status(400).json({ error: 'status é obrigatório' })
    }

    // Tentar atualizar em teacher_subscriptions primeiro
    const { data: teacherSub, error: teacherError } = await supabase
      .from('teacher_subscriptions')
      .update({
        status,
        ...asaas_data
      })
      .eq('id', id)
      .select()
      .single()

    if (!teacherError && teacherSub) {
      return res.json(teacherSub)
    }

    // Se não encontrou em teacher_subscriptions, tentar em student_subscriptions
    const { data: studentSub, error: studentError } = await supabase
      .from('student_subscriptions')
      .update({
        status,
        ...asaas_data
      })
      .eq('id', id)
      .select()
      .single()

    if (!studentError && studentSub) {
      return res.json(studentSub)
    }

    res.status(404).json({ error: 'Assinatura não encontrada' })
  } catch (error) {
    console.error('Error updating subscription status:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router