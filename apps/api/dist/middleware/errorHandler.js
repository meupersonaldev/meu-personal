"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncErrorHandler = exports.errorHandler = exports.CustomError = void 0;
const zod_1 = require("zod");
class CustomError extends Error {
    constructor(message, statusCode = 500, isOperational = true, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('ERRO:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        body: req.method !== 'GET' ? req.body : undefined
    });
    if (err instanceof zod_1.ZodError) {
        const validationErrors = err.errors.map(error => ({
            field: error.path.join('.'),
            message: error.message,
            code: error.code
        }));
        res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: validationErrors
        });
        return;
    }
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            error: 'INVALID_TOKEN',
            message: 'Token de autenticação inválido'
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'TOKEN_EXPIRED',
            message: 'Token de autenticação expirado'
        });
        return;
    }
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            const field = prismaError.meta?.target?.[0] || 'campo';
            res.status(409).json({
                success: false,
                error: 'DUPLICATE_ENTRY',
                message: `Já existe um registro com este ${field}`,
                details: {
                    field: prismaError.meta?.target
                }
            });
            return;
        }
        if (prismaError.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Registro não encontrado'
            });
            return;
        }
        if (prismaError.code === 'P2003') {
            res.status(400).json({
                success: false,
                error: 'FOREIGN_KEY_VIOLATION',
                message: 'Referência inválida',
                details: {
                    field: prismaError.meta?.field_name
                }
            });
            return;
        }
    }
    if (err.code === 'INSUFFICIENT_PERMISSIONS') {
        res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para realizar esta ação'
        });
        return;
    }
    if (err.code === 'RESOURCE_NOT_FOUND') {
        res.status(404).json({
            success: false,
            error: 'RESOURCE_NOT_FOUND',
            message: err.message || 'Recurso não encontrado'
        });
        return;
    }
    if (err.code === 'BUSINESS_RULE_VIOLATION') {
        res.status(400).json({
            success: false,
            error: 'BUSINESS_RULE_VIOLATION',
            message: err.message || 'Violação de regra de negócio',
            details: err.details
        });
        return;
    }
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor'
        : error.message || 'Erro interno do servidor';
    res.status(statusCode).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message,
        ...(process.env.NODE_ENV !== 'production' && {
            stack: err.stack,
            details: error.details
        })
    });
};
exports.errorHandler = errorHandler;
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncErrorHandler = asyncErrorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Rota ${req.method} ${req.path} não encontrada`
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map