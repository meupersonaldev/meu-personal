"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = auditMiddleware;
exports.auditAuthEvent = auditAuthEvent;
exports.auditSensitiveOperation = auditSensitiveOperation;
const crypto_1 = require("crypto");
const audit_service_1 = require("../services/audit.service");
function auditMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || (0, crypto_1.randomUUID)();
    req.audit = {
        ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString(),
        correlationId
    };
    res.setHeader('x-correlation-id', correlationId);
    next();
}
function auditAuthEvent(operation) {
    return async (req, res, next) => {
        const originalSend = res.send;
        let responseData;
        res.send = function (data) {
            responseData = data;
            return originalSend.call(this, data);
        };
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                try {
                    await audit_service_1.auditService.logAuthEvent(operation, req.user.userId, req.user.role, req.audit?.ipAddress, req.audit?.userAgent, {
                        timestamp: req.audit?.timestamp,
                        response_status: res.statusCode
                    });
                }
                catch (error) {
                    console.error('❌ Erro no middleware de audit auth:', error);
                }
            }
        });
        next();
    };
}
function auditSensitiveOperation(operation, tableName) {
    return async (req, res, next) => {
        const originalSend = res.send;
        let responseData;
        res.send = function (data) {
            responseData = data;
            return originalSend.call(this, data);
        };
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                try {
                    const recordId = req.params.id || responseData?.id || 'unknown';
                    await audit_service_1.auditService.createLog({
                        tableName,
                        recordId,
                        operation: operation,
                        actorId: req.user.userId,
                        actorRole: req.user.role,
                        newValues: {
                            ...req.body,
                            ...responseData
                        },
                        metadata: {
                            method: req.method,
                            path: req.path,
                            timestamp: req.audit?.timestamp,
                            response_status: res.statusCode,
                            correlation_id: req.audit?.correlationId
                        },
                        ipAddress: req.audit?.ipAddress,
                        userAgent: req.audit?.userAgent
                    });
                }
                catch (error) {
                    console.error('❌ Erro no middleware de audit operation:', error);
                }
            }
        });
        next();
    };
}
//# sourceMappingURL=audit.js.map