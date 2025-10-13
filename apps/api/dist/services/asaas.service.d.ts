interface AsaasCustomer {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    mobilePhone?: string;
}
interface AsaasPayment {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    dueDate: string;
    description: string;
    externalReference?: string;
}
interface AsaasSubscription {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description: string;
    externalReference?: string;
}
export declare class AsaasService {
    private api;
    constructor();
    private sleep;
    private withRetry;
    createCustomer(data: AsaasCustomer): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getOrCreateCustomer(userId: string, userData: {
        name: string;
        email: string;
        cpfCnpj?: string;
        phone?: string;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    } | {
        success: boolean;
        customerId: any;
        isNew: boolean;
    }>;
    getCustomer(customerId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    createPayment(data: AsaasPayment): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    generatePaymentLink(paymentId: string): Promise<{
        success: boolean;
        data: {
            paymentUrl: any;
            bankSlipUrl: any;
            pixCode: any;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    createSubscription(data: AsaasSubscription): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getPayment(paymentId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    cancelSubscription(subscriptionId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    refundPayment(paymentId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    processWebhook(event: any): Promise<{
        event: any;
        paymentId: any;
        status: any;
        value: any;
        customer: any;
        externalReference: any;
    }>;
    createSubscriptionPlan(data: {
        name: string;
        description?: string;
        value: number;
        cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
        billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateSubscriptionPlan(planId: string, data: {
        name?: string;
        description?: string;
        value?: number;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    deleteSubscriptionPlan(planId: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
}
export declare const asaasService: AsaasService;
export {};
//# sourceMappingURL=asaas.service.d.ts.map