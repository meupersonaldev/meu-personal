import { supabase } from '../lib/supabase';
import { CustomError } from '../middleware/errorHandler';
import { getPaymentProvider } from './payments/provider';
import { balanceService } from './balance.service';
import { asaasService } from './asaas.service';
import { onCreditsPurchased } from '../lib/events';

export interface PaymentIntent {
  id: string;
  type: 'STUDENT_PACKAGE' | 'PROF_HOURS';
  provider: string;
  provider_id: string;
  amount_cents: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
  checkout_url?: string;
  payload_json: Record<string, any>;
  actor_user_id: string;
  franqueadora_id: string;
  unit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentIntentParams {
  type: 'STUDENT_PACKAGE' | 'PROF_HOURS';
  actorUserId: string;
  franqueadoraId: string;
  unitId?: string;
  amountCents: number;
  metadata?: Record<string, any>;
}

class PaymentIntentService {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    // 1. Gerar checkout no provedor de pagamentos
    const provider = getPaymentProvider();
    const user = await this.getUser(params.actorUserId);
    if (!user) throw new Error('Usuário não encontrado');

    let asaasCustomerId = user.asaas_customer_id;
    if (!asaasCustomerId) {
      if (process.env.ASAAS_ENV === 'production') {
        const cpfSanitizedPre = (user.cpf || '').replace(/\D/g, '');
        if (cpfSanitizedPre.length < 11) {
          throw new CustomError('CPF obrigatório para pagamento', 400, true, 'BUSINESS_RULE_VIOLATION');
        }
      }
      const customerResult = await provider.createCustomer({
        name: user.name,
        email: user.email,
        cpfCnpj: (user.cpf || '').replace(/\D/g, '') || '00000000000',
        phone: user.phone
      });

      if (!customerResult.success) {
        // Extrair mensagem de erro de forma mais robusta
        let message = 'Erro retornado pelo provedor Asaas ao criar cliente';
        
        if (Array.isArray(customerResult.error)) {
          message = customerResult.error[0]?.description || customerResult.error[0] || message;
        } else if (typeof customerResult.error === 'string') {
          message = customerResult.error;
        } else if (customerResult.error && typeof customerResult.error === 'object') {
          message = customerResult.error.description || customerResult.error.message || message;
        }
        
        const isCpfError = typeof message === 'string' && message.toLowerCase().includes('cpf');
        const isApiKeyError = typeof message === 'string' && (
          message.toLowerCase().includes('chave') || 
          message.toLowerCase().includes('api') ||
          message.toLowerCase().includes('asaas_api_key')
        );
        
        // Log detalhado para debug
        console.error('[ASAAS] Erro retornado pelo provedor ao criar cliente:', {
          respostaAsaas: customerResult.error,
          mensagem: message,
          asaasEnv: process.env.ASAAS_ENV,
          hasApiKey: !!process.env.ASAAS_API_KEY,
          apiKeyLength: process.env.ASAAS_API_KEY?.length || 0
        });
        
        // Garantir que a mensagem tenha o prefixo [ASAAS] se não tiver
        const finalMessage = message.startsWith('[ASAAS]') ? message : `[ASAAS] ${message}`;
        
        throw new CustomError(
          finalMessage,
          isCpfError ? 400 : (isApiKeyError ? 500 : 502),
          true,
          isCpfError ? 'BUSINESS_RULE_VIOLATION' : (isApiKeyError ? 'CONFIGURATION_ERROR' : 'EXTERNAL_PROVIDER_ERROR'),
          { provider: process.env.PAYMENT_PROVIDER || 'ASAAS', step: 'createCustomer' }
        );
      }
      asaasCustomerId = customerResult.data.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const requestedMethod = String((params.metadata as any)?.payment_method || 'PIX').toUpperCase();
    const billingType = (['PIX','BOLETO','CREDIT_CARD'] as const).includes(requestedMethod as any)
      ? (requestedMethod as 'PIX' | 'BOLETO' | 'CREDIT_CARD')
      : 'PIX';

    // Configurar split de pagamento - apenas para franquia (subconta)
    // 90% para franquia, 10% fica automaticamente na franqueadora (conta principal)
    const FRANCHISE_WALLET_ID = '03223ec1-c254-43a9-bcdd-6f54acac0609' // 90%

    const finalSplit: Array<{ walletId: string; percentualValue: number }> = [
      { walletId: FRANCHISE_WALLET_ID, percentualValue: 90.00 }
      // Os 10% restantes ficam automaticamente na conta principal (franqueadora)
    ]

    console.log('[PAYMENT INTENT] ✅ Split configurado (apenas franquia):', {
      franchiseWalletId: FRANCHISE_WALLET_ID,
      franchisorPercent: '10% (automático - conta principal)',
      type: params.type,
      franqueadoraId: params.franqueadoraId,
      unitId: params.unitId
    })


    console.log('[PAYMENT INTENT] 🚀 CHAMANDO provider.createPayment COM SPLIT:', {
      hasSplit: !!finalSplit,
      splitLength: finalSplit.length,
      split: finalSplit,
      customer: asaasCustomerId,
      value: params.amountCents / 100
    })

    const paymentResult = await provider.createPayment({
      customer: asaasCustomerId,
      billingType,
      value: params.amountCents / 100,
      dueDate: dueDate,
      description: this.getPaymentDescription(params.type, params.metadata),
      externalReference: `meupersonal_${params.type}_${params.actorUserId}_${Date.now()}`,
      split: finalSplit
    });

    if (!paymentResult.success) {
      throw new Error('Erro ao criar pagamento no Asaas');
    }

    const asaasPaymentId = paymentResult.data.id;
    
    // 2. Buscar links de pagamento - tentar múltiplas fontes
    // Primeiro, verificar se já vem na resposta da criação
    let paymentUrl = paymentResult.data.invoiceUrl || paymentResult.data.paymentUrl || null;
    let bankSlipUrl = paymentResult.data.bankSlipUrl || null;
    let pixCopyPaste = paymentResult.data.payload || null;
    let pixQrCode = (paymentResult.data as any)?.encodedImage || null;

    // Se não tiver link na resposta, tentar buscar via generatePaymentLink
    if (!paymentUrl && !bankSlipUrl) {
      console.log('[PAYMENT INTENT] 🔍 Link não veio na criação, buscando via generatePaymentLink...');
      const linkResult = await provider.generatePaymentLink(asaasPaymentId);
      
      if (linkResult.success && linkResult.data) {
        paymentUrl = linkResult.data.paymentUrl || paymentUrl;
        bankSlipUrl = linkResult.data.bankSlipUrl || bankSlipUrl;
        pixCopyPaste = linkResult.data.pixCode || pixCopyPaste;
      } else {
        console.warn('[PAYMENT INTENT] ⚠️ generatePaymentLink falhou, tentando buscar pagamento completo...');
        
        // Última tentativa: buscar o pagamento completo do Asaas
        const paymentDetails = await asaasService.getPayment(asaasPaymentId);
        if (paymentDetails.success && paymentDetails.data) {
          paymentUrl = paymentDetails.data.invoiceUrl || paymentDetails.data.paymentUrl || paymentUrl;
          bankSlipUrl = paymentDetails.data.bankSlipUrl || bankSlipUrl;
          pixCopyPaste = paymentDetails.data.payload || pixCopyPaste;
        }
      }
    }

    // Se ainda não tiver link, construir URL manualmente usando o ID do Asaas
    // O Asaas sempre tem uma URL de checkout no formato: https://www.asaas.com/c/{paymentId}
    const checkoutUrl = paymentUrl || bankSlipUrl || (asaasPaymentId ? `https://www.asaas.com/c/${asaasPaymentId}` : null);
    
    if (!checkoutUrl) {
      console.error('[PAYMENT INTENT] ❌ Não foi possível obter link de pagamento para:', asaasPaymentId);
      throw new Error('Não foi possível gerar link de pagamento. Tente novamente.');
    }

    console.log('[PAYMENT INTENT] ✅ Link de pagamento obtido:', {
      hasPaymentUrl: !!paymentUrl,
      hasBankSlipUrl: !!bankSlipUrl,
      checkoutUrl: checkoutUrl?.substring(0, 50) + '...'
    });

    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        type: params.type,
        provider: 'ASAAS',
        provider_id: paymentResult.data.id, // ID do Asaas usado aqui
        amount_cents: params.amountCents,
        status: 'PENDING',
        checkout_url: checkoutUrl,
        payload_json: {
          ...params.metadata,
          payment_method: billingType,
          asaas_payment_id: paymentResult.data.id,
          billing_type: billingType,
          franqueadora_id: params.franqueadoraId,
          unit_id: params.unitId || null,
          payment_url: paymentUrl,
          invoice_url: paymentResult.data.invoiceUrl || null,
          bank_slip_url: bankSlipUrl,
          pix_copy_paste: pixCopyPaste,
          pix_qr_code: pixQrCode
        },
        actor_user_id: params.actorUserId,
        franqueadora_id: params.franqueadoraId,
        unit_id: params.unitId
      })
      .select()
      .single();

