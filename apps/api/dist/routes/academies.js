"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'TEACHER', 'PROFESSOR']), async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .select('id, name, city, state, credits_per_class, class_duration_minutes')
            .eq('is_active', true)
            .order('name');
        if (error)
            throw error;
        res.json({ academies: data || [] });
    }
    catch (error) {
        console.error('Error fetching academies:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'TEACHER', 'PROFESSOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        res.json({ academy: data });
    }
    catch (error) {
        console.error('Error fetching academy:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (req.franqueadoraAdmin?.franqueadora_id) {
            const { data: current } = await supabase_1.supabase
                .from('academies')
                .select('franqueadora_id')
                .eq('id', id)
                .single();
            if (current && current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ academy: data, message: 'Academia atualizada com sucesso' });
    }
    catch (error) {
        console.error('Error updating academy:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA']), async (req, res) => {
    try {
        const { id } = req.params;
        if (req.franqueadoraAdmin?.franqueadora_id) {
            const { data: current, error: fetchError } = await supabase_1.supabase
                .from('academies')
                .select('franqueadora_id')
                .eq('id', id)
                .single();
            if (fetchError || !current) {
                return res.status(404).json({ error: 'Academia não encontrada' });
            }
            if (current.franqueadora_id !== req.franqueadoraAdmin.franqueadora_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        const { error } = await supabase_1.supabase
            .from('academies')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting academy:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id/available-slots', async (req, res) => {
    try {
        console.log('📍 GET /api/academies/:id/available-slots');
        const { id } = req.params;
        const { date, teacher_id } = req.query;
        console.log('Params:', { id, date, teacher_id });
        if (!date) {
            return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' });
        }
        const reqDate = new Date(`${date}T00:00:00Z`);
        const dow = reqDate.getUTCDay();
        console.log('Day of week:', dow);
        const { data: academy, error: academyError } = await supabase_1.supabase
            .from('academies')
            .select('schedule, credits_per_class, class_duration_minutes')
            .eq('id', id)
            .single();
        if (academyError)
            throw academyError;
        console.log('📅 Schedule da academia:', academy?.schedule);
        let daySchedule = null;
        let hasSchedule = false;
        if (academy?.schedule && Array.isArray(academy.schedule) && academy.schedule.length > 0) {
            hasSchedule = true;
            try {
                const schedule = typeof academy.schedule === 'string'
                    ? JSON.parse(academy.schedule)
                    : academy.schedule;
                console.log('📋 Schedule parseado:', schedule);
                daySchedule = schedule.find((s) => s.day === String(dow));
                console.log('🗓️ Schedule do dia', dow, ':', daySchedule);
            }
            catch (e) {
                console.error('Erro ao parsear schedule:', e);
            }
            if (!daySchedule || !daySchedule.isOpen) {
                console.log('🚫 Academia fechada neste dia');
                return res.json({
                    slots: [],
                    message: 'Academia fechada neste dia',
                    isOpen: false
                });
            }
        }
        else {
            console.log('⚠️ Academia não tem schedule configurado, buscando slots diretamente');
        }
        console.log('🔍 Buscando slots para academia:', id, 'dia da semana:', dow, 'data:', date);
        const { data: slots, error: slotsError } = await supabase_1.supabase
            .from('academy_time_slots')
            .select('time, max_capacity, is_available')
            .eq('academy_id', id)
            .eq('day_of_week', dow)
            .eq('is_available', true)
            .order('time');
        console.log('📊 Slots encontrados:', slots?.length || 0);
        if (slots && slots.length > 0) {
            console.log('⏰ Horários:', slots.map(s => s.time));
        }
        if (slotsError) {
            console.error('Erro ao buscar slots:', slotsError);
            throw slotsError;
        }
        let filteredSlots = slots || [];
        if (hasSchedule && daySchedule) {
            filteredSlots = (slots || []).filter((s) => {
                const slotTime = String(s.time).substring(0, 5);
                return slotTime >= daySchedule.openingTime && slotTime <= daySchedule.closingTime;
            });
            console.log('✂️ Slots filtrados por horário de funcionamento:', filteredSlots.length);
        }
        else {
            console.log('⏭️ Sem schedule, usando todos os slots encontrados');
        }
        const startISO = new Date(`${date}T00:00:00Z`).toISOString();
        const endISO = new Date(`${date}T23:59:59Z`).toISOString();
        const { data: bookings, error: bookingsError } = await supabase_1.supabase
            .from('bookings')
            .select('id, date, status, teacher_id, student_id')
            .eq('franchise_id', id)
            .gte('date', startISO)
            .lte('date', endISO);
        if (bookingsError)
            throw bookingsError;
        console.log('📋 Reservas encontradas para este dia:', bookings?.length || 0);
        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                const t = new Date(b.date);
                const hhmm = t.toISOString().substring(11, 16);
                console.log(`  - ${hhmm}: ID=${b.id.substring(0, 8)}..., status=${b.status}, teacher=${b.teacher_id?.substring(0, 8)}...`);
            });
        }
        const occ = {};
        for (const b of bookings || []) {
            if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
                const t = new Date(b.date);
                const hhmm = t.toISOString().substring(11, 16);
                occ[hhmm] = (occ[hhmm] || 0) + 1;
            }
            else if (b.status === 'BLOCKED' && teacher_id && b.teacher_id === teacher_id) {
                const t = new Date(b.date);
                const hhmm = t.toISOString().substring(11, 16);
                occ[hhmm] = (occ[hhmm] || 0) + 999;
            }
        }
        console.log('🔢 Ocupação por horário (CONFIRMED + PENDING + BLOCKED do professor):', occ);
        const result = filteredSlots.map((s) => {
            const hhmm = String(s.time).substring(0, 5);
            const current = occ[hhmm] || 0;
            const max = s.max_capacity ?? 1;
            const remaining = Math.max(0, max - current);
            return {
                time: hhmm,
                max_capacity: max,
                current_occupancy: current,
                remaining,
                is_free: remaining > 0,
                slot_duration: Math.max(15, academy?.class_duration_minutes ?? 60),
                slot_cost: Math.max(1, academy?.credits_per_class ?? 1)
            };
        });
        res.json({
            slots: result,
            isOpen: true,
            daySchedule: daySchedule ? {
                openingTime: daySchedule.openingTime,
                closingTime: daySchedule.closingTime
            } : null
        });
    }
    catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=academies.js.map