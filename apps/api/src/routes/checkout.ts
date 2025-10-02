import express from 'express'
import { supabase } from '../lib/supabase'
import { asaasService } from '../services/asaas.service'

const router = express.Router()

/**
 * Criar checkout para aluno comprar plano
 * POST /api/checkout/student
 */
router.post('/student', async (req, res) => {
  try {
    const {
      student_id,
      plan_id,
      academy_id,
      payment_method = 'PIX' // PIX, CREDIT_CARD, BOLETO
    } = req.body

    if (!student_id || !plan_id || !academy_id) {
      return res.status(400).json({
        error: 'student_id, plan_id e academy_id são obrigatórios'
      })
    }

    // 1. Buscar dados do aluno
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('*')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // 2. Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('academy_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('academy_id', academy_id)
      .single()

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plano não encontrado' })
    }

    // 3. Verificar/Criar cliente no Asaas
    let asaasCustomerId = student.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: student.name,
        email: student.email,
        cpfCnpj: student.phone?.replace(/\D/g, '') || '00000000000', // TODO: pedir CPF
        mobilePhone: student.phone
      })

      if (!customerResult.success) {
        return res.status(500).json({
          error: 'Erro ao criar cliente no gateway de pagamento',
          details: customerResult.error
        })
      }

      asaasCustomerId = customerResult.data.id

      // Salvar asaas_customer_id no usuário
      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', student_id)
    }

    // 4. Criar registro de compra (subscription)
    const { data: subscription, error: subError } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id,
        plan_id,
        academy_id,
        status: 'pending',
        credits_remaining: 0 // Será creditado após confirmação
      })
      .select()
      .single()

    if (subError) {
      return res.status(500).json({ error: 'Erro ao criar registro de compra' })
    }

    // 5. Criar cobrança no Asaas
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // Vencimento em 3 dias

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: payment_method as any,
      value: plan.price,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `${plan.name} - ${plan.credits_included} créditos`,
      externalReference: subscription.id
    })

    if (!paymentResult.success) {
      // Rollback
      await supabase
        .from('student_subscriptions')
        .delete()
        .eq('id', subscription.id)

      return res.status(500).json({
        error: 'Erro ao criar cobrança no gateway de pagamento',
        details: paymentResult.error
      })
    }

    // 6. Atualizar subscription com payment_id
    await supabase
      .from('student_subscriptions')
      .update({ asaas_payment_id: paymentResult.data.id })
      .eq('id', subscription.id)

    // 7. Criar registro na tabela payments
    await supabase
      .from('payments')
      .insert({
        academy_id,
        user_id: student_id,
        asaas_payment_id: paymentResult.data.id,
        asaas_customer_id: asaasCustomerId,
        type: 'PLAN_PURCHASE',
        billing_type: payment_method,
        status: 'PENDING',
        amount: plan.price,
        description: `${plan.name} - ${plan.credits_included} créditos`,
        due_date: dueDate.toISOString().split('T')[0],
        invoice_url: paymentResult.data.invoiceUrl,
        bank_slip_url: paymentResult.data.bankSlipUrl,
        pix_code: paymentResult.data.payload,
        external_reference: subscription.id
      })

    // 8. Retornar dados do pagamento
    res.json({
      subscription_id: subscription.id,
      payment_id: paymentResult.data.id,
      payment_url: paymentResult.data.invoiceUrl,
      bank_slip_url: paymentResult.data.bankSlipUrl,
      pix_code: paymentResult.data.pixQrCode,
      pix_copy_paste: paymentResult.data.payload,
      status: 'pending',
      due_date: paymentResult.data.dueDate,
      value: paymentResult.data.value
    })
  } catch (error) {
    console.error('Error creating student checkout:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * Criar checkout para professor comprar plano
 * POST /api/checkout/teacher
 */
router.post('/teacher', async (req, res) => {
  try {
    const {
      teacher_id,
      plan_id,
      payment_method = 'PIX'
    } = req.body

    if (!teacher_id || !plan_id) {
      return res.status(400).json({
        error: 'teacher_id e plan_id são obrigatórios'
      })
    }

    // 1. Buscar dados do professor
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('id', teacher_id)
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // 2. Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('teacher_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plano não encontrado' })
    }

    // 3. Verificar/Criar cliente no Asaas
    let asaasCustomerId = teacher.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: teacher.name,
        email: teacher.email,
        cpfCnpj: teacher.phone?.replace(/\D/g, '') || '00000000000',
        mobilePhone: teacher.phone
      })

      if (!customerResult.success) {
        return res.status(500).json({
          error: 'Erro ao criar cliente no gateway de pagamento',
          details: customerResult.error
        })
      }

      asaasCustomerId = customerResult.data.id

      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', teacher_id)
    }

    // 4. Criar registro de compra
    const { data: subscription, error: subError } = await supabase
      .from('teacher_subscriptions')
      .insert({
        teacher_id,
        plan_id,
        status: 'pending'
      })
      .select()
      .single()

    if (subError) {
      return res.status(500).json({ error: 'Erro ao criar registro de compra' })
    }

    // 5. Criar cobrança no Asaas
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: payment_method as any,
      value: plan.price,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `${plan.name} - ${plan.hours_included} horas`,
      externalReference: subscription.id
    })

    if (!paymentResult.success) {
      await supabase
        .from('teacher_subscriptions')
        .delete()
        .eq('id', subscription.id)

      return res.status(500).json({
        error: 'Erro ao criar cobrança no gateway de pagamento',
        details: paymentResult.error
      })
    }

    // 6. Atualizar subscription
    await supabase
      .from('teacher_subscriptions')
      .update({ asaas_payment_id: paymentResult.data.id })
      .eq('id', subscription.id)

    // 7. Retornar dados
    res.json({
      subscription_id: subscription.id,
      payment_id: paymentResult.data.id,
      payment_url: paymentResult.data.invoiceUrl,
      bank_slip_url: paymentResult.data.bankSlipUrl,
      pix_code: paymentResult.data.pixQrCode,
      pix_copy_paste: paymentResult.data.payload,
      status: 'pending',
      due_date: paymentResult.data.dueDate,
      value: paymentResult.data.value
    })
  } catch (error) {
    console.error('Error creating teacher checkout:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * Verificar status de pagamento
 * GET /api/checkout/status/:payment_id
 */
router.get('/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params

    const paymentResult = await asaasService.getPayment(payment_id)

    if (!paymentResult.success) {
      return res.status(404).json({ error: 'Pagamento não encontrado' })
    }

    res.json({
      payment_id: paymentResult.data.id,
      status: paymentResult.data.status,
      value: paymentResult.data.value,
      payment_date: paymentResult.data.paymentDate,
      confirmed_date: paymentResult.data.confirmedDate
    })
  } catch (error) {
    console.error('Error checking payment status:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router