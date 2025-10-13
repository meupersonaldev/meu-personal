"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const notifications_1 = require("./notifications");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { type, status = 'pending', limit = 50 } = req.query;
        let query = supabase_1.supabase
            .from('approval_requests')
            .select(`
        *,
        user:user_id(id, name, email, phone),
        academy:academy_id(id, name),
        reviewer:reviewed_by(name)
      `)
            .eq('status', status)
            .order('created_at', { ascending: false })
            .limit(Number(limit));
        if (type) {
            query = query.eq('type', type);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        res.json(data || []);
    }
    catch (error) {
        console.error('Error fetching approval requests:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { type, user_id, academy_id, requested_data } = req.body;
        if (!type || !user_id || !requested_data) {
            return res.status(400).json({
                error: 'type, user_id e requested_data são obrigatórios'
            });
        }
        const { data, error } = await supabase_1.supabase
            .from('approval_requests')
            .insert({
            type,
            user_id,
            academy_id,
            requested_data
        })
            .select(`
        *,
        user:user_id(name, email),
        academy:academy_id(name)
      `)
            .single();
        if (error)
            throw error;
        const { data: franchiseAdmin } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('user_id')
            .limit(1)
            .single();
        if (franchiseAdmin) {
            const notificationTitle = type === 'teacher_registration'
                ? 'Nova Solicitação de Professor'
                : 'Nova Solicitação de Aluno';
            const notificationMessage = type === 'teacher_registration'
                ? `${data.user?.name} solicitou cadastro como professor`
                : `${data.user?.name} solicitou cadastro como aluno${data.academy ? ` na academia ${data.academy?.name}` : ''}`;
            await (0, notifications_1.createNotification)(franchiseAdmin.user_id, type === 'teacher_registration' ? 'teacher_approval_needed' : 'student_approval_needed', notificationTitle, notificationMessage, {
                approval_request_id: data.id,
                user_id,
                type,
                requested_data
            });
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating approval request:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewed_by, rejection_reason } = req.body;
        if (!status || !reviewed_by) {
            return res.status(400).json({
                error: 'status e reviewed_by são obrigatórios'
            });
        }
        if (status === 'rejected' && !rejection_reason) {
            return res.status(400).json({
                error: 'rejection_reason é obrigatório quando status é rejected'
            });
        }
        const { data: request } = await supabase_1.supabase
            .from('approval_requests')
            .select(`
        *,
        user:user_id(id, name, email),
        academy:academy_id(id, name)
      `)
            .eq('id', id)
            .single();
        if (!request) {
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        const { data, error } = await supabase_1.supabase
            .from('approval_requests')
            .update({
            status,
            reviewed_by,
            reviewed_at: new Date().toISOString(),
            rejection_reason: status === 'rejected' ? rejection_reason : null
        })
            .eq('id', id)
            .select(`
        *,
        user:user_id(name, email),
        academy:academy_id(name),
        reviewer:reviewed_by(name)
      `)
            .single();
        if (error)
            throw error;
        if (status === 'approved') {
            try {
                if (request.type === 'teacher_registration') {
                    await supabase_1.supabase
                        .from('teacher_profiles')
                        .insert({
                        user_id: request.user_id,
                        specialties: request.requested_data.specialties || [],
                        hourly_rate: request.requested_data.hourly_rate || 80.00,
                        is_available: true
                    });
                    const { data: franchiseAdmin } = await supabase_1.supabase
                        .from('franqueadora_admins')
                        .select('user_id')
                        .limit(1)
                        .single();
                    if (franchiseAdmin) {
                        await (0, notifications_1.createNotification)(franchiseAdmin.user_id, 'new_teacher', 'Novo Professor Aprovado', `${request.user?.name} foi aprovado como professor`, {
                            teacher_id: request.user_id,
                            approval_request_id: id
                        });
                    }
                }
                else if (request.type === 'student_registration' && request.academy_id) {
                    await supabase_1.supabase
                        .from('academy_students')
                        .insert({
                        student_id: request.user_id,
                        academy_id: request.academy_id,
                        status: 'active'
                    });
                    const { data: academyAdmin } = await supabase_1.supabase
                        .from('franchise_admins')
                        .select('user_id')
                        .eq('academy_id', request.academy_id)
                        .single();
                    if (academyAdmin) {
                        await (0, notifications_1.createNotification)(academyAdmin.user_id, 'new_student', 'Novo Aluno Aprovado', `${request.user?.name} foi aprovado como aluno`, {
                            student_id: request.user_id,
                            academy_id: request.academy_id,
                            approval_request_id: id
                        });
                    }
                }
            }
            catch (processingError) {
                console.error('Error processing approved request:', processingError);
                await supabase_1.supabase
                    .from('approval_requests')
                    .update({
                    status: 'pending',
                    reviewed_by: null,
                    reviewed_at: null,
                    rejection_reason: 'Erro no processamento da aprovação'
                })
                    .eq('id', id);
                return res.status(500).json({
                    error: 'Erro ao processar aprovação'
                });
            }
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error updating approval request:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const { data: stats, error } = await supabase_1.supabase
            .from('approval_requests')
            .select('status, type');
        if (error)
            throw error;
        const summary = {
            pending: 0,
            approved: 0,
            rejected: 0,
            teacher_requests: 0,
            student_requests: 0,
            total: stats?.length || 0
        };
        stats?.forEach(item => {
            summary[item.status]++;
            if (item.type === 'teacher_registration') {
                summary.teacher_requests++;
            }
            else if (item.type === 'student_registration') {
                summary.student_requests++;
            }
        });
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching approval stats:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=approvals.js.map