"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pagination_1 = require("../middleware/pagination");
const audit_1 = require("../middleware/audit");
const franqueadora_contacts_service_1 = require("../services/franqueadora-contacts.service");
const audit_service_1 = require("../services/audit.service");
const cache_service_1 = require("../services/cache.service");
const franqueadora_contacts_1 = require("../dto/franqueadora-contacts");
const router = (0, express_1.Router)();
router.get('/me', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, async (req, res) => {
    try {
        let franqueadoraId = req.franqueadoraAdmin?.franqueadora_id;
        if (!franqueadoraId && req.user?.role === 'SUPER_ADMIN') {
            const { data: defaultFranqueadora, error: defaultError } = await supabase_1.supabase
                .from('franqueadora')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
            if (!defaultError && defaultFranqueadora) {
                franqueadoraId = defaultFranqueadora.id;
                return res.json({ franqueadora: defaultFranqueadora });
            }
        }
        if (!franqueadoraId) {
            return res.status(200).json({ franqueadora: null });
        }
        const { data, error } = await supabase_1.supabase
            .from('franqueadora')
            .select('*')
            .eq('id', franqueadoraId)
            .single();
        if (error)
            throw error;
        return res.json({ franqueadora: data });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get('/contacts', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), pagination_1.extractPagination, pagination_1.addPaginationHeaders, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { pagination } = req;
    const queryParams = (req.query || {});
    let franqueadoraId = queryParams.franqueadora_id || (req.franqueadoraAdmin && req.franqueadoraAdmin.franqueadora_id) || null;
    if (!franqueadoraId && req.user && req.user.role === 'SUPER_ADMIN') {
        franqueadoraId = await (0, franqueadora_contacts_service_1.resolveDefaultFranqueadoraId)();
    }
    let query = supabase_1.supabase
        .from('franqueadora_contacts')
        .select(franqueadora_contacts_1.FRANQUEADORA_CONTACTS_SELECT, { count: 'exact' });
    if (franqueadoraId) {
        query = query.eq('franqueadora_id', franqueadoraId);
    }
    const roleFilter = queryParams.role ? String(queryParams.role).toUpperCase() : undefined;
    const statusFilter = queryParams.status ? String(queryParams.status).toUpperCase() : undefined;
    const assignedFlag = queryParams.assigned ? String(queryParams.assigned) : undefined;
    const academyId = queryParams.academy_id ? String(queryParams.academy_id) : undefined;
    const userActiveParam = queryParams.user_active;
    const userActive = typeof userActiveParam === 'string'
        ? (userActiveParam === 'true' || userActiveParam === '1')
        : undefined;
    const isStudent = roleFilter === 'STUDENT';
    const search = queryParams.search ? String(queryParams.search).trim() : undefined;
    if (roleFilter && ['STUDENT', 'TEACHER'].includes(roleFilter)) {
        query = query.eq('role', roleFilter);
    }
    if (statusFilter && ['UNASSIGNED', 'ASSIGNED', 'INACTIVE'].includes(statusFilter)) {
        if (isStudent) {
            if (statusFilter === 'INACTIVE') {
                query = query.eq('status', 'INACTIVE');
            }
        }
        else {
            query = query.eq('status', statusFilter);
        }
    }
    if (!isStudent && academyId) {
        query = query.contains('assigned_academy_ids', [academyId]);
    }
    if (!isStudent) {
        if (assignedFlag === 'true') {
            query = query.not('assigned_academy_ids', 'eq', '{}');
        }
        else if (assignedFlag === 'false') {
            query = query.eq('assigned_academy_ids', '{}');
        }
    }
    if (typeof userActive === 'boolean') {
        query = query.eq('user.is_active', userActive);
    }
    if (search) {
        const escapedSearch = search.replace(/[%_]/g, function (match) { return '\\' + match; });
        const like = '%' + escapedSearch + '%';
        query = query.or('user.name.ilike.' + like + ',user.email.ilike.' + like);
    }
    const allowedSorts = ['created_at', 'updated_at', 'last_assignment_at'];
    const sortColumn = allowedSorts.indexOf(pagination.sortBy) !== -1 ? pagination.sortBy : 'created_at';
    const ascending = pagination.sortOrder === 'asc';
    query = query
        .order(sortColumn, { ascending })
        .range(pagination.offset, pagination.offset + pagination.limit - 1);
    const { data, error, count } = await query;
    if (error) {
        throw new Error('Erro ao buscar contatos da franqueadora: ' + error.message);
    }
    const response = (0, pagination_1.buildPaginatedResponse)(data || [], count || 0, pagination, {
        role: roleFilter || null,
        status: statusFilter || null,
        search: search || null,
        assigned: assignedFlag || null,
        academy_id: academyId || null,
    });
    return res.json({
        success: true,
        ...response,
    });
}));
router.get('/packages', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, pagination_1.extractPagination, (0, pagination_1.extractFilters)(['is_active', 'name', 'investment_amount']), pagination_1.addPaginationHeaders, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.json({
            success: true,
            data: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
    const { pagination, filters } = req;
    let query = supabase_1.supabase
        .from('franchise_packages')
        .select('*', { count: 'exact' })
        .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id);
    query = (0, pagination_1.buildFilterClauses)(filters, query);
    const sortBy = pagination.sortBy || 'investment_amount';
    const sortOrder = pagination.sortOrder || 'asc';
    const orderClause = (0, pagination_1.buildOrderClause)(sortBy, sortOrder);
    query = query.order(Object.keys(orderClause)[0], orderClause[Object.keys(orderClause)[0]]);
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    const { data, error, count } = await query;
    if (error) {
        throw new Error(`Erro ao buscar pacotes: ${error.message}`);
    }
    const response = (0, pagination_1.buildPaginatedResponse)(data || [], count || 0, pagination, filters);
    return res.json({
        success: true,
        ...response
    });
}));
router.post('/packages', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, (0, audit_1.auditSensitiveOperation)('CREATE', 'franchise_packages'), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.status(400).json({
            success: false,
            error: 'NO_FRANQUEADORA_CONTEXT',
            message: 'Contexto da franqueadora não encontrado'
        });
    }
    const payload = {
        ...req.body,
        franqueadora_id: req.franqueadoraAdmin.franqueadora_id
    };
    const { data, error } = await supabase_1.supabase
        .from('franchise_packages')
        .insert(payload)
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao criar pacote: ${error.message}`);
    }
    return res.status(201).json({
        success: true,
        data: { package: data }
    });
}));
router.put('/packages/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, (0, audit_1.auditSensitiveOperation)('UPDATE', 'franchise_packages'), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.status(400).json({
            success: false,
            error: 'NO_FRANQUEADORA_CONTEXT',
            message: 'Contexto da franqueadora não encontrado'
        });
    }
    const { id } = req.params;
    const { data: current, error: curErr } = await supabase_1.supabase
        .from('franchise_packages')
        .select('franqueadora_id')
        .eq('id', id)
        .single();
    if (curErr || !current) {
        return res.status(404).json({
            success: false,
            error: 'PACKAGE_NOT_FOUND',
            message: 'Pacote não encontrado'
        });
    }
    if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
        const auditLogger = audit_service_1.auditService;
        await auditLogger.logPermissionDenied(req, 'franchise_packages', 'update', id);
        return res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para editar este pacote'
        });
    }
    const { data, error } = await supabase_1.supabase
        .from('franchise_packages')
        .update({
        ...req.body,
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao atualizar pacote: ${error.message}`);
    }
    return res.json({
        success: true,
        data: { package: data }
    });
}));
router.delete('/packages/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, (0, audit_1.auditSensitiveOperation)('DELETE', 'franchise_packages'), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.status(400).json({
            success: false,
            error: 'NO_FRANQUEADORA_CONTEXT',
            message: 'Contexto da franqueadora não encontrado'
        });
    }
    const { id } = req.params;
    const { data: current, error: curErr } = await supabase_1.supabase
        .from('franchise_packages')
        .select('franqueadora_id')
        .eq('id', id)
        .single();
    if (curErr || !current) {
        return res.status(404).json({
            success: false,
            error: 'PACKAGE_NOT_FOUND',
            message: 'Pacote não encontrado'
        });
    }
    if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
        const auditLogger = audit_service_1.auditService;
        await auditLogger.logPermissionDenied(req, 'franchise_packages', 'delete', id);
        return res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para excluir este pacote'
        });
    }
    const { error } = await supabase_1.supabase
        .from('franchise_packages')
        .update({
        is_active: false,
        updated_at: new Date().toISOString()
    })
        .eq('id', id);
    if (error) {
        throw new Error(`Erro ao desativar pacote: ${error.message}`);
    }
    return res.status(204).send();
}));
router.get('/leads', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, pagination_1.extractPagination, (0, pagination_1.extractFilters)(['status', 'name', 'email', 'phone']), pagination_1.addPaginationHeaders, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.json({
            success: true,
            data: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
    const { pagination, filters } = req;
    let query = supabase_1.supabase
        .from('franchise_leads')
        .select('*', { count: 'exact' })
        .eq('franqueadora_id', req.franqueadoraAdmin.franqueadora_id);
    query = (0, pagination_1.buildFilterClauses)(filters, query);
    const orderClause = (0, pagination_1.buildOrderClause)(pagination.sortBy, pagination.sortOrder);
    query = query.order(Object.keys(orderClause)[0], orderClause[Object.keys(orderClause)[0]]);
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    const { data, error, count } = await query;
    if (error) {
        throw new Error(`Erro ao buscar leads: ${error.message}`);
    }
    const response = (0, pagination_1.buildPaginatedResponse)(data || [], count || 0, pagination, filters);
    return res.json({
        success: true,
        ...response
    });
}));
router.put('/leads/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, async (req, res) => {
    try {
        if (!req.franqueadoraAdmin?.franqueadora_id)
            return res.status(400).json({ error: 'No franqueadora context' });
        const { id } = req.params;
        const { data: current, error: curErr } = await supabase_1.supabase
            .from('franchise_leads')
            .select('franqueadora_id')
            .eq('id', id)
            .single();
        if (curErr || !current)
            return res.status(404).json({ error: 'Lead not found' });
        if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id)
            return res.status(403).json({ error: 'Forbidden' });
        const { data, error } = await supabase_1.supabase
            .from('franchise_leads')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return res.json({ lead: data });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get('/academies/:id/stats', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), auth_1.requireFranqueadoraAdmin, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    if (!req.franqueadoraAdmin?.franqueadora_id) {
        return res.status(400).json({
            success: false,
            error: 'NO_FRANQUEADORA_CONTEXT',
            message: 'Contexto da franqueadora não encontrado'
        });
    }
    const cacheKey = `academy_stats_${id}_${req.franqueadoraAdmin.franqueadora_id}`;
    const cacheTime = 5 * 60 * 1000;
    const cachedStats = await cache_service_1.cacheService.get(cacheKey);
    if (cachedStats) {
        return res.json({
            success: true,
            data: cachedStats,
            cached: true
        });
    }
    const { data: academy, error: academyErr } = await supabase_1.supabase
        .from('academies')
        .select('id, franqueadora_id, monthly_revenue, name')
        .eq('id', id)
        .single();
    if (academyErr || !academy) {
        return res.status(404).json({
            success: false,
            error: 'ACADEMY_NOT_FOUND',
            message: 'Academia não encontrada'
        });
    }
    if (academy.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
        return res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para acessar esta academia'
        });
    }
    const { data: stats, error: statsError } = await supabase_1.supabase
        .rpc('get_academy_stats', {
        academy_id: id,
        include_revenue: true
    });
    if (statsError) {
        console.warn('RPC get_academy_stats não disponível, usando fallback');
        const [teachersResult, studentsResult, totalBookingsResult, completedBookingsResult, cancelledBookingsResult] = await Promise.all([
            supabase_1.supabase
                .from('academy_teachers')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', id),
            supabase_1.supabase
                .from('academy_students')
                .select('status')
                .eq('academy_id', id),
            supabase_1.supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', id),
            supabase_1.supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', id)
                .eq('status_canonical', 'DONE'),
            supabase_1.supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', id)
                .eq('status_canonical', 'CANCELED')
        ]);
        const totalTeachers = teachersResult.count || 0;
        const allStudents = studentsResult.data || [];
        const totalStudents = allStudents.length;
        const activeStudents = allStudents.filter(s => s.status === 'active').length;
        const totalBookings = totalBookingsResult.count || 0;
        const completedBookings = completedBookingsResult.count || 0;
        const cancelledBookings = cancelledBookingsResult.count || 0;
        const finalStats = {
            academy: {
                id: academy.id,
                name: academy.name,
                monthlyRevenue: academy.monthly_revenue || 0
            },
            totalStudents,
            activeStudents,
            totalTeachers,
            activeTeachers: totalTeachers,
            totalBookings,
            completedBookings,
            cancelledBookings,
            completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0,
            creditsBalance: 0,
            plansActive: 0,
            lastUpdated: new Date().toISOString()
        };
        await cache_service_1.cacheService.set(cacheKey, finalStats, cacheTime);
        return res.json({
            success: true,
            data: finalStats,
            cached: false
        });
    }
    const finalStats = {
        academy: {
            id: academy.id,
            name: academy.name,
            monthlyRevenue: academy.monthly_revenue || 0
        },
        ...stats,
        lastUpdated: new Date().toISOString()
    };
    await cache_service_1.cacheService.set(cacheKey, finalStats, cacheTime);
    return res.json({
        success: true,
        data: finalStats,
        cached: false
    });
}));
router.get('/users', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), pagination_1.extractPagination, pagination_1.addPaginationHeaders, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { pagination } = req;
    const queryParams = (req.query || {});
    const { role, search, status } = queryParams;
    try {
        let query = supabase_1.supabase
            .from('users')
            .select(`
          id,
          name,
          email,
          phone,
          cpf,
          role,
          avatar_url,
          created_at,
          updated_at,
          last_login_at,
          active,
          email_verified,
          phone_verified,
          franchisor_id,
          franchise_id,
          teacher_profiles (
            id,
            specialization,
            bio,
            graduation,
            cref,
            total_sessions,
            hourly_rate,
            available_online,
            available_in_person
          )
        `, { count: 'exact' })
            .in('role', ['STUDENT', 'TEACHER', 'ALUNO', 'PROFESSOR']);
        if (role && role !== 'all') {
            const r = role.toUpperCase();
            if (r === 'STUDENT' || r === 'ALUNO') {
                query = query.in('role', ['STUDENT', 'ALUNO']);
            }
            else if (r === 'TEACHER' || r === 'PROFESSOR') {
                query = query.in('role', ['TEACHER', 'PROFESSOR']);
            }
            else {
                query = query.eq('role', r);
            }
        }
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        if (status === 'active') {
            query = query.eq('active', true);
        }
        else if (status === 'inactive') {
            query = query.eq('active', false);
        }
        query = query.order('created_at', { ascending: false });
        const { offset, limit } = pagination;
        query = query.range(offset, offset + limit - 1);
        const { data: users, error, count } = await query;
        if (error) {
            console.error('Erro ao buscar usuários:', error);
            throw new Error(`Erro ao buscar usuários: ${error.message}`);
        }
        const userIds = users.map(u => u.id);
        const studentIds = users.filter(u => u.role === 'STUDENT' || u.role === 'ALUNO').map(u => u.id);
        const teacherIds = users.filter(u => u.role === 'TEACHER' || u.role === 'PROFESSOR').map(u => u.id);
        const [allProfessorUnits, allStudentUnits, allBookingStats, allStudentBalances, allProfessorBalances] = await Promise.all([
            teacherIds.length > 0 ? supabase_1.supabase
                .from('professor_units')
                .select('professor_id, unit_id, units(name, city, state)')
                .in('professor_id', teacherIds) : Promise.resolve({ data: [] }),
            studentIds.length > 0 ? supabase_1.supabase
                .from('student_units')
                .select('student_id, unit_id, units(name, city, state), total_bookings, first_booking_date, last_booking_date')
                .in('student_id', studentIds) : Promise.resolve({ data: [] }),
            userIds.length > 0 ? supabase_1.supabase
                .from('bookings')
                .select('professor_id, student_id, status_canonical')
                .or(`professor_id.in.(${userIds.join(',')}),student_id.in.(${userIds.join(',')})`) : Promise.resolve({ data: [] }),
            studentIds.length > 0 ? supabase_1.supabase
                .from('student_class_balance')
                .select('student_id, unit_id, total_purchased, total_consumed, locked_qty')
                .in('student_id', studentIds) : Promise.resolve({ data: [] }),
            teacherIds.length > 0 ? supabase_1.supabase
                .from('prof_hour_balance')
                .select('professor_id, unit_id, total_hours, available_hours, locked_hours')
                .in('professor_id', teacherIds) : Promise.resolve({ data: [] })
        ]);
        const professorUnitsMap = new Map();
        (allProfessorUnits.data || []).forEach(pu => {
            if (!professorUnitsMap.has(pu.professor_id))
                professorUnitsMap.set(pu.professor_id, []);
            professorUnitsMap.get(pu.professor_id).push(pu);
        });
        const studentUnitsMap = new Map();
        (allStudentUnits.data || []).forEach(su => {
            if (!studentUnitsMap.has(su.student_id))
                studentUnitsMap.set(su.student_id, []);
            studentUnitsMap.get(su.student_id).push(su);
        });
        const bookingStatsMap = new Map();
        (allBookingStats.data || []).forEach(booking => {
            const userId = booking.professor_id || booking.student_id;
            if (userId) {
                if (!bookingStatsMap.has(userId))
                    bookingStatsMap.set(userId, []);
                bookingStatsMap.get(userId).push(booking);
            }
        });
        const studentBalancesMap = new Map();
        (allStudentBalances.data || []).forEach(balance => {
            if (!studentBalancesMap.has(balance.student_id))
                studentBalancesMap.set(balance.student_id, []);
            studentBalancesMap.get(balance.student_id).push(balance);
        });
        const professorBalancesMap = new Map();
        (allProfessorBalances.data || []).forEach(balance => {
            if (!professorBalancesMap.has(balance.professor_id))
                professorBalancesMap.set(balance.professor_id, []);
            professorBalancesMap.get(balance.professor_id).push(balance);
        });
        const enrichedUsers = users.map((user) => {
            const userBookings = bookingStatsMap.get(user.id) || [];
            return {
                ...user,
                operational_links: {
                    professor_units: professorUnitsMap.get(user.id) || [],
                    student_units: studentUnitsMap.get(user.id) || []
                },
                booking_stats: {
                    total: userBookings.length,
                    completed: userBookings.filter(b => b.status_canonical === 'DONE').length,
                    pending: userBookings.filter(b => b.status_canonical === 'RESERVED').length,
                    cancelled: userBookings.filter(b => b.status_canonical === 'CANCELED').length
                },
                balance_info: studentBalancesMap.get(user.id) || null,
                hours_info: professorBalancesMap.get(user.id) || null
            };
        });
        const response = (0, pagination_1.buildPaginatedResponse)(enrichedUsers, count, pagination);
        return res.status(200).json({
            success: true,
            ...response,
            filters: {
                role,
                search,
                status
            }
        });
    }
    catch (err) {
        console.error('Erro ao listar usuários:', err);
        return res.status(500).json({
            error: err.message || 'Erro ao listar usuários',
            message: 'Não foi possível carregar a lista de usuários'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=franqueadora.js.map