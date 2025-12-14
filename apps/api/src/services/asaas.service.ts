import axios, { AxiosInstance } from 'axios'
import { supabase } from '../lib/supabase'
import { validateCpfCnpj } from '../utils/validation'

const ASAAS_API_URL = process.env.ASAAS_ENV === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''

interface AsaasCustomer {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
}

interface AsaasSplit {
  walletId: string
  fixedValue?: number
  percentualValue?: number
}

interface AsaasPayment {
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string
  description: string
  externalReference?: string
  split?: AsaasSplit[]
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

interface AsaasWebhook {
  name: string
  url: string
  email?: string
  enabled?: boolean
  interrupted?: boolean
  apiVersion?: number
  authToken?: string
  sendType?: 'SEQUENTIALLY' | 'PARALLEL'
  events?: string[]
}

interface AsaasAccount {
  name: string
  email: string
  cpfCnpj: string
  mobilePhone: string
  incomeValue: number
  address: string
  addressNumber: string
  province: string
  postalCode: string
  loginEmail?: string
  birthDate?: string
  companyType?: string
  phone?: string
  site?: string
  complement?: string
  webhooks?: AsaasWebhook[]
}

export class AsaasService {
  private api: AxiosInstance

  constructor() {
    // Exibir informações da API key carregada (parcialmente mascarada)
    if (!ASAAS_API_KEY) {
      console.error('⚠️ ASAAS_API_KEY não configurada. Configure a variável de ambiente ASAAS_API_KEY no arquivo .env')
    } else {
      const maskedKey = ASAAS_API_KEY.length > 20 
        ? ASAAS_API_KEY.substring(0, 20) + '...' + ASAAS_API_KEY.substring(ASAAS_API_KEY.length - 10)
        : '***'
      console.log('🔑 ASAAS_API_KEY carregada:', {
        ambiente: process.env.ASAAS_ENV || 'sandbox',
        url: ASAAS_API_URL,
        keyPreview: maskedKey,
        keyLength: ASAAS_API_KEY.length,
        keyPrefix: ASAAS_API_KEY.substring(0, 10)
      })
    }

    this.api = axios.create({
      baseURL: ASAAS_API_URL,
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
  }

  private validateApiKey(): void {
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não configurada. Configure a variável de ambiente ASAAS_API_KEY no arquivo .env')
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 2, backoffMs = 300): Promise<T> {
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
  async createCustomer(data: AsaasCustomer) {
    try {
      // Validar chave de API antes de fazer a requisição
      if (!ASAAS_API_KEY) {
        return {
          success: false,
          error: '[ASAAS] A chave de API não está configurada. Configure a variável de ambiente ASAAS_API_KEY no arquivo .env'
        }
      }

      // Sanitizar CPF/CNPJ e enforçar obrigatoriedade em produção
      const cpfSanitized = (data.cpfCnpj || '').replace(/\D/g, '')
      if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
        return {
          success: false,
          error: '[ASAAS] CPF obrigatório para pagamento em produção'
        }
      }

      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post('/customers', {
        ...data,
        cpfCnpj: cpfSanitized || data.cpfCnpj
      }))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'POST', path: '/customers', status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      const maskedKey = ASAAS_API_KEY ? 
        (ASAAS_API_KEY.length > 20 
          ? ASAAS_API_KEY.substring(0, 20) + '...' + ASAAS_API_KEY.substring(ASAAS_API_KEY.length - 10)
          : '***')
        : 'NÃO CONFIGURADA'
      
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro retornado pelo provedor ao criar cliente:', { 
        path: '/customers', 
        status: error?.response?.status, 
        respostaAsaas: asaasError,
        hasApiKey: !!ASAAS_API_KEY,
        apiKeyPreview: maskedKey,
        asaasEnv: process.env.ASAAS_ENV,
        apiUrl: ASAAS_API_URL
      })
      
      // Melhorar mensagem de erro para chave de API inválida ou não configurada
      if (error?.response?.status === 401) {
        const errorMessage = error.response?.data?.errors?.[0]?.description || error.message || ''
        if (errorMessage.toLowerCase().includes('chave') || 
            errorMessage.toLowerCase().includes('api') ||
            errorMessage.toLowerCase().includes('invalid') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          return {
            success: false,
            error: '[ASAAS] A chave de API está inválida ou não está configurada. Verifique a variável de ambiente ASAAS_API_KEY no arquivo .env e certifique-se de que está usando a chave correta para o ambiente ' + (process.env.ASAAS_ENV || 'sandbox')
          }
        }
      }
      
      // Se o erro for sobre chave não configurada (do validateApiKey)
      if (error.message && error.message.includes('ASAAS_API_KEY')) {
        return {
          success: false,
          error: '[ASAAS] ' + error.message
        }
      }
      
      // Extrair mensagem de erro do Asaas
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
      }
    }
  }

  /**
   * Criar ou obter cliente no Asaas a partir de um usuário
   * Se já existe asaas_customer_id, retorna esse ID
   * Se não, cria novo cliente no Asaas e atualiza no banco
   */
  async getOrCreateCustomer(userId: string, userData: { name: string, email: string, cpfCnpj?: string, phone?: string }) {
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
      console.error('[ASAAS] Erro ao obter/criar cliente:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Buscar cliente no Asaas
   */
  async getCustomer(customerId: string) {
    try {
      const path = `/customers/${customerId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'GET', path, status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro retornado pelo provedor ao buscar cliente:', { 
        path: `/customers/${customerId}`, 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
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
      this.validateApiKey()

      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post('/payments', data))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'POST', path: '/payments', status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro retornado pelo provedor ao criar cobrança:', { 
        path: '/payments', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      
      // Melhorar mensagem de erro para chave de API inválida
      if (error?.response?.status === 401) {
        const errorMessage = error.response?.data?.errors?.[0]?.description || error.message
        if (errorMessage?.toLowerCase().includes('chave') || errorMessage?.toLowerCase().includes('api')) {
          return {
            success: false,
            error: '[ASAAS] A chave de API está inválida ou não está configurada. Verifique a variável de ambiente ASAAS_API_KEY no arquivo .env'
          }
        }
      }
      
      // Extrair mensagem de erro do Asaas
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
      }
    }
  }

  /**
   * Gerar link de pagamento (checkout simplificado)
   * Retorna URL para o cliente finalizar o pagamento
   */
  async generatePaymentLink(paymentId: string) {
    try {
      const path = `/payments/${paymentId}/identificationField`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'GET', path, status: response.status, ms: duration })
      return {
        success: true,
        data: {
          paymentUrl: response.data.invoiceUrl,
          bankSlipUrl: response.data.bankSlipUrl,
          pixCode: response.data.payload
        }
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro retornado pelo provedor ao gerar link de pagamento:', { 
        path: `/payments/${paymentId}/identificationField`, 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
      }
    }
  }

  /**
   * Criar assinatura recorrente (para professores com plano mensal)
   */
  async createSubscription(data: AsaasSubscription) {
    try {
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post('/subscriptions', data))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'POST', path: '/subscriptions', status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar assinatura Asaas:', { path: '/subscriptions', status: error?.response?.status, error: error.response?.data || error.message })
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
      const path = `/payments/${paymentId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'GET', path, status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao buscar pagamento Asaas:', { path: `/payments/${paymentId}`, status: error?.response?.status, error: error.response?.data || error.message })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Listar pagamentos do Asaas
   * Filtros opcionais: customer, subscription, status, paymentDate, dueDate, walletId
   */
  async listPayments(filters?: {
    customer?: string
    subscription?: string
    status?: string
    paymentDate?: string
    dueDate?: string
    walletId?: string
    limit?: number
    offset?: number
  }) {
    try {
      const params = new URLSearchParams()
      
      if (filters?.customer) params.append('customer', filters.customer)
      if (filters?.subscription) params.append('subscription', filters.subscription)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.paymentDate) params.append('paymentDate', filters.paymentDate)
      if (filters?.dueDate) params.append('dueDate', filters.dueDate)
      if (filters?.walletId) params.append('walletId', filters.walletId)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))

      const path = `/payments${params.toString() ? `?${params.toString()}` : ''}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get(path))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Listagem de pagamentos bem-sucedida:', { path, status: response.status, count: response.data?.data?.length || 0, ms: duration })
      return {
        success: true,
        data: response.data?.data || [],
        totalCount: response.data?.totalCount || 0,
        hasMore: response.data?.hasMore || false
      }
    } catch (error: any) {
      console.error('Erro ao listar pagamentos Asaas:', { filters, status: error?.response?.status, error: error.response?.data || error.message })
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        data: []
      }
    }
  }

  /**
   * Listar pagamentos de uma subconta específica
   * Usa o header asaas-account para acessar a subconta
   */
  async listSubaccountPayments(subaccountId: string, filters?: {
    customer?: string
    subscription?: string
    status?: string
    paymentDate?: string
    dueDate?: string
    limit?: number
    offset?: number
  }) {
    try {
      const params = new URLSearchParams()
      
      if (filters?.customer) params.append('customer', filters.customer)
      if (filters?.subscription) params.append('subscription', filters.subscription)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.paymentDate) params.append('paymentDate', filters.paymentDate)
      if (filters?.dueDate) params.append('dueDate', filters.dueDate)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))

      const path = `/payments${params.toString() ? `?${params.toString()}` : ''}`
      const startedAt = Date.now()
      
      // Usar header asaas-account para acessar a subconta
      const response = await this.withRetry(() => 
        this.api.get(path, {
          headers: {
            'asaas-account': subaccountId
          }
        })
      )
      
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Listagem de pagamentos da subconta bem-sucedida:', { 
        subaccountId, 
        path, 
        status: response.status, 
        count: response.data?.data?.length || 0, 
        ms: duration 
      })
      
      return {
        success: true,
        data: response.data?.data || [],
        totalCount: response.data?.totalCount || 0,
        hasMore: response.data?.hasMore || false
      }
    } catch (error: any) {
      console.error('[ASAAS] Erro ao listar pagamentos da subconta:', { 
        subaccountId, 
        filters, 
        status: error?.response?.status, 
        error: error.response?.data || error.message 
      })
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        data: []
      }
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const path = `/subscriptions/${subscriptionId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.delete(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'DELETE', path, status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura Asaas:', { path: `/subscriptions/${subscriptionId}`, status: error?.response?.status, error: error.response?.data || error.message })
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Cancelar/Deletar pagamento pendente
   * Só funciona para pagamentos pendentes (PENDING)
   */
  async cancelPayment(paymentId: string) {
    try {
      const path = `/payments/${paymentId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.delete(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'DELETE', path, status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao cancelar pagamento Asaas:', { path: `/payments/${paymentId}`, status: error?.response?.status, error: error.response?.data || error.message })
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
      const path = `/payments/${paymentId}/refund`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'POST', path, status: response.status, ms: duration })
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao estornar pagamento Asaas:', { path: `/payments/${paymentId}/refund`, status: error?.response?.status, error: error.response?.data || error.message })
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

  /**
   * Criar plano de assinatura no Asaas
   */
  async createSubscriptionPlan(data: {
    name: string
    description?: string
    value: number
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
    billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  }) {
    try {
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post('/subscriptions/plans', {
        name: data.name,
        description: data.description || data.name,
        value: data.value,
        cycle: data.cycle,
        billingType: data.billingType || 'UNDEFINED'
      }))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'POST', path: '/subscriptions/plans', status: response.status, ms: duration })

      console.log('Plano criado no Asaas:', response.data.id)

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao criar plano no Asaas:', { path: '/subscriptions/plans', status: error?.response?.status, error: error.response?.data || error.message })
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Atualizar plano de assinatura no Asaas
   */
  async updateSubscriptionPlan(planId: string, data: {
    name?: string
    description?: string
    value?: number
  }) {
    try {
      const path = `/subscriptions/plans/${planId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.put(path, data))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'PUT', path, status: response.status, ms: duration })

      console.log('Plano atualizado no Asaas:', planId)

      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      console.error('Erro ao atualizar plano no Asaas:', { path: `/subscriptions/plans/${planId}`, status: error?.response?.status, error: error.response?.data || error.message })
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Deletar plano de assinatura no Asaas
   */
  async deleteSubscriptionPlan(planId: string) {
    try {
      const path = `/subscriptions/plans/${planId}`
      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.delete(path))
      const duration = Date.now() - startedAt
      console.log('asaas_request', { method: 'DELETE', path, status: response.status, ms: duration })

      console.log('Plano deletado no Asaas:', planId)

      return {
        success: true
      }
    } catch (error: any) {
      console.error('Erro ao deletar plano no Asaas:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * Criar subconta no Asaas
   * Permite criar uma subconta para receber pagamentos de forma independente
   */
  async createAccount(data: AsaasAccount) {
    try {
      this.validateApiKey()

      // Sanitizar CPF/CNPJ
      const cpfSanitized = (data.cpfCnpj || '').replace(/\D/g, '')
      
      if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
        return {
          success: false,
          error: '[ASAAS] CPF/CNPJ obrigatório para criação de subconta em produção'
        }
      }

      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.post('/accounts', {
        ...data,
        cpfCnpj: cpfSanitized || data.cpfCnpj
      }))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { method: 'POST', path: '/accounts', status: response.status, ms: duration })
      
      return {
        success: true,
        data: response.data
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro retornado pelo provedor ao criar subconta:', { 
        path: '/accounts', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      
      // Melhorar mensagem de erro para chave de API inválida
      if (error?.response?.status === 401) {
        const errorMessage = error.response?.data?.errors?.[0]?.description || error.message || ''
        if (errorMessage.toLowerCase().includes('chave') || 
            errorMessage.toLowerCase().includes('api') ||
            errorMessage.toLowerCase().includes('invalid') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          return {
            success: false,
            error: '[ASAAS] A chave de API está inválida ou não está configurada. Verifique a variável de ambiente ASAAS_API_KEY no arquivo .env e certifique-se de que está usando a chave correta para o ambiente ' + (process.env.ASAAS_ENV || 'sandbox')
          }
        }
      }
      
      // Extrair mensagem de erro do Asaas
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
      }
    }
  }

  /**
   * Obter wallets da conta principal
   * Retorna lista de wallets associados à API Key
   */
  async getWallets() {
    try {
      this.validateApiKey()

      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get('/wallets/'))
      const duration = Date.now() - startedAt
      console.log('[ASAAS] Requisição bem-sucedida:', { 
        method: 'GET', 
        path: '/wallets/', 
        status: response.status, 
        ms: duration 
      })
      
      const wallets = response.data?.data || []
      const walletId = wallets.length > 0 ? wallets[0].id : null

      return {
        success: true,
        walletId,
        wallets: wallets.map((w: any) => w.id)
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro ao buscar wallets:', { 
        path: '/wallets/', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      
      let errorMessage = 'Erro desconhecido retornado pelo Asaas'
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.description || error.response.data.errors[0] || errorMessage
        } else {
          errorMessage = error.response.data.errors
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return {
        success: false,
        error: `[ASAAS] ${errorMessage}`
      }
    }
  }

  /**
   * Criar ou obter subconta da franquia (academia)
   * Retorna o walletId necessário para split
   */
  async getOrCreateFranchiseAccount(academyId: string, academyData: {
    name: string
    email: string
    companyType?: string
    cpfCnpj?: string
    phone?: string
    address?: string
    addressNumber?: string
    province?: string
    postalCode?: string
  }) {
    try {
      // Verificar se já existe subconta no banco
      // Buscar também os campos obrigatórios para criação de conta
      const { data: academy } = await supabase
        .from('academies')
        .select('asaas_account_id, asaas_wallet_id, cpf_cnpj, address_number, province, company_type, monthly_revenue, address, zip_code, phone, birth_date')
        .eq('id', academyId)
        .single()

      if (academy?.asaas_wallet_id) {
        return {
          success: true,
          walletId: academy.asaas_wallet_id,
          accountId: academy.asaas_account_id,
          isNew: false
        }
      }

      // Buscar CPF/CNPJ: priorizar o que vem no parâmetro, senão buscar do banco
      let cpfCnpj: string | null = academyData.cpfCnpj || null
      
      if (!cpfCnpj || cpfCnpj.trim() === '') {
        // Buscar do banco se não veio no parâmetro
        cpfCnpj = academy?.cpf_cnpj || null
        
        if (!cpfCnpj || cpfCnpj.trim() === '') {
          console.error('[ASAAS] ❌ CPF/CNPJ não encontrado para academia:', {
            academyId,
            hasCpfCnpjInParam: !!academyData.cpfCnpj,
            hasCpfCnpjInDb: !!academy?.cpf_cnpj
          })
          return {
            success: false,
            error: '[ASAAS] CPF/CNPJ é obrigatório para criar subconta Asaas. A franquia deve ter CPF/CNPJ cadastrado.'
          }
        }
      }

      // Sanitizar CPF/CNPJ (remover formatação)
      const cpfCnpjSanitized = cpfCnpj.replace(/\D/g, '')

      // Validar CPF/CNPJ antes de criar conta
      if (!validateCpfCnpj(cpfCnpjSanitized)) {
        console.error('[ASAAS] ❌ CPF/CNPJ inválido para criar subconta:', {
          academyId,
          cpfCnpj: cpfCnpjSanitized
        })
        return {
          success: false,
          error: '[ASAAS] CPF/CNPJ inválido. Verifique os dígitos verificadores antes de criar a subconta.'
        }
      }

      // Determinar se é CPF (11 dígitos) ou CNPJ (14 dígitos)
      const isCpf = cpfCnpjSanitized.length === 11
      const isCnpj = cpfCnpjSanitized.length === 14

      console.log('[ASAAS] ✅ CPF/CNPJ validado, criando subconta:', {
        academyId,
        cpfCnpjLength: cpfCnpjSanitized.length,
        isCpf,
        isCnpj
      })

      // Buscar campos obrigatórios: priorizar parâmetros, senão buscar do banco
      const address = academyData.address || academy?.address || null
      const addressNumber = academyData.addressNumber || academy?.address_number || null
      const province = academyData.province || academy?.province || null
      const postalCode = academyData.postalCode || academy?.zip_code || null
      const mobilePhone = academyData.phone || academy?.phone || null
      const companyType = academyData.companyType || academy?.company_type || null
      const birthDate = academy?.birth_date || null
      const incomeValue = academy?.monthly_revenue || null

      // Validar campos obrigatórios
      if (!address || address.trim() === '') {
        console.error('[ASAAS] ❌ address não encontrado para academia:', { academyId })
        return {
          success: false,
          error: '[ASAAS] Endereço é obrigatório para criar subconta Asaas.'
        }
      }

      if (!addressNumber || addressNumber.trim() === '') {
        console.error('[ASAAS] ❌ addressNumber não encontrado para academia:', { academyId })
        return {
          success: false,
          error: '[ASAAS] Número do endereço é obrigatório para criar subconta Asaas.'
        }
      }

      if (!province || province.trim() === '') {
        console.error('[ASAAS] ❌ province não encontrado para academia:', { academyId })
        return {
          success: false,
          error: '[ASAAS] Bairro é obrigatório para criar subconta Asaas.'
        }
      }

      if (!postalCode || postalCode.trim() === '') {
        console.error('[ASAAS] ❌ postalCode não encontrado para academia:', { academyId })
        return {
          success: false,
          error: '[ASAAS] CEP é obrigatório para criar subconta Asaas.'
        }
      }

      if (!mobilePhone || mobilePhone.trim() === '') {
        console.error('[ASAAS] ❌ mobilePhone não encontrado para academia:', { academyId })
        return {
          success: false,
          error: '[ASAAS] Telefone móvel é obrigatório para criar subconta Asaas.'
        }
      }

      if (!incomeValue || incomeValue <= 0) {
        console.error('[ASAAS] ❌ incomeValue não encontrado ou inválido para academia:', { academyId, incomeValue })
        return {
          success: false,
          error: '[ASAAS] Receita mensal (incomeValue) é obrigatória e deve ser maior que zero para criar subconta Asaas.'
        }
      }

      // Validação condicional: birthDate obrigatório para CPF, companyType obrigatório para CNPJ
      if (isCpf) {
        if (!birthDate || birthDate.trim() === '') {
          console.error('[ASAAS] ❌ birthDate não encontrado para academia (CPF):', { academyId })
          return {
            success: false,
            error: '[ASAAS] Data de nascimento é obrigatória para pessoa física (CPF).'
          }
        }
        // Validar se a data de nascimento é válida
        const birthDateObj = new Date(birthDate)
        if (isNaN(birthDateObj.getTime())) {
          console.error('[ASAAS] ❌ birthDate inválido:', { academyId, birthDate })
          return {
            success: false,
            error: '[ASAAS] Data de nascimento inválida.'
          }
        }
        // Validar se a data não é futura
        if (birthDateObj > new Date()) {
          console.error('[ASAAS] ❌ birthDate é futura:', { academyId, birthDate })
          return {
            success: false,
            error: '[ASAAS] Data de nascimento não pode ser futura.'
          }
        }
      }

      if (isCnpj) {
        if (!companyType || companyType.trim() === '') {
          console.error('[ASAAS] ❌ companyType não encontrado para academia (CNPJ):', { academyId })
          return {
            success: false,
            error: '[ASAAS] Tipo de empresa é obrigatório para pessoa jurídica (CNPJ).'
          }
        }

        // Validar companyType para CNPJ
        if (!['MEI', 'LIMITED', 'ASSOCIATION'].includes(companyType)) {
          console.error('[ASAAS] ❌ companyType inválido para CNPJ:', { academyId, companyType })
          return {
            success: false,
            error: '[ASAAS] Tipo de empresa inválido. Para CNPJ, deve ser: MEI, LIMITED ou ASSOCIATION.'
          }
        }
      }

      console.log('[ASAAS] ✅ Campos obrigatórios validados, criando subconta:', {
        academyId,
        hasAddress: !!address,
        hasAddressNumber: !!addressNumber,
        hasProvince: !!province,
        hasPostalCode: !!postalCode,
        hasMobilePhone: !!mobilePhone,
        isCpf,
        isCnpj,
        hasBirthDate: !!birthDate,
        companyType,
        incomeValue
      })

      // Criar nova subconta
      const accountData: any = {
        name: academyData.name,
        email: academyData.email,
        cpfCnpj: cpfCnpjSanitized,
        mobilePhone: mobilePhone,
        incomeValue: Number(incomeValue),
        address: address,
        addressNumber: addressNumber,
        province: province,
        postalCode: postalCode,
        phone: academyData.phone || mobilePhone
      }

      // Adicionar campos condicionais
      if (isCpf && birthDate) {
        accountData.birthDate = birthDate
      }
      if (isCnpj && companyType) {
        accountData.companyType = companyType
      }

      const accountResult = await this.createAccount(accountData)

      if (!accountResult.success) {
        return accountResult
      }

      // Extrair accountId e walletId da resposta
      // A resposta do Asaas inclui ambos: id (accountId) e walletId
      const accountId = accountResult.data.id
      const walletId = accountResult.data.walletId

      if (!walletId) {
        console.warn('[ASAAS] Subconta criada mas walletId não veio na resposta:', {
          accountId,
          responseKeys: Object.keys(accountResult.data || {})
        })
        // Se não tiver walletId, usar accountId como fallback (pode ser o mesmo em alguns casos)
        const fallbackWalletId = accountId
        console.warn('[ASAAS] Usando accountId como walletId:', fallbackWalletId)
        
        // Salvar com fallback
        await supabase
          .from('academies')
          .update({
            asaas_account_id: accountId,
            asaas_wallet_id: fallbackWalletId
          })
          .eq('id', academyId)

        return {
          success: true,
          walletId: fallbackWalletId,
          accountId,
          isNew: true
        }
      }

      // Log para debug
      console.log('[ASAAS] Subconta criada:', {
        accountId,
        walletId,
        hasWalletIdInResponse: true
      })

      // Salvar no banco
      await supabase
        .from('academies')
        .update({
          asaas_account_id: accountId,
          asaas_wallet_id: walletId
        })
        .eq('id', academyId)

      return {
        success: true,
        walletId,
        accountId,
        isNew: true
      }
    } catch (error: any) {
      console.error('[ASAAS] Erro ao obter/criar subconta da franquia:', error)
      return {
        success: false,
        error: error.message || 'Erro ao criar subconta da franquia'
      }
    }
  }

  /**
   * Obter walletId da conta principal (franqueadora)
   * A franqueadora é a conta principal, não uma subconta
   * Retorna o walletId necessário para split
   */
  async getFranchisorWalletId(franqueadoraId: string) {
    try {
      // Verificar se já existe walletId no banco
      const { data: franqueadora } = await supabase
        .from('franqueadora')
        .select('asaas_wallet_id')
        .eq('id', franqueadoraId)
        .single()

      if (franqueadora?.asaas_wallet_id) {
        // Validar que não está vazio
        if (franqueadora.asaas_wallet_id.trim() === '') {
          console.error('[ASAAS] ❌ WalletId da franqueadora está vazio no banco')
          return {
            success: false,
            error: 'WalletId da franqueadora está vazio. É obrigatório ter uma conta Asaas configurada.'
          }
        }
        return {
          success: true,
          walletId: franqueadora.asaas_wallet_id
        }
      }

      // Para a franqueadora (conta principal), buscar walletId via getWallets
      // O endpoint /wallets/ retorna os wallets da conta principal
      const walletsResult = await this.getWallets()
      
      if (!walletsResult.success || !walletsResult.walletId) {
        console.error('[ASAAS] ❌ Não foi possível obter walletId da conta principal via /wallets/')
        return {
          success: false,
          error: 'Não foi possível obter walletId da conta principal. A franqueadora deve ter uma conta Asaas configurada.'
        }
      }

      const walletId = walletsResult.walletId
      
      if (!walletId || walletId.trim() === '') {
        console.error('[ASAAS] ❌ WalletId obtido está vazio')
        return {
          success: false,
          error: 'WalletId da franqueadora está vazio. É obrigatório ter uma conta Asaas configurada.'
        }
      }
      
      console.log('[ASAAS] ✅ WalletId da franqueadora (conta principal) obtido:', walletId)

      // Salvar walletId no banco (não accountId, pois é conta principal)
      await supabase
        .from('franqueadora')
        .update({
          asaas_wallet_id: walletId
        })
        .eq('id', franqueadoraId)

      return {
        success: true,
        walletId
      }
    } catch (error: any) {
      console.error('[ASAAS] Erro ao obter walletId da franqueadora:', error)
      return {
        success: false,
        error: error.message || 'Erro ao obter walletId da franqueadora'
      }
    }
  }

  /**
   * Obter saldo financeiro da conta Asaas
   * Retorna saldo disponível, a receber e bloqueado
   */
  async getBalance() {
    try {
      this.validateApiKey()

      const startedAt = Date.now()
      const response = await this.withRetry(() => this.api.get('/finance/balance'))
      const duration = Date.now() - startedAt
      
      console.log('[ASAAS] Saldo obtido:', { 
        method: 'GET', 
        path: '/finance/balance', 
        status: response.status, 
        ms: duration 
      })

      return {
        success: true,
        data: {
          balance: response.data?.balance || 0, // Saldo disponível para saque
          pendingBalance: response.data?.pendingBalance || 0, // Saldo a receber (aguardando compensação)
          blockedBalance: response.data?.blockedBalance || 0, // Saldo bloqueado
          totalBalance: (response.data?.balance || 0) + (response.data?.pendingBalance || 0) // Total
        }
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro ao buscar saldo:', { 
        path: '/finance/balance', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      return {
        success: false,
        error: asaasError?.errors?.[0]?.description || error.message || 'Erro ao buscar saldo'
      }
    }
  }

  /**
   * Obter extrato financeiro da conta Asaas
   * Retorna transações do período especificado
   */
  async getFinancialStatement(filters?: {
    startDate?: string // YYYY-MM-DD
    endDate?: string // YYYY-MM-DD
    offset?: number
    limit?: number
  }) {
    try {
      this.validateApiKey()

      const params = new URLSearchParams()
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (filters?.offset) params.append('offset', String(filters.offset))
      if (filters?.limit) params.append('limit', String(filters.limit || 50))

      const startedAt = Date.now()
      const response = await this.withRetry(() => 
        this.api.get(`/financialTransactions?${params.toString()}`)
      )
      const duration = Date.now() - startedAt
      
      console.log('[ASAAS] Extrato obtido:', { 
        method: 'GET', 
        path: '/financialTransactions', 
        status: response.status, 
        ms: duration,
        totalCount: response.data?.totalCount || 0
      })

      return {
        success: true,
        data: {
          transactions: response.data?.data || [],
          totalCount: response.data?.totalCount || 0,
          hasMore: response.data?.hasMore || false
        }
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro ao buscar extrato:', { 
        path: '/financialTransactions', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      return {
        success: false,
        error: asaasError?.errors?.[0]?.description || error.message || 'Erro ao buscar extrato'
      }
    }
  }

  /**
   * Obter resumo de pagamentos recebidos no período
   */
  async getPaymentsSummary(filters?: {
    startDate?: string // YYYY-MM-DD
    endDate?: string // YYYY-MM-DD
    status?: 'RECEIVED' | 'CONFIRMED' | 'PENDING' | 'OVERDUE'
  }) {
    try {
      this.validateApiKey()

      const params = new URLSearchParams()
      if (filters?.startDate) params.append('dateCreated[ge]', filters.startDate)
      if (filters?.endDate) params.append('dateCreated[le]', filters.endDate)
      if (filters?.status) params.append('status', filters.status)
      params.append('limit', '100')

      const startedAt = Date.now()
      const response = await this.withRetry(() => 
        this.api.get(`/payments?${params.toString()}`)
      )
      const duration = Date.now() - startedAt

      const payments = response.data?.data || []
      
      // Calcular totais
      const totalReceived = payments
        .filter((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
        .reduce((sum: number, p: any) => sum + (p.value || 0), 0)
      
      const totalPending = payments
        .filter((p: any) => p.status === 'PENDING')
        .reduce((sum: number, p: any) => sum + (p.value || 0), 0)

      const totalOverdue = payments
        .filter((p: any) => p.status === 'OVERDUE')
        .reduce((sum: number, p: any) => sum + (p.value || 0), 0)

      console.log('[ASAAS] Resumo de pagamentos:', { 
        method: 'GET', 
        path: '/payments', 
        status: response.status, 
        ms: duration,
        totalPayments: payments.length,
        totalReceived,
        totalPending,
        totalOverdue
      })

      return {
        success: true,
        data: {
          totalReceived,
          totalPending,
          totalOverdue,
          paymentsCount: payments.length,
          payments
        }
      }
    } catch (error: any) {
      const asaasError = error.response?.data || error.message
      console.error('[ASAAS] Erro ao buscar resumo de pagamentos:', { 
        path: '/payments', 
        status: error?.response?.status, 
        respostaAsaas: asaasError 
      })
      return {
        success: false,
        error: asaasError?.errors?.[0]?.description || error.message || 'Erro ao buscar resumo'
      }
    }
  }
}

export const asaasService = new AsaasService()

