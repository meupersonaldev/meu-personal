import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { asaasService } from '../services/asaas.service'
import { requireAuth } from '../middleware/auth'
import { requireApprovedTeacher } from '../middleware/approval'

const router = express.Router()

/**
 * Função auxiliar para buscar walletIds e montar split de pagamento
 * Retorna array de split (90% franquia, 10% franqueadora) ou lança erro se não conseguir
 * Se franqueadora não tiver walletId, busca automaticamente via getWallets e salva no banco
 * Se academia não tiver walletId, tenta criar subconta automaticamente
 */
/**
 * Retorna split de pagamento - apenas para franquia (subconta)
 * 90% para franquia, 10% fica automaticamente na franqueadora (conta principal)
 */
function getPaymentSplit(academyId: string | null): Array<{ walletId: string; percentualValue: number }> {
  // Split apenas para franquia (subconta) - 90%
  // Os 10% restantes ficam automaticamente na conta principal
  const FRANCHISE_WALLET_ID = '03223ec1-c254-43a9-bcdd-6f54acac0609' // 90%

  console.log('[PAYMENTS] ✅ Usando split (apenas franquia):', {
    franchiseWalletId: FRANCHISE_WALLET_ID,
    franchisorPercent: '10% (automático - conta principal)',
    academyId: academyId || 'N/A (não usado)'
  })

  return [
    { walletId: FRANCHISE_WALLET_ID, percentualValue: 90.00 }
    // Os 10% restantes ficam automaticamente na conta principal (franqueadora)
  ]
}

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
 * 2. Aluno ganha créditos para usar
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

    // 5. Configurar split de pagamento com walletIds hardcoded
    const academyId = (student.academy_students as any)?.[0]?.academy_id || null
    const split = getPaymentSplit(academyId)
    
    console.log('[PAYMENTS] ✅ Split configurado (apenas franquia) para compra de pacote:', {
      franchiseWalletId: split[0].walletId,
      franchisorPercent: '10% (automático - conta principal)',
      splitPercentages: split.map(s => s.percentualValue)
    })

    // 6. Criar cobrança no Asaas (apenas se split estiver validado)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: package_.price,
      dueDate: dueDate,
      description: `${package_.name} - ${package_.credits_included} créditos`,
      externalReference: `STUDENT_PACKAGE_${data.student_id}_${data.package_id}_${Date.now()}`,
      split: split
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 7. Salvar transação no banco (status: PENDING)
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
router.post('/teacher/purchase-hours', requireAuth, requireApprovedTeacher, async (req, res) => {
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

    // 4. Buscar walletIds para split (90% franquia, 10% franqueadora)
    // OBRIGATÓRIO: se falhar, retornar erro (não criar pagamento sem split)
    // Buscar academia do professor via academy_teachers
    const { data: academyTeacher } = await supabase
      .from('academy_teachers')
      .select('academy_id')
      .eq('teacher_id', data.teacher_id)
      .eq('status', 'active')
      .limit(1)
      .single()

    // 4. Configurar split de pagamento com walletIds hardcoded
    const academyId = academyTeacher?.academy_id || null
    const split = getPaymentSplit(academyId)
    
    console.log('[PAYMENTS] ✅ Split configurado (apenas franquia) para compra de horas:', {
      franchiseWalletId: split[0].walletId,
      franchisorPercent: '10% (automático - conta principal)',
      splitPercentages: split.map(s => s.percentualValue)
    })

    // 5. Criar cobrança no Asaas (apenas se split estiver validado)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: data.payment_method,
      value: hoursPackage.price,
      dueDate: dueDate,
      description: `${hoursPackage.name} - Banco de Horas`,
      externalReference: `TEACHER_HOURS_${data.teacher_id}_${data.hours_package_id}_${Date.now()}`,
      split: split
    })

    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' })
    }

    // 6. Salvar transação no banco
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

// webhook legado removido em favor do modelo payment_intents (apps/api/src/routes/webhooks.ts)

