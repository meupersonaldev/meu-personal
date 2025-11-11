"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedTeacher = void 0;
const supabase_1 = require("../lib/supabase");
const requireApprovedTeacher = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || (user.role !== 'TEACHER' && user.role !== 'PROFESSOR')) {
            return next();
        }
        const { data: userData, error } = await supabase_1.supabase
            .from('users')
            .select('approval_status')
            .eq('id', user.userId)
            .single();
        if (error) {
            console.error('Error fetching user approval status:', error);
            return res.status(500).json({
                error: 'Erro ao verificar status de aprovação'
            });
        }
        if (userData.approval_status !== 'approved') {
            return res.status(403).json({
                error: 'Seu cadastro está pendente de aprovação. Aguarde a análise da administração.',
                approval_status: userData.approval_status
            });
        }
        next();
    }
    catch (error) {
        console.error('Error in requireApprovedTeacher middleware:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.requireApprovedTeacher = requireApprovedTeacher;
//# sourceMappingURL=approval.js.map