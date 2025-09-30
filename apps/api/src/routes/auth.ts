import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const router = express.Router()

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT')
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Buscar usuário no Supabase (inclui campos de senha)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, role, credits, avatar_url, is_active, password_hash, password')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (userError || !users) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // Verificar senha com suporte a migração gradual
    let validPassword = false
    if (users.password_hash) {
      // Verificar hash
      validPassword = await bcrypt.compare(password, users.password_hash)
    } else if (users.password) {
      // Fallback temporário: comparar texto plano e fazer upgrade para hash
      validPassword = users.password === password
      if (validPassword) {
        const newHash = await bcrypt.hash(password, 10)
        await supabase
          .from('users')
          .update({ password_hash: newHash, password: null, updated_at: new Date().toISOString() })
          .eq('id', users.id)
      }
    }

    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        userId: users.id,
        email: users.email,
        role: users.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Retornar dados do usuário
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        credits: users.credits,
        avatarUrl: users.avatar_url,
        isActive: users.is_active
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro no login:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body)

    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' })
    }

    // Criar novo usuário no Supabase
    const passwordHash = await bcrypt.hash(userData.password, 10)
    const newUser = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone || null,
      role: userData.role,
      credits: userData.role === 'STUDENT' ? 5 : 0, // Créditos de boas-vindas
      is_active: true,
      password_hash: passwordHash
    }

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single()

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      return res.status(500).json({ message: 'Erro ao criar usuário' })
    }

    // Se for professor, criar perfil de professor
    if (userData.role === 'TEACHER') {
      const { error: profileError } = await supabase
        .from('teacher_profiles')
        .insert([{
          user_id: createdUser.id,
          bio: '',
          specialties: [],
          hourly_rate: 0,
          rating: null,
          total_reviews: 0,
          availability: {},
          is_available: false
        }])

      if (profileError) {
        console.error('Erro ao criar perfil de professor:', profileError)
      }
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Retornar dados do usuário
    res.status(201).json({
      message: 'Conta criada com sucesso',
      token,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
        credits: createdUser.credits,
        avatarUrl: createdUser.avatar_url,
        isActive: createdUser.is_active
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro no registro:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Em um cenário real, invalidaríamos o token no banco ou cache
  res.json({ message: 'Logout realizado com sucesso' })
})

// GET /api/auth/me (verificar token)
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return res.status(401).json({ message: 'Usuário não encontrado' })
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits,
        avatarUrl: user.avatar_url,
        isActive: user.is_active
      }
    })

  } catch (error) {
    res.status(401).json({ message: 'Token inválido' })
  }
})

export default router
