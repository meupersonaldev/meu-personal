"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.createUserNotification = createUserNotification;
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const notify_1 = require("../lib/notify");
const notificationTypes = [
    'new_booking',
    'booking_cancelled',
    'checkin',
    'new_student',
    'payment_received',
    'plan_purchased',
    'teacher_approval_needed',
    'student_approval_needed',
    'new_teacher',
    'booking_created'
];
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { academy_id, franchise_admin_id, franqueadora_id, user_id, limit = 50, unread_only, since } = req.query;
        const academyId = academy_id || franchise_admin_id;
        const userId = user_id;
        if (!academyId && !franqueadora_id && !userId) {
            return res.status(400).json({ error: 'academy_id, franqueadora_id ou user_id obrigatorio' });
        }
        let academyIds = null;
        if (academyId)
            academyIds = [academyId];
        if (!academyId && franqueadora_id) {
            const { data: academies } = await supabase_1.supabase
                .from('academies')
                .select('id')
                .eq('franqueadora_id', franqueadora_id)
                .eq('is_active', true);
            academyIds = (academies || []).map((a) => a.id);
        }
        const limitN = parseInt(limit);
        let query = supabase_1.supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Number.isNaN(limitN) ? 50 : limitN);
        if (academyIds && academyIds.length > 0) {
            if (academyIds.length === 1)
                query = query.eq('academy_id', academyIds[0]);
            else
                query = query.in('academy_id', academyIds);
        }
        if (unread_only === 'true') {
            query = query.eq('read', false);
        }
        if (since) {
            const sinceDate = new Date(since);
            if (!Number.isNaN(sinceDate.getTime()))
                query = query.gte('created_at', sinceDate.toISOString());
        }
        const { data: notifications, error } = await query;
        if (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ error: 'Erro ao buscar notificacoes' });
        }
        let countQuery = supabase_1.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('read', false);
        if (academyIds && academyIds.length > 0) {
            if (academyIds.length === 1)
                countQuery = countQuery.eq('academy_id', academyIds[0]);
            else
                countQuery = countQuery.in('academy_id', academyIds);
        }
        const { count: unreadCount } = await countQuery;
        res.json({ notifications: notifications || [], unreadCount: unreadCount || 0 });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: notification, error } = await supabase_1.supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({ error: 'Erro ao marcar como lida' });
        }
        res.json({ notification });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.patch('/mark-all-read', async (req, res) => {
    try {
        const body = req.body || {};
        const academyId = body.academy_id || req.query.academy_id;
        const franqueadoraId = body.franqueadora_id || req.query.franqueadora_id;
        if (!academyId && !franqueadoraId) {
            return res.status(400).json({ error: 'academy_id ou franqueadora_id obrigatorio' });
        }
        let query = supabase_1.supabase
            .from('notifications')
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('read', false);
        if (academyId) {
            query = query.eq('academy_id', academyId);
        }
        else if (franqueadoraId) {
            const { data: academies } = await supabase_1.supabase
                .from('academies')
                .select('id')
                .eq('franqueadora_id', franqueadoraId)
                .eq('is_active', true);
            const ids = (academies || []).map((a) => a.id);
            if (ids.length > 0)
                query = query.in('academy_id', ids);
            else
                return res.json({ message: 'Nenhuma academia encontrada; nada a marcar' });
        }
        const { error } = await query;
        if (error) {
            console.error('Error marking all as read:', error);
            return res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
        }
        res.json({ message: 'Todas marcadas como lidas' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const notificationSchema = zod_1.z.object({
            academy_id: zod_1.z.string().uuid(),
            type: zod_1.z.enum(notificationTypes),
            title: zod_1.z.string().min(1).max(255),
            message: zod_1.z.string().min(1),
            data: zod_1.z.record(zod_1.z.any()).optional()
        });
        const validatedData = notificationSchema.parse(req.body);
        const { data: notification, error } = await supabase_1.supabase
            .from('notifications')
            .insert({ ...validatedData, read: false, created_at: new Date().toISOString() })
            .select()
            .single();
        if (error) {
            console.error('Error creating notification:', error);
            return res.status(500).json({ error: 'Erro ao criar notificacao' });
        }
        try {
            (0, notify_1.publish)((0, notify_1.topicForAcademy)(notification.academy_id), { event: 'notification', notification });
            if (notification.user_id)
                (0, notify_1.publish)((0, notify_1.topicForUser)(notification.user_id), { event: 'notification', notification });
            const { data: academy } = await supabase_1.supabase
                .from('academies')
                .select('franqueadora_id')
                .eq('id', notification.academy_id)
                .single();
            if (academy?.franqueadora_id)
                (0, notify_1.publish)((0, notify_1.topicForFranqueadora)(academy.franqueadora_id), { event: 'notification', notification });
        }
        catch { }
        res.status(201).json({ notification });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Dados invalidos', details: err.errors });
        }
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({ error: 'Erro ao deletar notificacao' });
        }
        res.json({ message: 'Notificacao deletada' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
async function createNotification(academy_id, type, title, message, data = {}) {
    try {
        const { data: rows } = await supabase_1.supabase.from('notifications').insert({
            academy_id,
            type,
            title,
            message,
            data,
            read: false,
            created_at: new Date().toISOString()
        }).select('*');
        try {
            const inserted = Array.isArray(rows) ? rows[0] : rows;
            if (inserted) {
                (0, notify_1.publish)((0, notify_1.topicForAcademy)(academy_id), { event: 'notification', notification: inserted });
                const { data: academy } = await supabase_1.supabase
                    .from('academies')
                    .select('franqueadora_id')
                    .eq('id', academy_id)
                    .single();
                if (academy?.franqueadora_id)
                    (0, notify_1.publish)((0, notify_1.topicForFranqueadora)(academy.franqueadora_id), { event: 'notification', notification: inserted });
            }
        }
        catch { }
        return true;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        return false;
    }
}
async function createUserNotification(user_id, type, title, message, data = {}) {
    try {
        const { data: rows } = await supabase_1.supabase.from('notifications').insert({
            user_id,
            type,
            title,
            message,
            data,
            read: false,
            created_at: new Date().toISOString()
        }).select('*');
        try {
            const inserted = Array.isArray(rows) ? rows[0] : rows;
            if (inserted)
                (0, notify_1.publish)((0, notify_1.topicForUser)(user_id), { event: 'notification', notification: inserted });
        }
        catch { }
        return true;
    }
    catch (error) {
        console.error('Error creating user notification:', error);
        return false;
    }
}
router.get('/stream', auth_1.requireAuth, async (req, res) => {
    try {
        const { academy_id, user_id, franqueadora_id, since } = req.query;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        const send = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        if (since) {
            const sinceDate = new Date(since);
            if (!Number.isNaN(sinceDate.getTime())) {
                try {
                    const { data } = await supabase_1.supabase
                        .from('notifications')
                        .select('*')
                        .gte('created_at', sinceDate.toISOString())
                        .order('created_at', { ascending: true })
                        .limit(100);
                    for (const n of data || [])
                        send('notification', { notification: n });
                }
                catch { }
            }
        }
        const unsubs = [];
        const onMessage = (payload) => send('notification', payload);
        if (academy_id)
            unsubs.push((0, notify_1.subscribe)((0, notify_1.topicForAcademy)(academy_id), onMessage));
        if (user_id && user_id === (req.user?.userId || ''))
            unsubs.push((0, notify_1.subscribe)((0, notify_1.topicForUser)(user_id), onMessage));
        if (franqueadora_id) {
            let allowed = false;
            try {
                if (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN') {
                    allowed = true;
                }
                else {
                    const { data: fa } = await supabase_1.supabase
                        .from('franqueadora_admins')
                        .select('franqueadora_id')
                        .eq('user_id', req.user?.userId || '')
                        .single();
                    if (fa?.franqueadora_id && fa.franqueadora_id === franqueadora_id)
                        allowed = true;
                }
            }
            catch { }
            if (allowed)
                unsubs.push((0, notify_1.subscribe)((0, notify_1.topicForFranqueadora)(franqueadora_id), onMessage));
        }
        const ping = setInterval(() => send('ping', {}), 15000);
        req.on('close', () => {
            clearInterval(ping);
            unsubs.forEach(u => { try {
                u();
            }
            catch { } });
            try {
                res.end();
            }
            catch { }
        });
    }
    catch (e) {
        try {
            res.end();
        }
        catch { }
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map