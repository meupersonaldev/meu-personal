"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRateLimit = exports.createBlacklist = exports.createWhitelist = exports.uploadRateLimit = exports.apiRateLimit = exports.authRateLimit = exports.createRateLimit = exports.rateLimitConfig = void 0;
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
    },
    upload: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 100,
        message: 'Muitos uploads. Tente novamente em 1 hora.'
    }
};
const createRateLimit = (config) => {
    return (req, res, next) => {
        const ip = getClientIP(req);
        const now = Date.now();
        cleanupExpiredEntries(now);
        if (!store[ip]) {
            store[ip] = {
                count: 1,
                resetTime: now + config.windowMs
            };
            return next();
        }
        if (now > store[ip].resetTime) {
            store[ip] = {
                count: 1,
                resetTime: now + config.windowMs
            };
            return next();
        }
        store[ip].count++;
        if (store[ip].count > config.maxRequests) {
            const resetTimeInSeconds = Math.ceil((store[ip].resetTime - now) / 1000);
            return res.status(429).json({
                message: config.message,
                retryAfter: resetTimeInSeconds,
                error: 'RATE_LIMIT_EXCEEDED'
            });
        }
        res.set({
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - store[ip].count).toString(),
            'X-RateLimit-Reset': new Date(store[ip].resetTime).toISOString()
        });
        next();
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
exports.uploadRateLimit = (0, exports.createRateLimit)(exports.rateLimitConfig.upload);
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
    const userStore = {};
    return (req, res, next) => {
        const identifier = req.user?.userId || getClientIP(req);
        const now = Date.now();
        for (const id in userStore) {
            if (now > userStore[id].resetTime) {
                delete userStore[id];
            }
        }
        if (!userStore[identifier]) {
            userStore[identifier] = {
                count: 1,
                resetTime: now + config.windowMs
            };
            return next();
        }
        if (now > userStore[identifier].resetTime) {
            userStore[identifier] = {
                count: 1,
                resetTime: now + config.windowMs
            };
            return next();
        }
        userStore[identifier].count++;
        if (userStore[identifier].count > config.maxRequests) {
            const resetTimeInSeconds = Math.ceil((userStore[identifier].resetTime - now) / 1000);
            return res.status(429).json({
                message: config.message,
                retryAfter: resetTimeInSeconds,
                error: 'USER_RATE_LIMIT_EXCEEDED'
            });
        }
        next();
    };
};
exports.createUserRateLimit = createUserRateLimit;
//# sourceMappingURL=rateLimit.js.map