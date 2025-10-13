"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasService = exports.AsaasService = void 0;
const axios_1 = __importDefault(require("axios"));
const supabase_1 = require("../lib/supabase");
const ASAAS_API_URL = process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
class AsaasService {
    constructor() {
        this.api = axios_1.default.create({
            baseURL: ASAAS_API_URL,
            headers: {
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async withRetry(fn, retries = 2, backoffMs = 300) {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                const status = error?.response?.status;
                const isRetryable = !status || (status >= 500 && status < 600);
                if (attempt < retries && isRetryable) {
                    await this.sleep(backoffMs * Math.pow(2, attempt));
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    }
    async createCustomer(data) {
        try {
            const cpfSanitized = (data.cpfCnpj || '').replace(/\D/g, '');
            if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
                return {
                    success: false,
                    error: 'CPF obrigatório para pagamento'
                };
            }
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.post('/customers', {
                ...data,
                cpfCnpj: cpfSanitized || data.cpfCnpj
            }));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'POST', path: '/customers', status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar cliente Asaas:', { path: '/customers', status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async getOrCreateCustomer(userId, userData) {
        try {
            const { data: user } = await supabase_1.supabase
                .from('users')
                .select('asaas_customer_id')
                .eq('id', userId)
                .single();
            if (user?.asaas_customer_id) {
                return {
                    success: true,
                    customerId: user.asaas_customer_id,
                    isNew: false
                };
            }
            const customerData = {
                name: userData.name,
                email: userData.email,
                cpfCnpj: userData.cpfCnpj || '00000000000',
                phone: userData.phone,
                mobilePhone: userData.phone
            };
            const result = await this.createCustomer(customerData);
            if (!result.success) {
                return result;
            }
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: result.data.id })
                .eq('id', userId);
            return {
                success: true,
                customerId: result.data.id,
                isNew: true
            };
        }
        catch (error) {
            console.error('Erro ao obter/criar cliente Asaas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async getCustomer(customerId) {
        try {
            const path = `/customers/${customerId}`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.get(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'GET', path, status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao buscar cliente Asaas:', { path: `/customers/${customerId}`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async createPayment(data) {
        try {
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.post('/payments', data));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'POST', path: '/payments', status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar cobrança Asaas:', { path: '/payments', status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async generatePaymentLink(paymentId) {
        try {
            const path = `/payments/${paymentId}/identificationField`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.get(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'GET', path, status: response.status, ms: duration });
            return {
                success: true,
                data: {
                    paymentUrl: response.data.invoiceUrl,
                    bankSlipUrl: response.data.bankSlipUrl,
                    pixCode: response.data.payload
                }
            };
        }
        catch (error) {
            console.error('Erro ao gerar link de pagamento:', { path: `/payments/${paymentId}/identificationField`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async createSubscription(data) {
        try {
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.post('/subscriptions', data));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'POST', path: '/subscriptions', status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar assinatura Asaas:', { path: '/subscriptions', status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async getPayment(paymentId) {
        try {
            const path = `/payments/${paymentId}`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.get(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'GET', path, status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao buscar pagamento Asaas:', { path: `/payments/${paymentId}`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async cancelSubscription(subscriptionId) {
        try {
            const path = `/subscriptions/${subscriptionId}`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.delete(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'DELETE', path, status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao cancelar assinatura Asaas:', { path: `/subscriptions/${subscriptionId}`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async refundPayment(paymentId) {
        try {
            const path = `/payments/${paymentId}/refund`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.post(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'POST', path, status: response.status, ms: duration });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao estornar pagamento Asaas:', { path: `/payments/${paymentId}/refund`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async processWebhook(event) {
        console.log('Webhook Asaas recebido:', event.event, event.payment?.id);
        return {
            event: event.event,
            paymentId: event.payment?.id,
            status: event.payment?.status,
            value: event.payment?.value,
            customer: event.payment?.customer,
            externalReference: event.payment?.externalReference
        };
    }
    async createSubscriptionPlan(data) {
        try {
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.post('/subscriptions/plans', {
                name: data.name,
                description: data.description || data.name,
                value: data.value,
                cycle: data.cycle,
                billingType: data.billingType || 'UNDEFINED'
            }));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'POST', path: '/subscriptions/plans', status: response.status, ms: duration });
            console.log('Plano criado no Asaas:', response.data.id);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar plano no Asaas:', { path: '/subscriptions/plans', status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
    async updateSubscriptionPlan(planId, data) {
        try {
            const path = `/subscriptions/plans/${planId}`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.put(path, data));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'PUT', path, status: response.status, ms: duration });
            console.log('Plano atualizado no Asaas:', planId);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao atualizar plano no Asaas:', { path: `/subscriptions/plans/${planId}`, status: error?.response?.status, error: error.response?.data || error.message });
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
    async deleteSubscriptionPlan(planId) {
        try {
            const path = `/subscriptions/plans/${planId}`;
            const startedAt = Date.now();
            const response = await this.withRetry(() => this.api.delete(path));
            const duration = Date.now() - startedAt;
            console.log('asaas_request', { method: 'DELETE', path, status: response.status, ms: duration });
            console.log('Plano deletado no Asaas:', planId);
            return {
                success: true
            };
        }
        catch (error) {
            console.error('Erro ao deletar plano no Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}
exports.AsaasService = AsaasService;
exports.asaasService = new AsaasService();
//# sourceMappingURL=asaas.service.js.map