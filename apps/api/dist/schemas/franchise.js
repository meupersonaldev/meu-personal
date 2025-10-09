"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = exports.idParamSchema = exports.updatePlanSchema = exports.createPlanSchema = exports.updateStudentSchema = exports.createStudentSchema = exports.updateTeacherSchema = exports.createTeacherSchema = exports.updateFranchiseSchema = exports.createFranchiseSchema = void 0;
const zod_1 = require("zod");
exports.createFranchiseSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres')
        .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Nome contém caracteres inválidos'),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo'),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    address: zod_1.z.string()
        .min(5, 'Endereço deve ter pelo menos 5 caracteres')
        .max(200, 'Endereço muito longo')
        .optional(),
    city: zod_1.z.string()
        .min(2, 'Cidade deve ter pelo menos 2 caracteres')
        .max(50, 'Cidade muito longa')
        .regex(/^[a-zA-Z\s]+$/, 'Cidade contém caracteres inválidos')
        .optional(),
    state: zod_1.z.string()
        .length(2, 'Estado deve ter 2 caracteres')
        .regex(/^[A-Z]{2}$/, 'Estado deve ser sigla em maiúsculas')
        .optional(),
    zipCode: zod_1.z.string()
        .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
        .optional()
});
exports.updateFranchiseSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres')
        .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Nome contém caracteres inválidos')
        .optional(),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo')
        .optional(),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    address: zod_1.z.string()
        .min(5, 'Endereço deve ter pelo menos 5 caracteres')
        .max(200, 'Endereço muito longo')
        .optional(),
    city: zod_1.z.string()
        .min(2, 'Cidade deve ter pelo menos 2 caracteres')
        .max(50, 'Cidade muito longa')
        .regex(/^[a-zA-Z\s]+$/, 'Cidade contém caracteres inválidos')
        .optional(),
    state: zod_1.z.string()
        .length(2, 'Estado deve ter 2 caracteres')
        .regex(/^[A-Z]{2}$/, 'Estado deve ser sigla em maiúsculas')
        .optional(),
    zipCode: zod_1.z.string()
        .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
        .optional(),
    isActive: zod_1.z.boolean().optional()
});
exports.createTeacherSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos'),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo'),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    specialties: zod_1.z.array(zod_1.z.string())
        .min(1, 'Deve ter pelo menos uma especialidade')
        .max(5, 'Máximo 5 especialidades'),
    status: zod_1.z.enum(['active', 'inactive'])
        .default('active')
});
exports.updateTeacherSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos')
        .optional(),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo')
        .optional(),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    specialties: zod_1.z.array(zod_1.z.string())
        .min(1, 'Deve ter pelo menos uma especialidade')
        .max(5, 'Máximo 5 especialidades')
        .optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional()
});
exports.createStudentSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos'),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo'),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    credits: zod_1.z.number()
        .int('Créditos deve ser número inteiro')
        .min(0, 'Créditos não pode ser negativo')
        .max(1000, 'Créditos não pode exceder 1000')
        .default(0),
    status: zod_1.z.enum(['active', 'inactive'])
        .default('active'),
    planId: zod_1.z.string()
        .uuid('ID do plano inválido')
        .optional()
});
exports.updateStudentSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-Z\s]+$/, 'Nome contém caracteres inválidos')
        .optional(),
    email: zod_1.z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo')
        .optional(),
    phone: zod_1.z.string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional(),
    credits: zod_1.z.number()
        .int('Créditos deve ser número inteiro')
        .min(0, 'Créditos não pode ser negativo')
        .max(1000, 'Créditos não pode exceder 1000')
        .optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    planId: zod_1.z.string()
        .uuid('ID do plano inválido')
        .optional()
});
exports.createPlanSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),
    description: zod_1.z.string()
        .max(500, 'Descrição muito longa')
        .optional(),
    price: zod_1.z.number()
        .positive('Preço deve ser positivo')
        .max(10000, 'Preço muito alto'),
    creditsIncluded: zod_1.z.number()
        .int('Créditos deve ser número inteiro')
        .min(1, 'Deve incluir pelo menos 1 crédito')
        .max(1000, 'Créditos excessivos'),
    durationDays: zod_1.z.number()
        .int('Duração deve ser número inteiro')
        .min(1, 'Duração mínima de 1 dia')
        .max(365, 'Duração máxima de 365 dias'),
    features: zod_1.z.array(zod_1.z.string())
        .max(10, 'Máximo 10 características')
        .default([]),
    isActive: zod_1.z.boolean()
        .default(true)
});
exports.updatePlanSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo')
        .optional(),
    description: zod_1.z.string()
        .max(500, 'Descrição muito longa')
        .optional(),
    price: zod_1.z.number()
        .positive('Preço deve ser positivo')
        .max(10000, 'Preço muito alto')
        .optional(),
    creditsIncluded: zod_1.z.number()
        .int('Créditos deve ser número inteiro')
        .min(1, 'Deve incluir pelo menos 1 crédito')
        .max(1000, 'Créditos excessivos')
        .optional(),
    durationDays: zod_1.z.number()
        .int('Duração deve ser número inteiro')
        .min(1, 'Duração mínima de 1 dia')
        .max(365, 'Duração máxima de 365 dias')
        .optional(),
    features: zod_1.z.array(zod_1.z.string())
        .max(10, 'Máximo 10 características')
        .optional(),
    isActive: zod_1.z.boolean().optional()
});
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('ID inválido')
});
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.string()
        .regex(/^\d+$/, 'Página deve ser número')
        .transform(Number)
        .refine(n => n > 0, 'Página deve ser maior que 0')
        .default('1'),
    limit: zod_1.z.string()
        .regex(/^\d+$/, 'Limite deve ser número')
        .transform(Number)
        .refine(n => n > 0 && n <= 100, 'Limite deve estar entre 1 e 100')
        .default('20'),
    search: zod_1.z.string()
        .max(100, 'Termo de busca muito longo')
        .optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional()
});
//# sourceMappingURL=franchise.js.map