"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
const POLICY_FIELDS = {
    credits_per_class: { min: 0 },
    class_duration_minutes: { min: 15 },
    checkin_tolerance_minutes: { min: 0, max: 180 },
    student_min_booking_notice_minutes: { min: 0, max: 10080 },
    student_reschedule_min_notice_minutes: { min: 0, max: 10080 },
    late_cancel_threshold_minutes: { min: 0, max: 1440 },
    late_cancel_penalty_credits: { min: 0 },
    no_show_penalty_credits: { min: 0 },
    teacher_minutes_per_class: { min: 0 },
    teacher_rest_minutes_between_classes: { min: 0, max: 180 },
    teacher_max_daily_classes: { min: 0, max: 48 },
    max_future_booking_days: { min: 1, max: 365 },
    max_cancel_per_month: { min: 0 }
};
function validateOverrides(input) {
    if (!input || typeof input !== 'object')
        return ['overrides inválido'];
    const errors = [];
    for (const [k, v] of Object.entries(input)) {
        if (!(k in POLICY_FIELDS)) {
            errors.push(`campo não permitido: ${k}`);
            continue;
        }
        const n = Number(v);
        if (!Number.isFinite(n)) {
            errors.push(`${k} inválido`);
            continue;
        }
        const { min, max } = POLICY_FIELDS[k];
        if (min != null && n < min)
            errors.push(`${k} deve ser ≥ ${min}`);
        if (max != null && n > max)
            errors.push(`${k} deve ser ≤ ${max}`);
    }
    return errors;
}
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'TEACHER', 'PROFESSOR']), async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('academies')
            .select('id, name, city, state, credits_per_class, class_duration_minutes, checkin_tolerance')
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
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const policyFields = ['credits_per_class', 'class_duration_minutes', 'checkin_tolerance'];
        const role = req?.user?.role;
        if (role !== 'FRANQUEADORA' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
            for (const field of policyFields) {
                if (field in updateData) {
                    delete updateData[field];
                }
            }
        }
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
        const { data: beforePolicy } = await supabase_1.supabase
            .from('academies')
            .select('credits_per_class, class_duration_minutes, checkin_tolerance')
            .eq('id', id)
            .single();
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
        try {
            if (role === 'FRANQUEADORA' || role === 'SUPER_ADMIN' || role === 'ADMIN') {
                const changed = {};
                for (const f of policyFields) {
                    if (updateData[f] !== undefined && beforePolicy && data && beforePolicy[f] !== data[f]) {
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
            console.error('Audit log failed (academies update):', logErr);
        }
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
router.get('/:id/policies-overrides', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('academy_policy_overrides')
            .select('overrides')
            .eq('academy_id', id)
            .maybeSingle();
        if (error)
            throw error;
        return res.json({ success: true, overrides: data?.overrides || {} });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.put('/:id/policies-overrides', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA']), auth_1.requireFranqueadoraAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const overrides = req.body?.overrides || {};
        const { data: academy, error: aErr } = await supabase_1.supabase
            .from('academies')
            .select('franqueadora_id')
            .eq('id', id)
            .single();
        if (aErr || !academy)
            return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' });
        if (academy.franqueadora_id !== req.franqueadoraAdmin?.franqueadora_id)
            return res.status(403).json({ error: 'Forbidden' });
        const errors = validateOverrides(overrides);
        if (errors.length)
            return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors });
        const { data: current } = await supabase_1.supabase
            .from('academy_policy_overrides')
            .select('id')
            .eq('academy_id', id)
            .maybeSingle();
        if (current) {
            const { data, error } = await supabase_1.supabase
                .from('academy_policy_overrides')
                .update({ overrides, updated_at: new Date().toISOString() })
                .eq('id', current.id)
                .select()
                .single();
            if (error)
                throw error;
            return res.json({ success: true, overrides: data.overrides });
        }
        else {
            const { data, error } = await supabase_1.supabase
                .from('academy_policy_overrides')
                .insert({ academy_id: id, overrides })
                .select()
                .single();
            if (error)
                throw error;
            return res.status(201).json({ success: true, overrides: data.overrides });
        }
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.delete('/:id/policies-overrides/:field', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA']), auth_1.requireFranqueadoraAdmin, async (req, res) => {
    try {
        const { id, field } = req.params;
        if (!(field in POLICY_FIELDS))
            return res.status(400).json({ error: 'FIELD_NOT_ALLOWED' });
        const { data: academy, error: aErr } = await supabase_1.supabase
            .from('academies')
            .select('franqueadora_id')
            .eq('id', id)
            .single();
        if (aErr || !academy)
            return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' });
        if (academy.franqueadora_id !== req.franqueadoraAdmin?.franqueadora_id)
            return res.status(403).json({ error: 'Forbidden' });
        const { data: current, error: cErr } = await supabase_1.supabase
            .from('academy_policy_overrides')
            .select('id, overrides')
            .eq('academy_id', id)
            .maybeSingle();
        if (cErr)
            throw cErr;
        if (!current)
            return res.status(204).send();
        const newOverrides = { ...(current.overrides || {}) };
        delete newOverrides[field];
        const { error } = await supabase_1.supabase
            .from('academy_policy_overrides')
            .update({ overrides: newOverrides, updated_at: new Date().toISOString() })
            .eq('id', current.id);
        if (error)
            throw error;
        return res.status(204).send();
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get('/:id/policies-effective', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PROFESSOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data: academy, error: aErr } = await supabase_1.supabase
            .from('academies')
            .select('franqueadora_id')
            .eq('id', id)
            .single();
        if (aErr || !academy)
            return res.status(404).json({ error: 'ACADEMY_NOT_FOUND' });
        const { data: published, error: pErr } = await supabase_1.supabase
            .from('franchisor_policies')
            .select('*')
            .eq('franqueadora_id', academy.franqueadora_id)
            .eq('status', 'published')
            .order('effective_from', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (pErr)
            throw pErr;
        const base = published ? {
            credits_per_class: published.credits_per_class,
            class_duration_minutes: published.class_duration_minutes,
            checkin_tolerance_minutes: published.checkin_tolerance_minutes,
            student_min_booking_notice_minutes: published.student_min_booking_notice_minutes,
            student_reschedule_min_notice_minutes: published.student_reschedule_min_notice_minutes,
            late_cancel_threshold_minutes: published.late_cancel_threshold_minutes,
            late_cancel_penalty_credits: published.late_cancel_penalty_credits,
            no_show_penalty_credits: published.no_show_penalty_credits,
            teacher_minutes_per_class: published.teacher_minutes_per_class,
            teacher_rest_minutes_between_classes: published.teacher_rest_minutes_between_classes,
            teacher_max_daily_classes: published.teacher_max_daily_classes,
            max_future_booking_days: published.max_future_booking_days,
            max_cancel_per_month: published.max_cancel_per_month,
        } : {
            credits_per_class: 1,
            class_duration_minutes: 60,
            checkin_tolerance_minutes: 30,
            student_min_booking_notice_minutes: 0,
            student_reschedule_min_notice_minutes: 0,
            late_cancel_threshold_minutes: 120,
            late_cancel_penalty_credits: 1,
            no_show_penalty_credits: 1,
            teacher_minutes_per_class: 60,
            teacher_rest_minutes_between_classes: 10,
            teacher_max_daily_classes: 12,
            max_future_booking_days: 30,
            max_cancel_per_month: 0,
        };
        const { data: ov } = await supabase_1.supabase
            .from('academy_policy_overrides')
            .select('overrides')
            .eq('academy_id', id)
            .maybeSingle();
        const overrides = (ov?.overrides || {});
        const effective = { ...base, ...overrides };
        return res.json({ success: true, effective, published: !!published, overrides });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=academies.js.map