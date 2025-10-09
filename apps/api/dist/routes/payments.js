"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const asaas_service_1 = require("../services/asaas.service");
const router = express_1.default.Router();
const studentPackagePurchaseSchema = zod_1.z.object({
    student_id: zod_1.z.string().uuid(),
    package_id: zod_1.z.string().uuid(),
    teacher_id: zod_1.z.string().uuid(),
    payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
});
const teacherHoursPurchaseSchema = zod_1.z.object({
    teacher_id: zod_1.z.string().uuid(),
    hours_package_id: zod_1.z.string().uuid(),
    payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'])
});
router.post('/student/purchase-package', async (req, res) => {
    try {
        const data = studentPackagePurchaseSchema.parse(req.body);
        const { data: student, error: studentError } = await supabase_1.supabase
            .from('users')
            .select('*, academy_students(academy_id)')
            .eq('id', data.student_id)
            .single();
        if (studentError || !student) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        const { data: package_, error: packageError } = await supabase_1.supabase
            .from('student_plans')
            .select('*')
            .eq('id', data.package_id)
            .single();
        if (packageError || !package_) {
            return res.status(404).json({ error: 'Pacote não encontrado' });
        }
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', data.teacher_id)
            .eq('role', 'TEACHER')
            .single();
        if (teacherError || !teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        let asaasCustomerId = student.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResult = await asaas_service_1.asaasService.createCustomer({
                name: student.name,
                email: student.email,
                cpfCnpj: student.cpf || '00000000000',
                phone: student.phone
            });
            if (!customerResult.success) {
                return res.status(500).json({ error: 'Erro ao criar cliente no Asaas' });
            }
            asaasCustomerId = customerResult.data.id;
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', student.id);
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];
        const paymentResult = await asaas_service_1.asaasService.createPayment({
            customer: asaasCustomerId,
            billingType: data.payment_method,
            value: package_.price,
            dueDate: dueDate,
            description: `${package_.name} - ${package_.credits_included} créditos`,
            externalReference: `STUDENT_PACKAGE_${data.student_id}_${data.package_id}_${Date.now()}`
        });
        if (!paymentResult.success) {
            return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' });
        }
        const { data: transaction, error: transactionError } = await supabase_1.supabase
            .from('transactions')
            .insert({
            user_id: student.id,
            type: 'CREDIT_PURCHASE',
            amount: package_.price,
            description: `Compra de pacote: ${package_.name}`,
            reference_id: paymentResult.data.id,
            metadata: {
                package_id: package_.id,
                teacher_id: teacher.id,
                credits_to_add: package_.credits_included,
                hours_to_gift_teacher: 1,
                asaas_payment_id: paymentResult.data.id,
                payment_method: data.payment_method
            }
        })
            .select()
            .single();
        if (transactionError) {
            console.error('Erro ao salvar transação:', transactionError);
            return res.status(500).json({ error: 'Erro ao salvar transação' });
        }
        res.status(201).json({
            message: 'Pagamento criado com sucesso',
            transaction_id: transaction.id,
            payment: {
                id: paymentResult.data.id,
                status: paymentResult.data.status,
                value: paymentResult.data.value,
                due_date: paymentResult.data.dueDate,
                invoice_url: paymentResult.data.invoiceUrl,
                bank_slip_url: paymentResult.data.bankSlipUrl,
                pix_qr_code: paymentResult.data.encodedImage,
                pix_copy_paste: paymentResult.data.payload
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        console.error('Erro ao processar compra:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/teacher/purchase-hours', async (req, res) => {
    try {
        const data = teacherHoursPurchaseSchema.parse(req.body);
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', data.teacher_id)
            .eq('role', 'TEACHER')
            .single();
        if (teacherError || !teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const { data: hoursPackage, error: packageError } = await supabase_1.supabase
            .from('teacher_plans')
            .select('*')
            .eq('id', data.hours_package_id)
            .single();
        if (packageError || !hoursPackage) {
            return res.status(404).json({ error: 'Pacote de horas não encontrado' });
        }
        let asaasCustomerId = teacher.asaas_customer_id;
        if (!asaasCustomerId) {
            const customerResult = await asaas_service_1.asaasService.createCustomer({
                name: teacher.name,
                email: teacher.email,
                cpfCnpj: teacher.cpf || '00000000000',
                phone: teacher.phone
            });
            if (!customerResult.success) {
                return res.status(500).json({ error: 'Erro ao criar cliente no Asaas' });
            }
            asaasCustomerId = customerResult.data.id;
            await supabase_1.supabase
                .from('users')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', teacher.id);
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];
        const paymentResult = await asaas_service_1.asaasService.createPayment({
            customer: asaasCustomerId,
            billingType: data.payment_method,
            value: hoursPackage.price,
            dueDate: dueDate,
            description: `${hoursPackage.name} - Banco de Horas`,
            externalReference: `TEACHER_HOURS_${data.teacher_id}_${data.hours_package_id}_${Date.now()}`
        });
        if (!paymentResult.success) {
            return res.status(500).json({ error: 'Erro ao criar cobrança no Asaas' });
        }
        const { data: transaction, error: transactionError } = await supabase_1.supabase
            .from('transactions')
            .insert({
            user_id: teacher.id,
            type: 'CREDIT_PURCHASE',
            amount: hoursPackage.price,
            description: `Compra de horas: ${hoursPackage.name}`,
            reference_id: paymentResult.data.id,
            metadata: {
                package_id: hoursPackage.id,
                hours_to_add: hoursPackage.hours_included || 10,
                asaas_payment_id: paymentResult.data.id,
                payment_method: data.payment_method
            }
        })
            .select()
            .single();
        if (transactionError) {
            console.error('Erro ao salvar transação:', transactionError);
            return res.status(500).json({ error: 'Erro ao salvar transação' });
        }
        res.status(201).json({
            message: 'Pagamento criado com sucesso',
            transaction_id: transaction.id,
            payment: {
                id: paymentResult.data.id,
                status: paymentResult.data.status,
                value: paymentResult.data.value,
                due_date: paymentResult.data.dueDate,
                invoice_url: paymentResult.data.invoiceUrl,
                bank_slip_url: paymentResult.data.bankSlipUrl,
                pix_qr_code: paymentResult.data.encodedImage,
                pix_copy_paste: paymentResult.data.payload
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        console.error('Erro ao processar compra:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/webhook/asaas', async (req, res) => {
    try {
        const event = req.body;
        console.log('Webhook Asaas recebido:', event.event, event.payment?.id);
        if (event.event === 'PAYMENT_RECEIVED' || event.event === 'PAYMENT_CONFIRMED') {
            const paymentId = event.payment.id;
            const externalReference = event.payment.externalReference;
            const { data: transaction, error: transactionError } = await supabase_1.supabase
                .from('transactions')
                .select('*')
                .eq('reference_id', paymentId)
                .single();
            if (transactionError || !transaction) {
                console.error('Transação não encontrada:', paymentId);
                return res.sendStatus(200);
            }
            if (transaction.status === 'COMPLETED') {
                console.log('Transação já processada:', transaction.id);
                return res.sendStatus(200);
            }
            const metadata = transaction.metadata;
            if (externalReference?.startsWith('STUDENT_PACKAGE_')) {
                await supabase_1.supabase.rpc('add_credits', {
                    user_id: transaction.user_id,
                    credits_amount: metadata.credits_to_add
                });
                await supabase_1.supabase.rpc('add_teacher_hours', {
                    teacher_id: metadata.teacher_id,
                    hours_amount: metadata.hours_to_gift_teacher
                });
                await supabase_1.supabase
                    .from('notifications')
                    .insert({
                    user_id: metadata.teacher_id,
                    type: 'HOURS_GIFTED',
                    title: 'Você ganhou horas!',
                    message: `Parabéns! Você ganhou ${metadata.hours_to_gift_teacher}h de brinde por ter sido escolhido por um novo aluno.`,
                    data: {
                        student_id: transaction.user_id,
                        hours_gifted: metadata.hours_to_gift_teacher
                    }
                });
                console.log(`✅ Aluno ${transaction.user_id} recebeu ${metadata.credits_to_add} créditos`);
                console.log(`🎁 Professor ${metadata.teacher_id} ganhou ${metadata.hours_to_gift_teacher}h de brinde`);
            }
            if (externalReference?.startsWith('TEACHER_HOURS_')) {
                await supabase_1.supabase.rpc('add_teacher_hours', {
                    teacher_id: transaction.user_id,
                    hours_amount: metadata.hours_to_add
                });
                console.log(`✅ Professor ${transaction.user_id} recebeu ${metadata.hours_to_add}h`);
            }
            await supabase_1.supabase
                .from('transactions')
                .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString()
            })
                .eq('id', transaction.id);
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.sendStatus(500);
    }
});
router.get('/academy/:academy_id', async (req, res) => {
    try {
        const { academy_id } = req.params;
        const { status, start_date, end_date, limit = '50', offset = '0' } = req.query;
        let query = supabase_1.supabase
            .from('payments')
            .select(`
        *,
        user:users(id, name, email, role)
      `)
            .eq('academy_id', academy_id)
            .order('created_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        if (start_date) {
            query = query.gte('created_at', start_date);
        }
        if (end_date) {
            query = query.lte('created_at', end_date);
        }
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        const { data: payments, error } = await query;
        if (error)
            throw error;
        const { data: allPayments } = await supabase_1.supabase
            .from('payments')
            .select('status, amount, type')
            .eq('academy_id', academy_id);
        const summary = {
            total_received: allPayments?.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            total_pending: allPayments?.filter(p => p.status === 'PENDING')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            total_overdue: allPayments?.filter(p => p.status === 'OVERDUE')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            total_payments: allPayments?.length || 0,
            by_type: {
                plan_purchase: allPayments?.filter(p => p.type === 'PLAN_PURCHASE').length || 0,
                booking_payment: allPayments?.filter(p => p.type === 'BOOKING_PAYMENT').length || 0,
                subscription: allPayments?.filter(p => p.type === 'SUBSCRIPTION').length || 0
            }
        };
        res.json({
            payments,
            summary,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('Error fetching academy payments:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/stats/:academy_id', async (req, res) => {
    try {
        const { academy_id } = req.params;
        const { start_date, end_date } = req.query;
        let query = supabase_1.supabase
            .from('payments')
            .select('*')
            .eq('academy_id', academy_id);
        if (start_date) {
            query = query.gte('created_at', start_date);
        }
        if (end_date) {
            query = query.lte('created_at', end_date);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        const stats = {
            total_revenue: data?.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            pending_revenue: data?.filter(p => p.status === 'PENDING')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            overdue_revenue: data?.filter(p => p.status === 'OVERDUE')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
            total_transactions: data?.length || 0,
            by_status: {
                pending: data?.filter(p => p.status === 'PENDING').length || 0,
                confirmed: data?.filter(p => p.status === 'CONFIRMED').length || 0,
                received: data?.filter(p => p.status === 'RECEIVED').length || 0,
                overdue: data?.filter(p => p.status === 'OVERDUE').length || 0,
                refunded: data?.filter(p => p.status === 'REFUNDED').length || 0
            },
            by_type: {
                plan_purchase: data?.filter(p => p.type === 'PLAN_PURCHASE').length || 0,
                booking_payment: data?.filter(p => p.type === 'BOOKING_PAYMENT').length || 0,
                subscription: data?.filter(p => p.type === 'SUBSCRIPTION').length || 0
            },
            by_billing_type: {
                pix: data?.filter(p => p.billing_type === 'PIX').length || 0,
                boleto: data?.filter(p => p.billing_type === 'BOLETO').length || 0,
                credit_card: data?.filter(p => p.billing_type === 'CREDIT_CARD').length || 0
            },
            monthly_revenue: getMonthlyRevenue(data || [])
        };
        res.json({ stats });
    }
    catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({ error: error.message });
    }
});
function getMonthlyRevenue(payments) {
    const monthlyData = {};
    payments
        .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
        .forEach(payment => {
        const date = new Date(payment.payment_date || payment.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += parseFloat(payment.amount);
    });
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
            month: monthKey,
            revenue: monthlyData[monthKey] || 0
        });
    }
    return months;
}
exports.default = router;
//# sourceMappingURL=payments.js.map