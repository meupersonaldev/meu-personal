import express from 'express'
import { supabase } from '../lib/supabase'
import { asaasService } from '../services/asaas.service'
import { createNotification } from './notifications'

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
      value: event.payment?.value
    })

    // Processar webhook
    const webhookData = await asaasService.processWebhook(event)

    // Buscar referência externa (subscription_id ou booking_id)
    const externalRef = webhookData.externalReference

    // Processar diferentes tipos de eventos
    switch (event.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentConfirmed(webhookData, externalRef)
        break

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(webhookData, externalRef)
        break

      case 'PAYMENT_REFUNDED':
        await handlePaymentRefunded(webhookData, externalRef)
        break

      default:
        console.log('Evento não tratado:', event.event)
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

  // Verificar se é compra de pacote de professor
  const { data: teacherPurchase } = await supabase
    .from('teacher_subscriptions')
    .select('*, teacher:teacher_id(name, email), plan:plan_id(hours_included)')
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

    // TODO: Adicionar horas ao professor (implementar RPC ou campo hours_available)
    // await supabase.rpc('increment_teacher_hours', {
    //   user_id: teacherPurchase.teacher_id,
    //   hours: teacherPurchase.plan?.hours_included || 0
    // })

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
        'Pagamento Confirmado - Professor',
        `${teacherPurchase.teacher?.name} comprou pacote de ${teacherPurchase.plan?.hours_included || 0} horas. Valor: R$ ${webhookData.value}`,
        {
          subscription_id: externalRef,
          payment_id: webhookData.paymentId,
          amount: webhookData.value
        }
      )
    }

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