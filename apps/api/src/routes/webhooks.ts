import express from 'express'
import { supabase } from '../lib/supabase'
import { paymentIntentService } from '../services/payment-intent.service'
import { getPaymentProvider } from '../services/payments/provider'
import { createNotification, createUserNotification } from './notifications'

const router = express.Router()

/**
 * Webhook do Asaas
 * Recebe notificações de pagamentos confirmados, cancelados, etc.
 *
 * Eventos principais:
 * - PAYMENT_CREATED: Cobrança criada
 * - PAYMENT_UPDATED: Cobrança atualizada
 * - PAYMENT_CONFIRMED: Pagamento confirmado (crédito disponível)
 * - PAYMENT_RECEIVED: Pagamento recebido
 * - PAYMENT_OVERDUE: Cobrança vencida
 * - PAYMENT_DELETED: Cobrança removida
 * - PAYMENT_REFUNDED: Pagamento estornado
 */
router.post('/asaas', async (req, res) => {
  try {
    const event = req.body

    console.log('Webhook Asaas recebido:', {
      event: event.event,
      paymentId: event.payment?.id,
      status: event.payment?.status,
      value: event.payment?.value
    })

    // Validar webhook token (se configurado no Asaas)
    // Doc: https://docs.asaas.com/docs/sobre-os-webhooks (header asaas-access-token)
    const expectedToken = process.env.ASAAS_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_TOKEN
    if (expectedToken) {
      const receivedToken = req.header('asaas-access-token')
      if (!receivedToken || receivedToken !== expectedToken) {
        console.warn('Asaas webhook rejeitado por token inválido ou ausente')
        return res.status(401).json({ error: 'Invalid webhook token' })
      }
    }

    // Processar eventos via provider
    const provider = getPaymentProvider()
    const parsed = provider.parseWebhook ? provider.parseWebhook(event) : { providerId: event?.payment?.id || null, status: event?.payment?.status || null }

    if (parsed.providerId && parsed.status) {
      await paymentIntentService.processWebhook(parsed.providerId, parsed.status)
    } else {
      console.log('Evento não tratado:', event?.event)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Erro ao processar webhook Asaas:', error)
    res.status(500).json({ error: 'Erro ao processar webhook' })
  }
})

/**
 * Pagamento confirmado
 * Liberar créditos/horas compradas
 */
async function handlePaymentConfirmed(webhookData: any, externalRef: string) {
  if (!externalRef) {
    console.warn('Pagamento confirmado sem referência externa')
    return
  }

  // 1. Atualizar registro de pagamento
  await supabase
    .from('payments')
    .update({
      status: 'CONFIRMED',
      payment_date: new Date().toISOString()
    })
    .eq('asaas_payment_id', webhookData.paymentId)

  // Verificar se é compra de pacote de professor
  const { data: teacherPurchase } = await supabase
    .from('teacher_subscriptions')
    .select('*, teacher:teacher_id(name, email), plan:plan_id(hours_included, hours_qty, metadata_json)')
    .eq('id', externalRef)
    .single()

  if (teacherPurchase) {
    // Ativar compra de professor e adicionar horas
    await supabase
      .from('teacher_subscriptions')
      .update({
        status: 'active',
        asaas_payment_id: webhookData.paymentId
      })
      .eq('id', externalRef)

    const planMetadata = teacherPurchase.plan?.metadata_json || {}
    const rawPlanHours = Number(
      teacherPurchase.plan?.hours_included ??
      teacherPurchase.plan?.hours_qty ??
      planMetadata?.hours_included ??
      planMetadata?.hours ??
      0
    )
    const planHours = Math.max(0, Math.floor(rawPlanHours))

    if (planHours > 0) {
      await supabase.rpc('add_teacher_hours', {
        teacher_id: teacherPurchase.teacher_id,
        hours_amount: planHours
      })
    }

    // Notificar admin
    const { data: admin } = await supabase
      .from('franqueadora_admins')
      .select('user_id')
      .limit(1)
      .single()

    if (admin) {
      await createUserNotification(
        admin.user_id,
        'payment_received',
        'Pagamento Confirmado - Professor',
        `${teacherPurchase.teacher?.name} comprou pacote de ${planHours} horas. Valor: R$ ${webhookData.value}`,
        {
          subscription_id: externalRef,
          payment_id: webhookData.paymentId,
          amount: webhookData.value
        }
      )
    }
    try {
      await (require('./notifications')).createUserNotification(
        admin.user_id,
        'payment_received',
        'Pagamento Confirmado - Aluno',
        'Pagamento confirmado.',
        {
          subscription_id: externalRef,
          payment_id: webhookData.paymentId,
          amount: webhookData.value
        }
      )
    } catch {}

    return
  }

  // Verificar se é compra de pacote de aluno
  const { data: studentPurchase } = await supabase
    .from('student_subscriptions')
    .select('*, student:student_id(name, email), plan:plan_id(credits_included)')
    .eq('id', externalRef)
    .single()

  if (studentPurchase) {
    // Ativar compra e creditar aluno
    await supabase
      .from('student_subscriptions')
      .update({
        status: 'active',
        asaas_payment_id: webhookData.paymentId
      })
      .eq('id', externalRef)

    // Adicionar créditos ao aluno
    const { data: user } = await supabase
      .from('users')
      .select('credits')
      .eq('id', studentPurchase.student_id)
      .single()

    const newCredits = (user?.credits || 0) + (studentPurchase.plan?.credits_included || 0)

    await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', studentPurchase.student_id)

    // Registrar transação
    await supabase
      .from('transactions')
      .insert({
        user_id: studentPurchase.student_id,
        type: 'PLAN_PURCHASE',
        amount: studentPurchase.plan?.credits_included || 0,
        description: `Compra de pacote - R$ ${webhookData.value}`,
        reference_id: externalRef
      })

    // Notificar admin
    const { data: admin } = await supabase
      .from('franqueadora_admins')
      .select('user_id')
      .limit(1)
      .single()

    if (admin) {
      await createNotification(
        admin.user_id,
        'payment_received',
        'Pagamento Confirmado - Aluno',
        `${studentPurchase.student?.name} comprou pacote de ${studentPurchase.plan?.credits_included || 0} créditos. Valor: R$ ${webhookData.value}`,
        {
          subscription_id: externalRef,
          payment_id: webhookData.paymentId,
          amount: webhookData.value
        }
      )
    }
  }
}

/**
 * Pagamento vencido
 * Suspender assinatura
 */
async function handlePaymentOverdue(webhookData: any, externalRef: string) {
  if (!externalRef) return

  // Suspender assinatura de professor
  await supabase
    .from('teacher_subscriptions')
    .update({ status: 'overdue' })
    .eq('id', externalRef)

  // Suspender assinatura de aluno
  await supabase
    .from('student_subscriptions')
    .update({ status: 'overdue' })
    .eq('id', externalRef)
}

/**
 * Pagamento estornado
 * Reverter créditos e suspender
 */
async function handlePaymentRefunded(webhookData: any, externalRef: string) {
  if (!externalRef) return

  // Buscar assinatura de aluno
  const { data: studentSub } = await supabase
    .from('student_subscriptions')
    .select('*, plan:plan_id(credits_included)')
    .eq('id', externalRef)
    .single()

  if (studentSub) {
    // Remover créditos
    await supabase.rpc('decrement_user_credits', {
      user_id: studentSub.student_id,
      credits: studentSub.plan?.credits_included || 0
    })

    // Cancelar assinatura
    await supabase
      .from('student_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', externalRef)

    // Registrar transação de estorno
    await supabase
      .from('transactions')
      .insert({
        user_id: studentSub.student_id,
        type: 'BOOKING_REFUND',
        amount: -(studentSub.plan?.credits_included || 0),
        description: 'Estorno de pagamento',
        reference_id: externalRef
      })
  }
}

export default router

