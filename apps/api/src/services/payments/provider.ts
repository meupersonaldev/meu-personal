import { asaasService } from '../asaas.service'
import { getClienteProvider } from './cliente.provider'

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export interface PaymentProvider {
  createCustomer(data: {
    name: string
    email: string
    cpfCnpj: string
    phone?: string | null
  }): Promise<{ success: boolean; data?: any; error?: any }>

  createPayment(data: {
    customer: string
    billingType: BillingType
    value: number
    dueDate: string
    description: string
    externalReference?: string
    split?: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>
  }): Promise<{ success: boolean; data?: any; error?: any }>

  generatePaymentLink(paymentId: string): Promise<{
    success: boolean
    data?: { paymentUrl?: string; bankSlipUrl?: string; pixCode?: string }
    error?: any
  }>

  parseWebhook?(event: any): { providerId: string | null; status: string | null }
}

function getAsaasProvider(): PaymentProvider {
  return {
    createCustomer: (data) => asaasService.createCustomer(data),
    createPayment: (data) => {
      console.log('[PAYMENT PROVIDER] 🔍 Recebendo dados para createPayment:', {
        hasCustomer: !!data.customer,
        hasSplit: !!data.split,
        splitLength: data.split?.length,
        split: data.split,
        value: data.value
      })
      
      if (!data.split || !Array.isArray(data.split) || data.split.length < 1) {
        console.error('[PAYMENT PROVIDER] ❌❌❌ SPLIT INVÁLIDO - BLOQUEANDO PAGAMENTO:', {
          split: data.split,
          isArray: Array.isArray(data.split),
          length: data.split?.length
        })
        return Promise.resolve({
          success: false,
          error: 'Split de pagamento não configurado corretamente. É necessário pelo menos um walletId no split.'
        })
      }

      console.log('[PAYMENT PROVIDER] ✅ Split validado, chamando asaasService.createPayment...')
      
      return asaasService.createPayment({
        customer: data.customer,
        billingType: data.billingType,
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
        externalReference: data.externalReference,
        split: data.split
      })
    },
    generatePaymentLink: (paymentId) => asaasService.generatePaymentLink(paymentId),
    parseWebhook: (event: any) => {
      const ev = String(event?.event || '')
      const providerId = event?.payment?.id || null
      let status: string | null = null
      if (ev === 'PAYMENT_CONFIRMED') status = 'CONFIRMED'
      else if (ev === 'PAYMENT_RECEIVED') status = 'RECEIVED'
      else if (ev === 'PAYMENT_OVERDUE') status = 'OVERDUE'
      else if (ev === 'PAYMENT_DELETED' || ev === 'PAYMENT_REFUNDED') status = 'CANCELED'
      return { providerId, status }
    }
  }
}

export function getPaymentProvider(): PaymentProvider {
  const provider = (process.env.PAYMENT_PROVIDER || 'ASAAS').toUpperCase()
  switch (provider) {
    case 'CLIENTE':
      return getClienteProvider()
    case 'ASAAS':
    default:
      return getAsaasProvider()
  }
}
