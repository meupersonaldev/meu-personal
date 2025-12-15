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
      console.warn(`requireAuth: No token found for ${req.method} ${req.path}`)
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // SEGURANÇA CRÍTICA: Validar secret forte em produção; fallback seguro em dev/test
    const isProd = process.env.NODE_ENV === 'production'
    const secret = process.env.JWT_SECRET || (!isProd ? 'dev-insecure-jwt-secret-please-set-env-32chars-123456' : '')
    if (!secret || (isProd && secret.length < 32)) {
      return res.status(500).json({ message: 'Configuração de segurança inválida' })
    }
    const decoded = jwt.verify(token, secret) as any
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }

    // Log para debug de SSE
    if (req.path.includes('/stream')) {
      console.log(`requireAuth: SSE access - User: ${decoded.userId}, Role: ${decoded.role}, Path: ${req.path}`)
    }

    return next()
  } catch (err) {
    console.warn(`requireAuth: Invalid token for ${req.method} ${req.path}:`, err.message)
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
    const canonicalRole = req.user.canonicalRole || canonicalizeRole(req.user.role)
    
    console.log(`[AUTH] requireFranqueadoraAdmin - userId: ${userId}, role: ${req.user.role}, canonicalRole: ${canonicalRole}`)
    
    // 1) Tabela preferida: franqueadora_admins
    let franqueadoraId: string | null = null
    let franchiseId: string | null = null
    
    try {
      const { data, error } = await supabase
        .from('franqueadora_admins')
        .select('franqueadora_id')
        .eq('user_id', userId)
        .single()
      if (!error && data?.franqueadora_id) {
        franqueadoraId = data.franqueadora_id
        console.log(`[AUTH] Encontrado em franqueadora_admins: ${franqueadoraId}`)
      }
    } catch {}

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
            console.log(`[AUTH] FRANCHISOR - franqueadora_id: ${franqueadoraId}`)
          }
        } catch (err) {
          console.warn('[AUTH] Não foi possível determinar franqueadora do usuário:', err)
        }
        if (!franqueadoraId && queryFranqueadoraId) {
          // Fallback: permitir acesso com o identificador informado na query
          franqueadoraId = queryFranqueadoraId
        }
      } else if (canonicalRole === 'FRANCHISE_ADMIN') {
        // Para admin de franquia, buscar a franqueadora através da franquia
        console.log(`[AUTH] FRANCHISE_ADMIN - buscando franchise_admins para userId: ${userId}`)
        try {
          const { data: franchiseAdmin, error: faError } = await supabase
            .from('franchise_admins')
            .select('franchise_id')
            .eq('user_id', userId)
            .single()
          
          console.log(`[AUTH] franchise_admins result:`, { franchiseAdmin, error: faError?.message })
          
          if (franchiseAdmin?.franchise_id) {
            franchiseId = franchiseAdmin.franchise_id
            console.log(`[AUTH] FRANCHISE_ADMIN - franchise_id: ${franchiseId}`)
            
            // Buscar a franqueadora da franquia
            const { data: academy, error: acError } = await supabase
              .from('academies')
              .select('franqueadora_id')
              .eq('id', franchiseAdmin.franchise_id)
              .single()
            
            console.log(`[AUTH] academies result:`, { academy, error: acError?.message })
            
            if (academy?.franqueadora_id) {
              franqueadoraId = academy.franqueadora_id
              console.log(`[AUTH] FRANCHISE_ADMIN - franqueadora_id: ${franqueadoraId}`)
            }
          }
        } catch (err) {
          console.warn('[AUTH] Erro ao buscar franqueadora do admin de franquia:', err)
        }
      } else if (elevated && queryFranqueadoraId) {
        franqueadoraId = queryFranqueadoraId
      }
    }

    // Se for SUPER_ADMIN e não tiver franqueadora específica, buscar a primeira ativa
    if (!franqueadoraId && canonicalRole === 'SUPER_ADMIN') {
      try {
        const { data: defaultFranqueadora, error: defaultError } = await supabase
          .from('franqueadora')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        
        if (!defaultError && defaultFranqueadora?.id) {
          franqueadoraId = defaultFranqueadora.id
          console.log('[AUTH] SUPER_ADMIN sem franqueadora específica, usando primeira ativa:', franqueadoraId)
        }
      } catch (err) {
        console.warn('[AUTH] Erro ao buscar franqueadora padrão para SUPER_ADMIN:', err)
      }
    }

    // Se for FRANCHISE_ADMIN e não encontrou na tabela franchise_admins, tentar buscar pela academy
    if (!franqueadoraId && canonicalRole === 'FRANCHISE_ADMIN') {
      console.log(`[AUTH] FRANCHISE_ADMIN sem franqueadora - tentando buscar pela academy do usuário`)
      try {
        // Buscar academias onde o usuário é admin (pode estar em academy_admins ou outra tabela)
        const { data: userAcademies } = await supabase
          .from('academies')
          .select('id, franqueadora_id')
          .or(`owner_id.eq.${userId}`)
          .limit(1)
          .single()
        
        if (userAcademies?.franqueadora_id) {
          franqueadoraId = userAcademies.franqueadora_id
          franchiseId = userAcademies.id
          console.log(`[AUTH] FRANCHISE_ADMIN encontrado como owner - franqueadora_id: ${franqueadoraId}, franchise_id: ${franchiseId}`)
        }
      } catch (err) {
        console.warn('[AUTH] Erro ao buscar academy do FRANCHISE_ADMIN:', err)
      }
    }

    if (!franqueadoraId && !elevated) {
      console.warn(`[AUTH] Acesso negado - userId: ${userId}, role: ${canonicalRole}, franqueadoraId: ${franqueadoraId}`)
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!franqueadoraId && elevated && queryFranqueadoraId) {
      franqueadoraId = queryFranqueadoraId
    }

    if (franqueadoraId) {
      req.franqueadoraAdmin = { franqueadora_id: franqueadoraId }
    }
    
    // Armazenar franchiseId para uso em rotas que precisam filtrar por franquia
    if (franchiseId) {
      (req as any).franchiseId = franchiseId
    }
    
    console.log(`[AUTH] requireFranqueadoraAdmin OK - franqueadoraId: ${franqueadoraId}, franchiseId: ${franchiseId}`)
    return next()
  } catch (err) {
    console.error('[AUTH] Erro em requireFranqueadoraAdmin:', err)
    return res.status(403).json({ message: 'Forbidden' })
  }
}

