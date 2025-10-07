import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { ensureFranqueadoraContact } from '../services/franqueadora-contacts.service'
import { auditAuthEvent, auditSensitiveOperation } from '../middleware/audit'
import { auditService } from '../services/audit.service'

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
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT')
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
})


// POST /api/auth/login
router.post('/login', auditAuthEvent('LOGIN'), async (req, res) => {
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

    // SEGURANÇA CRÍTICA: Validar secret forte e obrigatório
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres para segurança')
    }
    
    // Gerar JWT com expiração curta para maior segurança
    const token = jwt.sign(
      {
        userId: users.id,
        email: users.email,
        role: users.role,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } // Access token curto
    )

    // Setar cookie HttpOnly para o domínio da API (usado pela API com credentials: include)
    try {
      const isProd = process.env.NODE_ENV === 'production'
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
    } catch {}

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
router.post('/register', auditSensitiveOperation('CREATE', 'users'), async (req, res) => {
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

    // Buscar ID da franqueadora principal
    const { data: franqueadora } = await supabase
      .from('franqueadora')
      .select('id')
      .eq('is_active', true)
      .single()

    const newUser = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone || null,
      cpf: userData.cpf.replace(/\D/g, ''), // Armazenar apenas números
      role: userData.role,
      credits: userData.role === 'STUDENT' ? 5 : 0, // Créditos de boas-vindas
      is_active: true,
      password_hash: passwordHash,
      franchisor_id: franqueadora?.id || null, // Vincular à franqueadora principal
      franchise_id: null // Franquia definida apenas por vínculo operacional
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

    try {
      await ensureFranqueadoraContact({
        userId: createdUser.id,
        role: createdUser.role,
        origin: 'SELF_REGISTRATION',
      })
    } catch (contactError) {
      console.warn('Falha ao sincronizar contato da franqueadora:', contactError)
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
          availability: {},
          is_available: false
        }])

      if (profileError) {
        console.error('Erro ao criar perfil de professor:', profileError)
      }
    }

    // SEGURANÇA CRÍTICA: Validar secret forte e obrigatório
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres para segurança')
    }
    
    // Gerar JWT com expiração curta para maior segurança
    const token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } // Access token curto
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
    // SEGURANÇA CRÍTICA: Validar secret forte
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres para segurança')
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body)

    // Buscar usuário pelo email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    // Se usuário existe, gerar token de reset
    if (user && !error) {
      // Gerar token único para reset de senha
      const resetToken = jwt.sign(
        {
          userId: user.id,
          email: email,
          type: 'password_reset'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' } // Token expira em 1 hora
      )

      // TODO: Implementar envio de email com Resend
      // Por enquanto, apenas logar o token (em produção, enviar email)
      console.log(`Token de reset para ${email}: ${resetToken}`)
      
      // Salvar hash do token na tabela users para validação posterior
      const tokenHash = await bcrypt.hash(resetToken, 10)
      await supabase
        .from('users')
        .update({
          reset_token_hash: tokenHash,
          reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    // Sempre retornar sucesso por segurança (não expor se email existe)
    res.json({
      message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Email inválido',
        errors: error.errors
      })
    }

    console.error('Erro em forgot-password:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', auditSensitiveOperation('SENSITIVE_CHANGE', 'users'), async (req, res) => {
  try {
    const { password, token } = z.object({
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      token: z.string().min(1, 'Token é obrigatório')
    }).parse(req.body)

    // Validar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    if (decoded.type !== 'password_reset') {
      return res.status(401).json({ message: 'Token inválido' })
    }

    // Buscar usuário e validar token hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_hash, reset_token_expires_at')
      .eq('id', decoded.userId)
      .eq('email', decoded.email)
      .single()

    if (error || !user) {
      return res.status(401).json({ message: 'Usuário não encontrado' })
    }

    // Verificar se token não expirou
    if (user.reset_token_expires_at && new Date(user.reset_token_expires_at) < new Date()) {
      return res.status(401).json({ message: 'Token expirado' })
    }

    // Validar hash do token
    const isValidToken = await bcrypt.compare(token, user.reset_token_hash)
    if (!isValidToken) {
      return res.status(401).json({ message: 'Token inválido' })
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 10)

    // Atualizar senha e limpar token de reset
    await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        password: null,
        reset_token_hash: null,
        reset_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    res.json({
      message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token inválido ou expirado' })
    }

    console.error('Erro em reset-password:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/auth/verify-password - Verificar senha do usuário da franqueadora
router.post('/verify-password', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email('Email inválido'),
      password: z.string().min(1, 'Senha é obrigatória')
    }).parse(req.body)

    // Buscar usuário pelo email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      })
    }

    // Verificar se usuário está ativo
    if (!userData.is_active) {
      return res.status(401).json({
        error: 'Usuário inativo'
      })
    }

    // Verificar senha com suporte a migração gradual
    let validPassword = false
    if (userData.password_hash) {
      // Verificar hash
      validPassword = await bcrypt.compare(password, userData.password_hash)
    } else if (userData.password) {
      // Fallback temporário: comparar texto plano e fazer upgrade para hash
      validPassword = userData.password === password
      if (validPassword) {
        const newHash = await bcrypt.hash(password, 10)
        await supabase
          .from('users')
          .update({ password_hash: newHash, password: null, updated_at: new Date().toISOString() })
          .eq('id', userData.id)
      }
    }

    if (!validPassword) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      })
    }

    // Verificar se é admin da franqueadora
    const { data: adminData, error: adminError } = await supabase
      .from('franqueadora_admins')
      .select('*')
      .eq('user_id', userData.id)
      .single()

    if (adminError || !adminData) {
      return res.status(403).json({
        error: 'Usuário não é administrador da franqueadora'
      })
    }

    // Buscar dados da franqueadora
    const { data: franqueadoraData, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .select('*')
      .eq('id', adminData.franqueadora_id)
      .single()

    if (franqueadoraError || !franqueadoraData) {
      console.warn('Franqueadora not found for admin:', franqueadoraError)
    }

    res.json({
      valid: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: adminData.role
      },
      franqueadora: franqueadoraData || null
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Error verifying password:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/auth/check-email - Verificar se email já existe
router.post('/check-email', async (req, res) => {
  try {
    const { email } = z.object({
      email: z.string().email('Email inválido')
    }).parse(req.body)

    // Buscar usuário pelo email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    res.json({
      exists: !userError && !!userData
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Email inválido',
        errors: error.errors
      })
    }

    console.error('Error checking email:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

export default router

// Extra endpoint: verificar se email já existe (usado pelo front antes de criar admin)
router.post('/check-email', async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email() })
    const { email } = schema.parse(req.body)

    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    return res.json({ exists: !!data })
  } catch (err) {
    return res.json({ exists: false })
  }
})

