import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

// Interface para erros da aplicação
export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
  code?: string
  details?: any
}

// Classe para erros da aplicação
export class CustomError extends Error implements AppError {
  public statusCode: number
  public isOperational: boolean
  public code?: string
  public details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code
    this.details = details

    // Garantir que o stack trace seja capturado
    Error.captureStackTrace(this, this.constructor)
  }
}

// Middleware de tratamento de erros
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err }
  error.message = err.message

  // Log do erro para debugging
  console.error('ERRO:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id,
    body: req.method !== 'GET' ? req.body : undefined
  })

  // Erro de validação do Zod
  if (err instanceof ZodError) {
    const validationErrors = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code
    }))

    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: validationErrors
    })
    return
  }

  // Erro de JWT inválido
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token de autenticação inválido'
    })
    return
  }

  // Erro de JWT expirado
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'TOKEN_EXPIRED',
      message: 'Token de autenticação expirado'
    })
    return
  }

  // Erro de banco de dados (prisma)
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'campo'
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: `Já existe um registro com este ${field}`,
        details: {
          field: prismaError.meta?.target
        }
      })
      return
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Registro não encontrado'
      })
      return
    }

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'FOREIGN_KEY_VIOLATION',
        message: 'Referência inválida',
        details: {
          field: prismaError.meta?.field_name
        }
      })
      return
    }
  }

  // Erro de permissão
  if (err.code === 'INSUFFICIENT_PERMISSIONS') {
    res.status(403).json({
      success: false,
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Você não tem permissão para realizar esta ação'
    })
    return
  }

  // Erro de recurso não encontrado
  if (err.code === 'RESOURCE_NOT_FOUND') {
    res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: err.message || 'Recurso não encontrado'
    })
    return
  }

  // Erro de negócio
  if (err.code === 'BUSINESS_RULE_VIOLATION') {
    res.status(400).json({
      success: false,
      error: 'BUSINESS_RULE_VIOLATION',
      message: err.message || 'Violação de regra de negócio',
      details: err.details
    })
    return
  }

  // Erro padrão (fallback)
  const statusCode = error.statusCode || 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : error.message || 'Erro interno do servidor'

  res.status(statusCode).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      details: error.details
    })
  })
}

// Middleware para erros assíncronos não capturados
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Middleware para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Rota ${req.method} ${req.path} não encontrada`
  })
}