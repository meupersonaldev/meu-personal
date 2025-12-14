import express from 'express'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import * as https from 'https'
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ensureFranqueadoraContact } from '../services/franqueadora-contacts.service'
import { auditAuthEvent, auditSensitiveOperation } from '../middleware/audit'
import { auditService } from '../services/audit.service'
import { emailService } from '../services/email.service'
import { validateCpfCnpj, validateCpfWithAPI } from '../utils/validation'
import { getHtmlEmailTemplate, getWelcomeStudentEmail, getWelcomeTeacherEmail, getPasswordResetEmail } from '../services/email-templates'

const router = express.Router()

async function isPasswordPwned(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  try {
    const text: string = await new Promise((resolve, reject) => {
      const req = https.request(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        { method: 'GET', headers: { 'Add-Padding': 'true' } },
        res => {
          let data = ''
          res.on('data', chunk => {
            data += chunk
          })
          res.on('end', () => resolve(data))
        }
      )
      req.on('error', reject)
      req.end()
    })
    const lines = text.split('\n')
    for (const line of lines) {
      const [h, count] = line.trim().split(':')
      if (h === suffix && Number(count) > 0) return true
    }
    return false
  } catch {
    return false
  }
}

function isStrongPassword(password: string): boolean {
  // Only check minimum length of 6 characters
  if (!password || password.length < 6) return false
  return true
}

function normalizeCref(v?: string | null) {
  if (!v) return null

  // Remover "CREF" do início se presente
  let normalized = v.toUpperCase().trim()
  if (normalized.startsWith('CREF')) {
    normalized = normalized.substring(4).trim()
  }

  // Remover espaços extras e caracteres inválidos, mantendo apenas números, letras, hífen e barra
  normalized = normalized.replace(/[^0-9A-Z\-\/]/g, '')

  // Formato esperado: 12345-G/SP ou variações
  // Garantir que está no formato correto
  const match = normalized.match(/^(\d{4,6})[\-]?([A-Z])?[\/-]?([A-Z]{2})?$/)

  if (match) {
    const [, number, category, uf] = match
    let result = number
    if (category) result += `-${category}`
    if (uf) result += `/${uf}`
    return result
  }

  // Se não corresponder ao padrão, retornar normalizado básico
  return normalized || null
}

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    passwordConfirmation: z.string(),
    phone: z.string().min(8, 'Telefone é obrigatório'),
    cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
    gender: z.enum([
      'MALE',
      'FEMALE',
      'NON_BINARY',
      'OTHER',
      'PREFER_NOT_TO_SAY'
    ]),
    role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
    cref: z.string().optional(),
    specialties: z.array(z.string()).optional()
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation']
  })

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
})

