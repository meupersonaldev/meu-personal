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
    createPayment: (data) => asaasService.createPayment({
      customer: data.customer,
      billingType: data.billingType,
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference
    }),
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
