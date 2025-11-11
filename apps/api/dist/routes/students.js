"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { academy_id } = req.query;
        let query = supabase_1.supabase
            .from('users')
            .select(`
        *,
        academy_students!inner (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          last_activity,
          academies (
            name,
            city,
            state
          )
        ),
        student_subscriptions (
          id,
          status,
          credits_remaining,
          start_date,
          end_date,
          student_plans (
            name,
            price,
            credits_included
          )
        )
      `)
            .eq('role', 'STUDENT')
            .order('created_at', { ascending: false });
        if (academy_id) {
            query = query.eq('academy_students.academy_id', academy_id);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar alunos:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          last_activity,
          academies (
            name,
            email,
            phone,
            address,
            city,
            state
          )
        ),
        student_subscriptions (
          id,
          status,
          credits_remaining,
          start_date,
          end_date,
          next_due_date,
          asaas_subscription_id,
          student_plans (
            name,
            description,
            price,
            credits_included,
            validity_days
          )
        ),
        bookings (
          id,
          date,
          duration,
          status,
          notes,
          credits_cost,
          teacher:users!bookings_teacher_id_fkey (
            name,
            email
          )
        ),
        transactions (
          id,
          type,
          amount,
          description,
          created_at
        )
      `)
            .eq('id', id)
            .eq('role', 'STUDENT')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Aluno não encontrado' });
            }
            console.error('Erro ao buscar aluno:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, academy_id, plan_id, avatar_url, credits } = req.body;
        if (!name || !email || !academy_id) {
            return res.status(400).json({
                error: 'Nome, email e academia são obrigatórios'
            });
        }
        const { data: existingUser } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (existingUser) {
            return res.status(409).json({
                error: 'Email já está em uso'
            });
        }
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .insert({
            name,
            email,
            phone,
            role: 'STUDENT',
            avatar_url,
            credits: credits ?? 0,
            is_active: true
        })
            .select()
            .single();
        if (userError) {
            console.error('Erro ao criar usuário:', userError);
            return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        const { data: academyStudent, error: academyError } = await supabase_1.supabase
            .from('academy_students')
            .insert({
            student_id: user.id,
            academy_id,
            plan_id,
            status: 'active'
        })
            .select()
            .single();
        if (academyError) {
            console.error('Erro ao associar com academia:', academyError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({ error: 'Erro ao associar aluno com academia' });
        }
        const { data: fullStudent, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          academies (
            name,
            city,
            state
          )
        )
      `)
            .eq('id', user.id)
            .single();
        if (fetchError) {
            console.error('Erro ao buscar dados completos:', fetchError);
            return res.status(500).json({ error: 'Aluno criado, mas erro ao buscar dados' });
        }
        res.status(201).json(fullStudent);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, avatar_url, is_active, academy_id, plan_id, status, credits } = req.body;
        const { data: existingStudent } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'STUDENT')
            .single();
        if (!existingStudent) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        if (email) {
            const { data: existingEmail } = await supabase_1.supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .neq('id', id)
                .single();
            if (existingEmail) {
                return res.status(409).json({
                    error: 'Email já está em uso por outro usuário'
                });
            }
        }
        const userUpdates = {};
        if (name !== undefined)
            userUpdates.name = name;
        if (email !== undefined)
            userUpdates.email = email;
        if (phone !== undefined)
            userUpdates.phone = phone;
        if (avatar_url !== undefined)
            userUpdates.avatar_url = avatar_url;
        if (is_active !== undefined)
            userUpdates.is_active = is_active;
        if (credits !== undefined)
            userUpdates.credits = credits;
        if (Object.keys(userUpdates).length > 0) {
            userUpdates.updated_at = new Date().toISOString();
            const { error: userError } = await supabase_1.supabase
                .from('users')
                .update(userUpdates)
                .eq('id', id);
            if (userError) {
                console.error('Erro ao atualizar usuário:', userError);
                return res.status(500).json({ error: 'Erro ao atualizar dados do usuário' });
            }
        }
        const academyUpdates = {};
        if (academy_id !== undefined)
            academyUpdates.academy_id = academy_id;
        if (plan_id !== undefined)
            academyUpdates.plan_id = plan_id;
        if (status !== undefined)
            academyUpdates.status = status;
        if (Object.keys(academyUpdates).length > 0) {
            academyUpdates.updated_at = new Date().toISOString();
            const { error: academyError } = await supabase_1.supabase
                .from('academy_students')
                .update(academyUpdates)
                .eq('student_id', id);
            if (academyError) {
                console.error('Erro ao atualizar associação:', academyError);
                return res.status(500).json({ error: 'Erro ao atualizar associação com academia' });
            }
        }
        const { data: updatedStudent, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          last_activity,
          academies (
            name,
            city,
            state
          )
        ),
        student_subscriptions (
          id,
          status,
          credits_remaining,
          start_date,
          end_date,
          student_plans (
            name,
            price,
            credits_included
          )
        )
      `)
            .eq('id', id)
            .single();
        if (fetchError) {
            console.error('Erro ao buscar dados atualizados:', fetchError);
            return res.status(500).json({ error: 'Dados atualizados, mas erro ao buscar' });
        }
        res.json(updatedStudent);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: existingStudent } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'STUDENT')
            .single();
        if (!existingStudent) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        const { error: userError } = await supabase_1.supabase
            .from('users')
            .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (userError) {
            console.error('Erro ao desativar usuário:', userError);
            return res.status(500).json({ error: 'Erro ao desativar usuário' });
        }
        const { error: academyError } = await supabase_1.supabase
            .from('academy_students')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
        })
            .eq('student_id', id);
        if (academyError) {
            console.error('Erro ao desativar associação:', academyError);
            return res.status(500).json({ error: 'Erro ao desativar associação' });
        }
        res.json({ message: 'Aluno desativado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: student } = await supabase_1.supabase
            .from('users')
            .select('id, created_at')
            .eq('id', id)
            .eq('role', 'STUDENT')
            .single();
        if (!student) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        const [bookingsData, transactionsData, subscriptionData] = await Promise.all([
            supabase_1.supabase
                .from('bookings')
                .select('id, status, date, credits_cost')
                .eq('student_id', id),
            supabase_1.supabase
                .from('transactions')
                .select('id, type, amount, created_at')
                .eq('user_id', id),
            supabase_1.supabase
                .from('student_subscriptions')
                .select(`
          *,
          student_plans (
            name,
            price,
            credits_included
          )
        `)
                .eq('student_id', id)
                .eq('status', 'active')
                .single()
        ]);
        const bookings = bookingsData.data || [];
        const transactions = transactionsData.data || [];
        const subscription = subscriptionData.data;
        const stats = {
            total_bookings: bookings.length,
            completed_bookings: bookings.filter(b => b.status === 'COMPLETED').length,
            pending_bookings: bookings.filter(b => b.status === 'PENDING').length,
            cancelled_bookings: bookings.filter(b => b.status === 'CANCELLED').length,
            total_credits_spent: bookings.reduce((sum, b) => sum + (b.credits_cost || 0), 0),
            total_transactions: transactions.length,
            total_spent: transactions
                .filter(t => ['CREDIT_PURCHASE', 'BOOKING_PAYMENT'].includes(t.type))
                .reduce((sum, t) => sum + t.amount, 0),
            current_subscription: subscription,
            last_booking_date: bookings.length > 0
                ? bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
                : null,
            join_date: student.created_at
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=students.js.map