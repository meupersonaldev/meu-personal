"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class CacheService {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.DEFAULT_TTL = 5 * 60 * 1000;
        const isTestEnv = process.env.NODE_ENV === 'test';
        if (process.env.REDIS_URL && !isTestEnv) {
            try {
                this.redis = new ioredis_1.default(process.env.REDIS_URL, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 3
                });
                this.redis.on('error', (err) => {
                    console.warn('Redis connection error, falling back to memory cache:', err.message);
                    this.redis = null;
                });
            }
            catch (error) {
                console.warn('Failed to initialize Redis, using memory cache:', error);
            }
        }
    }
    async get(key) {
        try {
            if (this.redis) {
                const cached = await this.redis.get(key);
                return cached ? JSON.parse(cached) : null;
            }
            const cached = this.memoryCache.get(key);
            if (cached && Date.now() - cached.timestamp < this.DEFAULT_TTL) {
                return cached.data;
            }
            if (cached) {
                this.memoryCache.delete(key);
            }
            return null;
        }
        catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttlMs = this.DEFAULT_TTL) {
        try {
            if (this.redis) {
                await this.redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
                return;
            }
            this.memoryCache.set(key, {
                data: value,
                timestamp: Date.now()
            });
            if (this.memoryCache.size > 1000) {
                this.cleanupMemoryCache();
            }
        }
        catch (error) {
            console.warn('Cache set error:', error);
        }
    }
    async delete(key) {
        try {
            if (this.redis) {
                await this.redis.del(key);
                return;
            }
            this.memoryCache.delete(key);
        }
        catch (error) {
            console.warn('Cache delete error:', error);
        }
    }
    cleanupMemoryCache() {
        const now = Date.now();
        for (const [key, cached] of this.memoryCache.entries()) {
            if (now - cached.timestamp > this.DEFAULT_TTL) {
                this.memoryCache.delete(key);
            }
        }
    }
    async invalidatePattern(pattern) {
        try {
            if (this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
                return;
            }
            for (const key of this.memoryCache.keys()) {
                if (key.includes(pattern.replace('*', ''))) {
                    this.memoryCache.delete(key);
                }
            }
        }
        catch (error) {
            console.warn('Cache invalidate pattern error:', error);
        }
    }
}
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map