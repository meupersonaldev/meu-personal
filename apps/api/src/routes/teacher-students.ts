import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ADMIN_ROLES = ['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN'] as const
const TEACHER_ROLES = ['TEACHER', 'PROFESSOR'] as const

const hasAdminAccess = (user?: { role?: string }) =>
  Boolean(user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]))

const hasTeacherScope = (user: { userId?: string; role?: string } | undefined, teacherId?: string) =>
  Boolean(
    user &&
      teacherId &&
      TEACHER_ROLES.includes(user.role as typeof TEACHER_ROLES[number]) &&
      user.userId === teacherId
  )

const ensureTeacherStudentAccess = (
  req: { user?: { userId?: string; role?: string } },
  res: { status: (code: number) => { json: (body: any) => void } },
  teacherId: string
) => {
  const user = req.user
  if (!user || (!hasAdminAccess(user) && !hasTeacherScope(user, teacherId))) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

// GET /api/teachers/:teacherId/students - Listar alunos do professor
router.get('/:teacherId/students', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    const { data: teacherStudents, error } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('name', { ascending: true })

    if (error) throw error

    // Buscar user_id correspondente para cada aluno (pelo email)
    const studentsWithUserId = await Promise.all(
      (teacherStudents || []).map(async (student) => {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', student.email)
          .single()
        
        return {
          ...student,
          user_id: user?.id || null
        }
      })
    )

    res.json({ students: studentsWithUserId })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/teachers/:teacherId/students - Criar aluno
router.post('/:teacherId/students', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params
    const { name, email, phone, notes, academy_id } = req.body

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' })
    }

    const normalizedAcademyId = typeof academy_id === 'string' && academy_id.trim() ? academy_id.trim() : null

    // 1. Verificar se aluno já existe na lista do professor (por email)
    const { data: existingTeacherStudent } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('email', email)
      .single()

    let studentData

    if (existingTeacherStudent) {
      // Aluno já existe na lista do professor
      studentData = existingTeacherStudent
    } else {
      // 2. Criar novo aluno na lista do professor
      const { data: newStudent, error: insertError } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: teacherId,
          name,
          email,
          phone,
          notes
        })
        .select()
        .single()

      if (insertError) throw insertError
      studentData = newStudent
    }

    // 3. Buscar ou criar usuário na tabela users
    console.log('🔍 Buscando usuário por email:', email)
    let userId: string
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (searchError) {
      console.log('⚠️ Erro ao buscar usuário (pode ser que não existe):', searchError.message)
    }

    if (existingUser) {
      console.log('✅ Usuário já existe:', existingUser.id)
      userId = existingUser.id
    } else {
      // Criar novo usuário
      console.log('➕ Criando novo usuário na tabela users...')
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          name,
          phone,
          role: 'STUDENT', // Enum em maiúsculo
          credits: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (userError) {
        console.error('❌ Erro ao criar usuário:', userError)
        throw userError
      }
      
      console.log('✅ Usuário criado com sucesso:', newUser)
      userId = newUser.id
    }

    // 4. Verificar se aluno já está vinculado à academia
    if (normalizedAcademyId) {
      const { data: existingAcademyStudent } = await supabase
        .from('academy_students')
        .select('*')
        .eq('academy_id', normalizedAcademyId)
        .eq('student_id', userId)
        .single()

      if (!existingAcademyStudent) {
        await supabase
          .from('academy_students')
          .insert({
            academy_id: normalizedAcademyId,
            student_id: userId,
            status: 'active',
            created_at: new Date().toISOString()
          })
      }
    }

    res.status(201).json({ 
      student: studentData,
      message: existingTeacherStudent ? 'Aluno já cadastrado, reutilizado com sucesso' : 'Aluno cadastrado com sucesso'
    })
  } catch (error: any) {
    console.error('Error creating student:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:teacherId/students/:studentId - Atualizar aluno
router.put('/:teacherId/students/:studentId', requireAuth, async (req, res) => {
  try {
    const { teacherId, studentId } = req.params
    const { name, email, phone, notes } = req.body

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    const { data, error } = await supabase
      .from('teacher_students')
      .update({ name, email, phone, notes, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    res.json({ student: data })
  } catch (error: any) {
    console.error('Error updating student:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/teachers/:teacherId/students/:studentId - Excluir aluno
router.delete('/:teacherId/students/:studentId', requireAuth, async (req, res) => {
  try {
    const { teacherId, studentId } = req.params

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    const { error } = await supabase
      .from('teacher_students')
      .delete()
      .eq('id', studentId)
      .eq('teacher_id', teacherId)

    if (error) throw error

    res.json({ message: 'Aluno excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting student:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

