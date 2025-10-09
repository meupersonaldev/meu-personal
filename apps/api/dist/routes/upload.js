"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const supabase_1 = require("../config/supabase");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/avatars');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path_1.default.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de arquivo inválido. Use JPG ou PNG'));
        }
    }
});
router.post('/users/:id/avatar', (req, res) => {
    console.log('📸 Avatar upload request received for user:', req.params.id);
    console.log('Request headers:', req.headers);
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Arquivo muito grande. Máximo 2MB' });
                }
                return res.status(400).json({ error: `Erro no upload: ${err.message}` });
            }
            return res.status(400).json({ error: err.message });
        }
        try {
            const { id } = req.params;
            const file = req.file;
            console.log('File received:', file);
            console.log('Request body:', req.body);
            if (!file) {
                console.log('❌ No file uploaded');
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }
            const avatar_url = `${process.env.API_URL || 'http://localhost:3001'}/uploads/avatars/${file.filename}`;
            console.log('Generated avatar URL:', avatar_url);
            console.log('Updating user avatar in database...');
            const { error } = await supabase_1.supabase
                .from('users')
                .update({ avatar_url, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) {
                console.error('❌ Database error:', error);
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Failed to delete file:', unlinkError);
                }
                return res.status(500).json({ error: 'Erro ao atualizar avatar', details: error.message });
            }
            console.log('✅ Avatar updated successfully!');
            res.json({ avatar_url });
        }
        catch (error) {
            console.error('❌ Upload error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
        }
    });
});
exports.default = router;
//# sourceMappingURL=upload.js.map