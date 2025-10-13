import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { asaasService } from '../services/asaas.service'

const router = express.Router()

// Schema para compra de pacote de aluno
const studentPackagePurchaseSchema = z.object({
  student_id: z.string().uuid(),
  package_id: z.string().uuid(),
  teacher_id: z.string().uuid(), // Professor escolhido pelo aluno
  payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
})

// Schema para compra de horas de professor
const teacherHoursPurchaseSchema = z.object({
  teacher_id: z.string().uuid(),
  hours_package_id: z.string().uuid(),
  payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
})

/**
 * POST /api/payments/student/purchase-package
 * Aluno compra pacote (espaço + personal)
 * 
 * Fluxo:
 * 1. Aluno paga → Dinheiro vai 100% para franquia
 * 2. Professor escolhido GANHA horas de brinde
 * 3. Aluno ganha créditos para usar
 */
router.post('/student/purchase-package', async (req, res) => {
  try {
    const data = studentPackagePurchaseSchema.parse(req.body)

    // 1. Buscar dados do aluno
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('*, academy_students(academy_id)')
      .eq('id', data.student_id)
      .single()

    if (studentError || !student) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // 2. Buscar pacote
    const { data: package_, error: packageError } = await supabase
      .from('student_plans')
      .select('*')
      .eq('id', data.package_id)
      .single()

    if (packageError || !package_) {
      return res.status(404).json({ error: 'Pacote não encontrado' })
    }

    // 3. Buscar professor escolhido
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.teacher_id)
      .in('role', ['TEACHER', 'PROFESSOR'])
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // 4. Criar/buscar cliente no Asaas
    let asaasCustomerId = student.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: student.name,
        email: student.email,
        cpfCnpj: (student.cpf || '').replace(/\D/g, '') || '00000000000',
        phone: student.phone
      })

      if (!customerResult.success) {
        const message = Array.isArray(customerResult.error)
          ? (customerResult.error[0]?.description || 'Erro ao criar cliente no Asaas')
          : (customerResult.error || 'Erro ao criar cliente no Asaas')
        const isCpfError = typeof message === 'string' && message.toLowerCase().includes('cpf')
        return res.status(isCpfError ? 400 : 500).json({ error: message })
      }

      asaasCustomerId = customerResult.data.id

      // Salvar ID do Asaas no banco
      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', student.id)
    }

    // 5. Criar cobrança no Asaas
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: package_.price,
      dueDate: dueDate,
      description: `${package_.name} - ${package_.credits_included} créditos`,
      externalReference: `STUDENT_PACKAGE_${data.student_id}_${data.package_id}_${Date.now()}`
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 6. Salvar transação no banco (status: PENDING)
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: student.id,
        type: 'CREDIT_PURCHASE',
        amount: package_.price,
        description: `Compra de pacote: ${package_.name}`,
        reference_id: paymentResult.data.id,
        metadata: {
          package_id: package_.id,
          teacher_id: teacher.id,
          credits_to_add: package_.credits_included,
          hours_to_gift_teacher: 1, // Professor ganha 1h de brinde
          asaas_payment_id: paymentResult.data.id,
          payment_method: data.payment_method
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao salvar transação:', transactionError)
      return res.status(500).json({ error: 'Erro ao salvar transação' })
    }

    // 7. Obter links de pagamento do Asaas e retornar dados
    const linkResult = await asaasService.generatePaymentLink(paymentResult.data.id)
    const paymentLink = linkResult.success ? linkResult.data : {
      paymentUrl: paymentResult.data.invoiceUrl,
      bankSlipUrl: paymentResult.data.bankSlipUrl,
      pixCode: paymentResult.data.payload
    }

    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      transaction_id: transaction.id,
      payment: {
        id: paymentResult.data.id,
        status: paymentResult.data.status,
        value: paymentResult.data.value,
        due_date: paymentResult.data.dueDate,
        invoice_url: paymentLink.paymentUrl,
        bank_slip_url: paymentLink.bankSlipUrl,
        pix_qr_code: null,
        pix_copy_paste: paymentLink.pixCode
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      })
    }

    console.error('Erro ao processar compra:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/payments/teacher/purchase-hours
 * Professor compra horas
 * 
 * Fluxo:
 * 1. Professor paga → Dinheiro vai 100% para franquia
 * 2. Professor recebe horas no banco de horas dele
 */
router.post('/teacher/purchase-hours', async (req, res) => {
  try {
    const data = teacherHoursPurchaseSchema.parse(req.body)

    // 1. Buscar dados do professor
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.teacher_id)
      .in('role', ['TEACHER', 'PROFESSOR'])
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // 2. Buscar pacote de horas
    const { data: hoursPackage, error: packageError } = await supabase
      .from('teacher_plans')
      .select('*')
      .eq('id', data.hours_package_id)
      .single()

    if (packageError || !hoursPackage) {
      return res.status(404).json({ error: 'Pacote de horas não encontrado' })
    }

    const metadataJson = (hoursPackage as any).metadata_json || {}
    const rawHoursIncluded = Number(
      (hoursPackage as any).hours_included ??
      (hoursPackage as any).hours_qty ??
      metadataJson?.hours_included ??
      metadataJson?.hours ??
      0
    )
    const hoursIncluded = Math.max(0, Math.floor(rawHoursIncluded))

    if (!hoursIncluded) {
      return res.status(400).json({ error: 'Pacote de horas sem quantidade configurada' })
    }

    // 3. Criar/buscar cliente no Asaas
    let asaasCustomerId = teacher.asaas_customer_id

    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: teacher.name,
        email: teacher.email,
        cpfCnpj: (teacher.cpf || '').replace(/\D/g, '') || '00000000000',
        phone: teacher.phone
      })

      if (!customerResult.success) {
        const message = Array.isArray(customerResult.error)
          ? (customerResult.error[0]?.description || 'Erro ao criar cliente no Asaas')
          : (customerResult.error || 'Erro ao criar cliente no Asaas')
        const isCpfError = typeof message === 'string' && message.toLowerCase().includes('cpf')
        return res.status(isCpfError ? 400 : 500).json({ error: message })
      }

      asaasCustomerId = customerResult.data.id

      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', teacher.id)
    }

    // 4. Criar cobrança no Asaas
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: hoursPackage.price,
      dueDate: dueDate,
      description: `${hoursPackage.name} - Banco de Horas`,
      externalReference: `TEACHER_HOURS_${data.teacher_id}_${data.hours_package_id}_${Date.now()}`
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 5. Salvar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: teacher.id,
        type: 'CREDIT_PURCHASE',
        amount: hoursPackage.price,
        description: `Compra de horas: ${hoursPackage.name}`,
        reference_id: paymentResult.data.id,
        metadata: {
          package_id: hoursPackage.id,
          hours_to_add: hoursIncluded,
          asaas_payment_id: paymentResult.data.id,
          payment_method: data.payment_method
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao salvar transação:', transactionError)
      return res.status(500).json({ error: 'Erro ao salvar transação' })
    }

    // 6. Obter links e retornar dados do pagamento
    const linkResult = await asaasService.generatePaymentLink(paymentResult.data.id)
    const paymentLink = linkResult.success ? linkResult.data : {
      paymentUrl: paymentResult.data.invoiceUrl,
      bankSlipUrl: paymentResult.data.bankSlipUrl,
      pixCode: paymentResult.data.payload
    }

    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      transaction_id: transaction.id,
      payment: {
        id: paymentResult.data.id,
        status: paymentResult.data.status,
        value: paymentResult.data.value,
        due_date: paymentResult.data.dueDate,
        invoice_url: paymentLink.paymentUrl,
        bank_slip_url: paymentLink.bankSlipUrl,
        pix_qr_code: null,
        pix_copy_paste: paymentLink.pixCode
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      })
    }

    console.error('Erro ao processar compra:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/payments/webhook/asaas
 * Webhook do Asaas para processar confirmações de pagamento
 * 
 * Quando pagamento é confirmado:
 * - ALUNO: Adiciona créditos + Dá horas de brinde pro professor
 * - PROFESSOR: Adiciona horas no banco de horas
 */
router.post('/webhook/asaas', async (req, res) => {
  try {
    const event = req.body

    console.log('Webhook Asaas recebido:', event.event, event.payment?.id)

    // Processar apenas quando pagamento for recebido
    if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
      const paymentId = event.payment.id
      const externalReference = event.payment.externalReference

      // Buscar transação no banco
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', paymentId)
        .single()

      if (transactionError || !transaction) {
        console.error('Transação não encontrada:', paymentId)
        return res.sendStatus(200) // Retorna 200 para não reprocessar
      }

      // Verificar se já foi processado
      if (transaction.status === 'COMPLETED') {
        console.log('Transação já processada:', transaction.id)
        return res.sendStatus(200)
      }

      const metadata = transaction.metadata as any

      // COMPRA DE PACOTE DE ALUNO
      if (externalReference?.startsWith('STUDENT_PACKAGE_')) {
        // 1. Adicionar créditos para o aluno
        await supabase.rpc('add_credits', {
          user_id: transaction.user_id,
          credits_amount: metadata.credits_to_add
        })

        // 2. DAR HORAS DE BRINDE PARA O PROFESSOR
        const giftedHours = Math.max(0, Math.floor(Number(metadata.hours_to_gift_teacher || 0)))

        if (giftedHours > 0 && metadata.teacher_id) {
          await supabase.rpc('add_teacher_hours', {
            teacher_id: metadata.teacher_id,
            hours_amount: giftedHours
          })
        }

        // 3. Criar notificação para o professor
        await supabase
          .from('notifications')
          .insert({
            user_id: metadata.teacher_id,
            type: 'HOURS_GIFTED',
            title: 'Você ganhou horas!',
            message: `Parabéns! Você ganhou ${giftedHours}h de brinde por ter sido escolhido por um novo aluno.`,
            data: {
              student_id: transaction.user_id,
              hours_gifted: giftedHours
            }
          })

        console.log(`✅ Aluno ${transaction.user_id} recebeu ${metadata.credits_to_add} créditos`)
        console.log(`🎁 Professor ${metadata.teacher_id} ganhou ${giftedHours}h de brinde`)
      }

      // COMPRA DE HORAS DE PROFESSOR
      if (externalReference?.startsWith('TEACHER_HOURS_')) {
        const hoursToAdd = Math.max(0, Math.floor(Number(metadata.hours_to_add || 0)))

        if (hoursToAdd > 0) {
          // Adicionar horas no banco de horas do professor
          await supabase.rpc('add_teacher_hours', {
            teacher_id: transaction.user_id,
            hours_amount: hoursToAdd
          })

          console.log(`✅ Professor ${transaction.user_id} recebeu ${hoursToAdd}h`)
        } else {
          console.warn('Compra de horas recebida sem quantidade válida:', metadata)
        }
      }

      // Atualizar status da transação
      await supabase
        .from('transactions')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
    }

    res.sendStatus(200)

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    res.sendStatus(500)
  }
})

