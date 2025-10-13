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
declare class PaymentIntentService {
    createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;
    processWebhook(providerId: string, status: string): Promise<void>;
    private creditPackage;
    private getUser;
    private getPaymentDescription;
    getPaymentIntentsByUser(userId: string, status?: string): Promise<PaymentIntent[]>;
    getPaymentIntentsByUnit(unitId: string, status?: string): Promise<PaymentIntent[]>;
}
export declare const paymentIntentService: PaymentIntentService;
export {};
//# sourceMappingURL=payment-intent.service.d.ts.map