    if (intentError) throw intentError;

    return intent;
  }

  async processWebhook(providerId: string, status: string): Promise<void> {
    try {
      // 1. Buscar PaymentIntent por provider_id
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (intentError || !intent) {
        console.log(`⚠️ PaymentIntent não encontrado para provider_id: ${providerId}`);
        return;
      }

      // 2. Verificar se já foi processado (idempotência)
      if (intent.status === 'PAID') {
        console.log(`ℹ️ PaymentIntent ${intent.id} já foi processado anteriormente`);
        return;
      }

      // 3. Atualizar status
      const newStatus = status === 'CONFIRMED' || status === 'RECEIVED' ? 'PAID' :
                       status === 'FAILED' ? 'FAILED' : 
                       status === 'CANCELED' ? 'CANCELED' : 'PENDING';

      const { error: updateError } = await supabase
        .from('payment_intents')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', intent.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar status do PaymentIntent:', updateError);
        throw updateError;
      }

      console.log(`✅ PaymentIntent ${intent.id} atualizado para status: ${newStatus}`);

      // 4. Se PAID, creditar pacote ao usuário
      if (newStatus === 'PAID') {
        await this.creditPackage(intent);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', {
        providerId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  private async creditPackage(intent: PaymentIntent): Promise<void> {
    const metadata = intent.payload_json;

    try {
      if (intent.type === 'STUDENT_PACKAGE') {
        console.log(`💳 Creditando aulas para aluno ${intent.actor_user_id}...`);
        
        // Creditar aulas para aluno
        const result = await balanceService.purchaseStudentClasses(
          intent.actor_user_id,
          intent.franqueadora_id,
          metadata.classes_qty,
          {
            unitId: intent.unit_id || null,
            source: 'ALUNO',
            metaJson: {
              payment_intent_id: intent.id,
              provider_id: intent.provider_id,
              package_title: metadata.package_title,
              amount_cents: intent.amount_cents
            }
          }
        );

        // Calculate new available balance and send notification (Requirement 3.3)
        const newAvailableBalance = result.balance.total_purchased - result.balance.total_consumed - result.balance.locked_qty;
        onCreditsPurchased(intent.actor_user_id, metadata.classes_qty, newAvailableBalance).catch(err => {
          console.error('[creditPackage] Error sending credit purchase notification:', err);
        });

        console.log(`✅ Aluno ${intent.actor_user_id} recebeu ${metadata.classes_qty} aulas`, {
          balance: result.balance,
          transaction_id: result.transaction.id
        });
      }

      if (intent.type === 'PROF_HOURS') {
        console.log(`💳 Creditando horas para professor ${intent.actor_user_id}...`);
        
        // Creditar horas para professor
        const result = await balanceService.purchaseProfessorHours(
          intent.actor_user_id,
          intent.franqueadora_id,
          metadata.hours_qty,
          {
            unitId: intent.unit_id || null,
            source: 'PROFESSOR',
            metaJson: {
              payment_intent_id: intent.id,
              provider_id: intent.provider_id,
              package_title: metadata.package_title,
              amount_cents: intent.amount_cents
            }
          }
        );

        console.log(`✅ Professor ${intent.actor_user_id} recebeu ${metadata.hours_qty} horas`, {
          balance: result.balance,
          transaction_id: result.transaction.id
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao creditar pacote:', {
        intent_id: intent.id,
        type: intent.type,
        user_id: intent.actor_user_id,
        error: error.message
      });
      throw error;
    }
  }

  private async getUser(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private getPaymentDescription(type: string, metadata: any): string {
    if (type === 'STUDENT_PACKAGE') {
      return `${metadata.package_title} - ${metadata.classes_qty} aulas`;
    }
    if (type === 'PROF_HOURS') {
      return `${metadata.package_title} - ${metadata.hours_qty} horas`;
    }
    return 'Pagamento Meu Personal';
  }

  async getPaymentIntentsByUser(userId: string, status?: string, limit?: number, offset?: number): Promise<{ data: PaymentIntent[]; total: number }> {
    let query = supabase
      .from('payment_intents')
      .select('*', { count: 'exact' })
      .eq('actor_user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  async getPaymentIntentsByUnit(unitId: string, status?: string): Promise<PaymentIntent[]> {
    let query = supabase
      .from('payment_intents')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async cancelPaymentIntent(intentId: string, userId: string): Promise<void> {
    // 1. Buscar PaymentIntent
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();

    if (intentError || !intent) {
      throw new Error('Payment intent não encontrado');
    }

    // 2. Verificar se o usuário tem permissão
    if (intent.actor_user_id !== userId) {
      throw new Error('Acesso não autorizado');
    }

    // 3. Verificar se pode ser cancelado (só pendentes)
    if (intent.status !== 'PENDING') {
      throw new Error('Apenas pagamentos pendentes podem ser cancelados');
    }

    // 4. Se tiver provider_id, cancelar no Asaas
    if (intent.provider_id && intent.provider === 'ASAAS') {
      const cancelResult = await asaasService.cancelPayment(intent.provider_id);
      
      if (!cancelResult.success) {
        console.warn('⚠️ Erro ao cancelar no Asaas, mas continuando com cancelamento local:', cancelResult.error);
        // Continua mesmo se falhar no Asaas (pode já estar cancelado)
      }
    }

    // 5. Atualizar status no banco
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'CANCELED',
        updated_at: new Date().toISOString()
      })
      .eq('id', intentId);

    if (updateError) {
      throw new Error('Erro ao atualizar status do payment intent');
    }

    console.log(`✅ PaymentIntent ${intentId} cancelado com sucesso`);
  }
}

export const paymentIntentService = new PaymentIntentService();

