"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { franchise_admin_id, limit = 50, unread_only } = req.query;
        if (!franchise_admin_id) {
            return res.status(400).json({ error: 'franchise_admin_id é obrigatório' });
        }
        let query = supabase_1.supabase
            .from('franchise_notifications')
            .select('*')
            .eq('franchise_admin_id', franchise_admin_id)
            .order('created_at', { ascending: false })
            .limit(Number(limit));
        if (unread_only === 'true') {
            query = query.eq('is_read', false);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabase
            .from('franchise_notifications')
            .update({ is_read: true })
            .eq('id', id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/read-all', async (req, res) => {
    try {
        const { franchise_admin_id } = req.body;
        if (!franchise_admin_id) {
            return res.status(400).json({ error: 'franchise_admin_id é obrigatório' });
        }
        const { error } = await supabase_1.supabase
            .from('franchise_notifications')
            .update({ is_read: true })
            .eq('franchise_admin_id', franchise_admin_id)
            .eq('is_read', false);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { franchise_admin_id, type, title, message, data = {} } = req.body;
        if (!franchise_admin_id || !type || !title || !message) {
            return res.status(400).json({
                error: 'franchise_admin_id, type, title e message são obrigatórios'
            });
        }
        const { data: notification, error } = await supabase_1.supabase
            .from('franchise_notifications')
            .insert({
            franchise_admin_id,
            type,
            title,
            message,
            data
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(notification);
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
async function createNotification(franchise_admin_id, type, title, message, data = {}) {
    try {
        const { data: notification, error } = await supabase_1.supabase
            .from('franchise_notifications')
            .insert({
            franchise_admin_id,
            type,
            title,
            message,
            data
        })
            .select()
            .single();
        if (error)
            throw error;
        return notification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}
exports.default = router;
//# sourceMappingURL=notifications.js.map