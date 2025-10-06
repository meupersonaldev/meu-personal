import { z } from 'zod'

// Schemas para validação de entrada

export const createFranchiseSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Nome contém caracteres inválidos'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço muito longo')
    .optional(),
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(50, 'Cidade muito longa')
    .regex(/^[a-zA-Z\s]+$/, 'Cidade contém caracteres inválidos')
    .optional(),
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser sigla em maiúsculas')
    .optional(),
  zipCode: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .optional()
})

export const updateFranchiseSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Nome contém caracteres inválidos')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço muito longo')
    .optional(),
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(50, 'Cidade muito longa')
    .regex(/^[a-zA-Z\s]+$/, 'Cidade contém caracteres inválidos')
    .optional(),
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser sigla em maiúsculas')
    .optional(),
  zipCode: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .optional(),
  isActive: z.boolean().optional()
})

export const createTeacherSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  specialties: z.array(z.string())
    .min(1, 'Deve ter pelo menos uma especialidade')
    .max(5, 'Máximo 5 especialidades'),
  status: z.enum(['active', 'inactive'])
    .default('active')
})

export const updateTeacherSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  specialties: z.array(z.string())
    .min(1, 'Deve ter pelo menos uma especialidade')
    .max(5, 'Máximo 5 especialidades')
    .optional(),
  status: z.enum(['active', 'inactive']).optional()
})

export const createStudentSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  credits: z.number()
    .int('Créditos deve ser número inteiro')
    .min(0, 'Créditos não pode ser negativo')
    .max(1000, 'Créditos não pode exceder 1000')
    .default(0),
  status: z.enum(['active', 'inactive'])
    .default('active'),
  planId: z.string()
    .uuid('ID do plano inválido')
    .optional()
})

export const updateStudentSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  credits: z.number()
    .int('Créditos deve ser número inteiro')
    .min(0, 'Créditos não pode ser negativo')
    .max(1000, 'Créditos não pode exceder 1000')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  planId: z.string()
    .uuid('ID do plano inválido')
    .optional()
})

export const createPlanSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo'),
  description: z.string()
    .max(500, 'Descrição muito longa')
    .optional(),
  price: z.number()
    .positive('Preço deve ser positivo')
    .max(10000, 'Preço muito alto'),
  creditsIncluded: z.number()
    .int('Créditos deve ser número inteiro')
    .min(1, 'Deve incluir pelo menos 1 crédito')
    .max(1000, 'Créditos excessivos'),
  durationDays: z.number()
    .int('Duração deve ser número inteiro')
    .min(1, 'Duração mínima de 1 dia')
    .max(365, 'Duração máxima de 365 dias'),
  features: z.array(z.string())
    .max(10, 'Máximo 10 características')
    .default([]),
  isActive: z.boolean()
    .default(true)
})

export const updatePlanSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo')
    .optional(),
  description: z.string()
    .max(500, 'Descrição muito longa')
    .optional(),
  price: z.number()
    .positive('Preço deve ser positivo')
    .max(10000, 'Preço muito alto')
    .optional(),
  creditsIncluded: z.number()
    .int('Créditos deve ser número inteiro')
    .min(1, 'Deve incluir pelo menos 1 crédito')
    .max(1000, 'Créditos excessivos')
    .optional(),
  durationDays: z.number()
    .int('Duração deve ser número inteiro')
    .min(1, 'Duração mínima de 1 dia')
    .max(365, 'Duração máxima de 365 dias')
    .optional(),
  features: z.array(z.string())
    .max(10, 'Máximo 10 características')
    .optional(),
  isActive: z.boolean().optional()
})

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido')
})

export const paginationQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Página deve ser número')
    .transform(Number)
    .refine(n => n > 0, 'Página deve ser maior que 0')
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limite deve ser número')
    .transform(Number)
    .refine(n => n > 0 && n <= 100, 'Limite deve estar entre 1 e 100')
    .default('20'),
  search: z.string()
    .max(100, 'Termo de busca muito longo')
    .optional(),
  status: z.enum(['active', 'inactive']).optional()
})