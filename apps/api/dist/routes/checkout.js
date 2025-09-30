"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const asaas_service_1 = require("../services/asaas.service");
const router = express_1.default.Router();
router.post('/student', async (req, res) => {
    try {
        const { student_id, plan_id, academy_id, payment_method = 'PIX' } = req.body;
        if (!student_id || !plan_id || !academy_id) {
            return res.status(400).json({
                error: 'student_id, plan_id e academy_id são obrigatórios'
            });
        }
        const { data: student, error: studentError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', student_id)
            .single();
        if (studentError || !student) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        const { data: plan, error: planError } = await supabase_1.supabase
            .from('academy_plans')
            .select('*')
            .eq('id', plan_id)
            .eq('academy_id', academy_id)
            .single();
        if (planError || !plan) {
            return res.status(404).json({ error: 'Plano não encontrado' });
        }
        let asaasCustomerId = student.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResult = await asaas_service_1.asaasService.createCustomer({
                name: student.name,
                email: student.email,
                cpfCnpj: student.phone?.replace(/\D/g, '') || '00000000000',
                mobilePhone: student.phone
            });
            if (!customerResult.success) {
                return res.status(500).json({
                    error: 'Erro ao criar cliente no gateway de pagamento',
                    details: customerResult.error
                });
            }
            asaasCustomerId = customerResult.data.id;
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', student_id);
        }
        const { data: subscription, error: subError } = await supabase_1.supabase
            .from('student_subscriptions')
            .insert({
            student_id,
            plan_id,
            academy_id,
            status: 'pending',
            credits_remaining: 0
        })
            .select()
            .single();
        if (subError) {
            return res.status(500).json({ error: 'Erro ao criar registro de compra' });
        }
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const paymentResult = await asaas_service_1.asaasService.createPayment({
            customer: asaasCustomerId,
            billingType: payment_method,
            value: plan.price,
            dueDate: dueDate.toISOString().split('T')[0],
            description: `${plan.name} - ${plan.credits_included} créditos`,
            externalReference: subscription.id
        });
        if (!paymentResult.success) {
            await supabase_1.supabase
                .from('student_subscriptions')
                .delete()
                .eq('id', subscription.id);
            return res.status(500).json({
                error: 'Erro ao criar cobrança no gateway de pagamento',
                details: paymentResult.error
            });
        }
        await supabase_1.supabase
            .from('student_subscriptions')
            .update({ asaas_payment_id: paymentResult.data.id })
            .eq('id', subscription.id);
        res.json({
            subscription_id: subscription.id,
            payment_id: paymentResult.data.id,
            payment_url: paymentResult.data.invoiceUrl,
            bank_slip_url: paymentResult.data.bankSlipUrl,
            pix_code: paymentResult.data.pixQrCode,
            pix_copy_paste: paymentResult.data.payload,
            status: 'pending',
            due_date: paymentResult.data.dueDate,
            value: paymentResult.data.value
        });
    }
    catch (error) {
        console.error('Error creating student checkout:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/teacher', async (req, res) => {
    try {
        const { teacher_id, plan_id, payment_method = 'PIX' } = req.body;
        if (!teacher_id || !plan_id) {
            return res.status(400).json({
                error: 'teacher_id e plan_id são obrigatórios'
            });
        }
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', teacher_id)
            .single();
        if (teacherError || !teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const { data: plan, error: planError } = await supabase_1.supabase
            .from('teacher_plans')
            .select('*')
            .eq('id', plan_id)
            .single();
        if (planError || !plan) {
            return res.status(404).json({ error: 'Plano não encontrado' });
        }
        let asaasCustomerId = teacher.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResult = await asaas_service_1.asaasService.createCustomer({
                name: teacher.name,
                email: teacher.email,
                cpfCnpj: teacher.phone?.replace(/\D/g, '') || '00000000000',
                mobilePhone: teacher.phone
            });
            if (!customerResult.success) {
                return res.status(500).json({
                    error: 'Erro ao criar cliente no gateway de pagamento',
                    details: customerResult.error
                });
            }
            asaasCustomerId = customerResult.data.id;
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', teacher_id);
        }
        const { data: subscription, error: subError } = await supabase_1.supabase
            .from('teacher_subscriptions')
            .insert({
            teacher_id,
            plan_id,
            status: 'pending'
        })
            .select()
            .single();
        if (subError) {
            return res.status(500).json({ error: 'Erro ao criar registro de compra' });
        }
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const paymentResult = await asaas_service_1.asaasService.createPayment({
            customer: asaasCustomerId,
            billingType: payment_method,
            value: plan.price,
            dueDate: dueDate.toISOString().split('T')[0],
            description: `${plan.name} - ${plan.hours_included} horas`,
            externalReference: subscription.id
        });
        if (!paymentResult.success) {
            await supabase_1.supabase
                .from('teacher_subscriptions')
                .delete()
                .eq('id', subscription.id);
            return res.status(500).json({
                error: 'Erro ao criar cobrança no gateway de pagamento',
                details: paymentResult.error
            });
        }
        await supabase_1.supabase
            .from('teacher_subscriptions')
            .update({ asaas_payment_id: paymentResult.data.id })
            .eq('id', subscription.id);
        res.json({
            subscription_id: subscription.id,
            payment_id: paymentResult.data.id,
            payment_url: paymentResult.data.invoiceUrl,
            bank_slip_url: paymentResult.data.bankSlipUrl,
            pix_code: paymentResult.data.pixQrCode,
            pix_copy_paste: paymentResult.data.payload,
            status: 'pending',
            due_date: paymentResult.data.dueDate,
            value: paymentResult.data.value
        });
    }
    catch (error) {
        console.error('Error creating teacher checkout:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/status/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const paymentResult = await asaas_service_1.asaasService.getPayment(payment_id);
        if (!paymentResult.success) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }
        res.json({
            payment_id: paymentResult.data.id,
            status: paymentResult.data.status,
            value: paymentResult.data.value,
            payment_date: paymentResult.data.paymentDate,
            confirmed_date: paymentResult.data.confirmedDate
        });
    }
    catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=checkout.js.map