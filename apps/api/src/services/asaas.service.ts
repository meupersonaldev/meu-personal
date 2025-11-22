import axios, { AxiosInstance } from 'axios'
import { supabase } from '../lib/supabase'

const ASAAS_API_URL =
  process.env.ASAAS_ENV === 'production'
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
  cycle:
    | 'WEEKLY'
    | 'BIWEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'SEMIANNUALLY'
    | 'YEARLY'
  description: string
  externalReference?: string
}

export class AsaasService {
  private api: AxiosInstance

  constructor () {
    this.api = axios.create({
      baseURL: ASAAS_API_URL,
      headers: {
        access_token: ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
  }

  private async sleep (ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async withRetry<T> (
    fn: () => Promise<T>,
    retries = 2,
    backoffMs = 300
  ): Promise<T> {
    let lastError: any
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (error: any) {
        lastError = error
        const status = error?.response?.status
        const isRetryable = !status || (status >= 500 && status < 600)
        if (attempt < retries && isRetryable) {
          await this.sleep(backoffMs * Math.pow(2, attempt))
          continue
        }
        throw error
      }
    }
    throw lastError
  }

  /**
   * Criar cliente no Asaas
   */
  async createCustomer (data: AsaasCustomer) {
    try {
      // Sanitizar CPF/CNPJ e enforçar obrigatoriedade em produção
      const cpfSanitized = (data.cpfCnpj || '').replace(/\D/g, '')
      if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
        return {
          success: false,
          error: 'CPF obrigatório para pagamento'
        }
      }

      const startedAt = Date.now()
      const response = await this.withRetry(() =>
        this.api.post('/customers', {
          ...data,
          cpfCnpj: cpfSanitized || data.cpfCnpj
        })
      )
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path: '/customers',
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar cliente Asaas:', {
        path: '/customers',
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Criar ou obter cliente no Asaas a partir de um usuário
   * Se já existe asaas_customer_id, retorna esse ID
   * Se não, cria novo cliente no Asaas e atualiza no banco
   */
  async getOrCreateCustomer (
    userId: string,
    userData: { name: string; email: string; cpfCnpj?: string; phone?: string }
  ) {
    try {
      // Usar cliente Supabase centralizado

      // Verificar se usuário já tem asaas_customer_id
      const { data: user } = await supabase
        .from('users')
        .select('asaas_customer_id')
        .eq('id', userId)
        .single()

      if (user?.asaas_customer_id) {
        return {
          success: true,
          customerId: user.asaas_customer_id,
          isNew: false
        }
      }

      // Criar novo cliente no Asaas
      const customerData: AsaasCustomer = {
        name: userData.name,
        email: userData.email,
        cpfCnpj: userData.cpfCnpj || '00000000000', // CPF fake para testes
        phone: userData.phone,
        mobilePhone: userData.phone
      }

      const result = await this.createCustomer(customerData)

      if (!result.success) {
        return result
      }

      // Salvar asaas_customer_id no banco
      await supabase
        .from('users')
        .update({ asaas_customer_id: result.data.id })
        .eq('id', userId)

      return {
        success: true,
        customerId: result.data.id,
        isNew: true
      }
    } catch (error: any) {
      console.error('Erro ao obter/criar cliente Asaas:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Buscar cliente no Asaas
   */
  async getCustomer (customerId: string) {
    try {
      const path = `/customers/${customerId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'GET',
        path,
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar cliente Asaas:', {
        path: `/customers/${customerId}`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
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
  async createPayment (data: AsaasPayment) {
    try {
      const startedAt = Date.now()
      const response = await this.withRetry(() =>
        this.api.post('/payments', data)
      )
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path: '/payments',
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar cobrança Asaas:', {
        path: '/payments',
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
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
  async generatePaymentLink (paymentId: string) {
    try {
      const path = `/payments/${paymentId}/identificationField`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'GET',
        path,
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: {
          paymentUrl: response.data.invoiceUrl,
          bankSlipUrl: response.data.bankSlipUrl,
          pixCode: response.data.payload
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar link de pagamento:', {
        path: `/payments/${paymentId}/identificationField`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Criar assinatura recorrente (para professores com plano mensal)
   */
  async createSubscription (data: AsaasSubscription) {
    try {
      const startedAt = Date.now()
      const response = await this.withRetry(() =>
        this.api.post('/subscriptions', data)
      )
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path: '/subscriptions',
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar assinatura Asaas:', {
        path: '/subscriptions',
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Buscar status de pagamento
   */
  async getPayment (paymentId: string) {
    try {
      const path = `/payments/${paymentId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'GET',
        path,
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar pagamento Asaas:', {
        path: `/payments/${paymentId}`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription (subscriptionId: string) {
    try {
      const path = `/subscriptions/${subscriptionId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.delete(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'DELETE',
        path,
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura Asaas:', {
        path: `/subscriptions/${subscriptionId}`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Estornar pagamento
   */
  async refundPayment (paymentId: string) {
    try {
      const path = `/payments/${paymentId}/refund`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path,
        status: response.status,
        ms: duration
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao estornar pagamento Asaas:', {
        path: `/payments/${paymentId}/refund`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
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
  async processWebhook (event: any) {
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

  /**
   * Criar plano de assinatura no Asaas
   */
  async createSubscriptionPlan (data: {
    name: string
    description?: string
    value: number
    cycle:
      | 'WEEKLY'
      | 'BIWEEKLY'
      | 'MONTHLY'
      | 'QUARTERLY'
      | 'SEMIANNUALLY'
      | 'YEARLY'
    billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  }) {
    try {
      const startedAt = Date.now()
      const response = await this.withRetry(() =>
        this.api.post('/subscriptions/plans', {
          name: data.name,
          description: data.description || data.name,
          value: data.value,
          cycle: data.cycle,
          billingType: data.billingType || 'UNDEFINED'
        })
      )
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path: '/subscriptions/plans',
        status: response.status,
        ms: duration
      })

      console.log('Plano criado no Asaas:', response.data.id)

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar plano no Asaas:', {
        path: '/subscriptions/plans',
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Atualizar plano de assinatura no Asaas
   */
  async updateSubscriptionPlan (
    planId: string,
    data: {
      name?: string
      description?: string
      value?: number
    }
  ) {
    try {
      const path = `/subscriptions/plans/${planId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.put(path, data))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'PUT',
        path,
        status: response.status,
        ms: duration
      })

      console.log('Plano atualizado no Asaas:', planId)

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao atualizar plano no Asaas:', {
        path: `/subscriptions/plans/${planId}`,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Deletar plano de assinatura no Asaas
   */
  async deleteSubscriptionPlan (planId: string) {
    try {
      const path = `/subscriptions/plans/${planId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.delete(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'DELETE',
        path,
        status: response.status,
        ms: duration
      })

      console.log('Plano deletado no Asaas:', planId)

      return {
        success: true
      }
    } catch (error: any) {
      console.error(
        'Erro ao deletar plano no Asaas:',
        error.response?.data || error.message
      )
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Emitir nota fiscal de serviço (NFS-e) no Asaas
   *
   * IMPORTANTE: O ASAAS pode não ter API pública para emissão direta de notas fiscais.
   * A emissão geralmente é feita pelo painel ou através de agendamento.
   *
   * Documentação:
   * - https://ajuda.asaas.com/pt-BR/articles/9571904-como-emitir-notas-fiscais
   * - https://ajuda.asaas.com/pt-BR/articles/1950634-e-possivel-emitir-notas-fiscais-atraves-da-api
   */
  async issueInvoice (data: {
    paymentId?: string // ID do pagamento no Asaas
    customer: string // ID do cliente no Asaas
    serviceDescription: string
    serviceCode?: string // Código do serviço (NBS)
    amount: number // Valor em reais (não centavos)
    issueDate?: string // Data de emissão (formato YYYY-MM-DD)
  }) {
    try {
      if (!data.paymentId) {
        return {
          success: false,
          error:
            'Para emitir nota fiscal no ASAAS, é necessário o ID do pagamento (paymentId).'
        }
      }

      // Tentar diferentes endpoints possíveis da API do ASAAS
      const endpoints = [
        `/invoiceServices/schedule`, // Endpoint de agendamento
        `/payments/${data.paymentId}/invoiceServices/schedule`, // Alternativa com paymentId na URL
        `/invoices` // Endpoint direto (se existir)
      ]

      const payload: any = {
        payment: data.paymentId,
        description: data.serviceDescription
      }

      if (data.serviceCode) {
        payload.serviceCode = data.serviceCode
      }

      if (data.issueDate) {
        payload.scheduleDate = data.issueDate
      }

      // Tentar cada endpoint
      let lastError: any = null
      for (const path of endpoints) {
        try {
          const startedAt = Date.now()
          const response = await this.api.post(path, payload)
          const duration = Date.now() - startedAt

          console.log('✅ Nota fiscal agendada no ASAAS:', {
            method: 'POST',
            path,
            status: response.status,
            ms: duration,
            paymentId: data.paymentId
          })

          return {
            success: true,
            data: {
              invoiceId: response.data.id,
              invoiceNumber:
                response.data.number || response.data.invoiceNumber,
              invoiceKey: response.data.accessKey || response.data.key,
              invoiceUrl: response.data.url || response.data.invoiceUrl,
              invoiceXml: response.data.xml,
              status: response.data.status
            }
          }
        } catch (error: any) {
          lastError = error
          // Se não for 404, pode ser outro erro válido (400, 401, etc) - retornar esse erro
          if (error?.response?.status !== 404) {
            console.error('❌ Erro ao agendar nota fiscal no ASAAS:', {
              path,
              status: error?.response?.status,
              error: error.response?.data || error.message
            })
            throw error
          }
          // Se for 404, tenta próximo endpoint
          continue
        }
      }

      // Se todos os endpoints retornaram 404, o ASAAS não tem API pública para isso
      console.warn(
        '⚠️ ASAAS não possui endpoint de API para emissão de notas fiscais'
      )
      return {
        success: false,
        error:
          'O ASAAS não possui API pública para emissão de notas fiscais. A emissão deve ser feita pelo painel do ASAAS. Acesse https://www.asaas.com → Pagamentos → Selecione o pagamento → Emitir Nota Fiscal. Ou configure a emissão automática no painel (Notas Fiscais → Configurações → Emissão Automática).'
      }
    } catch (error: any) {
      console.error('❌ Erro ao emitir nota fiscal no Asaas:', {
        paymentId: data.paymentId,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })

      // Mensagem de erro mais clara para configuração fiscal
      let errorMessage =
        error.response?.data?.errors?.[0]?.description ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao comunicar com ASAAS'

      // Se o erro mencionar informações fiscais, adicionar instruções
      if (
        errorMessage.toLowerCase().includes('informações fiscais') ||
        errorMessage.toLowerCase().includes('informacao fiscal') ||
        errorMessage.toLowerCase().includes('fiscal') ||
        error?.response?.status === 400
      ) {
        errorMessage = `Configuração fiscal necessária: ${errorMessage}. A franqueadora precisa configurar as informações fiscais no painel do ASAAS. Acesse https://www.asaas.com → Notas Fiscais → Configurações e preencha: dados da empresa (CNPJ, razão social, endereço), inscrição municipal, certificado digital (se exigido) e códigos de serviço (NBS).`
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Cancelar nota fiscal no Asaas
   */
  async cancelInvoice (invoiceId: string, reason?: string) {
    try {
      const path = `/invoices/${invoiceId}/cancel`
      const startedAt = Date.now()
      const response = await this.withRetry(() =>
        this.api.post(path, {
          reason: reason || 'Cancelamento solicitado pelo cliente'
        })
      )
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'POST',
        path,
        status: response.status,
        ms: duration
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao cancelar nota fiscal no Asaas:', {
        invoiceId,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error:
          error.response?.data?.errors ||
          error.response?.data?.message ||
          error.message
      }
    }
  }

  /**
   * Buscar nota fiscal no Asaas
   */
  async getInvoice (invoiceId: string) {
    try {
      const path = `/invoices/${invoiceId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', {
        method: 'GET',
        path,
        status: response.status,
        ms: duration
      })

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar nota fiscal no Asaas:', {
        invoiceId,
        status: error?.response?.status,
        error: error.response?.data || error.message
      })
      return {
        success: false,
        error:
          error.response?.data?.errors ||
          error.response?.data?.message ||
          error.message
      }
    }
  }
}

export const asaasService = new AsaasService()
