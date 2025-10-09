"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const balance_service_1 = require("../services/balance.service");
const payment_intent_service_1 = require("../services/payment-intent.service");
const supabase_1 = require("../config/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const pagination_1 = require("../middleware/pagination");
const router = (0, express_1.Router)();
router.get('/student', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'FRANQUIA', 'FRANQUEADORA']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    if (user.role === 'STUDENT') {
        const { data: userAcademies } = await supabase_1.supabase
            .from('academy_students')
            .select('academy_id')
            .eq('student_id', user.userId)
            .eq('academy_id', unit_id);
        if (!userAcademies || userAcademies.length === 0) {
            return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
        }
    }
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('unit_id', unit_id)
        .eq('status', 'active')
        .order('price_cents', { ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data });
}));
router.get('/professor', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'FRANQUIA', 'FRANQUEADORA']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    if (user.role === 'TEACHER') {
        const { data: userUnits } = await supabase_1.supabase
            .from('teacher_units')
            .select('unit_id')
            .eq('teacher_id', user.userId)
            .eq('unit_id', unit_id);
        if (!userUnits || userUnits.length === 0) {
            return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
        }
    }
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('unit_id', unit_id)
        .eq('status', 'active')
        .order('price_cents', { ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data });
}));
router.post('/student/checkout', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    try {
        const schema = zod_1.z.object({
            package_id: zod_1.z.string().uuid(),
            unit_id: zod_1.z.string().uuid(),
            payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
        });
        const { package_id, unit_id, payment_method } = schema.parse(req.body);
        const user = req.user;
        const { data: packageData, error: packageError } = await supabase_1.supabase
            .from('student_packages')
            .select('*')
            .eq('id', package_id)
            .eq('unit_id', unit_id)
            .eq('status', 'active')
            .single();
        if (packageError || !packageData) {
            return res.status(404).json({ error: 'Pacote não encontrado' });
        }
        const paymentIntent = await payment_intent_service_1.paymentIntentService.createPaymentIntent({
            type: 'STUDENT_PACKAGE',
            actorUserId: user.userId,
            unitId: unit_id,
            amountCents: packageData.price_cents,
            metadata: {
                package_id: packageData.id,
                package_title: packageData.title,
                classes_qty: packageData.classes_qty,
                payment_method
            }
        });
        res.status(201).json({
            message: 'Pagamento criado com sucesso',
            payment_intent: {
                id: paymentIntent.id,
                type: paymentIntent.type,
                amount_cents: paymentIntent.amount_cents,
                status: paymentIntent.status,
                checkout_url: paymentIntent.checkout_url,
                created_at: paymentIntent.created_at
            },
            package: {
                title: packageData.title,
                classes_qty: packageData.classes_qty,
                price_cents: packageData.price_cents
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
        console.error('Erro ao criar checkout de aluno:', error);
        res.status(500).json({ error: error.message });
    }
}));
router.post('/professor/checkout', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    try {
        const schema = zod_1.z.object({
            package_id: zod_1.z.string().uuid(),
            unit_id: zod_1.z.string().uuid(),
            payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
        });
        const { package_id, unit_id, payment_method } = schema.parse(req.body);
        const user = req.user;
        const { data: packageData, error: packageError } = await supabase_1.supabase
            .from('hour_packages')
            .select('*')
            .eq('id', package_id)
            .eq('unit_id', unit_id)
            .eq('status', 'active')
            .single();
        if (packageError || !packageData) {
            return res.status(404).json({ error: 'Pacote não encontrado' });
        }
        const paymentIntent = await payment_intent_service_1.paymentIntentService.createPaymentIntent({
            type: 'PROF_HOURS',
            actorUserId: user.userId,
            unitId: unit_id,
            amountCents: packageData.price_cents,
            metadata: {
                package_id: packageData.id,
                package_title: packageData.title,
                hours_qty: packageData.hours_qty,
                payment_method
            }
        });
        res.status(201).json({
            message: 'Pagamento criado com sucesso',
            payment_intent: {
                id: paymentIntent.id,
                type: paymentIntent.type,
                amount_cents: paymentIntent.amount_cents,
                status: paymentIntent.status,
                checkout_url: paymentIntent.checkout_url,
                created_at: paymentIntent.created_at
            },
            package: {
                title: packageData.title,
                hours_qty: packageData.hours_qty,
                price_cents: packageData.price_cents
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
        console.error('Erro ao criar checkout de professor:', error);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/student/balance', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    try {
        const balance = await balance_service_1.balanceService.getStudentBalance(user.userId, unit_id);
        const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;
        res.json({
            balance: {
                ...balance,
                available_classes: Math.max(0, availableClasses)
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/professor/balance', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    try {
        const balance = await balance_service_1.balanceService.getProfessorBalance(user.userId, unit_id);
        const availableHours = balance.available_hours - balance.locked_hours;
        res.json({
            balance: {
                ...balance,
                available_hours: Math.max(0, availableHours)
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/student/transactions', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), pagination_1.extractPagination, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const { limit, offset } = req.pagination;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    const { data, error, count } = await supabase_1.supabase
        .from('student_class_tx')
        .select('*', { count: 'exact' })
        .eq('student_id', user.userId)
        .eq('unit_id', unit_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.set('X-Total-Count', count?.toString() || '0');
    res.json({ transactions: data });
}));
router.get('/professor/transactions', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), pagination_1.extractPagination, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id } = req.query;
    const { limit, offset } = req.pagination;
    const user = req.user;
    if (!unit_id) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    const { data, error, count } = await supabase_1.supabase
        .from('hour_tx')
        .select('*', { count: 'exact' })
        .eq('professor_id', user.userId)
        .eq('unit_id', unit_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.set('X-Total-Count', count?.toString() || '0');
    res.json({ transactions: data });
}));
exports.default = router;
//# sourceMappingURL=packages.js.map