import type { PaymentProvider, BillingType } from './provider'

// Stub de provedor do cliente. Substitua as chamadas abaixo pela API real do cliente.
export function getClienteProvider(): PaymentProvider {
  return {
    async createCustomer(data: { name: string; email: string; cpfCnpj: string; phone?: string | null }) {
      // TODO: Implementar criação/obtenção de cliente na API do cliente
      return { success: false, error: 'CLIENTE provider: createCustomer não implementado' }
    },

    async createPayment(data: { customer: string; billingType: BillingType; value: number; dueDate: string; description: string; externalReference?: string }) {
      // TODO: Implementar criação de pagamento (retornar id do pagamento e status)
      return { success: false, error: 'CLIENTE provider: createPayment não implementado' }
    },

    async generatePaymentLink(paymentId: string) {
      // TODO: Implementar geração de link/QR Code de pagamento
      return { success: false, error: 'CLIENTE provider: generatePaymentLink não implementado' }
    },

    parseWebhook(event: any) {
      // TODO: Mapear o payload do webhook do cliente para { providerId, status }
      return { providerId: null, status: null }
    },
  }
}

