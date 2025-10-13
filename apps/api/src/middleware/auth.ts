import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase'

const canonicalizeRole = (role?: string) => {
  if (!role) return undefined
  const normalized = role.toUpperCase()
  switch (normalized) {
    case 'ALUNO':
      return 'STUDENT'
    case 'PROFESSOR':
      return 'TEACHER'
    case 'FRANQUEADORA':
      return 'FRANCHISOR'
    case 'FRANQUIA':
      return 'FRANCHISE_ADMIN'
    case 'STUDENT':
    case 'TEACHER':
    case 'FRANCHISOR':
    case 'FRANCHISE_ADMIN':
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return normalized
    default:
      console.warn(`Role não mapeado: ${normalized}`)
      return normalized
  }
}

type JwtUser = {
  userId: string
  email: string
  role?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUser & {
        canonicalRole?: string
      }
      franqueadoraAdmin?: {
        franqueadora_id: string
      }
      timezone?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Try Bearer header first
    const auth = req.headers.authorization || ''
    let token = ''
    if (auth.startsWith('Bearer ')) {
      token = auth.replace('Bearer ', '')
    }

    // Fallback to cookie `auth-token`
    if (!token && typeof req.headers.cookie === 'string') {
      const match = req.headers.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('auth-token='))
      if (match) token = match.split('=')[1]
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // SEGURANÇA CRÍTICA: Validar secret forte e obrigatório
    const secret = process.env.JWT_SECRET
    if (!secret || secret.length < 32) {
      return res.status(500).json({ message: 'Configuração de segurança inválida' })
    }
    
    const decoded = jwt.verify(token, secret) as any
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireRole(roles: string[]) {
  // Normalizar roles permitidas para o formato canônico
  const allowedRoles = new Set(roles.map(r => canonicalizeRole(r)).filter(Boolean))
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        message: 'Autenticação necessária',
        error: 'AUTH_REQUIRED'
      })
    }
    
    // Mapear role do usuário para formato canônico
    const userRole = canonicalizeRole(req.user.role)
    
    // Verificar se role do usuário está na lista de permitidos
    if (!userRole || !allowedRoles.has(userRole)) {
      console.warn(`Acesso negado. User role: ${userRole}, Allowed roles: ${Array.from(allowedRoles).join(', ')}`)
      return res.status(403).json({
        message: 'Acesso negado. Permissões insuficientes.',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: Array.from(allowedRoles),
        userRole: userRole
      })
    }
    
    // Adicionar role canônico ao request para uso posterior
    req.user.canonicalRole = userRole
    
    return next()
  }
}

export async function requireFranqueadoraAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' })

    // Tentar mapear franqueadora do admin
    const userId = req.user.userId
    // 1) Tabela preferida: franqueadora_admins
    let franqueadoraId: string | null = null
    try {
      const { data, error } = await supabase
        .from('franqueadora_admins')
        .select('franqueadora_id')
        .eq('user_id', userId)
        .single()
      if (!error && data?.franqueadora_id) {
        franqueadoraId = data.franqueadora_id
      }
    } catch {}

    const canonicalRole = req.user.canonicalRole || canonicalizeRole(req.user.role)
    const elevated = canonicalRole === 'SUPER_ADMIN' || canonicalRole === 'ADMIN'

    const rawFranqueadoraId = (req.query as Record<string, unknown> | undefined)?.franqueadora_id
    const queryFranqueadoraId = Array.isArray(rawFranqueadoraId)
      ? (rawFranqueadoraId[0] as string | undefined) || null
      : (typeof rawFranqueadoraId === 'string' ? rawFranqueadoraId : null)

    if (!franqueadoraId) {
      if (canonicalRole === 'FRANCHISOR') {
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('franchisor_id')
            .eq('id', userId)
            .single()
          const franchisorId = userRow?.franchisor_id
          if (franchisorId && (!queryFranqueadoraId || queryFranqueadoraId === franchisorId)) {
            franqueadoraId = franchisorId
          }
        } catch (err) {
          console.warn('Não foi possível determinar franqueadora do usuário:', err)
        }
        if (!franqueadoraId && queryFranqueadoraId) {
          // Fallback: permitir acesso com o identificador informado na query
          franqueadoraId = queryFranqueadoraId
        }
      } else if (elevated && queryFranqueadoraId) {
        franqueadoraId = queryFranqueadoraId
      }
    }

    if (!franqueadoraId && !elevated) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!franqueadoraId && elevated && queryFranqueadoraId) {
      franqueadoraId = queryFranqueadoraId
    }

    if (franqueadoraId) {
      req.franqueadoraAdmin = { franqueadora_id: franqueadoraId }
    }
    return next()
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden' })
  }
}

