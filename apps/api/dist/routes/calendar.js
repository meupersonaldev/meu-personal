"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/events', async (req, res) => {
    try {
        const { academy_id, start_date, end_date } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date e end_date são obrigatórios (YYYY-MM-DD)' });
        }
        const { data: bookings, error: bookingsError } = await supabase_1.supabase
            .from('bookings')
            .select(`
        id,
        date,
        duration,
        status,
        notes,
        student:users!bookings_student_id_fkey (
          id,
          name,
          email
        ),
        teacher:users!bookings_teacher_id_fkey (
          id,
          name,
          email
        )
      `)
            .eq('franchise_id', academy_id)
            .gte('date', `${start_date}T00:00:00Z`)
            .lte('date', `${end_date}T23:59:59Z`)
            .order('date', { ascending: true });
        if (bookingsError)
            throw bookingsError;
        const events = (bookings || []).map((booking) => {
            const startDate = new Date(booking.date);
            const endDate = new Date(startDate.getTime() + (booking.duration || 60) * 60 * 1000);
            const student = booking.student;
            const teacher = booking.teacher;
            return {
                id: booking.id,
                title: `Aula: ${student?.name || 'Aluno'} com ${teacher?.name || 'Professor'}`,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                status: booking.status,
                studentId: student?.id,
                studentName: student?.name || 'Aluno não encontrado',
                studentEmail: student?.email,
                teacherId: teacher?.id,
                teacherName: teacher?.name || 'Professor não encontrado',
                teacherEmail: teacher?.email,
                duration: booking.duration,
                notes: booking.notes,
                color: getEventColor(booking.status)
            };
        });
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/availability', async (req, res) => {
    try {
        const { academy_id, date } = req.query;
        if (!academy_id || !date) {
            return res.status(400).json({ error: 'academy_id e date são obrigatórios' });
        }
        const { data: academy, error: academyError } = await supabase_1.supabase
            .from('academies')
            .select('schedule, opening_time, closing_time')
            .eq('id', academy_id)
            .single();
        if (academyError)
            throw academyError;
        const requestDate = new Date(`${date}T00:00:00Z`);
        const dayOfWeek = requestDate.getUTCDay();
        let isOpen = true;
        let openingTime = academy?.opening_time || '06:00:00';
        let closingTime = academy?.closing_time || '22:00:00';
        if (academy?.schedule) {
            try {
                const schedule = typeof academy.schedule === 'string'
                    ? JSON.parse(academy.schedule)
                    : academy.schedule;
                const daySchedule = schedule.find((s) => s.day === String(dayOfWeek));
                if (daySchedule) {
                    isOpen = daySchedule.isOpen;
                    openingTime = daySchedule.openingTime;
                    closingTime = daySchedule.closingTime;
                }
            }
            catch (e) {
                console.error('Error parsing schedule:', e);
            }
        }
        if (!isOpen) {
            return res.json({
                isOpen: false,
                message: 'Academia fechada neste dia',
                slots: []
            });
        }
        const startISO = new Date(`${date}T00:00:00Z`).toISOString();
        const endISO = new Date(`${date}T23:59:59Z`).toISOString();
        const { data: bookings, error: bookingsError } = await supabase_1.supabase
            .from('bookings')
            .select('date, duration, status')
            .eq('franchise_id', academy_id)
            .gte('date', startISO)
            .lte('date', endISO)
            .neq('status', 'CANCELLED');
        if (bookingsError)
            throw bookingsError;
        const slots = [];
        const [openHour, openMinute] = openingTime.split(':').map(Number);
        const [closeHour, closeMinute] = closingTime.split(':').map(Number);
        for (let hour = openHour; hour < closeHour; hour++) {
            const slotTime = `${String(hour).padStart(2, '0')}:00`;
            const hasBooking = (bookings || []).some((b) => {
                const bookingDate = new Date(b.date);
                const bookingHour = bookingDate.getUTCHours();
                return bookingHour === hour;
            });
            slots.push({
                time: slotTime,
                available: !hasBooking,
                status: hasBooking ? 'occupied' : 'free'
            });
        }
        res.json({
            isOpen: true,
            openingTime,
            closingTime,
            slots
        });
    }
    catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: error.message });
    }
});
function getEventColor(status) {
    switch (status) {
        case 'CONFIRMED':
            return '#10B981';
        case 'COMPLETED':
            return '#3B82F6';
        case 'CANCELLED':
            return '#EF4444';
        case 'PENDING':
            return '#F59E0B';
        default:
            return '#6B7280';
    }
}
exports.default = router;
//# sourceMappingURL=calendar.js.map