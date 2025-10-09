"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const notifications_1 = require("./notifications");
const asaas_service_1 = require("../services/asaas.service");
const router = express_1.default.Router();
router.get('/teacher', async (req, res) => {
    try {
        const { academy_id } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const { data, error } = await supabase_1.supabase
            .from('teacher_plans')
            .select('*')
            .eq('academy_id', academy_id)
            .eq('is_active', true)
            .order('price', { ascending: true });
        if (error)
            throw error;
        res.json({ plans: data || [] });
    }
    catch (error) {
        console.error('Error fetching teacher plans:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/teacher/:teacherId/available', async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { data: prefs } = await supabase_1.supabase
            .from('teacher_preferences')
            .select('academy_ids')
            .eq('teacher_id', teacherId)
            .single();
        const academyIds = prefs?.academy_ids || [];
        if (academyIds.length === 0) {
            const { data, error } = await supabase_1.supabase
                .from('teacher_plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });
            if (error)
                throw error;
            return res.json({ plans: data || [] });
        }
        const { data, error } = await supabase_1.supabase
            .from('teacher_plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });
        if (error)
            throw error;
        res.json({ plans: data || [], academies: academyIds });
    }
    catch (error) {
        console.error('Error fetching available teacher plans:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/teachers', async (req, res) => {
    try {
        const { academy_id, name, description, price, hours_included, commission_rate, features = [] } = req.body;
        if (!academy_id || !name || !price || !commission_rate) {
            return res.status(400).json({
                error: 'academy_id, name, price e commission_rate são obrigatórios'
            });
        }
        const { data, error } = await supabase_1.supabase
            .from('teacher_plans')
            .insert({
            academy_id,
            name,
            description,
            price,
            hours_included,
            commission_rate,
            features,
            asaas_plan_id: null
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating teacher plan:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, hours_included, validity_days, commission_rate, features, is_active } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('teacher_plans')
            .update({
            name,
            description,
            price,
            hours_included,
            validity_days,
            commission_rate,
            features,
            is_active,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error updating teacher plan:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabase
            .from('teacher_plans')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Plano excluído com sucesso' });
    }
    catch (error) {
        console.error('Error deleting teacher plan:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/teachers/subscriptions', async (req, res) => {
    try {
        const { teacher_id, status } = req.query;
        let query = supabase_1.supabase
            .from('teacher_subscriptions')
            .select(`
        *,
        teacher:teacher_id(id, name, email),
        plan:plan_id(name, price, commission_rate)
      `)
            .order('created_at', { ascending: false });
        if (teacher_id) {
            query = query.eq('teacher_id', teacher_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching teacher subscriptions:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/teachers/subscriptions', async (req, res) => {
    try {
        const { teacher_id, plan_id } = req.body;
        if (!teacher_id || !plan_id) {
            return res.status(400).json({
                error: 'teacher_id e plan_id são obrigatórios'
            });
        }
        const { data: existingSubscription } = await supabase_1.supabase
            .from('teacher_subscriptions')
            .select('*')
            .eq('teacher_id', teacher_id)
            .eq('status', 'active')
            .single();
        if (existingSubscription) {
            return res.status(400).json({
                error: 'Professor já possui uma assinatura ativa'
            });
        }
        const { data, error } = await supabase_1.supabase
            .from('teacher_subscriptions')
            .insert({
            teacher_id,
            plan_id,
            status: 'pending'
        })
            .select(`
        *,
        teacher:teacher_id(name, email),
        plan:plan_id(name, price)
      `)
            .single();
        if (error)
            throw error;
        const { data: franchiseAdmin } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('user_id')
            .limit(1)
            .single();
        if (franchiseAdmin) {
            await (0, notifications_1.createNotification)(franchiseAdmin.user_id, 'plan_purchased', 'Nova Assinatura de Professor', `${data.teacher?.name} adquiriu o plano ${data.plan?.name}`, {
                teacher_id,
                plan_id,
                subscription_id: data.id,
                amount: data.plan?.price
            });
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating teacher subscription:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/student', async (req, res) => {
    try {
        const { academy_id } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const { data, error } = await supabase_1.supabase
            .from('academy_plans')
            .select('*')
            .eq('academy_id', academy_id)
            .eq('is_active', true)
            .order('price', { ascending: true });
        if (error)
            throw error;
        res.json({ plans: data || [] });
    }
    catch (error) {
        console.error('Error fetching student plans:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/students', async (req, res) => {
    try {
        const { academy_id, name, description, price, credits_included, duration_days, features = [] } = req.body;
        console.log('Criando plano de aluno:', { academy_id, name, price, credits_included });
        if (!academy_id || !name || !price || !credits_included) {
            return res.status(400).json({
                error: 'academy_id, name, price e credits_included são obrigatórios'
            });
        }
        console.log('Salvando plano no Supabase...');
        const { data, error } = await supabase_1.supabase
            .from('academy_plans')
            .insert({
            academy_id,
            name,
            description,
            price,
            credits_included,
            duration_days: duration_days || 30,
            features,
            is_active: true
        })
            .select()
            .single();
        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            throw error;
        }
        console.log('Plano criado com sucesso:', data.id);
        res.status(201).json({
            ...data,
            message: 'Plano criado com sucesso! A cobrança será criada no Asaas quando um aluno comprar.'
        });
    }
    catch (error) {
        console.error('Error creating student plan:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});
router.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, credits_included, duration_days, features, is_active } = req.body;
        const { data: currentPlan } = await supabase_1.supabase
            .from('academy_plans')
            .select('asaas_plan_id')
            .eq('id', id)
            .single();
        if (currentPlan?.asaas_plan_id) {
            const asaasResult = await asaas_service_1.asaasService.updateSubscriptionPlan(currentPlan.asaas_plan_id, {
                name: name ? `${name} - Plano Aluno` : undefined,
                description,
                value: price
            });
            if (!asaasResult.success) {
                console.error('Erro ao atualizar plano no Asaas:', asaasResult.error);
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('academy_plans')
            .update({
            name,
            description,
            price,
            credits_included,
            duration_days,
            features,
            is_active,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error updating student plan:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: plan } = await supabase_1.supabase
            .from('academy_plans')
            .select('asaas_plan_id')
            .eq('id', id)
            .single();
        if (plan?.asaas_plan_id) {
            const asaasResult = await asaas_service_1.asaasService.deleteSubscriptionPlan(plan.asaas_plan_id);
            if (!asaasResult.success) {
                console.error('Erro ao deletar plano no Asaas:', asaasResult.error);
            }
        }
        const { error } = await supabase_1.supabase
            .from('academy_plans')
            .update({ is_active: false })
            .eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Plano desativado com sucesso' });
    }
    catch (error) {
        console.error('Error deleting student plan:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/students/:id/sync-asaas', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: plan, error: fetchError } = await supabase_1.supabase
            .from('academy_plans')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError)
            throw fetchError;
        if (plan.asaas_plan_id) {
            return res.json({
                message: 'Plano já está sincronizado',
                asaas_plan_id: plan.asaas_plan_id
            });
        }
        const asaasResult = await asaas_service_1.asaasService.createSubscriptionPlan({
            name: `${plan.name} - Plano Aluno`,
            description: plan.description || `Plano ${plan.name}`,
            value: plan.price,
            cycle: 'MONTHLY',
            billingType: 'UNDEFINED'
        });
        if (!asaasResult.success) {
            return res.status(500).json({
                error: 'Erro ao criar plano no Asaas',
                details: asaasResult.error
            });
        }
        const { error: updateError } = await supabase_1.supabase
            .from('academy_plans')
            .update({ asaas_plan_id: asaasResult.data.id })
            .eq('id', id);
        if (updateError)
            throw updateError;
        res.json({
            message: 'Plano sincronizado com sucesso',
            asaas_plan_id: asaasResult.data.id
        });
    }
    catch (error) {
        console.error('Error syncing plan with Asaas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/students/subscriptions', async (req, res) => {
    try {
        const { student_id, academy_id, status } = req.query;
        let query = supabase_1.supabase
            .from('student_subscriptions')
            .select(`
        *,
        student:student_id(id, name, email),
        plan:plan_id(name, price, credits_included),
        academy:academy_id(name)
      `)
            .order('created_at', { ascending: false });
        if (student_id) {
            query = query.eq('student_id', student_id);
        }
        if (academy_id) {
            query = query.eq('academy_id', academy_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching student subscriptions:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/students/subscriptions', async (req, res) => {
    try {
        const { student_id, plan_id, academy_id } = req.body;
        if (!student_id || !plan_id || !academy_id) {
            return res.status(400).json({
                error: 'student_id, plan_id e academy_id são obrigatórios'
            });
        }
        const { data: plan } = await supabase_1.supabase
            .from('academy_plans')
            .select('*')
            .eq('id', plan_id)
            .single();
        if (!plan) {
            return res.status(404).json({ error: 'Plano não encontrado' });
        }
        const { data, error } = await supabase_1.supabase
            .from('student_subscriptions')
            .insert({
            student_id,
            plan_id,
            academy_id,
            status: 'pending',
            credits_remaining: plan.credits_included
        })
            .select(`
        *,
        student:student_id(name, email),
        plan:plan_id(name, price),
        academy:academy_id(name)
      `)
            .single();
        if (error)
            throw error;
        const { data: franchiseAdmin } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('user_id')
            .limit(1)
            .single();
        if (franchiseAdmin) {
            await (0, notifications_1.createNotification)(franchiseAdmin.user_id, 'plan_purchased', 'Nova Assinatura de Aluno', `${data.student?.name} adquiriu o plano ${data.plan?.name} na academia ${data.academy?.name}`, {
                student_id,
                plan_id,
                academy_id,
                subscription_id: data.id,
                amount: data.plan?.price
            });
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating student subscription:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/subscriptions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, asaas_data = {} } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status é obrigatório' });
        }
        const { data: teacherSub, error: teacherError } = await supabase_1.supabase
            .from('teacher_subscriptions')
            .update({
            status,
            ...asaas_data
        })
            .eq('id', id)
            .select()
            .single();
        if (!teacherError && teacherSub) {
            return res.json(teacherSub);
        }
        const { data: studentSub, error: studentError } = await supabase_1.supabase
            .from('student_subscriptions')
            .update({
            status,
            ...asaas_data
        })
            .eq('id', id)
            .select()
            .single();
        if (!studentError && studentSub) {
            return res.json(studentSub);
        }
        res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    catch (error) {
        console.error('Error updating subscription status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=plans.js.map