/**
 * GET /api/payments/academy/:academy_id
 * Listar todos os pagamentos de uma academia (para dashboard de finanças)
 * Busca de payment_intents relacionados à academia via unit_id
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

    console.log(`[payments/academy] Buscando pagamentos para academia ${academy_id}`)

    // Buscar payment_intents relacionados à academia via unit_id
    let query = supabase
      .from('payment_intents')
      .select(`
        *,
        user:users!payment_intents_actor_user_id_fkey(id, name, email, role)
      `)
      .eq('unit_id', academy_id)
      .order('created_at', { ascending: false })

    if (status) {
      // Mapear status da API para status do payment_intents
      const statusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'CONFIRMED': 'PAID',
        'RECEIVED': 'PAID',
        'OVERDUE': 'PENDING',
        'REFUNDED': 'CANCELED'
      }
      const mappedStatus = statusMap[status as string] || status
      query = query.eq('status', mappedStatus)
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

    const { data: paymentIntents, error } = await query

    if (error) {
      console.error('[payments/academy] Erro ao buscar payment_intents:', error)
      throw error
    }

    console.log(`[payments/academy] Encontrados ${paymentIntents?.length || 0} payment_intents`)

    // Transformar payment_intents para formato esperado pelo frontend
    const payments = (paymentIntents || []).map((intent: any) => {
      const payload = intent.payload_json || {}
      const amount = intent.amount_cents / 100 // Converter centavos para reais
      
      // Mapear status
      let mappedStatus = intent.status
      if (intent.status === 'PAID') {
        mappedStatus = 'RECEIVED'
      } else if (intent.status === 'FAILED') {
        mappedStatus = 'OVERDUE'
      }

      // Determinar tipo
      let type = 'PLAN_PURCHASE'
      if (intent.type === 'PROF_HOURS') {
        type = 'SUBSCRIPTION'
      }

      // Determinar billing_type
      const billingType = payload.payment_method || payload.billing_type || 'PIX'

      return {
        id: intent.id,
        user: intent.user || {
          id: intent.actor_user_id,
          name: 'Usuário não encontrado',
          email: '',
          role: ''
        },
        type,
        billing_type: billingType.toUpperCase(),
        status: mappedStatus,
        amount: amount.toFixed(2),
        description: payload.package_title || payload.description || `${intent.type} - R$ ${amount.toFixed(2)}`,
        due_date: payload.due_date || intent.created_at,
        payment_date: intent.status === 'PAID' ? intent.updated_at : null,
        invoice_url: payload.invoice_url || payload.payment_url || null,
        pix_code: payload.pix_copy_paste || payload.pix_qr_code || null,
        created_at: intent.created_at
      }
    })

    // Buscar todos os payment_intents para calcular estatísticas
    let statsQuery = supabase
      .from('payment_intents')
      .select('status, amount_cents, type, payload_json')
      .eq('unit_id', academy_id)

    if (start_date) {
      statsQuery = statsQuery.gte('created_at', start_date)
    }

    if (end_date) {
      statsQuery = statsQuery.lte('created_at', end_date)
    }

    const { data: allIntents } = await statsQuery

    const summary = {
      total_received: (allIntents || [])
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      total_pending: (allIntents || [])
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      total_overdue: (allIntents || [])
        .filter(p => p.status === 'FAILED')
        .reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      total_payments: allIntents?.length || 0,
      by_type: {
        plan_purchase: (allIntents || []).filter(p => p.type === 'STUDENT_PACKAGE').length,
        booking_payment: 0, // Não há booking_payment em payment_intents
        subscription: (allIntents || []).filter(p => p.type === 'PROF_HOURS').length
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
    console.error('[payments/academy] Erro:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/payments/stats/:academy_id
 * Estatísticas de pagamentos para dashboard
 * Busca de payment_intents relacionados à academia via unit_id
 */
router.get('/stats/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params
    const { start_date, end_date } = req.query

    console.log(`[payments/stats] Buscando estatísticas para academia ${academy_id}`)

    let query = supabase
      .from('payment_intents')
      .select('status, amount_cents, type, payload_json, created_at')
      .eq('unit_id', academy_id)

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('[payments/stats] Erro ao buscar payment_intents:', error)
      throw error
    }

    console.log(`[payments/stats] Encontrados ${data?.length || 0} payment_intents`)

    // Calcular estatísticas
    const paidIntents = data?.filter(p => p.status === 'PAID') || []
    const pendingIntents = data?.filter(p => p.status === 'PENDING') || []
    const failedIntents = data?.filter(p => p.status === 'FAILED') || []

    const stats = {
      total_revenue: paidIntents.reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      pending_revenue: pendingIntents.reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      overdue_revenue: failedIntents.reduce((sum, p) => sum + (p.amount_cents / 100), 0),
      total_transactions: data?.length || 0,
      by_status: {
        pending: pendingIntents.length,
        confirmed: paidIntents.length, // PAID = confirmado
        received: paidIntents.length, // PAID = recebido
        overdue: failedIntents.length,
        refunded: (data?.filter(p => p.status === 'CANCELED').length || 0)
      },
      by_type: {
        plan_purchase: (data?.filter(p => p.type === 'STUDENT_PACKAGE').length || 0),
        booking_payment: 0, // Não há booking_payment em payment_intents
        subscription: (data?.filter(p => p.type === 'PROF_HOURS').length || 0)
      },
      by_billing_type: {
        pix: (data?.filter(p => {
          const payload = p.payload_json || {}
          const method = (payload.payment_method || payload.billing_type || '').toUpperCase()
          return method === 'PIX'
        }).length || 0),
        boleto: (data?.filter(p => {
          const payload = p.payload_json || {}
          const method = (payload.payment_method || payload.billing_type || '').toUpperCase()
          return method === 'BOLETO'
        }).length || 0),
        credit_card: (data?.filter(p => {
          const payload = p.payload_json || {}
          const method = (payload.payment_method || payload.billing_type || '').toUpperCase()
          return method === 'CREDIT_CARD' || method === 'CREDITCARD'
        }).length || 0)
      },
      // Receita por mês (últimos 12 meses)
      monthly_revenue: getMonthlyRevenueFromIntents(data || [])
    }

    res.json({ stats })
  } catch (error: any) {
    console.error('[payments/stats] Erro:', error)
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

