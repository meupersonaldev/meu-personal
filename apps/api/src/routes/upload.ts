import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Verificar variáveis de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

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
router.post('/users/:id/avatar', (req, res) => {
  console.log('📸 Avatar upload request received for user:', req.params.id)
  console.log('Request headers:', req.headers)

  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer error:', err)
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Arquivo muito grande. Máximo 2MB' })
        }
        return res.status(400).json({ error: `Erro no upload: ${err.message}` })
      }
      return res.status(400).json({ error: err.message })
    }

    try {
      const { id } = req.params
      const file = req.file

      console.log('File received:', file)
      console.log('Request body:', req.body)

      if (!file) {
        console.log('❌ No file uploaded')
        return res.status(400).json({ error: 'Nenhum arquivo enviado' })
      }

      // Gerar URL pública
      const avatar_url = `${process.env.API_URL || 'http://localhost:3001'}/uploads/avatars/${file.filename}`
      console.log('Generated avatar URL:', avatar_url)

      // Atualizar no banco
      console.log('Updating user avatar in database...')
      const { error } = await supabase
        .from('users')
        .update({ avatar_url, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('❌ Database error:', error)
        // Deletar arquivo se falhou
        try {
          fs.unlinkSync(file.path)
        } catch (unlinkError) {
          console.error('Failed to delete file:', unlinkError)
        }
        return res.status(500).json({ error: 'Erro ao atualizar avatar', details: error.message })
      }

      console.log('✅ Avatar updated successfully!')
      res.json({ avatar_url })
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      console.error('Error stack:', error.stack)
      res.status(500).json({ error: error.message || 'Erro ao fazer upload' })
    }
  })
})

export default router
