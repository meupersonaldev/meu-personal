export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';
export interface PaymentProvider {
    createCustomer(data: {
        name: string;
        email: string;
        cpfCnpj: string;
        phone?: string | null;
    }): Promise<{
        success: boolean;
        data?: any;
        error?: any;
    }>;
    createPayment(data: {
        customer: string;
        billingType: BillingType;
        value: number;
        dueDate: string;
        description: string;
        externalReference?: string;
    }): Promise<{
        success: boolean;
        data?: any;
        error?: any;
    }>;
    generatePaymentLink(paymentId: string): Promise<{
        success: boolean;
        data?: {
            paymentUrl?: string;
            bankSlipUrl?: string;
            pixCode?: string;
        };
        error?: any;
    }>;
    parseWebhook?(event: any): {
        providerId: string | null;
        status: string | null;
    };
}
export declare function getPaymentProvider(): PaymentProvider;
//# sourceMappingURL=provider.d.ts.map