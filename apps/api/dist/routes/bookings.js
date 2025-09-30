"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
const bookingSchema = zod_1.z.object({
    student_id: zod_1.z.string().uuid(),
    teacher_id: zod_1.z.string().uuid(),
    date: zod_1.z.string(),
    duration: zod_1.z.number().min(30).max(180).optional().default(60),
    notes: zod_1.z.string().optional(),
    credits_cost: zod_1.z.number().min(1)
});
const updateBookingSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
    notes: zod_1.z.string().optional()
});
router.get('/', async (req, res) => {
    try {
        const { student_id, teacher_id, status } = req.query;
        let query = supabase_1.supabase
            .from('bookings')
            .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
            .order('date', { ascending: true });
        if (student_id) {
            query = query.eq('student_id', student_id);
        }
        if (teacher_id) {
            query = query.eq('teacher_id', teacher_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data: bookings, error } = await query;
        if (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return res.status(500).json({ message: 'Erro ao buscar agendamentos' });
        }
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            studentId: booking.student_id,
            teacherId: booking.teacher_id,
            teacherName: booking.teacher?.name || '',
            teacherAvatar: booking.teacher?.avatar_url || '',
            studentName: booking.student?.name || '',
            date: booking.date,
            duration: booking.duration,
            status: booking.status,
            notes: booking.notes,
            creditsCost: booking.credits_cost,
            createdAt: booking.created_at,
            updatedAt: booking.updated_at
        }));
        res.json({ bookings: formattedBookings });
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: booking, error } = await supabase_1.supabase
            .from('bookings')
            .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
            .eq('id', id)
            .single();
        if (error || !booking) {
            return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        const formattedBooking = {
            id: booking.id,
            studentId: booking.student_id,
            teacherId: booking.teacher_id,
            teacherName: booking.teacher?.name || '',
            teacherAvatar: booking.teacher?.avatar_url || '',
            studentName: booking.student?.name || '',
            date: booking.date,
            duration: booking.duration,
            status: booking.status,
            notes: booking.notes,
            creditsCost: booking.credits_cost,
            createdAt: booking.created_at,
            updatedAt: booking.updated_at
        };
        res.json({ booking: formattedBooking });
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const bookingData = bookingSchema.parse(req.body);
        const { data: student, error: studentError } = await supabase_1.supabase
            .from('users')
            .select('credits')
            .eq('id', bookingData.student_id)
            .single();
        if (studentError || !student) {
            return res.status(404).json({ message: 'Estudante não encontrado' });
        }
        if (student.credits < bookingData.credits_cost) {
            return res.status(400).json({ message: 'Créditos insuficientes' });
        }
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('teacher_profiles')
            .select('is_available')
            .eq('user_id', bookingData.teacher_id)
            .single();
        if (teacherError || !teacher || !teacher.is_available) {
            return res.status(400).json({ message: 'Professor não disponível' });
        }
        const { data: newBooking, error: bookingError } = await supabase_1.supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();
        if (bookingError) {
            console.error('Erro ao criar agendamento:', bookingError);
            return res.status(500).json({ message: 'Erro ao criar agendamento' });
        }
        const { error: creditError } = await supabase_1.supabase
            .from('users')
            .update({
            credits: student.credits - bookingData.credits_cost,
            updated_at: new Date().toISOString()
        })
            .eq('id', bookingData.student_id);
        if (creditError) {
            console.error('Erro ao debitar créditos:', creditError);
        }
        res.status(201).json({
            message: 'Agendamento criado com sucesso',
            booking: newBooking
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
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = updateBookingSchema.parse(req.body);
        const { data: updatedBooking, error } = await supabase_1.supabase
            .from('bookings')
            .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Erro ao atualizar agendamento:', error);
            return res.status(500).json({ message: 'Erro ao atualizar agendamento' });
        }
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        res.json({
            message: 'Agendamento atualizado com sucesso',
            booking: updatedBooking
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
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: booking, error: getError } = await supabase_1.supabase
            .from('bookings')
            .select('student_id, credits_cost, status')
            .eq('id', id)
            .single();
        if (getError || !booking) {
            return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        const { error: updateError } = await supabase_1.supabase
            .from('bookings')
            .update({
            status: 'CANCELLED',
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (updateError) {
            console.error('Erro ao cancelar agendamento:', updateError);
            return res.status(500).json({ message: 'Erro ao cancelar agendamento' });
        }
        if (booking.status !== 'COMPLETED') {
            const { data: student, error: studentError } = await supabase_1.supabase
                .from('users')
                .select('credits')
                .eq('id', booking.student_id)
                .single();
            if (!studentError && student) {
                await supabase_1.supabase
                    .from('users')
                    .update({
                    credits: student.credits + booking.credits_cost,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', booking.student_id);
            }
        }
        res.json({ message: 'Agendamento cancelado com sucesso' });
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map