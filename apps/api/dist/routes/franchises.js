"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
router.post('/create', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { academy, admin } = req.body;
        if (academy?.contract_start_date && academy?.contract_end_date) {
            const start = new Date(academy.contract_start_date);
            const end = new Date(academy.contract_end_date);
            if (isFinite(start.getTime()) && isFinite(end.getTime()) && end < start) {
                return res.status(400).json({
                    error: 'CONTRACT_DATES_INVALID',
                    message: 'Data de término deve ser maior ou igual à data de início'
                });
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(admin.password, 10);
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .insert({
            name: admin.name,
            email: admin.email,
            password_hash: hashedPassword,
            role: 'FRANCHISE_ADMIN',
            is_active: true
        })
            .select()
            .single();
        if (userError) {
            console.error('Error creating user:', userError);
            throw new Error('Erro ao criar usuário admin');
        }
        const { data: newAcademy, error: academyError } = await supabase_1.supabase
            .from('academies')
            .insert({
            franqueadora_id: academy.franqueadora_id,
            name: academy.name,
            email: academy.email,
            phone: academy.phone,
            address: academy.address,
            city: academy.city,
            state: academy.state,
            zip_code: academy.zip_code,
            franchise_fee: academy.franchise_fee || 0,
            royalty_percentage: academy.royalty_percentage || 0,
            monthly_revenue: academy.monthly_revenue || 0,
            contract_start_date: academy.contract_start_date,
            contract_end_date: academy.contract_end_date,
            is_active: academy.is_active ?? true
        })
            .select()
            .single();
        if (academyError) {
            console.error('Error creating academy:', academyError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            throw new Error('Erro ao criar academia');
        }
        const { error: franchiseAdminError } = await supabase_1.supabase
            .from('franchise_admins')
            .insert({
            user_id: user.id,
            academy_id: newAcademy.id
        });
        if (franchiseAdminError) {
            console.error('Error creating franchise admin link:', franchiseAdminError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            await supabase_1.supabase.from('academies').delete().eq('id', newAcademy.id);
            throw new Error('Erro ao vincular admin à academia');
        }
        res.status(201).json({
            academy: newAcademy,
            admin: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Error creating franchise with admin:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar franquia' });
    }
});
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        let { franqueadora_id } = req.query;
        if (!franqueadora_id && req.franqueadoraAdmin?.franqueadora_id) {
            franqueadora_id = req.franqueadoraAdmin.franqueadora_id;
        }
        let query = supabase_1.supabase
            .from('academies')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (franqueadora_id) {
            query = query.eq('franqueadora_id', franqueadora_id);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        const franchises = (data || []).map(academy => ({
            id: academy.id,
            name: academy.name,
            address: academy.address,
            city: academy.city,
            state: academy.state,
            is_active: academy.is_active,
            monthly_revenue: academy.monthly_revenue,
            royalty_percentage: academy.royalty_percentage,
            created_at: academy.created_at,
            credits_per_class: academy.credits_per_class,
            class_duration_minutes: academy.class_duration_minutes,
            checkin_tolerance: academy.checkin_tolerance
        }));
        res.json({ franchises });
    }
    catch (error) {
        console.error('Error fetching franchises:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({ error: 'Franchise not found' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching franchise:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { franqueadora_id, name, email, phone, address, city, state, zip_code, franchise_fee, royalty_percentage, monthly_revenue, contract_start_date, contract_end_date, is_active } = req.body;
        if (contract_start_date && contract_end_date) {
            const start = new Date(contract_start_date);
            const end = new Date(contract_end_date);
            if (isFinite(start.getTime()) && isFinite(end.getTime()) && end < start) {
                return res.status(400).json({
                    error: 'CONTRACT_DATES_INVALID',
                    message: 'Data de término deve ser maior ou igual à data de início'
                });
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .insert({
            franqueadora_id,
            name,
            email,
            phone,
            address,
            city,
            state,
            zip_code,
            franchise_fee,
            royalty_percentage,
            monthly_revenue: monthly_revenue || 0,
            contract_start_date,
            contract_end_date,
            is_active: typeof is_active === 'boolean' ? is_active : true
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating franchise:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANQUIA']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const policyFields = ['credits_per_class', 'class_duration_minutes', 'checkin_tolerance'];
        const role = req?.user?.canonicalRole || req?.user?.role;
        if (role !== 'FRANCHISOR' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
            for (const field of policyFields) {
                if (field in updates) {
                    delete updates[field];
                }
            }
        }
        const { data: beforePolicy } = await supabase_1.supabase
            .from('academies')
            .select('credits_per_class, class_duration_minutes, checkin_tolerance')
            .eq('id', id)
            .single();
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({ error: 'Franchise not found' });
        }
        res.json(data);
        try {
            if (role === 'FRANCHISOR' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
                const changed = {};
                for (const f of policyFields) {
                    if (updates[f] !== undefined && beforePolicy && data && beforePolicy[f] !== data[f]) {
                        changed[f] = { old: beforePolicy[f], new: data[f] };
                    }
                }
                if (Object.keys(changed).length > 0) {
                    await audit_service_1.auditService.createLog({
                        tableName: 'academies',
                        recordId: id,
                        operation: 'SENSITIVE_CHANGE',
                        actorId: req?.user?.userId,
                        actorRole: req?.user?.role,
                        oldValues: beforePolicy || undefined,
                        newValues: {
                            credits_per_class: data?.credits_per_class,
                            class_duration_minutes: data?.class_duration_minutes,
                            checkin_tolerance: data?.checkin_tolerance
                        },
                        metadata: { changedFields: Object.keys(changed) },
                        ipAddress: req.ip,
                        userAgent: req.headers?.['user-agent']
                    });
                }
            }
        }
        catch (logErr) {
            console.error('Audit log failed (franchises update):', logErr);
        }
    }
    catch (error) {
        console.error('Error updating franchise:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data: admins } = await supabase_1.supabase
            .from('franchise_admins')
            .select('user_id')
            .eq('academy_id', id);
        await supabase_1.supabase
            .from('franchise_admins')
            .delete()
            .eq('academy_id', id);
        await supabase_1.supabase
            .from('academy_teachers')
            .delete()
            .eq('academy_id', id);
        await supabase_1.supabase
            .from('academy_students')
            .delete()
            .eq('academy_id', id);
        await supabase_1.supabase
            .from('academy_plans')
            .delete()
            .eq('academy_id', id);
        await supabase_1.supabase
            .from('academy_time_slots')
            .delete()
            .eq('academy_id', id);
        const { error: academyError } = await supabase_1.supabase
            .from('academies')
            .delete()
            .eq('id', id);
        if (academyError)
            throw academyError;
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                const { data: otherAdminRoles } = await supabase_1.supabase
                    .from('franchise_admins')
                    .select('id')
                    .eq('user_id', admin.user_id);
                if (!otherAdminRoles || otherAdminRoles.length === 0) {
                    await supabase_1.supabase
                        .from('users')
                        .delete()
                        .eq('id', admin.user_id);
                }
            }
        }
        res.json({ message: 'Franchise deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting franchise:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: studentsData, error: studentsError } = await supabase_1.supabase
            .from('academy_students')
            .select('status')
            .eq('academy_id', id);
        if (studentsError)
            throw studentsError;
        const { data: teachersData, error: teachersError } = await supabase_1.supabase
            .from('academy_teachers')
            .select('teacher_id, status')
            .eq('academy_id', id);
        if (teachersError)
            throw teachersError;
        const teacherIds = (teachersData || [])
            .map(t => t.teacher_id)
            .filter((value) => Boolean(value));
        let bookings = [];
        if (teacherIds.length > 0) {
            const { data: bookingsData, error: bookingsError } = await supabase_1.supabase
                .from('bookings')
                .select('status, teacher_id')
                .in('teacher_id', teacherIds);
            if (bookingsError)
                throw bookingsError;
            bookings = bookingsData || [];
        }
        const { data: plansData, error: plansError } = await supabase_1.supabase
            .from('academy_plans')
            .select('*')
            .eq('academy_id', id)
            .eq('is_active', true);
        if (plansError)
            throw plansError;
        const students = studentsData || [];
        const teachers = teachersData || [];
        const plans = plansData || [];
        const stats = {
            totalStudents: students.length,
            activeStudents: students.filter(s => s.status === 'active').length,
            totalTeachers: teachers.length,
            activeTeachers: teachers.filter(t => t.status === 'active').length,
            totalBookings: bookings.length,
            completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
            cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
            plansActive: plans.length
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching franchise stats:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/packages/list', async (req, res) => {
    try {
        const { franqueadora_id } = req.query;
        let query = supabase_1.supabase
            .from('franchise_packages')
            .select('*')
            .order('investment_amount', { ascending: true });
        if (franqueadora_id) {
            query = query.eq('franqueadora_id', franqueadora_id);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching franchise packages:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/packages', async (req, res) => {
    try {
        const { franqueadora_id, name, description, investment_amount, franchise_fee, royalty_percentage, territory_size, max_population, included_features } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('franchise_packages')
            .insert({
            franqueadora_id,
            name,
            description,
            investment_amount,
            franchise_fee,
            royalty_percentage,
            territory_size,
            max_population,
            included_features,
            is_active: true
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating franchise package:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase_1.supabase
            .from('franchise_packages')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error updating franchise package:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/packages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('franchise_packages')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ message: 'Package deactivated successfully' });
    }
    catch (error) {
        console.error('Error deleting franchise package:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/leads/list', async (req, res) => {
    try {
        const { franqueadora_id, status } = req.query;
        let query = supabase_1.supabase
            .from('franchise_leads')
            .select('*')
            .order('created_at', { ascending: false });
        if (franqueadora_id) {
            query = query.eq('franqueadora_id', franqueadora_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching franchise leads:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/leads', async (req, res) => {
    try {
        const { franqueadora_id, name, email, phone, city, investment_capacity, message } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('franchise_leads')
            .insert({
            franqueadora_id,
            name,
            email,
            phone,
            city,
            investment_capacity,
            message,
            status: 'NEW'
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating franchise lead:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase_1.supabase
            .from('franchise_leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error updating franchise lead:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=franchises.js.map