"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClienteProvider = getClienteProvider;
function getClienteProvider() {
    return {
        async createCustomer(data) {
            return { success: false, error: 'CLIENTE provider: createCustomer não implementado' };
        },
        async createPayment(data) {
            return { success: false, error: 'CLIENTE provider: createPayment não implementado' };
        },
        async generatePaymentLink(paymentId) {
            return { success: false, error: 'CLIENTE provider: generatePaymentLink não implementado' };
        },
        parseWebhook(event) {
            return { providerId: null, status: null };
        },
    };
}
//# sourceMappingURL=cliente.provider.js.map