"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const ADMIN_ROLES = ['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN'];
const TEACHER_ROLES = ['TEACHER', 'PROFESSOR'];
const hasAdminAccess = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));
const hasTeacherScope = (user, teacherId) => Boolean(user &&
    teacherId &&
    TEACHER_ROLES.includes(user.role) &&
    user.userId === teacherId);
const ensureTeacherStudentAccess = (req, res, teacherId) => {
    const user = req.user;
    if (!user || (!hasAdminAccess(user) && !hasTeacherScope(user, teacherId))) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
};
router.get('/:teacherId/students', auth_1.requireAuth, async (req, res) => {
    try {
        const { teacherId } = req.params;
        if (!ensureTeacherStudentAccess(req, res, teacherId)) {
            return;
        }
        const { data: teacherStudents, error } = await supabase_1.supabase
            .from('teacher_students')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('name', { ascending: true });
        if (error)
            throw error;
        const studentsWithUserId = await Promise.all((teacherStudents || []).map(async (student) => {
            const { data: user } = await supabase_1.supabase
                .from('users')
                .select('id')
                .eq('email', student.email)
                .single();
            return {
                ...student,
                user_id: user?.id || null
            };
        }));
        res.json({ students: studentsWithUserId });
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:teacherId/students', auth_1.requireAuth, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { name, email, phone, notes, academy_id } = req.body;
        if (!ensureTeacherStudentAccess(req, res, teacherId)) {
            return;
        }
        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios' });
        }
        const normalizedAcademyId = typeof academy_id === 'string' && academy_id.trim() ? academy_id.trim() : null;
        const { data: existingTeacherStudent } = await supabase_1.supabase
            .from('teacher_students')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('email', email)
            .single();
        let studentData;
        if (existingTeacherStudent) {
            studentData = existingTeacherStudent;
        }
        else {
            const { data: newStudent, error: insertError } = await supabase_1.supabase
                .from('teacher_students')
                .insert({
                teacher_id: teacherId,
                name,
                email,
                phone,
                notes
            })
                .select()
                .single();
            if (insertError)
                throw insertError;
            studentData = newStudent;
        }
        console.log('🔍 Buscando usuário por email:', email);
        let userId;
        const { data: existingUser, error: searchError } = await supabase_1.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (searchError) {
            console.log('⚠️ Erro ao buscar usuário (pode ser que não existe):', searchError.message);
        }
        if (existingUser) {
            console.log('✅ Usuário já existe:', existingUser.id);
            userId = existingUser.id;
        }
        else {
            console.log('➕ Criando novo usuário na tabela users...');
            const { data: newUser, error: userError } = await supabase_1.supabase
                .from('users')
                .insert({
                email,
                name,
                phone,
                role: 'STUDENT',
                credits: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .select('id')
                .single();
            if (userError) {
                console.error('❌ Erro ao criar usuário:', userError);
                throw userError;
            }
            console.log('✅ Usuário criado com sucesso:', newUser);
            userId = newUser.id;
        }
        if (normalizedAcademyId) {
            const { data: existingAcademyStudent } = await supabase_1.supabase
                .from('academy_students')
                .select('*')
                .eq('academy_id', normalizedAcademyId)
                .eq('student_id', userId)
                .single();
            if (!existingAcademyStudent) {
                await supabase_1.supabase
                    .from('academy_students')
                    .insert({
                    academy_id: normalizedAcademyId,
                    student_id: userId,
                    status: 'active',
                    created_at: new Date().toISOString()
                });
            }
        }
        res.status(201).json({
            student: studentData,
            message: existingTeacherStudent ? 'Aluno já cadastrado, reutilizado com sucesso' : 'Aluno cadastrado com sucesso'
        });
    }
    catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:teacherId/students/:studentId', auth_1.requireAuth, async (req, res) => {
    try {
        const { teacherId, studentId } = req.params;
        const { name, email, phone, notes } = req.body;
        if (!ensureTeacherStudentAccess(req, res, teacherId)) {
            return;
        }
        const { data, error } = await supabase_1.supabase
            .from('teacher_students')
            .update({ name, email, phone, notes, updated_at: new Date().toISOString() })
            .eq('id', studentId)
            .eq('teacher_id', teacherId)
            .select()
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        res.json({ student: data });
    }
    catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:teacherId/students/:studentId', auth_1.requireAuth, async (req, res) => {
    try {
        const { teacherId, studentId } = req.params;
        if (!ensureTeacherStudentAccess(req, res, teacherId)) {
            return;
        }
        const { error } = await supabase_1.supabase
            .from('teacher_students')
            .delete()
            .eq('id', studentId)
            .eq('teacher_id', teacherId);
        if (error)
            throw error;
        res.json({ message: 'Aluno excluído com sucesso' });
    }
    catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=teacher-students.js.map