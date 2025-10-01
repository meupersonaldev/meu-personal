import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { supabase } from '../lib/supabase'

const router = Router()

// Configurar multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname)
    cb(null, `avatar-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo inválido. Use JPG ou PNG'))
    }
  }
})

// POST /api/users/:id/avatar - Upload avatar
router.post('/users/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    // Gerar URL pública (ajustar conforme sua configuração)
    const avatar_url = `${process.env.API_URL || 'http://localhost:3001'}/uploads/avatars/${file.filename}`

    // Atualizar no banco
    const { error } = await supabase
      .from('users')
      .update({ avatar_url, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao atualizar avatar:', error)
      // Deletar arquivo se falhou
      fs.unlinkSync(file.path)
      return res.status(500).json({ error: 'Erro ao atualizar avatar' })
    }

    res.json({ avatar_url })
  } catch (error: any) {
    console.error('Erro no upload:', error)
    res.status(500).json({ error: error.message || 'Erro ao fazer upload' })
  }
})

export default router
