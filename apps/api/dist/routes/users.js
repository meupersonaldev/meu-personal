"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const supabase_1 = require("../lib/supabase");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role);
        if (!isAdmin && user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        const { password, ...userWithoutPassword } = data;
        res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, bio } = req.body;
        const user = req.user;
        const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role);
        if (!isAdmin && user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { data, error } = await supabase_1.supabase
            .from('users')
            .update({
            name,
            email,
            phone,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        if (typeof bio === 'string') {
            const { error: prefError } = await supabase_1.supabase
                .from('teacher_preferences')
                .upsert([{ teacher_id: id, bio, updated_at: new Date().toISOString() }], { onConflict: 'teacher_id' });
            if (prefError) {
                console.error('Erro ao salvar bio em teacher_preferences:', prefError);
            }
        }
        const { password, ...userWithoutPassword } = data;
        res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, cpf } = req.body;
        const user = req.user;
        const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role);
        if (!isAdmin && user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (cpf !== undefined) {
            const cpfSanitized = String(cpf).replace(/\D/g, '');
            if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
                return res.status(400).json({ error: 'CPF inválido' });
            }
            updateData.cpf = cpfSanitized;
        }
        const { data, error } = await supabase_1.supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        const { password, ...userWithoutPassword } = data;
        res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:id/password', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const user = req.user;
        if (user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Parâmetros inválidos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
        }
        const { data: dbUser, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select('password, password_hash')
            .eq('id', id)
            .single();
        if (fetchError || !dbUser)
            throw fetchError || new Error('Usuário não encontrado');
        let validPassword = false;
        if (dbUser.password_hash) {
            validPassword = await bcryptjs_1.default.compare(currentPassword, dbUser.password_hash);
        }
        else if (dbUser.password) {
            validPassword = dbUser.password === currentPassword;
        }
        if (!validPassword) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        const newHash = await bcryptjs_1.default.hash(newPassword, 10);
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            password_hash: newHash,
            password: null,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (updateError)
            throw updateError;
        res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
});
router.post('/:id/avatar', auth_1.requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        const user = req.user;
        if (user?.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const fileExt = path_1.default.extname(file.originalname);
        const fileName = `${id}-${(0, crypto_1.randomUUID)()}${fileExt}`;
        const filePath = `avatars/${fileName}`;
        const { error: uploadError } = await supabase_1.supabase.storage
            .from('avatars')
            .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });
        if (uploadError)
            throw uploadError;
        const { data: { publicUrl } } = supabase_1.supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (updateError)
            throw updateError;
        res.json({ avatar_url: publicUrl });
    }
    catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map