import { supabase } from '../lib/supabase'
import { CustomError } from '../middleware/errorHandler'
import { asaasService } from './asaas.service'

export interface Invoice {
  id: string
  payment_intent_id: string
  type: 'NFE' | 'NFC_E'
  status: 'PENDING' | 'ISSUED' | 'CANCELED' | 'ERROR'
  customer_name: string
  customer_email: string
  customer_cpf_cnpj: string
  customer_phone?: string
  customer_address?: any
  nfe_number?: string
  nfe_key?: string
  nfe_url?: string
  nfe_xml?: string
  service_description: string
  service_code?: string
  amount_cents: number
  provider: string
  provider_invoice_id?: string
  provider_response?: any
  error_message?: string
  error_details?: any
  issued_at?: string
  canceled_at?: string
  created_at: string
  updated_at: string
}

export interface CreateInvoiceParams {
  paymentIntentId: string
  type?: 'NFE' | 'NFC_E'
  serviceCode?: string
}

export interface InvoiceProvider {
  issueInvoice(data: {
    customer: {
      name: string
      email: string
      cpfCnpj: string
      phone?: string
      address?: {
        street: string
        number: string
        complement?: string
        neighborhood: string
        city: string
        state: string
        zipCode: string
      }
    }
    service: {
      description: string
      code?: string
      amount: number // em centavos
    }
    metadata?: Record<string, any>
  }): Promise<{
    success: boolean
    data?: {
      nfeNumber: string
      nfeKey: string
      nfeUrl: string
      nfeXml?: string
      providerInvoiceId: string
    }
    error?: string
  }>

  cancelInvoice(providerInvoiceId: string): Promise<{
    success: boolean
    error?: string
  }>
}

class InvoiceService {
  private provider: InvoiceProvider | null = null

  constructor () {
    // Inicializar provedor baseado em variável de ambiente
    // Por padrão, usa ASAAS se já estiver configurado (já usamos para pagamentos)
    const providerName =
      process.env.INVOICE_PROVIDER ||
      (process.env.ASAAS_API_KEY ? 'ASAAS' : 'NFE_IO')
    this.provider = this.getProvider(providerName)
  }

  private getProvider (name: string): InvoiceProvider | null {
    // Provedor ASAAS (recomendado - já está configurado para pagamentos)
    if (name === 'ASAAS' || name === 'ASAS') {
      if (!process.env.ASAAS_API_KEY) {
        console.warn(
          '⚠️ ASAAS_API_KEY não configurada. Configure no .env para emitir notas fiscais.'
        )
        return null
      }
      return this.createAsaasProvider()
    }

    // Provedor NFe.io (alternativa)
    if (name === 'NFE_IO' || name === 'NFE.IO' || name === 'NFEIO') {
      if (!process.env.NFE_IO_API_KEY) {
        console.warn(
          '⚠️ NFE_IO_API_KEY não configurada. Configure no .env para emitir notas fiscais.'
        )
        return null
      }
      return this.createNFeIoProvider()
    }

    // Se não configurado, retorna null (vai gerar erro mais claro)
    return null
  }

