"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const franqueadora_contacts_service_1 = require("../services/franqueadora-contacts.service");
const notifications_1 = require("./notifications");
const booking_canonical_service_1 = require("../services/booking-canonical.service");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const createBookingSchema = zod_1.z.object({
    source: zod_1.z.enum(['ALUNO', 'PROFESSOR']),
    studentId: zod_1.z.string().uuid().optional(),
    professorId: zod_1.z.string().uuid(),
    unitId: zod_1.z.string().uuid(),
    startAt: zod_1.z.string().datetime(),
    endAt: zod_1.z.string().datetime(),
    studentNotes: zod_1.z.string().optional(),
    professorNotes: zod_1.z.string().optional()
});
const updateBookingSchema = zod_1.z.object({
    status: zod_1.z.enum(['RESERVED', 'PAID', 'DONE', 'CANCELED']).optional(),
    notes: zod_1.z.string().optional()
});
router.get('/', auth_1.requireAuth, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { unit_id, status, from, to, teacher_id } = req.query;
    const user = req.user;
    const unitId = Array.isArray(unit_id) ? unit_id[0] : unit_id;
    const teacherId = Array.isArray(teacher_id) ? teacher_id[0] : teacher_id;
    const formatBooking = (booking) => {
        const unit = booking.unit || {};
        const academy = booking.academy || {};
        const student = booking.student || {};
        const teacher = booking.teacher || {};
        const franchiseName = unit.name || academy.name || null;
        const franchiseAddressParts = unit.id
            ? [unit.address, unit.city, unit.state]
            : [academy.city, academy.state];
        return {
            id: booking.id,
            studentId: booking.student_id || undefined,
            studentName: student.name || undefined,
            teacherId: booking.teacher_id,
            teacherName: teacher.name || undefined,
            franchiseId: booking.unit_id || booking.franchise_id || undefined,
            franchiseName,
            franchiseAddress: franchiseAddressParts.filter(Boolean).join(', ') || undefined,
            date: booking.date,
            duration: booking.duration ?? 60,
            status: booking.status || booking.status_canonical || 'PENDING',
            notes: booking.notes || undefined,
            creditsCost: booking.credits_cost ?? 0
        };
    };
    if (!unitId && !teacherId) {
        return res.status(400).json({ error: 'unit_id é obrigatório' });
    }
    if (!unitId && teacherId) {
        if ((user.role === 'TEACHER' || user.role === 'PROFESSOR') && user.userId !== teacherId) {
            return res.status(403).json({ error: 'Acesso não autorizado a este professor' });
        }
        const { data: teacherBookings, error } = await supabase_1.supabase
            .from('bookings')
            .select(`
        id,
        student_id,
        teacher_id,
        unit_id,
        franchise_id,
        date,
        duration,
        status,
        status_canonical,
        notes,
        credits_cost
      `)
            .eq('teacher_id', teacherId)
            .order('date', { ascending: true });
        if (error) {
            console.error('Error fetching teacher bookings (legacy):', error);
            return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        }
        let results = teacherBookings || [];
        if (status) {
            results = results.filter((booking) => {
                const currentStatus = booking.status || booking.status_canonical;
                return currentStatus === status;
            });
        }
        if (from) {
            const fromDate = new Date(String(from));
            if (!Number.isNaN(fromDate.getTime())) {
                results = results.filter((booking) => new Date(booking.date) >= fromDate);
            }
        }
        if (to) {
            const toDate = new Date(String(to));
            if (!Number.isNaN(toDate.getTime())) {
                results = results.filter((booking) => new Date(booking.date) <= toDate);
            }
        }
        const studentIds = Array.from(new Set(results
            .map((booking) => booking.student_id)
            .filter((id) => Boolean(id))));
        const unitIds = Array.from(new Set(results
            .map((booking) => booking.unit_id)
            .filter((id) => Boolean(id))));
        const franchiseIds = Array.from(new Set(results
            .map((booking) => booking.franchise_id)
            .filter((id) => Boolean(id))));
        let studentsMap = {};
        let unitsMap = {};
        let academiesMap = {};
        if (studentIds.length > 0) {
            const { data: studentsData } = await supabase_1.supabase
                .from('users')
                .select('id, name')
                .in('id', studentIds);
            if (studentsData) {
                studentsMap = studentsData.reduce((acc, curr) => {
                    acc[curr.id] = curr;
                    return acc;
                }, {});
            }
        }
        if (unitIds.length > 0) {
            const { data: unitsData } = await supabase_1.supabase
                .from('units')
                .select('id, name, city, state, address')
                .in('id', unitIds);
            if (unitsData) {
                unitsMap = unitsData.reduce((acc, curr) => {
                    acc[curr.id] = curr;
                    return acc;
                }, {});
            }
        }
        if (franchiseIds.length > 0) {
            const { data: academiesData } = await supabase_1.supabase
                .from('academies')
                .select('id, name, city, state, address')
                .in('id', franchiseIds);
            if (academiesData) {
                academiesMap = academiesData.reduce((acc, curr) => {
                    acc[curr.id] = curr;
                    return acc;
                }, {});
            }
        }
        const bookings = results.map((booking) => {
            const student = booking.student_id ? studentsMap[booking.student_id] : undefined;
            const unit = booking.unit_id ? unitsMap[booking.unit_id] : undefined;
            const academy = booking.franchise_id ? academiesMap[booking.franchise_id] : undefined;
            const franchiseName = unit?.name || academy?.name || null;
            const franchiseAddressParts = unit?.id
                ? [unit.address, unit.city, unit.state]
                : [academy?.address, academy?.city, academy?.state];
            return {
                id: booking.id,
                studentId: booking.student_id || undefined,
                studentName: student?.name || undefined,
                teacherId: booking.teacher_id,
                franchiseId: booking.unit_id || booking.franchise_id || undefined,
                franchiseName,
                franchiseAddress: franchiseAddressParts.filter(Boolean).join(', ') || undefined,
                date: booking.date,
                duration: booking.duration ?? 60,
                status: booking.status || booking.status_canonical || 'PENDING',
                notes: booking.notes || undefined,
                creditsCost: booking.credits_cost ?? 0
            };
        });
        return res.json({ bookings });
    }
    if (user.role === 'STUDENT' || user.role === 'ALUNO') {
        const { data: userUnits } = await supabase_1.supabase
            .from('user_units')
            .select('unit_id')
            .eq('user_id', user.userId)
            .eq('unit_id', unitId);
        if (!userUnits || userUnits.length === 0) {
            return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
        }
    }
    if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
        const { data: teacherUnits } = await supabase_1.supabase
            .from('teacher_units')
            .select('unit_id')
            .eq('teacher_id', user.userId)
            .eq('unit_id', unitId);
        if (!teacherUnits || teacherUnits.length === 0) {
            return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
        }
    }
    const { data: unitBookings, error } = await supabase_1.supabase
        .from('bookings')
        .select(`
      id,
      student_id,
      teacher_id,
      unit_id,
      franchise_id,
      date,
      duration,
      status,
      status_canonical,
      notes,
      credits_cost,
      student:users!bookings_student_id_fkey (id, name),
      teacher:users!bookings_teacher_id_fkey (id, name),
      unit:units!bookings_unit_id_fkey (id, name, city, state, address),
      academy:academies!bookings_franchise_id_fkey (id, name, city, state, address)
    `)
        .or(`unit_id.eq.${unitId},franchise_id.eq.${unitId}`)
        .order('date', { ascending: true });
    if (error) {
        console.error('Error fetching bookings by unit:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
    let results = unitBookings || [];
    if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
        results = results.filter((booking) => booking.teacher_id === user.userId);
    }
    if (user.role === 'STUDENT' || user.role === 'ALUNO') {
        results = results.filter((booking) => booking.student_id === user.userId);
    }
    if (status) {
        results = results.filter((booking) => {
            const currentStatus = booking.status || booking.status_canonical;
            return currentStatus === status;
        });
    }
    if (from) {
        const fromDate = new Date(String(from));
        if (!Number.isNaN(fromDate.getTime())) {
            results = results.filter((booking) => new Date(booking.date) >= fromDate);
        }
    }
    if (to) {
        const toDate = new Date(String(to));
        if (!Number.isNaN(toDate.getTime())) {
            results = results.filter((booking) => new Date(booking.date) <= toDate);
        }
    }
    const bookings = results.map(formatBooking);
    res.json({ bookings });
}));
router.get('/:id', auth_1.requireAuth, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { data: booking, error } = await supabase_1.supabase
        .from('bookings')
        .select(`
      *,
      student:users!bookings_student_id_fkey (id, name, email, avatar_url),
      professor:users!bookings_professor_id_fkey (id, name, email, avatar_url),
      unit:units (id, name, city, state)
    `)
        .eq('id', id)
        .single();
    if (error || !booking) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const hasAccess = booking.student_id === user.userId ||
        booking.professor_id === user.userId ||
        ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role);
    if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    res.json({ booking });
}));
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const bookingData = createBookingSchema.parse(req.body);
    const user = req.user;
    if (bookingData.source === 'ALUNO' && !['STUDENT', 'ALUNO', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
        return res.status(403).json({ error: 'Apenas alunos podem criar agendamentos aluno-led' });
    }
    if (bookingData.source === 'PROFESSOR' && !['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
        return res.status(403).json({ error: 'Apenas professores podem criar agendamentos professor-led' });
    }
    if (bookingData.source === 'ALUNO' && !bookingData.studentId) {
        bookingData.studentId = user.userId;
    }
    const startAt = new Date(bookingData.startAt);
    const endAt = new Date(bookingData.endAt);
    const now = new Date();
    if (startAt <= now) {
        return res.status(400).json({ error: 'Data de início deve ser no futuro' });
    }
    if (endAt <= startAt) {
        return res.status(400).json({ error: 'Data de término deve ser após a data de início' });
    }
    const booking = await booking_canonical_service_1.bookingCanonicalService.createBooking({
        source: bookingData.source,
        studentId: bookingData.studentId,
        professorId: bookingData.professorId,
        unitId: bookingData.unitId,
        startAt: startAt,
        endAt: endAt,
        studentNotes: bookingData.studentNotes,
        professorNotes: bookingData.professorNotes
    });
    try {
        const syncTasks = [(0, franqueadora_contacts_service_1.addAcademyToContact)(booking.professor_id, booking.unit_id)];
        if (booking.student_id) {
            syncTasks.push((0, franqueadora_contacts_service_1.addAcademyToContact)(booking.student_id, booking.unit_id));
        }
        await Promise.all(syncTasks);
    }
    catch (syncError) {
        console.warn('Erro ao sincronizar contato da franqueadora após agendamento:', syncError);
    }
    try {
        if (booking.student_id) {
            await (0, notifications_1.createUserNotification)(booking.student_id, 'booking_created', 'Agendamento criado', 'Seu agendamento foi criado com sucesso.', { booking_id: booking.id });
        }
        await (0, notifications_1.createUserNotification)(booking.professor_id, 'booking_created', 'Novo agendamento', 'Um novo agendamento foi criado.', { booking_id: booking.id });
    }
    catch (error) {
        console.error('Erro ao criar notificações:', error);
    }
    res.status(201).json({
        message: 'Agendamento criado com sucesso',
        booking
    });
}));
router.patch('/:id', auth_1.requireAuth, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = updateBookingSchema.parse(req.body);
    const user = req.user;
    const { data: booking, error: getError } = await supabase_1.supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();
    if (getError || !booking) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const hasPermission = booking.student_id === user.userId ||
        booking.professor_id === user.userId ||
        ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role);
    if (!hasPermission) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    if (status === 'CANCELED') {
        await booking_canonical_service_1.bookingCanonicalService.cancelBooking(id, user.userId);
        res.json({
            message: 'Agendamento cancelado com sucesso',
            status: 'CANCELED'
        });
    }
    else if (status === 'PAID') {
        const updatedBooking = await booking_canonical_service_1.bookingCanonicalService.confirmBooking(id);
        res.json({
            message: 'Agendamento confirmado com sucesso',
            booking: updatedBooking
        });
    }
    else if (status === 'DONE') {
        const updatedBooking = await booking_canonical_service_1.bookingCanonicalService.completeBooking(id);
        res.json({
            message: 'Agendamento concluído com sucesso',
            booking: updatedBooking
        });
    }
    else {
        return res.status(400).json({ error: 'Status inválido' });
    }
}));
router.delete('/:id', auth_1.requireAuth, (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { data: booking, error: getError } = await supabase_1.supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();
    if (getError || !booking) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    const hasPermission = booking.student_id === user.userId ||
        booking.professor_id === user.userId ||
        ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role);
    if (!hasPermission) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    await booking_canonical_service_1.bookingCanonicalService.cancelBooking(id, user.userId);
    res.json({
        message: 'Agendamento cancelado com sucesso',
        status: 'CANCELED'
    });
}));
exports.default = router;
//# sourceMappingURL=bookings.js.map