/**
 * GET /api/payments/academy/:academy_id
 * Listar todos os pagamentos de uma academia (para dashboard de finanças)
 */
router.get('/academy/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params
    const {
      status,
      start_date,
      end_date,
      limit = '50',
      offset = '0'
    } = req.query

    // Buscar pagamentos da tabela payments
    let query = supabase
      .from('payments')
      .select(`
        *,
        user:users(id, name, email, role)
      `)
      .eq('academy_id', academy_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    query = query.range(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string) - 1
    )

    const { data: payments, error } = await query

    if (error) throw error

    // Calcular resumo financeiro
    const { data: allPayments } = await supabase
      .from('payments')
      .select('status, amount, type')
      .eq('academy_id', academy_id)

    const summary = {
      total_received: allPayments?.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      total_pending: allPayments?.filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      total_overdue: allPayments?.filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      total_payments: allPayments?.length || 0,
      by_type: {
        plan_purchase: allPayments?.filter(p => p.type === 'PLAN_PURCHASE').length || 0,
        booking_payment: allPayments?.filter(p => p.type === 'BOOKING_PAYMENT').length || 0,
        subscription: allPayments?.filter(p => p.type === 'SUBSCRIPTION').length || 0
      }
    }

    res.json({
      payments,
      summary,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    })
  } catch (error: any) {
    console.error('Error fetching academy payments:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/payments/stats/:academy_id
 * Estatísticas de pagamentos para dashboard
 */
router.get('/stats/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params
    const { start_date, end_date } = req.query

    let query = supabase
      .from('payments')
      .select('*')
      .eq('academy_id', academy_id)

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    const { data, error } = await query

    if (error) throw error

    // Calcular estatísticas
    const stats = {
      total_revenue: data?.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      pending_revenue: data?.filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      overdue_revenue: data?.filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      total_transactions: data?.length || 0,
      by_status: {
        pending: data?.filter(p => p.status === 'PENDING').length || 0,
        confirmed: data?.filter(p => p.status === 'CONFIRMED').length || 0,
        received: data?.filter(p => p.status === 'RECEIVED').length || 0,
        overdue: data?.filter(p => p.status === 'OVERDUE').length || 0,
        refunded: data?.filter(p => p.status === 'REFUNDED').length || 0
      },
      by_type: {
        plan_purchase: data?.filter(p => p.type === 'PLAN_PURCHASE').length || 0,
        booking_payment: data?.filter(p => p.type === 'BOOKING_PAYMENT').length || 0,
        subscription: data?.filter(p => p.type === 'SUBSCRIPTION').length || 0
      },
      by_billing_type: {
        pix: data?.filter(p => p.billing_type === 'PIX').length || 0,
        boleto: data?.filter(p => p.billing_type === 'BOLETO').length || 0,
        credit_card: data?.filter(p => p.billing_type === 'CREDIT_CARD').length || 0
      },
      // Receita por mês (últimos 12 meses)
      monthly_revenue: getMonthlyRevenue(data || [])
    }

    res.json({ stats })
  } catch (error: any) {
    console.error('Error fetching payment stats:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Helper para calcular receita mensal
 */
function getMonthlyRevenue(payments: any[]) {
  const monthlyData: Record<string, number> = {}

  payments
    .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
    .forEach(payment => {
      const date = new Date(payment.payment_date || payment.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0
      }

      monthlyData[monthKey] += parseFloat(payment.amount)
    })

  // Últimos 12 meses
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months.push({
      month: monthKey,
      revenue: monthlyData[monthKey] || 0
    })
  }

  return months
}

export default router

