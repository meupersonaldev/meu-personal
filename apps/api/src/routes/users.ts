import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'
import multer from 'multer'
import { randomUUID } from 'crypto'
import path from 'path'
import { requireAuth } from '../middleware/auth'

// Cliente Supabase centralizado importado de ../lib/supabase

const router = Router()

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido'))
    }
  }
})

// GET /api/users/:id - Buscar usuário
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({ user: userWithoutPassword })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, bio } = req.body
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        name,
        email,
        phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Upsert da bio em teacher_preferences (unificação de persistência)
    if (typeof bio === 'string') {
      const { error: prefError } = await supabase
        .from('teacher_preferences')
        .upsert(
          [{ teacher_id: id, bio, updated_at: new Date().toISOString() }],
          { onConflict: 'teacher_id' }
        )
      if (prefError) {
        console.error('Erro ao salvar bio em teacher_preferences:', prefError)
      }
    }

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({ user: userWithoutPassword })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/users/:id - Atualizar parcialmente usuário
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, cpf } = req.body
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (cpf !== undefined) {
      const cpfSanitized = String(cpf).replace(/\D/g, '')
      if (process.env.ASAAS_ENV === 'production' && cpfSanitized.length < 11) {
        return res.status(400).json({ error: 'CPF inválido' })
      }
      updateData.cpf = cpfSanitized
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({ user: userWithoutPassword })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id/password - Alterar senha
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
    const user = (req as any).user

    if (user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Parâmetros inválidos' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' })
    }

    const { data: dbUser, error: fetchError } = await supabase
      .from('users')
      .select('password, password_hash')
      .eq('id', id)
      .single()

    if (fetchError || !dbUser) throw fetchError || new Error('Usuário não encontrado')

    let validPassword = false
    if (dbUser.password_hash) {
      validPassword = await bcrypt.compare(currentPassword, dbUser.password_hash)
    } else if (dbUser.password) {
      validPassword = dbUser.password === currentPassword
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        password: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error: any) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
})

// POST /api/users/:id/avatar - Upload de avatar
router.post('/:id/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params
    const file = req.file
    const user = (req as any).user
    // Apenas o próprio usuário pode trocar seu avatar
    if (user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    // Gerar nome único para o arquivo
    const fileExt = path.extname(file.originalname)
    const fileName = `${id}-${randomUUID()}${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      })

    if (uploadError) throw uploadError

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Atualizar usuário com URL do avatar
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ avatar_url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading avatar:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

