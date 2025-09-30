"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(['STUDENT', 'TEACHER']).default('STUDENT')
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const { data: users, error: userError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single();
        if (userError || !users) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }
        const defaultPassword = '123456';
        if (password !== defaultPassword) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: users.id,
            email: users.email,
            role: users.role
        }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                credits: users.credits,
                avatarUrl: users.avatar_url,
                isActive: users.is_active
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/register', async (req, res) => {
    try {
        const userData = registerSchema.parse(req.body);
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();
        if (existingUser) {
            return res.status(400).json({ message: 'Email já está em uso' });
        }
        const newUser = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone || null,
            role: userData.role,
            credits: userData.role === 'STUDENT' ? 5 : 0,
            is_active: true
        };
        const { data: createdUser, error: createError } = await supabase_1.supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
        if (createError) {
            console.error('Erro ao criar usuário:', createError);
            return res.status(500).json({ message: 'Erro ao criar usuário' });
        }
        if (userData.role === 'TEACHER') {
            const { error: profileError } = await supabase_1.supabase
                .from('teacher_profiles')
                .insert([{
                    user_id: createdUser.id,
                    bio: '',
                    specialties: [],
                    hourly_rate: 0,
                    rating: null,
                    total_reviews: 0,
                    availability: {},
                    is_available: false
                }]);
            if (profileError) {
                console.error('Erro ao criar perfil de professor:', profileError);
            }
        }
        const token = jsonwebtoken_1.default.sign({
            userId: createdUser.id,
            email: createdUser.email,
            role: createdUser.role
        }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        res.status(201).json({
            message: 'Conta criada com sucesso',
            token,
            user: {
                id: createdUser.id,
                name: createdUser.name,
                email: createdUser.email,
                phone: createdUser.phone,
                role: createdUser.role,
                credits: createdUser.credits,
                avatarUrl: createdUser.avatar_url,
                isActive: createdUser.is_active
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const { data: user, error } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .eq('is_active', true)
            .single();
        if (error || !user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                credits: user.credits,
                avatarUrl: user.avatar_url,
                isActive: user.is_active
            }
        });
    }
    catch (error) {
        res.status(401).json({ message: 'Token inválido' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map