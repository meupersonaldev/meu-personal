"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const booking_status_1 = require("../utils/booking-status");
const router = express_1.default.Router();
const ADMIN_ROLES = ['FRANCHISE_ADMIN', 'FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN'];
const TEACHER_ROLES = ['TEACHER'];
const hasAdminAccess = (user) => Boolean(user?.role && ADMIN_ROLES.includes(user.role));
const hasTeacherSelfAccess = (user, teacherId) => Boolean(user && teacherId && user.role && TEACHER_ROLES.includes(user.role) && user.userId === teacherId);
const ensureTeacherScope = (req, res, teacherId) => {
    const user = req.user;
    if (!user || (!hasAdminAccess(user) && !hasTeacherSelfAccess(user, teacherId))) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
};
const ensureAdminScope = (req, res) => {
    const user = req.user;
    if (!user || !hasAdminAccess(user)) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
};
router.get('/by-academy', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { academy_id } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const { data: links, error: linksErr } = await supabase_1.supabase
            .from('academy_teachers')
            .select(`
        id,
        teacher_id,
        academy_id,
        status,
        created_at,
        users:teacher_id (
          id,
          name,
          email,
          phone,
          avatar_url,
          is_active,
          created_at,
          role
        )
      `)
            .eq('academy_id', academy_id)
            .eq('status', 'active');
        if (linksErr) {
            return res.status(500).json({ error: 'Erro ao buscar professores' });
        }
        const base = (links || []).filter((l) => l.users);
        const enriched = await Promise.all(base.map(async (item) => {
            const teacherId = item.users.id;
            const [allAcademyTeachers, profileRow, subscriptions] = await Promise.all([
                supabase_1.supabase
                    .from('academy_teachers')
                    .select(`
            *,
            academies:academy_id (
              id,
              name,
              city,
              state
            )
          `)
                    .eq('teacher_id', teacherId),
                supabase_1.supabase
                    .from('teacher_profiles')
                    .select('*')
                    .eq('user_id', teacherId)
                    .single(),
                supabase_1.supabase
                    .from('teacher_subscriptions')
                    .select(`
            *,
            teacher_plans (
              name,
              price,
              features
            )
          `)
                    .eq('teacher_id', teacherId)
            ]);
            const teacher = item.users;
            const profile = profileRow?.data || null;
            const subs = subscriptions?.data || [];
            const allLinks = allAcademyTeachers?.data || [];
            return {
                id: teacher.id,
                name: teacher.name || 'Professor',
                email: teacher.email || '',
                phone: teacher.phone || '',
                avatar_url: teacher.avatar_url,
                is_active: teacher.is_active,
                created_at: teacher.created_at,
                specialties: profile?.specialties || profile?.specialization || [],
                status: item.status || 'active',
                teacher_profiles: profile ? [profile] : [],
                academy_teachers: allLinks,
                teacher_subscriptions: subs
            };
        }));
        return res.json({ teachers: enriched });
    }
    catch (error) {
        console.error('Erro ao listar professores por academia:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id/academy-link', auth_1.requireAuth, async (req, res) => {
    try {
        if (!ensureAdminScope(req, res)) {
            return;
        }
        const { id } = req.params;
        const { academy_id, status, commission_rate } = req.body || {};
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const updates = { updated_at: new Date().toISOString() };
        if (status !== undefined)
            updates.status = status;
        if (commission_rate !== undefined)
            updates.commission_rate = commission_rate;
        const { data, error } = await supabase_1.supabase
            .from('academy_teachers')
            .update(updates)
            .eq('teacher_id', id)
            .eq('academy_id', academy_id)
            .select('*')
            .single();
        if (error) {
            console.error('Erro ao atualizar vínculo professor-academia:', error);
            return res.status(500).json({ error: 'Erro ao atualizar vínculo com academia' });
        }
        res.json({ link: data });
    }
    catch (error) {
        console.error('Erro interno (academy-link):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
const teacherSchema = zod_1.z.object({
    bio: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    hourly_rate: zod_1.z.number().min(0).optional(),
    availability: zod_1.z.object({}).optional(),
    is_available: zod_1.z.boolean().optional()
});
router.get('/:id/hours', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const isAdmin = user?.role && ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user.role);
        if (!isAdmin && user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .select('available_hours, locked_hours')
            .eq('professor_id', id);
        if (error) {
            console.error('Erro ao buscar saldo de horas:', error);
            return res.status(500).json({ error: 'Erro ao buscar saldo de horas' });
        }
        const rows = data || [];
        const totalAvailable = rows.reduce((sum, row) => {
            const available = Number(row.available_hours) || 0;
            const locked = Number(row.locked_hours) || 0;
            return sum + Math.max(0, available - locked);
        }, 0);
        return res.json({ available_hours: totalAvailable });
    }
    catch (error) {
        console.error('Erro ao processar saldo de horas:', error);
        return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
});
router.post('/:id/blocks/slot', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { academy_id, date, time, notes } = req.body;
        if (!academy_id || !date || !time) {
            return res.status(400).json({ error: 'academy_id, date e time são obrigatórios' });
        }
        const [hours, minutes] = String(time).split(':').map((n) => parseInt(n, 10));
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCHours(hours, minutes, 0, 0);
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        const duration = 60;
        const { data: booking, error } = await supabase_1.supabase
            .from('bookings')
            .insert({
            teacher_id: id,
            franchise_id: academy_id,
            student_id: null,
            date: d.toISOString(),
            duration,
            credits_cost: 0,
            status: 'BLOCKED',
            notes: notes || 'Bloqueio de agenda'
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ booking });
    }
    catch (error) {
        console.error('Erro ao bloquear slot:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:id/blocks/custom', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { academy_id, date, hours } = req.body;
        if (!academy_id || !date || !hours || hours.length === 0) {
            return res.status(400).json({ error: 'academy_id, date e hours são obrigatórios' });
        }
        const toBlock = [];
        for (const hhmm of hours) {
            const d = new Date(`${date}T${hhmm}:00Z`);
            const startOfHour = new Date(d);
            startOfHour.setUTCMinutes(0, 0, 0);
            const endOfHour = new Date(d);
            endOfHour.setUTCMinutes(59, 59, 999);
            const { data: existingBookings } = await supabase_1.supabase
                .from('bookings')
                .select('id, status, student_id')
                .eq('teacher_id', id)
                .eq('franchise_id', academy_id)
                .gte('date', startOfHour.toISOString())
                .lte('date', endOfHour.toISOString())
                .not('student_id', 'is', null)
                .neq('status', 'CANCELLED');
            if (existingBookings && existingBookings.length > 0) {
                continue;
            }
            toBlock.push({ date: d.toISOString(), duration: 60 });
        }
        if (toBlock.length === 0) {
            return res.status(400).json({
                error: 'Todos os horários selecionados já possuem reservas com alunos',
                created: []
            });
        }
        const payload = toBlock.map(b => ({
            teacher_id: id,
            franchise_id: academy_id,
            student_id: null,
            date: b.date,
            duration: b.duration,
            credits_cost: 0,
            status: 'BLOCKED',
            notes: 'Bloqueio de agenda'
        }));
        const { data, error } = await supabase_1.supabase.from('bookings').insert(payload).select();
        if (error)
            throw error;
        res.status(201).json({ created: data || [] });
    }
    catch (error) {
        console.error('Erro ao bloquear horários:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:id/blocks/day', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { academy_id, date, notes } = req.body;
        if (!academy_id || !date) {
            return res.status(400).json({ error: 'academy_id e date são obrigatórios' });
        }
        const allHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        const toBlock = [];
        for (const hhmm of allHours) {
            const d = new Date(`${date}T${hhmm}:00Z`);
            const duration = 60;
            toBlock.push({ date: d.toISOString(), duration, notes });
        }
        let created = [];
        if (toBlock.length > 0) {
            const payload = toBlock.map(b => ({
                teacher_id: id,
                franchise_id: academy_id,
                student_id: null,
                date: b.date,
                duration: b.duration,
                credits_cost: 0,
                status: 'BLOCKED',
                notes: b.notes || 'Bloqueio de agenda (dia)'
            }));
            const { data, error } = await supabase_1.supabase.from('bookings').insert(payload).select();
            if (error)
                throw error;
            created = data || [];
        }
        res.status(201).json({ created });
    }
    catch (error) {
        console.error('Erro ao bloquear dia:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id/blocks', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { academy_id, date } = req.query;
        let query = supabase_1.supabase
            .from('bookings')
            .select('id, date, duration, status, notes, franchise_id')
            .eq('teacher_id', id)
            .eq('status', 'BLOCKED');
        if (academy_id)
            query = query.eq('franchise_id', academy_id);
        if (date) {
            const startISO = new Date(`${date}T00:00:00Z`).toISOString();
            const endISO = new Date(`${date}T23:59:59Z`).toISOString();
            query = query.gte('date', startISO).lte('date', endISO);
        }
        const { data, error } = await query.order('date');
        if (error)
            throw error;
        res.json({ blocks: data || [] });
    }
    catch (error) {
        console.error('Erro ao listar bloqueios:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id/blocks/:bookingId', auth_1.requireAuth, async (req, res) => {
    try {
        const { id, bookingId } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data: booking } = await supabase_1.supabase
            .from('bookings')
            .select('id, teacher_id')
            .eq('id', bookingId)
            .single();
        if (!booking || booking.teacher_id !== id) {
            return res.status(404).json({ error: 'Bloqueio não encontrado' });
        }
        const { error } = await supabase_1.supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao desbloquear:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id/blocks/all/:date', auth_1.requireAuth, async (req, res) => {
    try {
        const { id, date } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const startISO = new Date(`${date}T00:00:00Z`).toISOString();
        const endISO = new Date(`${date}T23:59:59Z`).toISOString();
        const { error } = await supabase_1.supabase
            .from('bookings')
            .delete()
            .eq('teacher_id', id)
            .eq('status', 'BLOCKED')
            .gte('date', startISO)
            .lte('date', endISO);
        if (error)
            throw error;
        res.json({ success: true, message: 'Todos os bloqueios removidos' });
    }
    catch (error) {
        console.error('Erro ao limpar bloqueios:', error);
        res.status(500).json({ error: error.message });
    }
});
const createTeacherSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    email: zod_1.z.string().email('Email inválido'),
    phone: zod_1.z.string().optional(),
    academy_id: zod_1.z.string().uuid('Academy ID inválido'),
    avatar_url: zod_1.z.string().url().optional(),
    bio: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    hourly_rate: zod_1.z.number().min(0).optional(),
    availability: zod_1.z.object({}).optional(),
    commission_rate: zod_1.z.number().min(0).max(1).optional()
});
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user || (user.role !== 'ADMIN' && user.role !== 'STUDENT')) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { academy_id, city, state, unit_id } = req.query;
        let teacherIds = [];
        if (unit_id) {
            const { data: professorUnits } = await supabase_1.supabase
                .from('professor_units')
                .select('professor_id, active')
                .eq('unit_id', unit_id);
            if (professorUnits) {
                const activeProfessors = professorUnits.filter(pu => pu.active);
                teacherIds = activeProfessors.map(pu => pu.professor_id);
            }
            if (teacherIds.length === 0) {
                return res.json([]);
            }
        }
        let query = supabase_1.supabase
            .from('users')
            .select(`
        id,
        name,
        email,
        phone,
        avatar_url,
        created_at,
        is_active,
        role,
        teacher_profiles (
          id,
          bio,
          specialization,
          hourly_rate,
          availability,
          is_available,
          rating_avg,
          rating_count
        ),
        academy_teachers!inner (
          id,
          academy_id,
          status,
          commission_rate
        )
      `)
            .eq('role', 'TEACHER')
            .eq('is_active', true)
            .eq('academy_teachers.status', 'active')
            .order('created_at', { ascending: false });
        if (academy_id) {
            query = query.eq('academy_teachers.academy_id', academy_id);
        }
        if (unit_id && teacherIds.length > 0) {
            query = query.in('id', teacherIds);
        }
        const { data: teachers, error } = await query;
        if (error) {
            console.error('Erro ao buscar professores:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        if (!teachers || teachers.length === 0) {
            return res.json([]);
        }
        const academyIds = [...new Set(teachers.map((t) => t.academy_teachers?.academy_id).filter(Boolean))];
        let academiesMap = {};
        if (academyIds.length > 0) {
            const { data: academies } = await supabase_1.supabase
                .from('academies')
                .select('id, name, city, state, address, phone, email')
                .in('id', academyIds);
            if (academies) {
                academiesMap = academies.reduce((acc, academy) => {
                    acc[academy.id] = academy;
                    return acc;
                }, {});
            }
        }
        const normalizedTeachers = teachers.map((teacher) => {
            const profilesArray = Array.isArray(teacher.teacher_profiles)
                ? teacher.teacher_profiles
                : teacher.teacher_profiles
                    ? [teacher.teacher_profiles]
                    : [];
            const normalizedProfiles = profilesArray.map((profile) => ({
                ...profile,
                specialties: profile.specialties ?? profile.specialization ?? []
            }));
            const academyInfo = teacher.academy_teachers?.academy_id
                ? academiesMap[teacher.academy_teachers.academy_id]
                : null;
            return {
                ...teacher,
                teacher_profiles: normalizedProfiles,
                academy: academyInfo
            };
        });
        let filteredTeachers = normalizedTeachers;
        if (city) {
            filteredTeachers = filteredTeachers.filter(teacher => teacher.academy?.city?.toLowerCase().includes(city.toLowerCase()));
        }
        if (state) {
            filteredTeachers = filteredTeachers.filter(teacher => teacher.academy?.state?.toLowerCase() === state.toLowerCase());
        }
        filteredTeachers = filteredTeachers.filter(teacher => teacher.teacher_profiles?.[0]?.is_available === true);
        const enhanced = filteredTeachers.map((t) => {
            const profile = t.teacher_profiles?.[0];
            const avg = profile?.rating_avg != null ? Number(profile.rating_avg) : 0;
            const count = profile?.rating_count != null ? Number(profile.rating_count) : 0;
            return { ...t, rating_avg: avg, rating_count: count };
        });
        res.json(enhanced);
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data: teacher } = await supabase_1.supabase
            .from('users')
            .select('id, created_at')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const [bookingsData, transactionsData, subscriptionData, profileData, hourTransactionsData, studentsData] = await Promise.all([
            supabase_1.supabase
                .from('bookings')
                .select('id, status, status_canonical, date, credits_cost, student_id, duration, teacher_id')
                .eq('teacher_id', id),
            supabase_1.supabase
                .from('transactions')
                .select('id, type, amount, created_at')
                .eq('user_id', id),
            supabase_1.supabase
                .from('teacher_subscriptions')
                .select(`
          *,
          teacher_plans (
            name,
            price,
            commission_rate,
            features
          )
        `)
                .eq('teacher_id', id)
                .eq('status', 'active')
                .single(),
            supabase_1.supabase
                .from('teacher_profiles')
                .select('hourly_rate')
                .eq('user_id', id)
                .single(),
            supabase_1.supabase
                .from('hour_transactions')
                .select('id, type, hours, created_at, meta_json')
                .eq('professor_id', id)
                .in('type', ['CONSUME']),
            supabase_1.supabase
                .from('teacher_students')
                .select('id, email, hourly_rate')
                .eq('teacher_id', id)
        ]);
        const bookings = bookingsData.data || [];
        const transactions = transactionsData.data || [];
        const subscription = subscriptionData.data;
        const profile = profileData.data;
        const hourTransactions = hourTransactionsData.data || [];
        const students = studentsData.data || [];
        const studentRateMap = new Map();
        for (const student of students) {
            if (student.email && student.hourly_rate) {
                const { data: user } = await supabase_1.supabase
                    .from('users')
                    .select('id')
                    .eq('email', student.email)
                    .single();
                if (user) {
                    studentRateMap.set(user.id, student.hourly_rate);
                }
            }
        }
        const normalizedBookings = bookings.map((b) => ({
            ...b,
            _status: (0, booking_status_1.normalizeBookingStatus)(b.status, b.status_canonical)
        }));
        const completedBookings = normalizedBookings.filter((b) => b._status === 'COMPLETED');
        const totalAcademyEarnings = hourTransactions.reduce((sum, t) => {
            const rate = profile?.hourly_rate || 0;
            return sum + (t.hours * rate);
        }, 0);
        const totalPrivateEarnings = completedBookings
            .filter((b) => b.student_id)
            .reduce((sum, b) => {
            const studentRate = studentRateMap.get(b.student_id) || 0;
            return sum + studentRate;
        }, 0);
        const totalRevenue = totalAcademyEarnings + totalPrivateEarnings;
        const totalCreditsUsed = normalizedBookings
            .filter((b) => b.student_id && !['CANCELED', 'BLOCKED', 'AVAILABLE'].includes(b._status))
            .reduce((sum, b) => sum + (b.credits_cost || 0), 0);
        const hoursEarned = hourTransactions
            .filter((t) => t.type === 'CONSUME')
            .reduce((sum, t) => sum + (t.hours || 0), 0);
        const stats = {
            total_bookings: normalizedBookings.length,
            completed_bookings: completedBookings.length,
            pending_bookings: normalizedBookings.filter((b) => ['PENDING', 'RESERVED'].includes(b._status)).length,
            cancelled_bookings: normalizedBookings.filter((b) => b._status === 'CANCELED').length,
            total_students: new Set(normalizedBookings.map((b) => b.student_id).filter(Boolean)).size,
            total_revenue: totalRevenue,
            total_credits_used: totalCreditsUsed,
            hourly_rate: profile?.hourly_rate || 0,
            hours_earned: hoursEarned,
            current_subscription: subscription,
            last_booking_date: normalizedBookings.length > 0
                ? normalizedBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
                : null,
            join_date: teacher.created_at,
            monthly_earnings: {
                current_month: (() => {
                    const now = new Date();
                    const academyEarnings = hourTransactions
                        .filter((t) => {
                        const txDate = new Date(t.created_at);
                        return txDate.getMonth() === now.getMonth() &&
                            txDate.getFullYear() === now.getFullYear();
                    })
                        .reduce((sum, t) => {
                        const rate = profile?.hourly_rate || 0;
                        return sum + (t.hours * rate);
                    }, 0);
                    const privateEarnings = completedBookings
                        .filter((b) => {
                        const bookingDate = new Date(b.date);
                        return b.student_id &&
                            bookingDate.getMonth() === now.getMonth() &&
                            bookingDate.getFullYear() === now.getFullYear();
                    })
                        .reduce((sum, b) => {
                        const studentRate = studentRateMap.get(b.student_id) || 0;
                        return sum + studentRate;
                    }, 0);
                    return academyEarnings + privateEarnings;
                })()
            }
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/transactions', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data: hourTransactions, error } = await supabase_1.supabase
            .from('hour_transactions')
            .select('id, type, hours, created_at, meta_json')
            .eq('professor_id', id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao buscar transações:', error);
            return res.status(500).json({ error: 'Erro ao buscar transações' });
        }
        res.json({ transactions: hourTransactions || [] });
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data: teacher, error } = await supabase_1.supabase
            .from('users')
            .select(`
        id,
        name,
        email,
        role,
        teacher_profiles (
          id,
          bio,
          specialties: specialization,
          hourly_rate,
          availability,
          is_available,
          rating_avg,
          rating_count
        )
      `)
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Professor não encontrado' });
            }
            console.error('Erro ao buscar professor:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        const profilesArray = Array.isArray(teacher.teacher_profiles)
            ? teacher.teacher_profiles
            : teacher.teacher_profiles
                ? [teacher.teacher_profiles]
                : [];
        let profiles = profilesArray.map((profile) => ({
            ...profile,
            specialties: profile.specialties ?? profile.specialization ?? []
        }));
        if (profiles.length === 0) {
            const { data: newProfile } = await supabase_1.supabase
                .from('teacher_profiles')
                .insert({
                user_id: id,
                bio: '',
                specialization: [],
                hourly_rate: 0,
                availability: {},
                is_available: true
            })
                .select()
                .single();
            profiles = newProfile
                ? [{ ...newProfile, specialties: newProfile.specialization ?? [] }]
                : [];
        }
        const firstProfile = profiles?.[0];
        const rCount = firstProfile?.rating_count != null ? Number(firstProfile.rating_count) : 0;
        const rAvg = firstProfile?.rating_avg != null ? Number(firstProfile.rating_avg) : 0;
        res.json({
            ...teacher,
            teacher_profiles: profiles,
            rating_avg: rAvg,
            rating_count: rCount
        });
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/ratings', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10')), 1), 50);
        const offset = Math.max(parseInt(String(req.query.offset || '0')), 0);
        const { data: teacher, error: tErr } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (tErr || !teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const rangeStart = offset;
        const rangeEnd = offset + limit - 1;
        const { data: rows, error } = await supabase_1.supabase
            .from('teacher_ratings')
            .select('id, rating, comment, created_at, student_id')
            .eq('teacher_id', id)
            .order('created_at', { ascending: false })
            .range(rangeStart, rangeEnd);
        if (error) {
            console.error('Erro ao buscar avaliações:', error);
            return res.status(500).json({ error: 'Erro ao buscar avaliações' });
        }
        const list = rows || [];
        const studentIds = Array.from(new Set(list.map(r => r.student_id).filter(Boolean)));
        let studentsMap = {};
        if (studentIds.length > 0) {
            const { data: students } = await supabase_1.supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', studentIds);
            if (students) {
                studentsMap = students.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
            }
        }
        const ratings = list.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            student: r.student_id ? studentsMap[r.student_id] || { id: r.student_id } : null
        }));
        res.json({ ratings });
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const updateData = teacherSchema.parse(req.body);
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (teacherError || !teacher) {
            return res.status(404).json({ message: 'Professor não encontrado' });
        }
        const { name: uName, email: uEmail, phone: uPhone } = req.body || {};
        if (uName !== undefined || uEmail !== undefined || uPhone !== undefined) {
            const { error: userUpdateError } = await supabase_1.supabase
                .from('users')
                .update({
                ...(uName !== undefined ? { name: uName } : {}),
                ...(uEmail !== undefined ? { email: uEmail } : {}),
                ...(uPhone !== undefined ? { phone: uPhone } : {}),
                updated_at: new Date().toISOString()
            })
                .eq('id', id);
            if (userUpdateError) {
                console.error('Erro ao atualizar usuário (teacher):', userUpdateError);
                return res.status(500).json({ message: 'Erro ao atualizar dados do usuário' });
            }
        }
        const { specialties, ...rest } = updateData;
        const profileUpdate = {
            ...rest,
            updated_at: new Date().toISOString()
        };
        if (specialties !== undefined) {
            profileUpdate.specialization = specialties;
        }
        const { data: updatedProfile, error: updateError } = await supabase_1.supabase
            .from('teacher_profiles')
            .update(profileUpdate)
            .eq('user_id', id)
            .select()
            .single();
        if (updateError) {
            console.error('Erro ao atualizar professor:', updateError);
            return res.status(500).json({ message: 'Erro ao atualizar professor' });
        }
        res.json({
            message: 'Professor atualizado com sucesso',
            profile: updatedProfile
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro interno:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        if (!ensureAdminScope(req, res)) {
            return;
        }
        const validatedData = createTeacherSchema.parse(req.body);
        const { name, email, phone, academy_id, avatar_url, bio, specialties, hourly_rate, availability, commission_rate } = validatedData;
        const { data: existingUser } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (existingUser) {
            return res.status(409).json({
                error: 'Email já está em uso'
            });
        }
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .insert({
            name,
            email,
            phone,
            role: 'TEACHER',
            avatar_url,
            is_active: true
        })
            .select()
            .single();
        if (userError) {
            console.error('Erro ao criar usuário:', userError);
            return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        const { data: profile, error: profileError } = await supabase_1.supabase
            .from('teacher_profiles')
            .insert({
            user_id: user.id,
            bio: bio || '',
            specialization: specialties || [],
            hourly_rate: hourly_rate || 0,
            availability: availability || {},
            is_available: true
        })
            .select()
            .single();
        if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({ error: 'Erro ao criar perfil do professor' });
        }
        const { data: academyTeacher, error: academyError } = await supabase_1.supabase
            .from('academy_teachers')
            .insert({
            teacher_id: user.id,
            academy_id,
            status: 'active',
            commission_rate: commission_rate || 0.70
        })
            .select()
            .single();
        if (academyError) {
            console.error('Erro ao associar com academia:', academyError);
            await supabase_1.supabase.from('teacher_profiles').delete().eq('user_id', user.id);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({ error: 'Erro ao associar professor com academia' });
        }
        const { data: fullTeacher, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          availability,
          is_available
        ),
        academy_teachers (
          id,
          academy_id,
          status,
          commission_rate,
          academies (
            name,
            city,
            state
          )
        )
      `)
            .eq('id', user.id)
            .single();
        if (fetchError) {
            console.error('Erro ao buscar dados completos:', fetchError);
            return res.status(500).json({ error: 'Professor criado, mas erro ao buscar dados' });
        }
        res.status(201).json(fullTeacher);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        if (!ensureAdminScope(req, res)) {
            return;
        }
        const { id } = req.params;
        const { data: existingTeacher } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (!existingTeacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const { error: userError } = await supabase_1.supabase
            .from('users')
            .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (userError) {
            console.error('Erro ao desativar usuário:', userError);
            return res.status(500).json({ error: 'Erro ao desativar usuário' });
        }
        const { error: profileError } = await supabase_1.supabase
            .from('teacher_profiles')
            .update({
            is_available: false,
            updated_at: new Date().toISOString()
        })
            .eq('user_id', id);
        if (profileError) {
            console.error('Erro ao desativar perfil:', profileError);
            return res.status(500).json({ error: 'Erro ao desativar perfil' });
        }
        const { error: academyError } = await supabase_1.supabase
            .from('academy_teachers')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
        })
            .eq('teacher_id', id);
        if (academyError) {
            console.error('Erro ao desativar associação:', academyError);
            return res.status(500).json({ error: 'Erro ao desativar associação' });
        }
        res.json({ message: 'Professor desativado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/availability', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data: profile, error } = await supabase_1.supabase
            .from('teacher_profiles')
            .select('availability, is_available')
            .eq('user_id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Professor não encontrado' });
            }
            console.error('Erro ao buscar disponibilidade:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(profile);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id/availability', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { availability, is_available } = req.body;
        const updates = {
            updated_at: new Date().toISOString()
        };
        if (availability !== undefined)
            updates.availability = availability;
        if (is_available !== undefined)
            updates.is_available = is_available;
        const { data, error } = await supabase_1.supabase
            .from('teacher_profiles')
            .update(updates)
            .eq('user_id', id)
            .select('availability, is_available')
            .single();
        if (error) {
            console.error('Erro ao atualizar disponibilidade:', error);
            return res.status(500).json({ error: 'Erro ao atualizar disponibilidade' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/academies', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ensureTeacherScope(req, res, id)) {
            return;
        }
        const { data, error } = await supabase_1.supabase
            .from('academy_teachers')
            .select(`
        academy_id,
        status,
        academies (
          id,
          name,
          city,
          state
        )
      `)
            .eq('teacher_id', id);
        if (error)
            throw error;
        const academies = (data || [])
            .filter((at) => at.status === 'active' && at.academies)
            .map((at) => ({
            id: at.academies.id,
            name: at.academies.name,
            city: at.academies.city,
            state: at.academies.state
        }));
        res.json({ academies });
    }
    catch (error) {
        console.error('Erro ao listar academias do professor:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=teachers.js.map