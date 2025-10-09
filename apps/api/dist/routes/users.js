"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../config/supabase");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
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
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
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
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, bio } = req.body;
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
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
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
router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const { data: user, error: fetchError } = await supabase_1.supabase
            .from('users')
            .select('password')
            .eq('id', id)
            .single();
        if (fetchError)
            throw fetchError;
        if (user.password !== currentPassword) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            password: newPassword,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (updateError)
            throw updateError;
        res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const fileExt = path_1.default.extname(file.originalname);
        const fileName = `${id}-${(0, uuid_1.v4)()}${fileExt}`;
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