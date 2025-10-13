"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const balance_service_1 = require("../services/balance.service");
const payment_intent_service_1 = require("../services/payment-intent.service");
const supabase_1 = require("../lib/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const pagination_1 = require("../middleware/pagination");
const franqueadora_contacts_service_1 = require("../services/franqueadora-contacts.service");
const router = (0, express_1.Router)();
async function fetchFranqueadoraIdFromUnit(unitId) {
    if (!unitId) {
        return null;
    }
    const { data: academyDirect, error: academyDirectError } = await supabase_1.supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', unitId)
        .single();
    if (!academyDirectError && academyDirect?.franqueadora_id) {
        return academyDirect.franqueadora_id;
    }
    const { data: unitData, error: unitError } = await supabase_1.supabase
        .from('units')
        .select('academy_legacy_id')
        .eq('id', unitId)
        .single();
    if (unitError || !unitData) {
        return null;
    }
    if (!unitData.academy_legacy_id) {
        return null;
    }
    const { data: legacyAcademy, error: legacyError } = await supabase_1.supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', unitData.academy_legacy_id)
        .single();
    if (!legacyError && legacyAcademy?.franqueadora_id) {
        return legacyAcademy.franqueadora_id;
    }
    return null;
}
async function resolveFranqueadoraId(options) {
    const { franqueadoraId, unitId, contextFranqueadoraId, allowFallback = true } = options;
    if (franqueadoraId) {
        return franqueadoraId;
    }
    if (contextFranqueadoraId) {
        return contextFranqueadoraId;
    }
    const fromUnit = await fetchFranqueadoraIdFromUnit(unitId);
    if (fromUnit) {
        return fromUnit;
    }
    if (!allowFallback) {
        return null;
    }
    return (0, franqueadora_contacts_service_1.resolveDefaultFranqueadoraId)();
}
async function ensureStudentAccessToUnit(studentId, unitId) {
    const { data, error } = await supabase_1.supabase
        .from('student_units')
        .select('id')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .limit(1);
    if (error) {
        console.warn('Falha ao validar acesso do aluno a unidade:', error.message);
        return false;
    }
    return !!(data && data.length > 0);
}
async function ensureTeacherAccessToUnit(teacherId, unitId) {
    const { data, error } = await supabase_1.supabase
        .from('teacher_units')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('unit_id', unitId)
        .limit(1);
    if (error) {
        console.warn('Falha ao validar acesso do professor a unidade:', error.message);
        return false;
    }
    return !!(data && data.length > 0);
}
function getContextFranqueadoraId(req) {
    return (req?.franqueadoraAdmin?.franqueadora_id ||
        req?.user?.franqueadora_id ||
        null);
}
router.get('/student', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'FRANQUIA', 'FRANQUEADORA']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: true
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    if (user.role === 'STUDENT' && unit_id) {
        const hasAccess = await ensureStudentAccessToUnit(user.userId, unit_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
        }
    }
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('franqueadora_id', franqueadoraId)
        .eq('status', 'active')
        .order('price_cents', { ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data, franqueadora_id: franqueadoraId });
}));
router.get('/professor', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'FRANQUIA', 'FRANQUEADORA']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: true
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    if (user.role === 'TEACHER' && unit_id) {
        const hasAccess = await ensureTeacherAccessToUnit(user.userId, unit_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
        }
    }
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('franqueadora_id', franqueadoraId)
        .eq('status', 'active')
        .order('price_cents', { ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data, franqueadora_id: franqueadoraId });
}));
router.post('/student/checkout', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        package_id: zod_1.z.string().uuid(),
        unit_id: zod_1.z.string().uuid().optional(),
        payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
    });
    const { package_id, unit_id, payment_method } = schema.parse(req.body);
    const user = req.user;
    const { data: packageData, error: packageError } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('id', package_id)
        .eq('status', 'active')
        .single();
    if (packageError || !packageData) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
    }
    if (user.role === 'STUDENT' && unit_id) {
        const hasAccess = await ensureStudentAccessToUnit(user.userId, unit_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
        }
    }
    const franqueadoraId = packageData.franqueadora_id;
    if (!franqueadoraId) {
        return res.status(409).json({ error: 'Pacote sem franqueadora associada' });
    }
    const paymentIntent = await payment_intent_service_1.paymentIntentService.createPaymentIntent({
        type: 'STUDENT_PACKAGE',
        actorUserId: user.userId,
        franqueadoraId,
        unitId: unit_id,
        amountCents: packageData.price_cents,
        metadata: {
            package_id: packageData.id,
            package_title: packageData.title,
            classes_qty: packageData.classes_qty,
            payment_method
        }
    });
    console.log('checkout_student_intent_created', {
        correlationId: req.audit?.correlationId,
        intentId: paymentIntent.id,
        userId: user.userId,
        packageId: package_id,
        franqueadoraId,
        unitId: unit_id || null,
        amountCents: packageData.price_cents,
        createdAt: paymentIntent.created_at
    });
    res.status(201).json({
        message: 'Pagamento criado com sucesso',
        payment_intent: {
            id: paymentIntent.id,
            type: paymentIntent.type,
            status: paymentIntent.status,
            checkout_url: paymentIntent.checkout_url,
            created_at: paymentIntent.created_at
        },
        package: {
            title: packageData.title,
            classes_qty: packageData.classes_qty,
            price_cents: packageData.price_cents,
            franqueadora_id: franqueadoraId
        }
    });
}));
router.post('/professor/checkout', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        package_id: zod_1.z.string().uuid(),
        unit_id: zod_1.z.string().uuid().optional(),
        payment_method: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
    });
    const { package_id, unit_id, payment_method } = schema.parse(req.body);
    const user = req.user;
    const { data: packageData, error: packageError } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('id', package_id)
        .eq('status', 'active')
        .single();
    if (packageError || !packageData) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
    }
    if (user.role === 'TEACHER' && unit_id) {
        const hasAccess = await ensureTeacherAccessToUnit(user.userId, unit_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
        }
    }
    const franqueadoraId = packageData.franqueadora_id;
    if (!franqueadoraId) {
        return res.status(409).json({ error: 'Pacote sem franqueadora associada' });
    }
    const paymentIntent = await payment_intent_service_1.paymentIntentService.createPaymentIntent({
        type: 'PROF_HOURS',
        actorUserId: user.userId,
        franqueadoraId,
        unitId: unit_id,
        amountCents: packageData.price_cents,
        metadata: {
            package_id: packageData.id,
            package_title: packageData.title,
            hours_qty: packageData.hours_qty,
            payment_method
        }
    });
    console.log('checkout_professor_intent_created', {
        correlationId: req.audit?.correlationId,
        intentId: paymentIntent.id,
        userId: user.userId,
        packageId: package_id,
        franqueadoraId,
        unitId: unit_id || null,
        amountCents: packageData.price_cents,
        createdAt: paymentIntent.created_at
    });
    res.status(201).json({
        message: 'Pagamento criado com sucesso',
        payment_intent: {
            id: paymentIntent.id,
            type: paymentIntent.type,
            status: paymentIntent.status,
            checkout_url: paymentIntent.checkout_url,
            created_at: paymentIntent.created_at
        },
        package: {
            title: packageData.title,
            hours_qty: packageData.hours_qty,
            price_cents: packageData.price_cents,
            franqueadora_id: franqueadoraId
        }
    });
}));
router.get('/student/balance', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: true
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const balance = await balance_service_1.balanceService.getStudentBalance(user.userId, franqueadoraId);
    const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;
    res.json({
        balance: {
            ...balance,
            franqueadora_id: franqueadoraId,
            available_classes: Math.max(0, availableClasses)
        }
    });
}));
router.get('/professor/balance', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: true
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const balance = await balance_service_1.balanceService.getProfessorBalance(user.userId, franqueadoraId);
    const availableHours = balance.available_hours - balance.locked_hours;
    res.json({
        balance: {
            ...balance,
            franqueadora_id: franqueadoraId,
            available_hours: Math.max(0, availableHours)
        }
    });
}));
router.get('/student/transactions', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO']), pagination_1.extractPagination, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const { limit, offset } = req.pagination;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    let query = supabase_1.supabase
        .from('student_class_tx')
        .select('*', { count: 'exact' })
        .eq('student_id', user.userId)
        .eq('franqueadora_id', franqueadoraId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (unit_id) {
        query = query.eq('unit_id', unit_id);
    }
    const { data, error, count } = await query;
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.set('X-Total-Count', count?.toString() || '0');
    res.json({ transactions: data, franqueadora_id: franqueadoraId });
}));
router.get('/professor/transactions', auth_1.requireAuth, (0, auth_1.requireRole)(['TEACHER', 'PROFESSOR']), pagination_1.extractPagination, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id, unit_id } = req.query;
    const { limit, offset } = req.pagination;
    const user = req.user;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        unitId: unit_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    let query = supabase_1.supabase
        .from('hour_tx')
        .select('*', { count: 'exact' })
        .eq('professor_id', user.userId)
        .eq('franqueadora_id', franqueadoraId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (unit_id) {
        query = query.eq('unit_id', unit_id);
    }
    const { data, error, count } = await query;
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.set('X-Total-Count', count?.toString() || '0');
    res.json({ transactions: data, franqueadora_id: franqueadoraId });
}));
const packageStatusSchema = zod_1.z.enum(['active', 'inactive']);
const manageStudentPackageSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(120),
    classes_qty: zod_1.z.number().int().positive(),
    price_cents: zod_1.z.number().int().nonnegative(),
    status: packageStatusSchema.optional(),
    description: zod_1.z.string().max(280).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
const manageHourPackageSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(120),
    hours_qty: zod_1.z.number().int().positive(),
    price_cents: zod_1.z.number().int().nonnegative(),
    status: packageStatusSchema.optional(),
    description: zod_1.z.string().max(280).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
router.get('/student/manage', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id } = req.query;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('franqueadora_id', franqueadoraId)
        .order('created_at', { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data || [], franqueadora_id: franqueadoraId });
}));
router.post('/student/manage', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const payload = manageStudentPackageSchema.parse(req.body ?? {});
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: (req.body && req.body.franqueadora_id) || null,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const metadataJson = {
        ...(payload.metadata || {}),
        ...(payload.description ? { description: payload.description } : {})
    };
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .insert({
        franqueadora_id: franqueadoraId,
        unit_id: null,
        title: payload.title.trim(),
        classes_qty: payload.classes_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? 'active',
        metadata_json: metadataJson
    })
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao criar pacote de aluno:', error);
        return res.status(500).json({ error: 'Erro ao criar pacote' });
    }
    res.status(201).json({ package: data, franqueadora_id: franqueadoraId });
}));
router.put('/student/manage/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const payload = manageStudentPackageSchema.parse(req.body ?? {});
    const { data: existingPackage, error: fetchError } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !existingPackage) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
    }
    const franqueadoraId = await resolveFranqueadoraId({
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
        return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }
    const metadataJson = {
        ...(existingPackage.metadata_json || {}),
        ...(payload.metadata || {}),
        ...(payload.description ? { description: payload.description } : {})
    };
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .update({
        title: payload.title.trim(),
        classes_qty: payload.classes_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? existingPackage.status,
        metadata_json: metadataJson,
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao atualizar pacote de aluno:', error);
        return res.status(500).json({ error: 'Erro ao atualizar pacote' });
    }
    res.json({ package: data, franqueadora_id: franqueadoraId });
}));
router.delete('/student/manage/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const { data: existingPackage, error: fetchError } = await supabase_1.supabase
        .from('student_packages')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !existingPackage) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
    }
    const franqueadoraId = await resolveFranqueadoraId({
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
        return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }
    const { data: activeStudents, error: checkError } = await supabase_1.supabase
        .from('student_class_balance')
        .select('student_id')
        .eq('franqueadora_id', franqueadoraId)
        .gt('total_purchased', 0);
    if (checkError) {
        console.error('Erro ao verificar uso do pacote:', checkError);
        return res.status(500).json({ error: 'Erro ao verificar pacote' });
    }
    if (activeStudents && activeStudents.length > 0) {
        const { data, error } = await supabase_1.supabase
            .from('student_packages')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            console.error('Erro ao inativar pacote de aluno:', error);
            return res.status(500).json({ error: 'Erro ao inativar pacote' });
        }
        return res.json({
            package: data,
            message: 'Pacote inativado (há alunos com este pacote)',
            franqueadora_id: franqueadoraId
        });
    }
    const { data, error } = await supabase_1.supabase
        .from('student_packages')
        .delete()
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao excluir pacote de aluno:', error);
        return res.status(500).json({ error: 'Erro ao excluir pacote' });
    }
    res.json({ package: data, message: 'Pacote excluído com sucesso', franqueadora_id: franqueadoraId });
}));
router.get('/professor/manage', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { franqueadora_id } = req.query;
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: franqueadora_id,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('franqueadora_id', franqueadoraId)
        .order('created_at', { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ packages: data || [], franqueadora_id: franqueadoraId });
}));
router.post('/professor/manage', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const payload = manageHourPackageSchema.parse(req.body ?? {});
    const franqueadoraId = await resolveFranqueadoraId({
        franqueadoraId: (req.body && req.body.franqueadora_id) || null,
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId) {
        return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }
    const metadataJson = {
        ...(payload.metadata || {}),
        ...(payload.description ? { description: payload.description } : {})
    };
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .insert({
        franqueadora_id: franqueadoraId,
        unit_id: null,
        title: payload.title.trim(),
        hours_qty: payload.hours_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? 'active',
        metadata_json: metadataJson
    })
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao criar pacote de professor:', error);
        return res.status(500).json({ error: 'Erro ao criar pacote' });
    }
    res.status(201).json({ package: data, franqueadora_id: franqueadoraId });
}));
router.put('/professor/manage/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const payload = manageHourPackageSchema.parse(req.body ?? {});
    const { data: existingPackage, error: fetchError } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !existingPackage) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
    }
    const franqueadoraId = await resolveFranqueadoraId({
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
        return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }
    const metadataJson = {
        ...(existingPackage.metadata_json || {}),
        ...(payload.metadata || {}),
        ...(payload.description ? { description: payload.description } : {})
    };
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .update({
        title: payload.title.trim(),
        hours_qty: payload.hours_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? existingPackage.status,
        metadata_json: metadataJson,
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao atualizar pacote de professor:', error);
        return res.status(500).json({ error: 'Erro ao atualizar pacote' });
    }
    res.json({ package: data, franqueadora_id: franqueadoraId });
}));
router.delete('/professor/manage/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const { data: existingPackage, error: fetchError } = await supabase_1.supabase
        .from('hour_packages')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !existingPackage) {
        return res.status(404).json({ error: 'Pacote não encontrado' });
    }
    const franqueadoraId = await resolveFranqueadoraId({
        contextFranqueadoraId: getContextFranqueadoraId(req),
        allowFallback: false
    });
    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
        return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }
    const { data: activeProfessors, error: checkError } = await supabase_1.supabase
        .from('prof_hour_balance')
        .select('professor_id')
        .eq('franqueadora_id', franqueadoraId)
        .gt('available_hours', 0);
    if (checkError) {
        console.error('Erro ao verificar uso do pacote:', checkError);
        return res.status(500).json({ error: 'Erro ao verificar pacote' });
    }
    if (activeProfessors && activeProfessors.length > 0) {
        const { data, error } = await supabase_1.supabase
            .from('hour_packages')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            console.error('Erro ao inativar pacote de professor:', error);
            return res.status(500).json({ error: 'Erro ao inativar pacote' });
        }
        return res.json({
            package: data,
            message: 'Pacote inativado (há professores com horas ativas)',
            franqueadora_id: franqueadoraId
        });
    }
    const { data, error } = await supabase_1.supabase
        .from('hour_packages')
        .delete()
        .eq('id', id)
        .select('*')
        .single();
    if (error) {
        console.error('Erro ao excluir pacote de professor:', error);
        return res.status(500).json({ error: 'Erro ao excluir pacote' });
    }
    res.json({ package: data, message: 'Pacote excluído com sucesso', franqueadora_id: franqueadoraId });
}));
exports.default = router;
//# sourceMappingURL=packages.js.map