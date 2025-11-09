import { Request, Response, NextFunction } from 'express'

// Interface para armazenar requisições por IP
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Store em memória (em produção usar Redis)
const store: RateLimitStore = {}

// Configurações diferentes para diferentes endpoints
export const rateLimitConfig = {
  // Login - mais restritivo
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 50, // máximo 50 tentativas
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  // API geral - menos restritivo
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 1000, // máximo 1000 requisições (aumentado de 100)
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  },
  ratings: {
    windowMs: 60 * 1000,
    maxRequests: 6,
    message: 'Muitas avaliações enviadas. Tente novamente em instantes.'
  }
}

export const createRateLimit = (config: typeof rateLimitConfig.auth) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // RATE LIMIT DESABILITADO TEMPORARIAMENTE
    return next()
  }
}

// Função para obter IP do cliente
function getClientIP(req: Request): string {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    '127.0.0.1'
  )
}

// Limpar entradas expiradas
function cleanupExpiredEntries(now: number): void {
  for (const ip in store) {
    if (now > store[ip].resetTime) {
      delete store[ip]
    }
  }
}

// Rate limits específicos
export const authRateLimit = createRateLimit(rateLimitConfig.auth)
export const apiRateLimit = createRateLimit(rateLimitConfig.api)

// Middleware para whitelist de IPs (se necessário)
export const createWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req)
    
    if (allowedIPs.includes(ip)) {
      return next()
    }
    
    return res.status(403).json({
      message: 'Acesso não permitido para este IP',
      error: 'IP_NOT_ALLOWED'
    })
  }
}

// Middleware para blacklist de IPs
export const createBlacklist = (blockedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req)
    
    if (blockedIPs.includes(ip)) {
      return res.status(403).json({
        message: 'IP bloqueado',
        error: 'IP_BLOCKED'
      })
    }
    
    next()
  }
}

// Rate limit baseado em usuário (para endpoints autenticados)
export const createUserRateLimit = (config: typeof rateLimitConfig.api) => {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const now = Date.now()
    cleanupExpiredEntries(now)
    const uid = req.user?.userId
    if (!uid) return next()
    const key = `user:${uid}:ratings:${config.windowMs}`
    const entry = store[key]
    if (!entry || now > entry.resetTime) {
      store[key] = { count: 1, resetTime: now + config.windowMs }
      return next()
    }
    if (entry.count >= config.maxRequests) {
      return res.status(429).json({ message: config.message })
    }
    entry.count += 1
    next()
  }
}