// POST /api/auth/login
router.post('/login', auditAuthEvent('LOGIN'), async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Buscar usuário no Supabase (inclui campos de senha)
    // Não filtrar por is_active aqui para poder dar mensagem específica
    const { data: users, error: userError } = await supabase
      .from('users')
      .select(
        'id, name, email, phone, role, credits, avatar_url, is_active, password_hash, password, approval_status'
      )
      .eq('email', email)
      .single()

    if (userError || !users) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // Verificar se usuário está ativo ANTES de verificar senha
    if (!users.is_active) {
      return res.status(403).json({ 
        message: 'Sua conta está desativada. Entre em contato com a administração para mais informações.',
        code: 'USER_INACTIVE'
      })
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
          .update({
            password_hash: newHash,
            password: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', users.id)
      }
    }

    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // SEGURANÇA CRÍTICA: Validar secret forte (exigente em produção). Fallback em dev.
    const isProd = process.env.NODE_ENV === 'production'
    const jwtSecret =
      process.env.JWT_SECRET ||
      (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '')
    if (!jwtSecret || (isProd && jwtSecret.length < 32)) {
      throw new Error('JWT_SECRET inválido (produção exige >=32 chars)')
    }
    const jwtSecretKey: Secret = jwtSecret
    const expiresIn: StringValue = (process.env.JWT_EXPIRES_IN ||
      '15m') as StringValue
    const jwtOptions: SignOptions = {
      expiresIn
    }

    // Gerar JWT com expiração curta para maior segurança
    const token = jwt.sign(
      {
        userId: users.id,
        email: users.email,
        role: users.role,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtSecretKey,
      jwtOptions // Access token curto
    )

    // Setar cookie HttpOnly para o domínio da API (usado pela API com credentials: include)
    try {
      const isProd = process.env.NODE_ENV === 'production'
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      })
    } catch { }

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
        isActive: users.is_active,
        approval_status: users.approval_status
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(
        'Validação de login falhou:',
        JSON.stringify(error.errors, null, 2)
      )
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
router.post(
  '/register',
  auditSensitiveOperation('CREATE', 'users'),
  async (req, res) => {
    try {
      console.log(
        'JWT_SECRET configurado:',
        process.env.JWT_SECRET
          ? `Sim (${process.env.JWT_SECRET.length} chars)`
          : 'Não'
      )
      const userData = registerSchema.parse(req.body)
      if (userData.role === 'TEACHER') {
        if (!userData.cref || !userData.cref.trim()) {
          return res
            .status(400)
            .json({ message: 'CREF é obrigatório para professores' })
        }
      }
      if (!isStrongPassword(userData.password)) {
        return res
          .status(400)
          .json({
            message:
              'Senha deve ter no mínimo 6 caracteres.'
          })
      }
      if (await isPasswordPwned(userData.password)) {
        return res
          .status(400)
          .json({
            message: 'Senha vazada ou muito comum. Escolha outra senha.'
          })
      }
      const sanitizedCpf = userData.cpf.replace(/\D/g, '')

      // Validar CPF (verificar dígitos verificadores)
      if (!validateCpfCnpj(sanitizedCpf)) {
        return res.status(400).json({ message: 'CPF inválido. Verifique os dígitos e tente novamente.' })
      }

      // Validar CPF via API externa (se configurado)
      // Isso confirma se o CPF existe na Receita Federal
      if (process.env.ENABLE_CPF_API_VALIDATION === 'true') {
        try {
          const apiValidation = await validateCpfWithAPI(sanitizedCpf)
          if (!apiValidation.valid) {
            return res.status(400).json({
              message: apiValidation.error || 'CPF não encontrado nos registros oficiais. Verifique o número e tente novamente.'
            })
          }
        } catch (apiError: any) {
          // Se API falhar, aceita se dígitos estão corretos (não bloqueia cadastro)
          console.warn('Erro ao validar CPF via API, mas dígitos estão corretos:', apiError.message)
        }
      }

      // Verificar se email já existe
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        return res.status(400).json({ message: 'Email já está em uso' })
      }

      // Verificar se CPF já existe
      const { data: existingCpfUsers, error: cpfCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('cpf', sanitizedCpf)
        .limit(1)

      if (cpfCheckError) {
        console.error('Erro ao verificar CPF existente:', cpfCheckError)
        return res.status(500).json({ message: 'Erro ao validar CPF' })
      }

      if (existingCpfUsers && existingCpfUsers.length > 0) {
        return res.status(400).json({ message: 'CPF já está em uso' })
      }

      // Criar novo usuário no Supabase
      const passwordHash = await bcrypt.hash(userData.password, 10)

      // Buscar ID da franqueadora principal
      const { data: franqueadora } = await supabase
        .from('franqueadora')
        .select('id')
        .eq('is_active', true)
        .single()

      const crefNormalized =
        userData.role === 'TEACHER' && userData.cref
          ? normalizeCref(userData.cref)
          : null

      const newUser = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        cpf: sanitizedCpf, // Armazenar apenas números
        cref: crefNormalized, // Armazenar CREF normalizado na tabela users
        role: userData.role,
        credits: userData.role === 'STUDENT' ? 5 : 0, // Créditos de boas-vindas
        is_active: true,
        password_hash: passwordHash,
        gender: userData.gender,
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
          origin: 'SELF_REGISTRATION'
        })
      } catch (contactError) {
        console.warn(
          'Falha ao sincronizar contato da franqueadora:',
          contactError
        )
      }
      // Se for professor, criar perfil de professor e abrir approval request
      if (userData.role === 'TEACHER') {
        const { error: profileError } = await supabase
          .from('teacher_profiles')
          .insert([
            {
              user_id: createdUser.id,
              bio: '',
              specialization: Array.isArray(userData.specialties)
                ? userData.specialties
                : [],
              hourly_rate: 0,
              availability: {},
              is_available: false,
              cref: crefNormalized || null
            }
          ])

        if (profileError) {
          if ((profileError as any).code === '23505') {
            return res.status(409).json({ message: 'CREF já cadastrado' })
          }
          console.error('Erro ao criar perfil de professor:', profileError)
          return res
            .status(500)
            .json({ message: 'Erro ao criar perfil de professor' })
        }

        // Criar approval request pendente para franqueadora
        try {
          await supabase.from('approval_requests').insert({
            type: 'teacher_registration',
            user_id: createdUser.id,
            requested_data: { cref: crefNormalized || null }
          })
        } catch (e) {
          console.warn('Falha ao criar approval_request de professor:', e)
        }
      }

      // SEGURANÇA CRÍTICA: Validar secret forte (exigente em produção). Fallback em dev.
      const isProd = process.env.NODE_ENV === 'production'
      const jwtSecret =
        process.env.JWT_SECRET ||
        (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '')
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error(
          'JWT_SECRET deve ter pelo menos 32 caracteres para segurança'
        )
      }
      const jwtSecretKey: Secret = jwtSecret
      const expiresIn: StringValue = (process.env.JWT_EXPIRES_IN ||
        '15m') as StringValue
      const jwtOptions: SignOptions = {
        expiresIn
      }

      // Gerar JWT com expiração curta para maior segurança
      const token = jwt.sign(
        {
          userId: createdUser.id,
          email: createdUser.email,
          role: createdUser.role,
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecretKey,
        jwtOptions // Access token curto
      )

      // Setar cookie HttpOnly para o domínio da API (usado pela API com credentials: include)
      try {
        const isProdEnv = process.env.NODE_ENV === 'production'
        res.cookie('auth-token', token, {
          httpOnly: true,
          secure: isProdEnv,
          sameSite: isProdEnv ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        })
      } catch { }

      // Enviar email de boas-vindas (assíncrono, não bloqueia resposta)
      const frontendUrl = process.env.FRONTEND_URL || 'https://meupersonalfranquia.com.br'
      const loginUrl = userData.role === 'STUDENT' 
        ? `${frontendUrl}/aluno/login`
        : `${frontendUrl}/professor/login`
      
      // Enviar email em background (não espera) - usando EmailTemplateService
      ;(async () => {
        try {
          if (userData.role === 'STUDENT') {
            const html = await getWelcomeStudentEmail(createdUser.name, loginUrl)
            await emailService.sendEmail({
              to: createdUser.email,
              subject: 'Bem-vindo ao Meu Personal! 🎉',
              html,
              text: [
                `Olá ${createdUser.name}!`,
                '',
                'Seja muito bem-vindo(a) ao Meu Personal!',
                '',
                'Estamos muito felizes em ter você conosco.',
                '',
                '🎁 PRESENTE DE BOAS-VINDAS!',
                'Você ganhou 1 aula gratuita para experimentar nossos serviços!',
                '',
                'O que você pode fazer agora:',
                '- Agendar sua primeira aula gratuita',
                '- Conhecer nossos professores',
                '- Comprar pacotes de aulas quando quiser',
                '',
                `Acesse sua conta: ${loginUrl}`,
                '',
                'Bons treinos!',
                'Equipe Meu Personal'
              ].join('\n')
            })
            console.log('[AUTH] Email de boas-vindas enviado para aluno:', createdUser.email)
          } else if (userData.role === 'TEACHER') {
            const html = await getWelcomeTeacherEmail(createdUser.name, loginUrl)
            await emailService.sendEmail({
              to: createdUser.email,
              subject: 'Bem-vindo ao Meu Personal! 🎉',
              html,
              text: [
                `Olá ${createdUser.name}!`,
                '',
                'Seja muito bem-vindo(a) ao Meu Personal!',
                '',
                'Estamos muito felizes em ter você como parte da nossa equipe de profissionais.',
                '',
                '⏳ AGUARDANDO APROVAÇÃO',
                'Seu cadastro está sendo analisado pela nossa equipe.',
                'Assim que for aprovado, você receberá uma notificação.',
                '',
                'Enquanto isso, você pode:',
                '- Completar seu perfil profissional',
                '- Configurar sua disponibilidade de horários',
                '- Conhecer a plataforma e suas funcionalidades',
                '',
                `Acesse sua conta: ${loginUrl}`,
                '',
                'Sucesso na sua jornada!',
                'Equipe Meu Personal'
              ].join('\n')
            })
            console.log('[AUTH] Email de boas-vindas enviado para professor:', createdUser.email)
          }
        } catch (emailError) {
          console.warn('[AUTH] Falha ao enviar email de boas-vindas:', emailError)
          // Não falha o registro se o email não for enviado
        }
      })()

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
          gender: createdUser.gender,
          credits: createdUser.credits,
          avatarUrl: createdUser.avatar_url,
          isActive: createdUser.is_active
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn(
          'Validação de registro falhou:',
          JSON.stringify(error.errors, null, 2)
        )
        const errorMessage = error.errors.map(e => e.message).join(', ')
        return res.status(400).json({
          message: `Dados inválidos: ${errorMessage}`,
          errors: error.errors
        })
      }

      console.error('Erro no registro:', error)
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }
)

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
    const isProd = process.env.NODE_ENV === 'production'
    const jwtSecret =
      process.env.JWT_SECRET ||
      (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '')
    if (!jwtSecret || (isProd && jwtSecret.length < 32)) {
      throw new Error('JWT_SECRET inválido (produção exige >=32 chars)')
    }
    const decoded = jwt.verify(token, jwtSecret) as any

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({ message: 'Usuário não encontrado' })
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return res.status(403).json({ 
        message: 'Sua conta está desativada. Entre em contato com a administração para mais informações.',
        code: 'USER_INACTIVE'
      })
    }

    res.json({
      user: {
        gender: user.gender,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits,
        avatarUrl: user.avatar_url,
        isActive: user.is_active,
        approval_status: user.approval_status
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

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (user && !userError) {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) throw new Error('JWT_SECRET não está configurado.')

      const resetToken = jwt.sign(
        { userId: user.id, email: email, type: 'password_reset' },
        jwtSecret,
        { expiresIn: '1h' }
      )

      const frontendUrl = process.env.FRONTEND_URL || 'https://meupersonalfranquia.com.br'
      const resetUrl = new URL('/redefinir-senha', frontendUrl)
      resetUrl.searchParams.set('token', resetToken)
      const resetLink = resetUrl.toString()

      try {
        // Usando EmailTemplateService para buscar template customizado
        const html = await getPasswordResetEmail(user.name || '', resetLink)

        await emailService.sendEmail({
          to: email,
          subject: 'Redefinição de senha - Meu Personal',
          html,
          text: [
            `Olá ${user.name || ''},`,
            '',
            'Recebemos uma solicitação para redefinir a sua senha na plataforma Meu Personal.',
            `Acesse o link a seguir para criar uma nova senha: ${resetLink}`,
            '',
            'Se você não solicitou essa alteração, ignore este e-mail.',
            '',
            'Atenciosamente,',
            'Equipe Meu Personal'
          ].join('\n')
        })
      } catch (sendError) {
        console.error(
          'Erro ao enviar email de redefinição de senha:',
          sendError
        )
      }
    }

    res.json({
      message:
        'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: 'Dados inválidos', errors: error.errors })
    }
    console.error('Erro em forgot-password:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  auditSensitiveOperation('SENSITIVE_CHANGE', 'users'),
  async (req, res) => {
    try {
      const { password, token } = z
        .object({
          password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
          token: z.string().min(1, 'Token é obrigatório')
        })
        .parse(req.body)

      // Validar token JWT
      const isProd = process.env.NODE_ENV === 'production'
      const jwtSecret =
        process.env.JWT_SECRET ||
        (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '')
      const decoded = jwt.verify(token, jwtSecret) as any

      if (decoded.type !== 'password_reset') {
        return res.status(401).json({ message: 'Token inválido' })
      }

      // Buscar usuário
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', decoded.userId)
        .eq('email', decoded.email)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return res.status(401).json({ message: 'Usuário não encontrado' })
      }

      if (!isStrongPassword(password)) {
        return res
          .status(400)
          .json({
            message:
              'Senha deve ter no mínimo 6 caracteres.'
          })
      }
      if (await isPasswordPwned(password)) {
        return res
          .status(400)
          .json({
            message: 'Senha vazada ou muito comum. Escolha outra senha.'
          })
      }

      // Hash da nova senha
      const passwordHash = await bcrypt.hash(password, 10)

      // Atualizar senha
      await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      res.json({
        message:
          'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
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
  }
)

// POST /api/auth/verify-password - Verificar senha do usuário da franqueadora
router.post('/verify-password', async (req, res) => {
  try {
    const { email, password } = z
      .object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória')
      })
      .parse(req.body)

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
          .update({
            password_hash: newHash,
            password: null,
            updated_at: new Date().toISOString()
          })
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
    const { email } = z
      .object({
        email: z.string().email('Email inválido')
      })
      .parse(req.body)

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
