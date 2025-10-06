import { supabase } from '../config/supabase';
import { asaasService } from './asaas.service';
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
  unit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentIntentParams {
  type: 'STUDENT_PACKAGE' | 'PROF_HOURS';
  actorUserId: string;
  unitId?: string;
  amountCents: number;
  metadata?: Record<string, any>;
}

class PaymentIntentService {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    // 1. Criar registro em payment_intents
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        type: params.type,
        provider: 'ASAAS',
        provider_id: '', // Será preenchido após criação no Asaas
        amount_cents: params.amountCents,
        status: 'PENDING',
        payload_json: params.metadata || {},
        actor_user_id: params.actorUserId,
        unit_id: params.unitId
      })
      .select()
      .single();

    if (intentError) throw intentError;

    // 2. Gerar checkout no Asaas
    const user = await this.getUser(params.actorUserId);
    if (!user) throw new Error('Usuário não encontrado');

    let asaasCustomerId = user.asaas_customer_id;
    if (!asaasCustomerId) {
      const customerResult = await asaasService.createCustomer({
        name: user.name,
        email: user.email,
        cpfCnpj: '38534592808', // CPF válido para testes
        phone: user.phone
      });

      if (!customerResult.success) {
        throw new Error('Erro ao criar cliente no Asaas');
      }

      asaasCustomerId = customerResult.data.id;

      // Salvar ID do Asaas no banco
      await supabase
        .from('users')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', user.id);
    }

    // Criar pagamento no Asaas
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const paymentResult = await asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: 'PIX', // Default, pode ser parametrizado
      value: params.amountCents / 100, // Converter cents para reais
      dueDate: dueDate,
      description: this.getPaymentDescription(params.type, params.metadata),
      externalReference: `${params.type}_${intent.id}_${Date.now()}`
    });

    if (!paymentResult.success) {
      throw new Error('Erro ao criar pagamento no Asaas');
    }

    // 3. Atualizar PaymentIntent com provider_id e checkout_url
    const { data: updatedIntent, error: updateError } = await supabase
      .from('payment_intents')
      .update({
        provider_id: paymentResult.data.id,
        checkout_url: paymentResult.data.invoiceUrl,
        payload_json: {
          ...params.metadata,
          asaas_payment_id: paymentResult.data.id,
          billing_type: 'PIX'
        }
      })
      .eq('id', intent.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedIntent;
  }

  async processWebhook(providerId: string, status: string): Promise<void> {
    // 1. Buscar PaymentIntent por provider_id
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (intentError || !intent) {
      console.log(`PaymentIntent não encontrado para provider_id: ${providerId}`);
      return;
    }

    // 2. Verificar se já foi processado (idempotência)
    if (intent.status === 'PAID') {
      console.log(`PaymentIntent ${intent.id} já foi processado`);
      return;
    }

    // 3. Atualizar status
    const newStatus = status === 'CONFIRMED' || status === 'RECEIVED' ? 'PAID' :
                     status === 'FAILED' ? 'FAILED' : 'PENDING';

    await supabase
      .from('payment_intents')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', intent.id);

    // 4. Se PAID, creditar pacote ao usuário
    if (newStatus === 'PAID') {
      await this.creditPackage(intent);
    }
  }

  private async creditPackage(intent: PaymentIntent): Promise<void> {
    const metadata = intent.payload_json;

    if (intent.type === 'STUDENT_PACKAGE') {
      // Creditar aulas para aluno
      await balanceService.purchaseStudentClasses(
        intent.actor_user_id,
        intent.unit_id!,
        metadata.classes_qty,
        'ALUNO',
        {
          payment_intent_id: intent.id,
          provider_id: intent.provider_id,
          package_title: metadata.package_title
        }
      );

      console.log(`✅ Aluno ${intent.actor_user_id} recebeu ${metadata.classes_qty} aulas`);
    }

    if (intent.type === 'PROF_HOURS') {
      // Creditar horas para professor
      await balanceService.purchaseProfessorHours(
        intent.actor_user_id,
        intent.unit_id!,
        metadata.hours_qty,
        'PROFESSOR',
        {
          payment_intent_id: intent.id,
          provider_id: intent.provider_id,
          package_title: metadata.package_title
        }
      );

      console.log(`✅ Professor ${intent.actor_user_id} recebeu ${metadata.hours_qty} horas`);
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