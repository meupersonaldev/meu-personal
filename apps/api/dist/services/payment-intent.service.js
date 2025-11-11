"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIntentService = void 0;
const supabase_1 = require("../lib/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const provider_1 = require("./payments/provider");
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
            franqueadora_id: params.franqueadoraId,
            unit_id: params.unitId
        })
            .select()
            .single();
        if (intentError)
            throw intentError;
        const provider = (0, provider_1.getPaymentProvider)();
        const user = await this.getUser(params.actorUserId);
        if (!user)
            throw new Error('Usuário não encontrado');
        let asaasCustomerId = user.asaas_customer_id;
        if (!asaasCustomerId) {
            if (process.env.ASAAS_ENV === 'production') {
                const cpfSanitizedPre = (user.cpf || '').replace(/\D/g, '');
                if (cpfSanitizedPre.length < 11) {
                    throw new errorHandler_1.CustomError('CPF obrigatório para pagamento', 400, true, 'BUSINESS_RULE_VIOLATION');
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
                throw new errorHandler_1.CustomError(message, isCpfError ? 400 : 502, true, isCpfError ? 'BUSINESS_RULE_VIOLATION' : 'EXTERNAL_PROVIDER_ERROR', { provider: process.env.PAYMENT_PROVIDER || 'ASAAS', step: 'createCustomer' });
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
        const requestedMethod = String(params.metadata?.payment_method || 'PIX').toUpperCase();
        const billingType = ['PIX', 'BOLETO', 'CREDIT_CARD'].includes(requestedMethod)
            ? requestedMethod
            : 'PIX';
        const paymentResult = await provider.createPayment({
            customer: asaasCustomerId,
            billingType,
            value: params.amountCents / 100,
            dueDate: dueDate,
            description: this.getPaymentDescription(params.type, params.metadata),
            externalReference: `${params.type}_${intent.id}_${Date.now()}`
        });
        if (!paymentResult.success) {
            throw new Error('Erro ao criar pagamento no Asaas');
        }
        const linkResult = await provider.generatePaymentLink(paymentResult.data.id);
        const paymentLink = linkResult.success ? linkResult.data : {
            paymentUrl: paymentResult.data.invoiceUrl,
            bankSlipUrl: paymentResult.data.bankSlipUrl,
            pixCode: paymentResult.data.payload
        };
        const { data: updatedIntent, error: updateError } = await supabase_1.supabase
            .from('payment_intents')
            .update({
            provider_id: paymentResult.data.id,
            checkout_url: paymentLink.paymentUrl,
            payload_json: {
                ...params.metadata,
                asaas_payment_id: paymentResult.data.id,
                billing_type: billingType,
                franqueadora_id: params.franqueadoraId,
                unit_id: params.unitId || null
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
            await balance_service_1.balanceService.purchaseStudentClasses(intent.actor_user_id, intent.franqueadora_id, metadata.classes_qty, {
                unitId: intent.unit_id || null,
                source: 'ALUNO',
                metaJson: {
                    payment_intent_id: intent.id,
                    provider_id: intent.provider_id,
                    package_title: metadata.package_title
                }
            });
            console.log(`✅ Aluno ${intent.actor_user_id} recebeu ${metadata.classes_qty} aulas`);
        }
        if (intent.type === 'PROF_HOURS') {
            await balance_service_1.balanceService.purchaseProfessorHours(intent.actor_user_id, intent.franqueadora_id, metadata.hours_qty, {
                unitId: intent.unit_id || null,
                source: 'PROFESSOR',
                metaJson: {
                    payment_intent_id: intent.id,
                    provider_id: intent.provider_id,
                    package_title: metadata.package_title
                }
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