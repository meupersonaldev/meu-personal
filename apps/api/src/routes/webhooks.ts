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

