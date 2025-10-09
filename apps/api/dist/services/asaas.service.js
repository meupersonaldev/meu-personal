"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asaasService = exports.AsaasService = void 0;
const axios_1 = __importDefault(require("axios"));
const supabase_1 = require("../config/supabase");
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
            }
        });
    }
    async createCustomer(data) {
        try {
            const response = await this.api.post('/customers', data);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar cliente Asaas:', error.response?.data || error.message);
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
            const response = await this.api.get(`/customers/${customerId}`);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao buscar cliente Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async createPayment(data) {
        try {
            const response = await this.api.post('/payments', data);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar cobrança Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async generatePaymentLink(paymentId) {
        try {
            const response = await this.api.get(`/payments/${paymentId}/identificationField`);
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
            console.error('Erro ao gerar link de pagamento:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async createSubscription(data) {
        try {
            const response = await this.api.post('/subscriptions', data);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar assinatura Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async getPayment(paymentId) {
        try {
            const response = await this.api.get(`/payments/${paymentId}`);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao buscar pagamento Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async cancelSubscription(subscriptionId) {
        try {
            const response = await this.api.delete(`/subscriptions/${subscriptionId}`);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao cancelar assinatura Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }
    async refundPayment(paymentId) {
        try {
            const response = await this.api.post(`/payments/${paymentId}/refund`);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao estornar pagamento Asaas:', error.response?.data || error.message);
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
            const response = await this.api.post('/subscriptions/plans', {
                name: data.name,
                description: data.description || data.name,
                value: data.value,
                cycle: data.cycle,
                billingType: data.billingType || 'UNDEFINED'
            });
            console.log('Plano criado no Asaas:', response.data.id);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao criar plano no Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
    async updateSubscriptionPlan(planId, data) {
        try {
            const response = await this.api.put(`/subscriptions/plans/${planId}`, data);
            console.log('Plano atualizado no Asaas:', planId);
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            console.error('Erro ao atualizar plano no Asaas:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
    async deleteSubscriptionPlan(planId) {
        try {
            await this.api.delete(`/subscriptions/plans/${planId}`);
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