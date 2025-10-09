"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIntentService = void 0;
const supabase_1 = require("../config/supabase");
const asaas_service_1 = require("./asaas.service");
const balance_service_1 = require("./balance.service");
class PaymentIntentService {
    async createPaymentIntent(params) {
        const { data: intent, error: intentError } = await supabase_1.supabase
            .from('payment_intents')
            .insert({
            type: params.type,
            provider: 'ASAAS',
            provider_id: '',
            amount_cents: params.amountCents,
            status: 'PENDING',
            payload_json: params.metadata || {},
            actor_user_id: params.actorUserId,
            unit_id: params.unitId
        })
            .select()
            .single();
        if (intentError)
            throw intentError;
        const user = await this.getUser(params.actorUserId);
        if (!user)
            throw new Error('Usuário não encontrado');
        let asaasCustomerId = user.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResult = await asaas_service_1.asaasService.createCustomer({
                name: user.name,
                email: user.email,
                cpfCnpj: '38534592808',
                phone: user.phone
            });
            if (!customerResult.success) {
                throw new Error('Erro ao criar cliente no Asaas');
            }
            asaasCustomerId = customerResult.data.id;
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', user.id);
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];
        const paymentResult = await asaas_service_1.asaasService.createPayment({
            customer: asaasCustomerId,
            billingType: 'PIX',
            value: params.amountCents / 100,
            dueDate: dueDate,
            description: this.getPaymentDescription(params.type, params.metadata),
            externalReference: `${params.type}_${intent.id}_${Date.now()}`
        });
        if (!paymentResult.success) {
            throw new Error('Erro ao criar pagamento no Asaas');
        }
        const { data: updatedIntent, error: updateError } = await supabase_1.supabase
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
        if (updateError)
            throw updateError;
        return updatedIntent;
    }
    async processWebhook(providerId, status) {
        const { data: intent, error: intentError } = await supabase_1.supabase
            .from('payment_intents')
            .select('*')
            .eq('provider_id', providerId)
            .single();
        if (intentError || !intent) {
            console.log(`PaymentIntent não encontrado para provider_id: ${providerId}`);
            return;
        }
        if (intent.status === 'PAID') {
            console.log(`PaymentIntent ${intent.id} já foi processado`);
            return;
        }
        const newStatus = status === 'CONFIRMED' || status === 'RECEIVED' ? 'PAID' :
            status === 'FAILED' ? 'FAILED' : 'PENDING';
        await supabase_1.supabase
            .from('payment_intents')
            .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
            .eq('id', intent.id);
        if (newStatus === 'PAID') {
            await this.creditPackage(intent);
        }
    }
    async creditPackage(intent) {
        const metadata = intent.payload_json;
        if (intent.type === 'STUDENT_PACKAGE') {
            await balance_service_1.balanceService.purchaseStudentClasses(intent.actor_user_id, intent.unit_id, metadata.classes_qty, 'ALUNO', {
                payment_intent_id: intent.id,
                provider_id: intent.provider_id,
                package_title: metadata.package_title
            });
            console.log(`✅ Aluno ${intent.actor_user_id} recebeu ${metadata.classes_qty} aulas`);
        }
        if (intent.type === 'PROF_HOURS') {
            await balance_service_1.balanceService.purchaseProfessorHours(intent.actor_user_id, intent.unit_id, metadata.hours_qty, 'PROFESSOR', {
                payment_intent_id: intent.id,
                provider_id: intent.provider_id,
                package_title: metadata.package_title
            });
            console.log(`✅ Professor ${intent.actor_user_id} recebeu ${metadata.hours_qty} horas`);
        }
    }
    async getUser(userId) {
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error)
            throw error;
        return data;
    }
    getPaymentDescription(type, metadata) {
        if (type === 'STUDENT_PACKAGE') {
            return `${metadata.package_title} - ${metadata.classes_qty} aulas`;
        }
        if (type === 'PROF_HOURS') {
            return `${metadata.package_title} - ${metadata.hours_qty} horas`;
        }
        return 'Pagamento Meu Personal';
    }
    async getPaymentIntentsByUser(userId, status) {
        let query = supabase_1.supabase
            .from('payment_intents')
            .select('*')
            .eq('actor_user_id', userId)
            .order('created_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data;
    }
    async getPaymentIntentsByUnit(unitId, status) {
        let query = supabase_1.supabase
            .from('payment_intents')
            .select('*')
            .eq('unit_id', unitId)
            .order('created_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data;
    }
}
exports.paymentIntentService = new PaymentIntentService();
//# sourceMappingURL=payment-intent.service.js.map