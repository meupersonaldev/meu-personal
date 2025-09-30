"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const router = express_1.default.Router();
const teacherSchema = zod_1.z.object({
    bio: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    hourly_rate: zod_1.z.number().min(0).optional(),
    availability: zod_1.z.object({}).optional(),
    is_available: zod_1.z.boolean().optional()
});
const createTeacherSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    email: zod_1.z.string().email('Email inválido'),
    phone: zod_1.z.string().optional(),
    academy_id: zod_1.z.string().uuid('Academy ID inválido'),
    avatar_url: zod_1.z.string().url().optional(),
    bio: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    hourly_rate: zod_1.z.number().min(0).optional(),
    availability: zod_1.z.object({}).optional(),
    commission_rate: zod_1.z.number().min(0).max(1).optional()
});
router.get('/', async (req, res) => {
    try {
        const { academy_id, city, state } = req.query;
        let query = supabase_1.supabase
            .from('users')
            .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers!inner (
          id,
          academy_id,
          status,
          commission_rate,
          academies (
            id,
            name,
            city,
            state,
            address,
            phone,
            email
          )
        ),
        teacher_subscriptions (
          id,
          status,
          start_date,
          end_date,
          teacher_plans (
            name,
            price,
            commission_rate,
            features
          )
        )
      `)
            .eq('role', 'TEACHER')
            .eq('is_active', true)
            .eq('academy_teachers.status', 'active')
            .order('created_at', { ascending: false });
        if (academy_id) {
            query = query.eq('academy_teachers.academy_id', academy_id);
        }
        const { data: teachers, error } = await query;
        if (error) {
            console.error('Erro ao buscar professores:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        let filteredTeachers = teachers || [];
        if (city) {
            filteredTeachers = filteredTeachers.filter(teacher => teacher.academy_teachers?.some((at) => at.academies?.city?.toLowerCase().includes(city.toLowerCase())));
        }
        if (state) {
            filteredTeachers = filteredTeachers.filter(teacher => teacher.academy_teachers?.some((at) => at.academies?.state?.toLowerCase() === state.toLowerCase()));
        }
        filteredTeachers = filteredTeachers.filter(teacher => teacher.teacher_profiles?.[0]?.is_available === true);
        res.json(filteredTeachers);
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: teacher, error } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers (
          id,
          academy_id,
          status,
          commission_rate,
          academies (
            name,
            email,
            phone,
            address,
            city,
            state
          )
        ),
        teacher_subscriptions (
          id,
          status,
          start_date,
          end_date,
          next_due_date,
          asaas_subscription_id,
          teacher_plans (
            name,
            description,
            price,
            commission_rate,
            features
          )
        ),
        bookings (
          id,
          date,
          duration,
          status,
          notes,
          credits_cost,
          student:users!bookings_student_id_fkey (
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
            .eq('role', 'TEACHER')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Professor não encontrado' });
            }
            console.error('Erro ao buscar professor:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(teacher);
    }
    catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = teacherSchema.parse(req.body);
        const { data: teacher, error: teacherError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (teacherError || !teacher) {
            return res.status(404).json({ message: 'Professor não encontrado' });
        }
        const { data: updatedProfile, error: updateError } = await supabase_1.supabase
            .from('teacher_profiles')
            .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
            .eq('user_id', id)
            .select()
            .single();
        if (updateError) {
            console.error('Erro ao atualizar professor:', updateError);
            return res.status(500).json({ message: 'Erro ao atualizar professor' });
        }
        res.json({
            message: 'Professor atualizado com sucesso',
            profile: updatedProfile
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
router.post('/', async (req, res) => {
    try {
        const validatedData = createTeacherSchema.parse(req.body);
        const { name, email, phone, academy_id, avatar_url, bio, specialties, hourly_rate, availability, commission_rate } = validatedData;
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
            role: 'TEACHER',
            avatar_url,
            is_active: true
        })
            .select()
            .single();
        if (userError) {
            console.error('Erro ao criar usuário:', userError);
            return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        const { data: profile, error: profileError } = await supabase_1.supabase
            .from('teacher_profiles')
            .insert({
            user_id: user.id,
            bio: bio || '',
            specialties: specialties || [],
            hourly_rate: hourly_rate || 0,
            availability: availability || {},
            is_available: true
        })
            .select()
            .single();
        if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({ error: 'Erro ao criar perfil do professor' });
        }
        const { data: academyTeacher, error: academyError } = await supabase_1.supabase
            .from('academy_teachers')
            .insert({
            teacher_id: user.id,
            academy_id,
            status: 'active',
            commission_rate: commission_rate || 0.70
        })
            .select()
            .single();
        if (academyError) {
            console.error('Erro ao associar com academia:', academyError);
            await supabase_1.supabase.from('teacher_profiles').delete().eq('user_id', user.id);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({ error: 'Erro ao associar professor com academia' });
        }
        const { data: fullTeacher, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers (
          id,
          academy_id,
          status,
          commission_rate,
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
            return res.status(500).json({ error: 'Professor criado, mas erro ao buscar dados' });
        }
        res.status(201).json(fullTeacher);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: existingTeacher } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (!existingTeacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
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
        const { error: profileError } = await supabase_1.supabase
            .from('teacher_profiles')
            .update({
            is_available: false,
            updated_at: new Date().toISOString()
        })
            .eq('user_id', id);
        if (profileError) {
            console.error('Erro ao desativar perfil:', profileError);
            return res.status(500).json({ error: 'Erro ao desativar perfil' });
        }
        const { error: academyError } = await supabase_1.supabase
            .from('academy_teachers')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
        })
            .eq('teacher_id', id);
        if (academyError) {
            console.error('Erro ao desativar associação:', academyError);
            return res.status(500).json({ error: 'Erro ao desativar associação' });
        }
        res.json({ message: 'Professor desativado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: teacher } = await supabase_1.supabase
            .from('users')
            .select('id, created_at')
            .eq('id', id)
            .eq('role', 'TEACHER')
            .single();
        if (!teacher) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        const [bookingsData, transactionsData, subscriptionData, profileData] = await Promise.all([
            supabase_1.supabase
                .from('bookings')
                .select('id, status, date, credits_cost')
                .eq('teacher_id', id),
            supabase_1.supabase
                .from('transactions')
                .select('id, type, amount, created_at')
                .eq('user_id', id),
            supabase_1.supabase
                .from('teacher_subscriptions')
                .select(`
          *,
          teacher_plans (
            name,
            price,
            commission_rate,
            features
          )
        `)
                .eq('teacher_id', id)
                .eq('status', 'active')
                .single(),
            supabase_1.supabase
                .from('teacher_profiles')
                .select('rating, total_reviews, hourly_rate')
                .eq('user_id', id)
                .single()
        ]);
        const bookings = bookingsData.data || [];
        const transactions = transactionsData.data || [];
        const subscription = subscriptionData.data;
        const profile = profileData.data;
        const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
        const totalRevenue = completedBookings.reduce((sum, b) => {
            const rate = profile?.hourly_rate || 0;
            const duration = 60;
            return sum + (rate * (duration / 60));
        }, 0);
        const stats = {
            total_bookings: bookings.length,
            completed_bookings: completedBookings.length,
            pending_bookings: bookings.filter(b => b.status === 'PENDING').length,
            cancelled_bookings: bookings.filter(b => b.status === 'CANCELLED').length,
            total_students: new Set(bookings.map(b => b.student_id)).size,
            total_revenue: totalRevenue,
            rating: profile?.rating || 0,
            total_reviews: profile?.total_reviews || 0,
            hourly_rate: profile?.hourly_rate || 0,
            current_subscription: subscription,
            last_booking_date: bookings.length > 0
                ? bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
                : null,
            join_date: teacher.created_at,
            monthly_earnings: {
                current_month: completedBookings
                    .filter(b => {
                    const bookingDate = new Date(b.date);
                    const now = new Date();
                    return bookingDate.getMonth() === now.getMonth() &&
                        bookingDate.getFullYear() === now.getFullYear();
                })
                    .reduce((sum, b) => {
                    const rate = profile?.hourly_rate || 0;
                    return sum + (rate * 1);
                }, 0)
            }
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: profile, error } = await supabase_1.supabase
            .from('teacher_profiles')
            .select('availability, is_available')
            .eq('user_id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Professor não encontrado' });
            }
            console.error('Erro ao buscar disponibilidade:', error);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(profile);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { availability, is_available } = req.body;
        const updates = {
            updated_at: new Date().toISOString()
        };
        if (availability !== undefined)
            updates.availability = availability;
        if (is_available !== undefined)
            updates.is_available = is_available;
        const { data, error } = await supabase_1.supabase
            .from('teacher_profiles')
            .update(updates)
            .eq('user_id', id)
            .select('availability, is_available')
            .single();
        if (error) {
            console.error('Erro ao atualizar disponibilidade:', error);
            return res.status(500).json({ error: 'Erro ao atualizar disponibilidade' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=teachers.js.map