"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRateLimit = exports.createBlacklist = exports.createWhitelist = exports.apiRateLimit = exports.authRateLimit = exports.createRateLimit = exports.rateLimitConfig = void 0;
const store = {};
exports.rateLimitConfig = {
    auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 50,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    api: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1000,
        message: 'Muitas requisições. Tente novamente em alguns minutos.'
    }
};
const createRateLimit = (config) => {
    return (req, res, next) => {
        return next();
    };
};
exports.createRateLimit = createRateLimit;
function getClientIP(req) {
    return (req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        '127.0.0.1');
}
function cleanupExpiredEntries(now) {
    for (const ip in store) {
        if (now > store[ip].resetTime) {
            delete store[ip];
        }
    }
}
exports.authRateLimit = (0, exports.createRateLimit)(exports.rateLimitConfig.auth);
exports.apiRateLimit = (0, exports.createRateLimit)(exports.rateLimitConfig.api);
const createWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const ip = getClientIP(req);
        if (allowedIPs.includes(ip)) {
            return next();
        }
        return res.status(403).json({
            message: 'Acesso não permitido para este IP',
            error: 'IP_NOT_ALLOWED'
        });
    };
};
exports.createWhitelist = createWhitelist;
const createBlacklist = (blockedIPs) => {
    return (req, res, next) => {
        const ip = getClientIP(req);
        if (blockedIPs.includes(ip)) {
            return res.status(403).json({
                message: 'IP bloqueado',
                error: 'IP_BLOCKED'
            });
        }
        next();
    };
};
exports.createBlacklist = createBlacklist;
const createUserRateLimit = (config) => {
    return (req, res, next) => {
        return next();
    };
};
exports.createUserRateLimit = createUserRateLimit;
//# sourceMappingURL=rateLimit.js.map