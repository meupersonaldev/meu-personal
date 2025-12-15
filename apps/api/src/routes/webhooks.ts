import express from 'express'
import { supabase } from '../lib/supabase'
import { paymentIntentService } from '../services/payment-intent.service'
import { getPaymentProvider } from '../services/payments/provider'
import { onPaymentConfirmed, onPaymentFailed, onPaymentRefunded } from '../lib/events'

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
    const timestamp = new Date().toISOString()

    console.log('🔔 [WEBHOOK] Asaas recebido:', {
      timestamp,
      event: event.event,
      paymentId: event.payment?.id,
      status: event.payment?.status,
      value: event.payment?.value,
      customer: event.payment?.customer,
      externalReference: event.payment?.externalReference
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
      console.log('✅ [WEBHOOK] Processando pagamento:', { providerId: parsed.providerId, status: parsed.status })
      await paymentIntentService.processWebhook(parsed.providerId, parsed.status)
      console.log('✅ [WEBHOOK] Pagamento processado com sucesso')

      // Send payment notifications based on status (Requirements 4.1, 4.2, 4.3, 7.5, 7.6)
      try {
        // Fetch payment intent to get user and academy info
        const { data: paymentIntent } = await supabase
          .from('payment_intents')
          .select('id, actor_user_id, unit_id, amount_cents, payload_json')
          .eq('provider_id', parsed.providerId)
          .single()

        if (paymentIntent) {
          const userId = paymentIntent.actor_user_id
          const paymentId = paymentIntent.id
          const amount = paymentIntent.amount_cents / 100
          const academyId = paymentIntent.unit_id || null
          const description = paymentIntent.payload_json?.package_title || 'Pagamento Meu Personal'

          // Determine notification based on status
          if (parsed.status === 'CONFIRMED' || parsed.status === 'RECEIVED') {
            // Payment confirmed - notify user and franchise (Requirements 4.1, 7.5)
            await onPaymentConfirmed(userId, paymentId, amount, description, academyId)
          } else if (parsed.status === 'FAILED' || parsed.status === 'OVERDUE') {
            // Payment failed - notify user and franchise (Requirements 4.2, 7.6)
            const reason = parsed.status === 'OVERDUE' ? 'Pagamento vencido' : 'Falha no processamento'
            await onPaymentFailed(userId, paymentId, amount, reason, academyId)
          } else if (parsed.status === 'REFUNDED') {
            // Payment refunded - notify user (Requirement 4.3)
            await onPaymentRefunded(userId, paymentId, amount)
          }
        }
      } catch (notifError: any) {
        // Log notification error but don't fail the webhook
        console.error('⚠️ [WEBHOOK] Erro ao enviar notificações de pagamento:', notifError.message)
      }
    } else {
      console.log('⚠️ [WEBHOOK] Evento não tratado:', event?.event)
    }

    res.status(200).json({ received: true, processed: !!parsed.providerId })
  } catch (error: any) {
    console.error('❌ [WEBHOOK] Erro ao processar webhook Asaas:', {
      error: error.message,
      stack: error.stack,
      event: req.body?.event,
      paymentId: req.body?.payment?.id
    })
    res.status(500).json({ error: 'Erro ao processar webhook', details: error.message })
  }
})

// NOTA: Funções antigas removidas - agora tudo é processado via paymentIntentService.processWebhook()
// O novo fluxo usa a tabela payment_intents e o balanceService para creditar automaticamente

export default router

