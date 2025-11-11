"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentProvider = getPaymentProvider;
const asaas_service_1 = require("../asaas.service");
const cliente_provider_1 = require("./cliente.provider");
function getAsaasProvider() {
    return {
        createCustomer: (data) => asaas_service_1.asaasService.createCustomer(data),
        createPayment: (data) => asaas_service_1.asaasService.createPayment({
            customer: data.customer,
            billingType: data.billingType,
            value: data.value,
            dueDate: data.dueDate,
            description: data.description,
            externalReference: data.externalReference
        }),
        generatePaymentLink: (paymentId) => asaas_service_1.asaasService.generatePaymentLink(paymentId),
        parseWebhook: (event) => {
            const ev = String(event?.event || '');
            const providerId = event?.payment?.id || null;
            let status = null;
            if (ev === 'PAYMENT_CONFIRMED')
                status = 'CONFIRMED';
            else if (ev === 'PAYMENT_RECEIVED')
                status = 'RECEIVED';
            else if (ev === 'PAYMENT_OVERDUE')
                status = 'OVERDUE';
            else if (ev === 'PAYMENT_DELETED' || ev === 'PAYMENT_REFUNDED')
                status = 'CANCELED';
            return { providerId, status };
        }
    };
}
function getPaymentProvider() {
    const provider = (process.env.PAYMENT_PROVIDER || 'ASAAS').toUpperCase();
    switch (provider) {
        case 'CLIENTE':
            return (0, cliente_provider_1.getClienteProvider)();
        case 'ASAAS':
        default:
            return getAsaasProvider();
    }
}
//# sourceMappingURL=provider.js.map