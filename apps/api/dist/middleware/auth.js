"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireFranqueadoraAdmin = requireFranqueadoraAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../lib/supabase");
const canonicalizeRole = (role) => {
    if (!role)
        return undefined;
    const normalized = role.toUpperCase();
    switch (normalized) {
        case 'ALUNO':
            return 'STUDENT';
        case 'PROFESSOR':
            return 'TEACHER';
        case 'FRANQUEADORA':
            return 'FRANCHISOR';
        case 'FRANQUIA':
            return 'FRANCHISE_ADMIN';
        case 'STUDENT':
        case 'TEACHER':
        case 'FRANCHISOR':
        case 'FRANCHISE_ADMIN':
        case 'ADMIN':
        case 'SUPER_ADMIN':
            return normalized;
        default:
            console.warn(`Role não mapeado: ${normalized}`);
            return normalized;
    }
};
function requireAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        let token = '';
        if (auth.startsWith('Bearer ')) {
            token = auth.replace('Bearer ', '');
        }
        if (!token && typeof req.headers.cookie === 'string') {
            const match = req.headers.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('auth-token='));
            if (match)
                token = match.split('=')[1];
        }
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const isProd = process.env.NODE_ENV === 'production';
        const secret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '');
        if (!secret || (isProd && secret.length < 32)) {
            return res.status(500).json({ message: 'Configuração de segurança inválida' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        return next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
function requireRole(roles) {
    const allowedRoles = new Set(roles.map(r => canonicalizeRole(r)).filter(Boolean));
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Autenticação necessária',
                error: 'AUTH_REQUIRED'
            });
        }
        const userRole = canonicalizeRole(req.user.role);
        if (!userRole || !allowedRoles.has(userRole)) {
            console.warn(`Acesso negado. User role: ${userRole}, Allowed roles: ${Array.from(allowedRoles).join(', ')}`);
            return res.status(403).json({
                message: 'Acesso negado. Permissões insuficientes.',
                error: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: Array.from(allowedRoles),
                userRole: userRole
            });
        }
        req.user.canonicalRole = userRole;
        return next();
    };
}
async function requireFranqueadoraAdmin(req, res, next) {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const userId = req.user.userId;
        let franqueadoraId = null;
        try {
            const { data, error } = await supabase_1.supabase
                .from('franqueadora_admins')
                .select('franqueadora_id')
                .eq('user_id', userId)
                .single();
            if (!error && data?.franqueadora_id) {
                franqueadoraId = data.franqueadora_id;
            }
        }
        catch { }
        const canonicalRole = req.user.canonicalRole || canonicalizeRole(req.user.role);
        const elevated = canonicalRole === 'SUPER_ADMIN' || canonicalRole === 'ADMIN';
        const rawFranqueadoraId = req.query?.franqueadora_id;
        const queryFranqueadoraId = Array.isArray(rawFranqueadoraId)
            ? rawFranqueadoraId[0] || null
            : (typeof rawFranqueadoraId === 'string' ? rawFranqueadoraId : null);
        if (!franqueadoraId) {
            if (canonicalRole === 'FRANCHISOR') {
                try {
                    const { data: userRow } = await supabase_1.supabase
                        .from('users')
                        .select('franchisor_id')
                        .eq('id', userId)
                        .single();
                    const franchisorId = userRow?.franchisor_id;
                    if (franchisorId && (!queryFranqueadoraId || queryFranqueadoraId === franchisorId)) {
                        franqueadoraId = franchisorId;
                    }
                }
                catch (err) {
                    console.warn('Não foi possível determinar franqueadora do usuário:', err);
                }
                if (!franqueadoraId && queryFranqueadoraId) {
                    franqueadoraId = queryFranqueadoraId;
                }
            }
            else if (elevated && queryFranqueadoraId) {
                franqueadoraId = queryFranqueadoraId;
            }
        }
        if (!franqueadoraId && !elevated) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (!franqueadoraId && elevated && queryFranqueadoraId) {
            franqueadoraId = queryFranqueadoraId;
        }
        if (franqueadoraId) {
            req.franqueadoraAdmin = { franqueadora_id: franqueadoraId };
        }
        return next();
    }
    catch (err) {
        return res.status(403).json({ message: 'Forbidden' });
    }
}
//# sourceMappingURL=auth.js.map