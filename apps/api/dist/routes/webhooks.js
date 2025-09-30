"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const asaas_service_1 = require("../services/asaas.service");
const notifications_1 = require("./notifications");
const router = express_1.default.Router();
router.post('/asaas', async (req, res) => {
    try {
        const event = req.body;
        console.log('Webhook Asaas recebido:', {
            event: event.event,
            paymentId: event.payment?.id,
            value: event.payment?.value
        });
        const webhookData = await asaas_service_1.asaasService.processWebhook(event);
        const externalRef = webhookData.externalReference;
        switch (event.event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                await handlePaymentConfirmed(webhookData, externalRef);
                break;
            case 'PAYMENT_OVERDUE':
                await handlePaymentOverdue(webhookData, externalRef);
                break;
            case 'PAYMENT_REFUNDED':
                await handlePaymentRefunded(webhookData, externalRef);
                break;
            default:
                console.log('Evento não tratado:', event.event);
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Erro ao processar webhook Asaas:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});
async function handlePaymentConfirmed(webhookData, externalRef) {
    if (!externalRef) {
        console.warn('Pagamento confirmado sem referência externa');
        return;
    }
    const { data: teacherPurchase } = await supabase_1.supabase
        .from('teacher_subscriptions')
        .select('*, teacher:teacher_id(name, email), plan:plan_id(hours_included)')
        .eq('id', externalRef)
        .single();
    if (teacherPurchase) {
        await supabase_1.supabase
            .from('teacher_subscriptions')
            .update({
            status: 'active',
            asaas_payment_id: webhookData.paymentId
        })
            .eq('id', externalRef);
        const { data: admin } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('user_id')
            .limit(1)
            .single();
        if (admin) {
            await (0, notifications_1.createNotification)(admin.user_id, 'payment_received', 'Pagamento Confirmado - Professor', `${teacherPurchase.teacher?.name} comprou pacote de ${teacherPurchase.plan?.hours_included || 0} horas. Valor: R$ ${webhookData.value}`, {
                subscription_id: externalRef,
                payment_id: webhookData.paymentId,
                amount: webhookData.value
            });
        }
        return;
    }
    const { data: studentPurchase } = await supabase_1.supabase
        .from('student_subscriptions')
        .select('*, student:student_id(name, email), plan:plan_id(credits_included)')
        .eq('id', externalRef)
        .single();
    if (studentPurchase) {
        await supabase_1.supabase
            .from('student_subscriptions')
            .update({
            status: 'active',
            asaas_payment_id: webhookData.paymentId
        })
            .eq('id', externalRef);
        const { data: user } = await supabase_1.supabase
            .from('users')
            .select('credits')
            .eq('id', studentPurchase.student_id)
            .single();
        const newCredits = (user?.credits || 0) + (studentPurchase.plan?.credits_included || 0);
        await supabase_1.supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', studentPurchase.student_id);
        await supabase_1.supabase
            .from('transactions')
            .insert({
            user_id: studentPurchase.student_id,
            type: 'PLAN_PURCHASE',
            amount: studentPurchase.plan?.credits_included || 0,
            description: `Compra de pacote - R$ ${webhookData.value}`,
            reference_id: externalRef
        });
        const { data: admin } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('user_id')
            .limit(1)
            .single();
        if (admin) {
            await (0, notifications_1.createNotification)(admin.user_id, 'payment_received', 'Pagamento Confirmado - Aluno', `${studentPurchase.student?.name} comprou pacote de ${studentPurchase.plan?.credits_included || 0} créditos. Valor: R$ ${webhookData.value}`, {
                subscription_id: externalRef,
                payment_id: webhookData.paymentId,
                amount: webhookData.value
            });
        }
    }
}
async function handlePaymentOverdue(webhookData, externalRef) {
    if (!externalRef)
        return;
    await supabase_1.supabase
        .from('teacher_subscriptions')
        .update({ status: 'overdue' })
        .eq('id', externalRef);
    await supabase_1.supabase
        .from('student_subscriptions')
        .update({ status: 'overdue' })
        .eq('id', externalRef);
}
async function handlePaymentRefunded(webhookData, externalRef) {
    if (!externalRef)
        return;
    const { data: studentSub } = await supabase_1.supabase
        .from('student_subscriptions')
        .select('*, plan:plan_id(credits_included)')
        .eq('id', externalRef)
        .single();
    if (studentSub) {
        await supabase_1.supabase.rpc('decrement_user_credits', {
            user_id: studentSub.student_id,
            credits: studentSub.plan?.credits_included || 0
        });
        await supabase_1.supabase
            .from('student_subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', externalRef);
        await supabase_1.supabase
            .from('transactions')
            .insert({
            user_id: studentSub.student_id,
            type: 'BOOKING_REFUND',
            amount: -(studentSub.plan?.credits_included || 0),
            description: 'Estorno de pagamento',
            reference_id: externalRef
        });
    }
}
exports.default = router;
//# sourceMappingURL=webhooks.js.map