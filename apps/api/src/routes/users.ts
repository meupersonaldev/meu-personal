import { Router } from 'express'
import { supabase } from '../config/supabase'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// Cliente Supabase centralizado importado de ../config/supabase

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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, bio } = req.body

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
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, email } = req.body

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email

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
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body

    // Buscar usuário atual
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Verificar senha atual (em produção, usar bcrypt)
    // Por enquanto, comparação simples
    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: newPassword, // Em produção, fazer hash com bcrypt
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error: any) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/users/:id/avatar - Upload de avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    // Gerar nome único para o arquivo
    const fileExt = path.extname(file.originalname)
    const fileName = `${id}-${uuidv4()}${fileExt}`
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