  private createAsaasProvider (): InvoiceProvider {
    // Implementação usando ASAAS (já configurado para pagamentos)
    // O ASAAS emite NFS-e (Nota Fiscal de Serviço Eletrônica)
    return {
      issueInvoice: async data => {
        try {
          // Buscar payment intent para obter o provider_id (ID do pagamento no ASAAS)
          const paymentIntentId = data.metadata?.payment_intent_id
          if (!paymentIntentId) {
            return {
              success: false,
              error: 'ID do payment intent não fornecido nos metadados'
            }
          }

          const { data: paymentIntent } = await supabase
            .from('payment_intents')
            .select(
              `
              provider_id,
              user:users!payment_intents_actor_user_id_fkey(
                asaas_customer_id
              )
            `
            )
            .eq('id', paymentIntentId)
            .single()

          if (!paymentIntent) {
            return {
              success: false,
              error: 'Payment intent não encontrado'
            }
          }

          const asaasPaymentId = paymentIntent.provider_id
          const asaasCustomerId = (paymentIntent.user as any)?.asaas_customer_id

          if (!asaasCustomerId && !asaasPaymentId) {
            return {
              success: false,
              error:
                'Cliente ou pagamento não encontrado no ASAAS. Certifique-se de que o pagamento foi processado pelo ASAAS.'
            }
          }

          // Se tiver paymentId, emitir nota vinculada ao pagamento (recomendado)
          if (asaasPaymentId) {
            const result = await asaasService.issueInvoice({
              paymentId: asaasPaymentId,
              customer: asaasCustomerId || '',
              serviceDescription: data.service.description,
              serviceCode: data.service.code,
              amount: data.service.amount / 100 // Converter centavos para reais
            })

            if (!result.success) {
              return {
                success: false,
                error: result.error || 'Erro ao emitir nota fiscal no ASAAS'
              }
            }

            return {
              success: true,
              data: {
                nfeNumber: result.data?.invoiceNumber || '',
                nfeKey: result.data?.invoiceKey || '',
                nfeUrl: result.data?.invoiceUrl || '',
                nfeXml: result.data?.invoiceXml || undefined,
                providerInvoiceId: result.data?.invoiceId || ''
              }
            }
          }

          // Se não tiver paymentId, emitir nota avulsa
          if (!asaasCustomerId) {
            return {
              success: false,
              error:
                'ID do cliente no ASAAS não encontrado. É necessário ter um cliente cadastrado no ASAAS.'
            }
          }

          const result = await asaasService.issueInvoice({
            customer: asaasCustomerId,
            serviceDescription: data.service.description,
            serviceCode: data.service.code,
            amount: data.service.amount / 100
          })

          if (!result.success) {
            return {
              success: false,
              error: result.error || 'Erro ao emitir nota fiscal no ASAAS'
            }
          }

          return {
            success: true,
            data: {
              nfeNumber: result.data?.invoiceNumber || '',
              nfeKey: result.data?.invoiceKey || '',
              nfeUrl: result.data?.invoiceUrl || '',
              nfeXml: result.data?.invoiceXml || undefined,
              providerInvoiceId: result.data?.invoiceId || ''
            }
          }
        } catch (error: any) {
          console.error('❌ Erro ao comunicar com ASAAS:', error)
          return {
            success: false,
            error:
              error.message ||
              'Erro ao comunicar com ASAAS para emitir nota fiscal'
          }
        }
      },

      cancelInvoice: async providerInvoiceId => {
        try {
          const result = await asaasService.cancelInvoice(providerInvoiceId)

          if (!result.success) {
            return {
              success: false,
              error: result.error || 'Erro ao cancelar nota fiscal no ASAAS'
            }
          }

          return { success: true }
        } catch (error: any) {
          console.error('❌ Erro ao cancelar nota fiscal no ASAAS:', error)
          return {
            success: false,
            error: error.message || 'Erro ao comunicar com ASAAS'
          }
        }
      }
    }
  }

