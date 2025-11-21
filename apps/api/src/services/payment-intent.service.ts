import { supabase } from '../lib/supabase';
import { CustomError } from '../middleware/errorHandler';
import { getPaymentProvider } from './payments/provider';
import { balanceService } from './balance.service';

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
    const existingIntent = await this.findExistingIntent(params);
    if (existingIntent) {
      return existingIntent;
    }

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
        const message = Array.isArray(customerResult.error)
          ? (customerResult.error[0]?.description || 'Erro ao criar cliente no provedor de pagamento')
          : (customerResult.error || 'Erro ao criar cliente no provedor de pagamento');
        const isCpfError = typeof message === 'string' && message.toLowerCase().includes('cpf');
        throw new CustomError(
          message,
          isCpfError ? 400 : 502,
          true,
          isCpfError ? 'BUSINESS_RULE_VIOLATION' : 'EXTERNAL_PROVIDER_ERROR',
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

    const paymentResult = await provider.createPayment({
      customer: asaasCustomerId,
      billingType,
      value: params.amountCents / 100,
      dueDate: dueDate,
      description: this.getPaymentDescription(params.type, params.metadata),
      externalReference: `meupersonal_${params.type}_${params.actorUserId}_${Date.now()}`
    });

    if (!paymentResult.success) {
      throw new Error('Erro ao criar pagamento no Asaas');
    }

    // 2. Criar registro em payment_intents AGORA, com o provider_id
    const linkResult = await provider.generatePaymentLink(paymentResult.data.id);
    const paymentLink = linkResult.success ? linkResult.data : {
      paymentUrl: paymentResult.data.invoiceUrl,
      bankSlipUrl: paymentResult.data.bankSlipUrl,
      pixCode: paymentResult.data.payload
    };

    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        type: params.type,
        provider: 'ASAAS',
        provider_id: paymentResult.data.id, // ID do Asaas usado aqui
        amount_cents: params.amountCents,
        status: 'PENDING',
        checkout_url: paymentLink.paymentUrl,
        payload_json: {
          ...params.metadata,
          asaas_payment_id: paymentResult.data.id,
          billing_type: billingType,
          franqueadora_id: params.franqueadoraId,
          unit_id: params.unitId || null
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

  private async findExistingIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent | null> {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('actor_user_id', params.actorUserId)
      .eq('type', params.type)
      .eq('status', 'PENDING')
      .eq('payload_json->>package_id', params.metadata?.package_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getPaymentIntentsByUser(userId: string, status?: string): Promise<PaymentIntent[]> {
    let query = supabase
      .from('payment_intents')
      .select('*')
      .eq('actor_user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
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
}

export const paymentIntentService = new PaymentIntentService();

