import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export interface ValidationRequest extends Request {
  validatedBody?: any
  validatedParams?: any
  validatedQuery?: any
}

export const validateBody = (schema: ZodSchema) => {
  return (req: ValidationRequest, res: Response, next: NextFunction) => {
    try {
      req.validatedBody = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      return res.status(400).json({ message: 'Dados inválidos' })
    }
  }
}

export const validateParams = (schema: ZodSchema) => {
  return (req: ValidationRequest, res: Response, next: NextFunction) => {
    try {
      req.validatedParams = schema.parse(req.params)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Parâmetros inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      return res.status(400).json({ message: 'Parâmetros inválidos' })
    }
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: ValidationRequest, res: Response, next: NextFunction) => {
    try {
      req.validatedQuery = schema.parse(req.query)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Query inválido',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      return res.status(400).json({ message: 'Query inválido' })
    }
  }
}