  private createNFeIoProvider (): InvoiceProvider {
    // Implementação básica do NFe.io
    // Para produção, usar a biblioteca oficial ou SDK
    return {
      issueInvoice: async data => {
        try {
          const apiKey = process.env.NFE_IO_API_KEY
          if (!apiKey) {
            return { success: false, error: 'NFe.io API key não configurada' }
          }

          // Montar payload para NFe.io
          const payload = {
            natureza_operacao: 'Venda',
            data_emissao: new Date().toISOString().split('T')[0],
            data_entrada_saida: new Date().toISOString().split('T')[0],
            tipo_documento: '1', // 1 = Saída
            local_destino: '1', // 1 = Operação interna
            finalidade_emissao: '1', // 1 = Normal
            consumidor_final: '1', // 1 = Sim
            presenca_comprador: '1', // 1 = Operação presencial
            cliente: {
              cpf: data.customer.cpfCnpj.replace(/\D/g, ''),
              nome_completo: data.customer.name,
              email: data.customer.email,
              telefone: data.customer.phone?.replace(/\D/g, '') || '',
              endereco: data.customer.address
                ? {
                    logradouro: data.customer.address.street,
                    numero: data.customer.address.number,
                    complemento: data.customer.address.complement || '',
                    bairro: data.customer.address.neighborhood,
                    municipio: data.customer.address.city,
                    uf: data.customer.address.state,
                    cep: data.customer.address.zipCode.replace(/\D/g, '')
                  }
                : undefined
            },
            itens: [
              {
                numero_item: '1',
                codigo_produto: data.service.code || '1401', // Código padrão para serviços
                descricao: data.service.description,
                cfop: '5102', // CFOP para venda de serviços
                unidade_comercial: 'UN',
                quantidade_comercial: '1',
                valor_unitario_comercial: (data.service.amount / 100).toFixed(
                  2
                ),
                valor_total: (data.service.amount / 100).toFixed(2)
              }
            ]
          }

          // Verificar se temos company_id configurado (opcional)
          const companyId = process.env.NFE_IO_COMPANY_ID || 'me'

          // Endpoint da API NFe.io
          const endpoint =
            companyId === 'me'
              ? 'https://api.nfe.io/v1/companies/me/invoices'
              : `https://api.nfe.io/v1/companies/${companyId}/invoices`

          console.log('📄 Emitindo nota fiscal via NFe.io...', {
            endpoint,
            customer: data.customer.name,
            amount: `R$ ${(data.service.amount / 100).toFixed(2)}`
          })

          // Chamar API do NFe.io
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify(payload)
          })

          // Tentar ler resposta como JSON
          const responseText = await response.text()
          let result: any = {}

          try {
            result = JSON.parse(responseText)
          } catch (parseError) {
            // Se não for JSON, pode ser erro HTML ou texto
            console.error(
              '❌ Resposta não-JSON do NFe.io:',
              responseText.substring(0, 500)
            )
            return {
              success: false,
              error: `Erro na API NFe.io (${response.status}): ${response.statusText}. Verifique se a API key está correta e se a empresa está configurada no NFe.io.`
            }
          }

          if (!response.ok) {
            const errorMessage =
              result.message ||
              result.error ||
              result.errors?.[0]?.message ||
              result.errors?.[0]?.description ||
              `Erro ${response.status}: ${response.statusText}`

            console.error('❌ Erro ao emitir nota fiscal:', {
              status: response.status,
              error: errorMessage,
              details: result
            })

            return {
              success: false,
              error: `NFe.io: ${errorMessage}`
            }
          }

          // Extrair dados da resposta (formato pode variar conforme versão da API)
          const nfeNumber =
            result.numero ||
            result.number ||
            result.numero_nf ||
            result.numeroNota ||
            ''
          const nfeKey =
            result.chave_acesso ||
            result.access_key ||
            result.chave ||
            result.chaveAcesso ||
            ''
          const nfeUrl =
            result.url ||
            result.link ||
            result.danfe_url ||
            result.danfeUrl ||
            ''
          const nfeXml =
            result.xml || result.xml_content || result.xmlContent || undefined
          const providerInvoiceId =
            result.id || result.invoice_id || result.invoiceId || ''

          console.log('✅ Nota fiscal emitida com sucesso:', {
            nfeNumber,
            nfeKey: nfeKey ? nfeKey.substring(0, 20) + '...' : 'N/A',
            providerInvoiceId
          })

          return {
            success: true,
            data: {
              nfeNumber,
              nfeKey,
              nfeUrl,
              nfeXml,
              providerInvoiceId
            }
          }
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Erro ao comunicar com provedor de NFe'
          }
        }
      },

      cancelInvoice: async providerInvoiceId => {
        try {
          const apiKey = process.env.NFE_IO_API_KEY
          if (!apiKey) {
            return { success: false, error: 'NFe.io API key não configurada' }
          }

          const companyId = process.env.NFE_IO_COMPANY_ID || 'me'
          const endpoint =
            companyId === 'me'
              ? `https://api.nfe.io/v1/companies/me/invoices/${providerInvoiceId}/cancel`
              : `https://api.nfe.io/v1/companies/${companyId}/invoices/${providerInvoiceId}/cancel`

          console.log('🚫 Cancelando nota fiscal via NFe.io...', {
            providerInvoiceId
          })

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              justificativa: 'Cancelamento solicitado pelo cliente'
            })
          })

          const responseText = await response.text()
          let result: any = {}

          try {
            result = JSON.parse(responseText)
          } catch {
            return {
              success: false,
              error: `Erro ao cancelar nota fiscal: ${response.status} ${response.statusText}`
            }
          }

          if (!response.ok) {
            const errorMessage =
              result.message ||
              result.error ||
              result.errors?.[0]?.message ||
              `Erro ${response.status}`
            console.error('❌ Erro ao cancelar nota fiscal:', errorMessage)
            return {
              success: false,
              error: `NFe.io: ${errorMessage}`
            }
          }

          console.log('✅ Nota fiscal cancelada com sucesso')
          return { success: true }
        } catch (error: any) {
          console.error('❌ Erro ao comunicar com NFe.io:', error)
          return {
            success: false,
            error: error.message || 'Erro ao comunicar com provedor de NFe'
          }
        }
      }
    }
  }

  /**
   * Buscar ou criar invoice para um payment intent
   */
  async getOrCreateInvoice (params: CreateInvoiceParams): Promise<Invoice> {
    // Verificar se já existe invoice para este payment intent
    const { data: existing } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_intent_id', params.paymentIntentId)
      .single()

    if (existing) {
      return existing as Invoice
    }

    // Buscar dados do payment intent
    const { data: paymentIntent, error: piError } = await supabase
      .from('payment_intents')
      .select(
        `
        *,
        user:users!payment_intents_actor_user_id_fkey (
          id,
          name,
          email,
          cpf,
          phone
        )
      `
      )
      .eq('id', params.paymentIntentId)
      .single()

    if (piError || !paymentIntent) {
      throw new CustomError('Payment intent não encontrado', 404)
    }

    if (paymentIntent.status !== 'PAID') {
      throw new CustomError(
        'Apenas pagamentos confirmados podem gerar nota fiscal',
        400
      )
    }

    const user = paymentIntent.user as any
    if (!user) {
      throw new CustomError('Usuário não encontrado', 404)
    }

    // Determinar descrição do serviço
    const serviceDescription = this.getServiceDescription(paymentIntent)

    // Criar invoice pendente
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        payment_intent_id: params.paymentIntentId,
        type: params.type || 'NFE',
        status: 'PENDING',
        customer_name: user.name,
        customer_email: user.email,
        customer_cpf_cnpj: (user.cpf || '').replace(/\D/g, '') || '00000000000',
        customer_phone: user.phone || null,
        service_description: serviceDescription,
        service_code: params.serviceCode || '1401',
        amount_cents: paymentIntent.amount_cents,
        provider: process.env.INVOICE_PROVIDER || 'NFE_IO'
      })
      .select()
      .single()

    if (invoiceError) {
      throw new CustomError('Erro ao criar invoice', 500)
    }

    return invoice as Invoice
  }

  /**
   * Emitir nota fiscal
   */
  async issueInvoice (invoiceId: string): Promise<Invoice> {
    // Buscar invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new CustomError('Invoice não encontrada', 404)
    }

    if (invoice.status === 'ISSUED') {
      throw new CustomError('Nota fiscal já foi emitida', 400)
    }

    if (invoice.status === 'CANCELED') {
      throw new CustomError(
        'Não é possível emitir uma nota fiscal cancelada',
        400
      )
    }

    // Buscar dados do payment intent e usuário
    const { data: paymentIntent, error: piError } = await supabase
      .from('payment_intents')
      .select(
        `
        *,
        user:users!payment_intents_actor_user_id_fkey (
          id,
          name,
          email,
          cpf,
          phone
        )
      `
      )
      .eq('id', invoice.payment_intent_id)
      .single()

    if (piError || !paymentIntent) {
      throw new CustomError('Payment intent não encontrado', 404)
    }

    const user = paymentIntent.user as any

    // Verificar se há provedor configurado
    if (!this.provider) {
      const providerName = process.env.INVOICE_PROVIDER || 'ASAAS'
      const hasAsaasKey = !!process.env.ASAAS_API_KEY
      const hasNfeIoKey = !!process.env.NFE_IO_API_KEY

      let errorMessage = 'Provedor de nota fiscal não configurado.'

      if (providerName === 'ASAAS' || providerName === 'ASAS') {
        if (!hasAsaasKey) {
          errorMessage =
            'ASAAS_API_KEY não configurada. Configure a variável de ambiente ASAAS_API_KEY no arquivo .env do backend.'
        } else {
          errorMessage =
            'Erro ao inicializar provedor ASAAS. Verifique se a API key está correta.'
        }
      } else if (providerName === 'NFE_IO' || providerName === 'NFE.IO') {
        if (!hasNfeIoKey) {
          errorMessage =
            'NFE_IO_API_KEY não configurada. Configure a variável de ambiente NFE_IO_API_KEY no arquivo .env do backend com sua API key do NFe.io. Obtenha a chave em: https://app.nfe.io'
        } else {
          errorMessage =
            'Erro ao inicializar provedor NFe.io. Verifique se a API key está correta.'
        }
      } else {
        errorMessage = `Provedor "${providerName}" não suportado. Configure INVOICE_PROVIDER=ASAAS (recomendado) ou INVOICE_PROVIDER=NFE_IO no .env`
      }

      throw new CustomError(errorMessage, 500)
    }

    // Emitir nota fiscal via provedor
    const result = await this.provider.issueInvoice({
      customer: {
        name: invoice.customer_name,
        email: invoice.customer_email,
        cpfCnpj: invoice.customer_cpf_cnpj,
        phone: invoice.customer_phone || undefined,
        address: invoice.customer_address || undefined
      },
      service: {
        description: invoice.service_description,
        code: invoice.service_code || undefined,
        amount: invoice.amount_cents
      },
      metadata: {
        payment_intent_id: invoice.payment_intent_id,
        invoice_id: invoice.id
      }
    })

    if (!result.success) {
      // Atualizar invoice com erro
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .update({
          status: 'ERROR',
          error_message:
            result.error || 'Erro desconhecido ao emitir nota fiscal',
          error_details: { provider_response: result },
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single()

      throw new CustomError(result.error || 'Erro ao emitir nota fiscal', 500)
    }

    // Atualizar invoice com sucesso
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'ISSUED',
        nfe_number: result.data?.nfeNumber || null,
        nfe_key: result.data?.nfeKey || null,
        nfe_url: result.data?.nfeUrl || null,
        nfe_xml: result.data?.nfeXml || null,
        provider_invoice_id: result.data?.providerInvoiceId || null,
        provider_response: result.data || {},
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      throw new CustomError('Erro ao atualizar invoice', 500)
    }

    return updatedInvoice as Invoice
  }

  /**
   * Cancelar nota fiscal
   */
  async cancelInvoice (invoiceId: string): Promise<Invoice> {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new CustomError('Invoice não encontrada', 404)
    }

    if (invoice.status !== 'ISSUED') {
      throw new CustomError(
        'Apenas notas fiscais emitidas podem ser canceladas',
        400
      )
    }

    if (!this.provider || !invoice.provider_invoice_id) {
      throw new CustomError('Provedor de nota fiscal não configurado', 500)
    }

    // Cancelar no provedor
    const result = await this.provider.cancelInvoice(
      invoice.provider_invoice_id
    )

    if (!result.success) {
      throw new CustomError(result.error || 'Erro ao cancelar nota fiscal', 500)
    }

    // Atualizar invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'CANCELED',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      throw new CustomError('Erro ao atualizar invoice', 500)
    }

    return updatedInvoice as Invoice
  }

  /**
   * Listar invoices com filtros
   */
  async listInvoices (filters: {
    paymentIntentId?: string
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ invoices: Invoice[]; total: number }> {
    let query = supabase.from('invoices').select('*', { count: 'exact' })

    if (filters.paymentIntentId) {
      query = query.eq('payment_intent_id', filters.paymentIntentId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    query = query.order('created_at', { ascending: false })

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 50) - 1
      )
    }

    const { data, error, count } = await query

    if (error) {
      throw new CustomError('Erro ao buscar invoices', 500)
    }

    return {
      invoices: (data || []) as Invoice[],
      total: count || 0
    }
  }

  /**
   * Buscar vendas pagas que ainda não têm nota fiscal
   */
  async getSalesWithoutInvoice (filters: {
    franqueadoraId?: string
    unitId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ sales: any[]; total: number }> {
    let query = supabase
      .from('payment_intents')
      .select(
        `
        *,
        user:users!payment_intents_actor_user_id_fkey (
          id,
          name,
          email,
          cpf,
          phone
        ),
        invoice:invoices!invoices_payment_intent_id_fkey (
          id,
          status,
          nfe_key
        )
      `,
        { count: 'exact' }
      )
      .eq('status', 'PAID')
      .is('invoice.id', null) // Sem invoice associada
      .order('created_at', { ascending: false })

    if (filters.franqueadoraId) {
      query = query.eq('franqueadora_id', filters.franqueadoraId)
    }

    if (filters.unitId) {
      query = query.eq('unit_id', filters.unitId)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 50) - 1
      )
    }

    const { data, error, count } = await query

    if (error) {
      throw new CustomError('Erro ao buscar vendas', 500)
    }

    return {
      sales: (data || []).map((item: any) => ({
        payment_intent: item,
        user: item.user,
        invoice: item.invoice?.[0] || null
      })),
      total: count || 0
    }
  }

  private getServiceDescription (paymentIntent: any): string {
    const metadata = paymentIntent.payload_json || {}

    if (paymentIntent.type === 'STUDENT_PACKAGE') {
      const packageTitle = metadata.package_title || 'Pacote de Aulas'
      const classesQty = metadata.classes_qty || 1
      return `${packageTitle} - ${classesQty} ${
        classesQty === 1 ? 'aula' : 'aulas'
      }`
    }

    if (paymentIntent.type === 'PROF_HOURS') {
      const packageTitle = metadata.package_title || 'Pacote de Horas'
      const hoursQty = metadata.hours_qty || 1
      return `${packageTitle} - ${hoursQty} ${
        hoursQty === 1 ? 'hora' : 'horas'
      }`
    }

    return 'Serviço de Personal Training'
  }
}

export const invoiceService = new InvoiceService()
