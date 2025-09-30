import axios, { AxiosInstance } from 'axios'

const ASAAS_API_URL = process.env.ASAAS_ENV === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''

interface AsaasCustomer {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
}

interface AsaasPayment {
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string
  description: string
  externalReference?: string
  // Removido split - não usamos divisão de pagamento
}

interface AsaasSubscription {
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'
  value: number
  nextDueDate: string
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  description: string
  externalReference?: string
}

export class AsaasService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: ASAAS_API_URL,
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Criar cliente no Asaas
   */
  async createCustomer(data: AsaasCustomer) {
    try {
      const response = await this.api.post('/customers', data)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar cliente Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Buscar cliente no Asaas
   */
  async getCustomer(customerId: string) {
    try {
      const response = await this.api.get(`/customers/${customerId}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar cliente Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Criar cobrança única (para alunos comprarem pacotes ou professores comprarem horas)
   * TODO PAGAMENTO VAI 100% PARA A FRANQUIA
   * Sistema credita horas automaticamente após confirmação
   */
  async createPayment(data: AsaasPayment) {
    try {
      const response = await this.api.post('/payments', data)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar cobrança Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Gerar link de pagamento (checkout simplificado)
   * Retorna URL para o cliente finalizar o pagamento
   */
  async generatePaymentLink(paymentId: string) {
    try {
      const response = await this.api.get(`/payments/${paymentId}/identificationField`)
      return {
        success: true,
        data: {
          paymentUrl: response.data.invoiceUrl,
          bankSlipUrl: response.data.bankSlipUrl,
          pixCode: response.data.payload
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar link de pagamento:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Criar assinatura recorrente (para professores com plano mensal)
   */
  async createSubscription(data: AsaasSubscription) {
    try {
      const response = await this.api.post('/subscriptions', data)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar assinatura Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Buscar status de pagamento
   */
  async getPayment(paymentId: string) {
    try {
      const response = await this.api.get(`/payments/${paymentId}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar pagamento Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await this.api.delete(`/subscriptions/${subscriptionId}`)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Estornar pagamento
   */
  async refundPayment(paymentId: string) {
    try {
      const response = await this.api.post(`/payments/${paymentId}/refund`)
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao estornar pagamento Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Criar plano de assinatura no Asaas (para planos recorrentes de professores)
   * Note: Asaas chama isso de "subscription plan"
   */
  async createSubscriptionPlan(data: {
    name: string
    description?: string
    value: number
    cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  }) {
    try {
      const response = await this.api.post('/subscriptions/plans', {
        name: data.name,
        description: data.description || data.name,
        value: data.value,
        cycle: data.cycle
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar plano de assinatura Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Processar webhook do Asaas
   * Eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc
   */
  async processWebhook(event: any) {
    console.log('Webhook Asaas recebido:', event.event, event.payment?.id)

    return {
      event: event.event,
      paymentId: event.payment?.id,
      status: event.payment?.status,
      value: event.payment?.value,
      customer: event.payment?.customer,
      externalReference: event.payment?.externalReference
    }
  }
}

export const asaasService = new AsaasService()
