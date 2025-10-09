"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const notifications_1 = require("./notifications");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { academy_id, teacher_id } = req.query;
        let query = supabase_1.supabase
            .from('checkins')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
        if (academy_id) {
            query = query.eq('academy_id', academy_id);
        }
        if (teacher_id) {
            query = query.eq('teacher_id', teacher_id);
        }
        if (!academy_id && !teacher_id) {
            return res.status(400).json({ error: 'academy_id ou teacher_id é obrigatório' });
        }
        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01') {
                return res.json({ checkins: [] });
            }
            throw error;
        }
        res.json({ checkins: data || [] });
    }
    catch (error) {
        console.error('Error fetching checkins:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const { academy_id } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data, error } = await supabase_1.supabase
            .from('checkins')
            .select('status, created_at')
            .eq('academy_id', academy_id)
            .gte('created_at', thirtyDaysAgo.toISOString());
        if (error) {
            if (error.code === '42P01') {
                return res.json({
                    total: 0,
                    granted: 0,
                    denied: 0,
                    today: 0,
                    week: 0,
                    month: 0
                });
            }
            throw error;
        }
        const checkins = data || [];
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const stats = {
            total: checkins.length,
            granted: checkins.filter(c => c.status === 'GRANTED').length,
            denied: checkins.filter(c => c.status === 'DENIED').length,
            today: checkins.filter(c => new Date(c.created_at) >= todayStart).length,
            week: checkins.filter(c => new Date(c.created_at) >= weekAgo).length,
            month: checkins.length
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching checkin stats:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/scan', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            booking_id: zod_1.z.string().uuid(),
            academy_id: zod_1.z.string().uuid(),
        });
        const { booking_id, academy_id } = schema.parse(req.body);
        const { data: booking, error: getError } = await supabase_1.supabase
            .from('bookings')
            .select('id, status, date, duration, teacher_id, student_id, franchise_id')
            .eq('id', booking_id)
            .single();
        if (getError || !booking) {
            try {
                await supabase_1.supabase.from('checkins').insert({
                    academy_id,
                    teacher_id: null,
                    booking_id,
                    status: 'DENIED',
                    reason: 'BOOKING_NOT_FOUND',
                    method: 'RECEPTION',
                    created_at: new Date().toISOString(),
                });
            }
            catch { }
            try {
                await (0, notifications_1.createNotification)(academy_id, 'checkin', 'Check-in negado', 'Tentativa de check-in sem agendamento.', { booking_id });
            }
            catch { }
            return res.status(404).json({ allowed: false, message: 'Agendamento não encontrado' });
        }
        if (booking.franchise_id !== academy_id) {
            try {
                await supabase_1.supabase.from('checkins').insert({
                    academy_id,
                    teacher_id: booking.teacher_id,
                    booking_id: booking.id,
                    status: 'DENIED',
                    reason: 'WRONG_ACADEMY',
                    method: 'RECEPTION',
                    created_at: new Date().toISOString(),
                });
            }
            catch { }
            try {
                await (0, notifications_1.createNotification)(academy_id, 'checkin', 'Check-in negado', 'Agendamento nao pertence a esta unidade.', { booking_id: booking.id });
            }
            catch { }
            try {
                if (booking.student_id) {
                    await (0, notifications_1.createUserNotification)(booking.student_id, 'checkin', 'Check-in negado', 'Tentativa de check-in em unidade incorreta.', { booking_id: booking.id });
                }
            }
            catch { }
            try {
                if (booking.teacher_id) {
                    await (0, notifications_1.createUserNotification)(booking.teacher_id, 'checkin', 'Check-in negado', 'Tentativa de check-in em unidade incorreta.', { booking_id: booking.id });
                }
            }
            catch { }
            return res.status(403).json({ allowed: false, message: 'Agendamento não pertence a esta unidade' });
        }
        if (booking.status === 'CANCELLED') {
            try {
                await supabase_1.supabase.from('checkins').insert({
                    academy_id,
                    teacher_id: booking.teacher_id,
                    booking_id: booking.id,
                    status: 'DENIED',
                    reason: 'BOOKING_CANCELLED',
                    method: 'RECEPTION',
                    created_at: new Date().toISOString(),
                });
            }
            catch { }
            try {
                await (0, notifications_1.createNotification)(academy_id, 'checkin', 'Check-in negado', 'Agendamento cancelado.', { booking_id: booking.id });
            }
            catch { }
            try {
                if (booking.student_id) {
                    await (0, notifications_1.createUserNotification)(booking.student_id, 'checkin', 'Check-in negado', 'Agendamento cancelado.', { booking_id: booking.id });
                }
            }
            catch { }
            try {
                if (booking.teacher_id) {
                    await (0, notifications_1.createUserNotification)(booking.teacher_id, 'checkin', 'Check-in negado', 'Agendamento cancelado.', { booking_id: booking.id });
                }
            }
            catch { }
            return res.status(409).json({ allowed: false, message: 'Agendamento cancelado' });
        }
        if (booking.status === 'PENDING') {
            await supabase_1.supabase
                .from('bookings')
                .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
                .eq('id', booking.id);
        }
        try {
            await supabase_1.supabase.from('checkins').insert({
                academy_id,
                teacher_id: booking.teacher_id,
                booking_id: booking.id,
                status: 'GRANTED',
                reason: null,
                method: 'RECEPTION',
                created_at: new Date().toISOString(),
            });
        }
        catch { }
        try {
            await (0, notifications_1.createNotification)(academy_id, 'checkin', 'Check-in realizado', 'Entrada registrada na recepcao.', { booking_id: booking.id });
        }
        catch { }
        try {
            if (booking.student_id) {
                await (0, notifications_1.createUserNotification)(booking.student_id, 'checkin', 'Check-in realizado', 'Seu check-in foi confirmado.', { booking_id: booking.id });
            }
        }
        catch { }
        try {
            if (booking.teacher_id) {
                await (0, notifications_1.createUserNotification)(booking.teacher_id, 'checkin', 'Check-in realizado', 'Seu aluno realizou check-in.', { booking_id: booking.id });
            }
        }
        catch { }
        return res.status(200).json({
            allowed: true,
            booking: {
                id: booking.id,
                start: new Date(booking.date).toISOString(),
                duration: booking.duration || 60,
            },
            message: 'Check-in registrado'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ allowed: false, message: 'Dados inválidos', errors: error.errors });
        }
        console.error('Erro no check-in (recepção):', error);
        return res.status(500).json({ allowed: false, message: 'Erro interno' });
    }
});
exports.default = router;
//# sourceMappingURL=checkins.js.map