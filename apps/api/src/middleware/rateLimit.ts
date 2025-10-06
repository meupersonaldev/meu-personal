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
    maxRequests: 50, // máximo 50 tentativas (aumentado de 5)
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  // API geral - menos restritivo
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 1000, // máximo 1000 requisições (aumentado de 100)
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  },
  // Upload de arquivos - muito restritivo
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 100, // máximo 100 uploads (aumentado de 10)
    message: 'Muitos uploads. Tente novamente em 1 hora.'
  }
}

export const createRateLimit = (config: typeof rateLimitConfig.auth) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req)
    const now = Date.now()
    
    // Limpar entradas expiradas
    cleanupExpiredEntries(now)
    
    // Verificar se IP existe no store
    if (!store[ip]) {
      store[ip] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return next()
    }
    
    // Verificar se janela de tempo expirou
    if (now > store[ip].resetTime) {
      store[ip] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return next()
    }
    
    // Incrementar contador
    store[ip].count++
    
    // Verificar se excedeu limite
    if (store[ip].count > config.maxRequests) {
      const resetTimeInSeconds = Math.ceil((store[ip].resetTime - now) / 1000)
      
      return res.status(429).json({
        message: config.message,
        retryAfter: resetTimeInSeconds,
        error: 'RATE_LIMIT_EXCEEDED'
      })
    }
    
    // Adicionar headers de rate limit
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - store[ip].count).toString(),
      'X-RateLimit-Reset': new Date(store[ip].resetTime).toISOString()
    })
    
    next()
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
export const uploadRateLimit = createRateLimit(rateLimitConfig.upload)

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
  const userStore: RateLimitStore = {}
  
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    // Se não há usuário, usar IP
    const identifier = req.user?.userId || getClientIP(req)
    const now = Date.now()
    
    // Limpar entradas expiradas
    for (const id in userStore) {
      if (now > userStore[id].resetTime) {
        delete userStore[id]
      }
    }
    
    // Verificar se usuário existe no store
    if (!userStore[identifier]) {
      userStore[identifier] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return next()
    }
    
    // Verificar se janela de tempo expirou
    if (now > userStore[identifier].resetTime) {
      userStore[identifier] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return next()
    }
    
    // Incrementar contador
    userStore[identifier].count++
    
    // Verificar se excedeu limite
    if (userStore[identifier].count > config.maxRequests) {
      const resetTimeInSeconds = Math.ceil((userStore[identifier].resetTime - now) / 1000)
      
      return res.status(429).json({
        message: config.message,
        retryAfter: resetTimeInSeconds,
        error: 'USER_RATE_LIMIT_EXCEEDED'
      })
    }
    
    next()
  }
}