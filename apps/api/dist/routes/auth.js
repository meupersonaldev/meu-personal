"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const resend_1 = require("resend");
const supabase_1 = require("../lib/supabase");
const franqueadora_contacts_service_1 = require("../services/franqueadora-contacts.service");
const audit_1 = require("../middleware/audit");
const router = express_1.default.Router();
function normalizeCref(v) {
    if (!v)
        return v;
    return v.toUpperCase().replace(/\s+/g, ' ').trim();
}
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    phone: zod_1.z.string().optional(),
    cpf: zod_1.z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
    role: zod_1.z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
    cref: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional()
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido')
});
const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const resendClient = resendApiKey ? new resend_1.Resend(resendApiKey) : null;
router.post('/login', (0, audit_1.auditAuthEvent)('LOGIN'), async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const { data: users, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, name, email, phone, role, credits, avatar_url, is_active, password_hash, password')
            .eq('email', email)
            .eq('is_active', true)
            .single();
        if (userError || !users) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }
        let validPassword = false;
        if (users.password_hash) {
            validPassword = await bcryptjs_1.default.compare(password, users.password_hash);
        }
        else if (users.password) {
            validPassword = users.password === password;
            if (validPassword) {
                const newHash = await bcryptjs_1.default.hash(password, 10);
                await supabase_1.supabase
                    .from('users')
                    .update({ password_hash: newHash, password: null, updated_at: new Date().toISOString() })
                    .eq('id', users.id);
            }
        }
        if (!validPassword) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }
        const isProd = process.env.NODE_ENV === 'production';
        const jwtSecret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '');
        if (!jwtSecret || (isProd && jwtSecret.length < 32)) {
            throw new Error('JWT_SECRET inválido (produção exige >=32 chars)');
        }
        const jwtSecretKey = jwtSecret;
        const expiresIn = (process.env.JWT_EXPIRES_IN || '15m');
        const jwtOptions = {
            expiresIn
        };
        const token = jsonwebtoken_1.default.sign({
            userId: users.id,
            email: users.email,
            role: users.role,
            iat: Math.floor(Date.now() / 1000)
        }, jwtSecretKey, jwtOptions);
        try {
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('auth-token', token, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });
        }
        catch { }
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
            console.warn('Validação de login falhou:', JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/register', (0, audit_1.auditSensitiveOperation)('CREATE', 'users'), async (req, res) => {
    try {
        const userData = registerSchema.parse(req.body);
        if (userData.role === 'TEACHER') {
            if (!userData.cref || !userData.cref.trim()) {
                return res.status(400).json({ message: 'CREF é obrigatório para professores' });
            }
            if (!userData.specialties || userData.specialties.length === 0) {
                return res.status(400).json({ message: 'Informe ao menos uma especialidade' });
            }
        }
        const sanitizedCpf = userData.cpf.replace(/\D/g, '');
        const { data: existingUser, error: checkError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();
        if (existingUser) {
            return res.status(400).json({ message: 'Email já está em uso' });
        }
        const { data: existingCpfUsers, error: cpfCheckError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('cpf', sanitizedCpf)
            .limit(1);
        if (cpfCheckError) {
            console.error('Erro ao verificar CPF existente:', cpfCheckError);
            return res.status(500).json({ message: 'Erro ao validar CPF' });
        }
        if (existingCpfUsers && existingCpfUsers.length > 0) {
            return res.status(400).json({ message: 'CPF já está em uso' });
        }
        const passwordHash = await bcryptjs_1.default.hash(userData.password, 10);
        const { data: franqueadora } = await supabase_1.supabase
            .from('franqueadora')
            .select('id')
            .eq('is_active', true)
            .single();
        const newUser = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone || null,
            cpf: sanitizedCpf,
            role: userData.role,
            credits: userData.role === 'STUDENT' ? 5 : 0,
            is_active: true,
            password_hash: passwordHash,
            franchisor_id: franqueadora?.id || null,
            franchise_id: null
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
        try {
            await (0, franqueadora_contacts_service_1.ensureFranqueadoraContact)({
                userId: createdUser.id,
                role: createdUser.role,
                origin: 'SELF_REGISTRATION',
            });
        }
        catch (contactError) {
            console.warn('Falha ao sincronizar contato da franqueadora:', contactError);
        }
        if (userData.role === 'TEACHER') {
            const crefNormalized = normalizeCref(userData.cref || '');
            const { error: profileError } = await supabase_1.supabase
                .from('teacher_profiles')
                .insert([{
                    user_id: createdUser.id,
                    bio: '',
                    specialization: Array.isArray(userData.specialties) ? userData.specialties : [],
                    hourly_rate: 0,
                    availability: {},
                    is_available: false,
                    cref: crefNormalized || null
                }]);
            if (profileError) {
                if (profileError.code === '23505') {
                    return res.status(409).json({ message: 'CREF já cadastrado' });
                }
                console.error('Erro ao criar perfil de professor:', profileError);
                return res.status(500).json({ message: 'Erro ao criar perfil de professor' });
            }
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres para segurança');
        }
        const jwtSecretKey = jwtSecret;
        const expiresIn = (process.env.JWT_EXPIRES_IN || '15m');
        const jwtOptions = {
            expiresIn
        };
        const token = jsonwebtoken_1.default.sign({
            userId: createdUser.id,
            email: createdUser.email,
            role: createdUser.role,
            iat: Math.floor(Date.now() / 1000)
        }, jwtSecretKey, jwtOptions);
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
            console.warn('Validação de registro falhou:', JSON.stringify(error.errors, null, 2));
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
        const isProd = process.env.NODE_ENV === 'production';
        const jwtSecret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '');
        if (!jwtSecret || (isProd && jwtSecret.length < 32)) {
            throw new Error('JWT_SECRET inválido (produção exige >=32 chars)');
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
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
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const { data: user, error } = await supabase_1.supabase
            .from('users')
            .select('id, name')
            .eq('email', email)
            .eq('is_active', true)
            .single();
        if (user && !error) {
            const isProd = process.env.NODE_ENV === 'production';
            const jwtSecret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '');
            const resetToken = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: email,
                type: 'password_reset'
            }, jwtSecret, { expiresIn: '1h' });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = new URL('/redefinir-senha', frontendUrl);
            resetUrl.searchParams.set('token', resetToken);
            const resetLink = resetUrl.toString();
            if (resendClient && resendFromEmail) {
                try {
                    await resendClient.emails.send({
                        from: resendFromEmail,
                        to: email,
                        subject: 'Redefinição de senha - Meu Personal',
                        html: `
              <p>Olá ${user.name || ''},</p>
              <p>Recebemos uma solicitação para redefinir a sua senha na plataforma Meu Personal.</p>
              <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Clique aqui para criar uma nova senha</a>.</p>
              <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
              <p>Atenciosamente,<br/>Equipe Meu Personal</p>
            `,
                        text: [
                            `Olá ${user.name || ''},`,
                            '',
                            'Recebemos uma solicitação para redefinir a sua senha na plataforma Meu Personal.',
                            `Acesse o link a seguir para criar uma nova senha: ${resetLink}`,
                            '',
                            'Se você não solicitou essa alteração, ignore este e-mail.',
                            '',
                            'Equipe Meu Personal'
                        ].join('\n')
                    });
                }
                catch (sendError) {
                    console.error('Erro ao enviar email de redefinição de senha via Resend:', sendError);
                }
            }
            else {
                console.warn('Resend não está configurado. Token de redefinição gerado:', resetToken);
            }
            const tokenHash = await bcryptjs_1.default.hash(resetToken, 10);
            await supabase_1.supabase
                .from('users')
                .update({
                reset_token_hash: tokenHash,
                reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
            })
                .eq('id', user.id);
        }
        res.json({
            message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Email inválido',
                errors: error.errors
            });
        }
        console.error('Erro em forgot-password:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/reset-password', (0, audit_1.auditSensitiveOperation)('SENSITIVE_CHANGE', 'users'), async (req, res) => {
    try {
        const { password, token } = zod_1.z.object({
            password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
            token: zod_1.z.string().min(1, 'Token é obrigatório')
        }).parse(req.body);
        const isProd = process.env.NODE_ENV === 'production';
        const jwtSecret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '');
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (decoded.type !== 'password_reset') {
            return res.status(401).json({ message: 'Token inválido' });
        }
        const { data: user, error } = await supabase_1.supabase
            .from('users')
            .select('id, reset_token_hash, reset_token_expires_at')
            .eq('id', decoded.userId)
            .eq('email', decoded.email)
            .single();
        if (error || !user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        if (user.reset_token_expires_at && new Date(user.reset_token_expires_at) < new Date()) {
            return res.status(401).json({ message: 'Token expirado' });
        }
        const isValidToken = await bcryptjs_1.default.compare(token, user.reset_token_hash);
        if (!isValidToken) {
            return res.status(401).json({ message: 'Token inválido' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await supabase_1.supabase
            .from('users')
            .update({
            password_hash: passwordHash,
            password: null,
            reset_token_hash: null,
            reset_token_expires_at: null,
            updated_at: new Date().toISOString()
        })
            .eq('id', user.id);
        res.json({
            message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: 'Token inválido ou expirado' });
        }
        console.error('Erro em reset-password:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
router.post('/verify-password', async (req, res) => {
    try {
        const { email, password } = zod_1.z.object({
            email: zod_1.z.string().email('Email inválido'),
            password: zod_1.z.string().min(1, 'Senha é obrigatória')
        }).parse(req.body);
        const { data: userData, error: userError } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (userError || !userData) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }
        if (!userData.is_active) {
            return res.status(401).json({
                error: 'Usuário inativo'
            });
        }
        let validPassword = false;
        if (userData.password_hash) {
            validPassword = await bcryptjs_1.default.compare(password, userData.password_hash);
        }
        else if (userData.password) {
            validPassword = userData.password === password;
            if (validPassword) {
                const newHash = await bcryptjs_1.default.hash(password, 10);
                await supabase_1.supabase
                    .from('users')
                    .update({ password_hash: newHash, password: null, updated_at: new Date().toISOString() })
                    .eq('id', userData.id);
            }
        }
        if (!validPassword) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }
        const { data: adminData, error: adminError } = await supabase_1.supabase
            .from('franqueadora_admins')
            .select('*')
            .eq('user_id', userData.id)
            .single();
        if (adminError || !adminData) {
            return res.status(403).json({
                error: 'Usuário não é administrador da franqueadora'
            });
        }
        const { data: franqueadoraData, error: franqueadoraError } = await supabase_1.supabase
            .from('franqueadora')
            .select('*')
            .eq('id', adminData.franqueadora_id)
            .single();
        if (franqueadoraError || !franqueadoraData) {
            console.warn('Franqueadora not found for admin:', franqueadoraError);
        }
        res.json({
            valid: true,
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: adminData.role
            },
            franqueadora: franqueadoraData || null
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Error verifying password:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/check-email', async (req, res) => {
    try {
        const { email } = zod_1.z.object({
            email: zod_1.z.string().email('Email inválido')
        }).parse(req.body);
        const { data: userData, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();
        res.json({
            exists: !userError && !!userData
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Email inválido',
                errors: error.errors
            });
        }
        console.error('Error checking email:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map