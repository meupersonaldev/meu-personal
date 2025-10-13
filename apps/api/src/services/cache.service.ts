import Redis from 'ioredis'

class CacheService {
  private redis: Redis | null = null
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  constructor() {
    // Inicializar Redis apenas se disponível
    const isTestEnv = process.env.NODE_ENV === 'test'
    if (process.env.REDIS_URL && !isTestEnv) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 3
        })
        
        this.redis.on('error', (err) => {
          console.warn('Redis connection error, falling back to memory cache:', err.message)
          this.redis = null
        })
      } catch (error) {
        console.warn('Failed to initialize Redis, using memory cache:', error)
      }
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      if (this.redis) {
        const cached = await this.redis.get(key)
        return cached ? JSON.parse(cached) : null
      }
      
      // Fallback para cache em memória
      const cached = this.memoryCache.get(key)
      if (cached && Date.now() - cached.timestamp < this.DEFAULT_TTL) {
        return cached.data
      }
      
      // Limpar cache expirado
      if (cached) {
        this.memoryCache.delete(key)
      }
      
      return null
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttlMs: number = this.DEFAULT_TTL): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value))
        return
      }
      
      // Fallback para cache em memória
      this.memoryCache.set(key, {
        data: value,
        timestamp: Date.now()
      })
      
      // Limpar cache antigo periodicamente
      if (this.memoryCache.size > 1000) {
        this.cleanupMemoryCache()
      }
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
        return
      }
      
      this.memoryCache.delete(key)
    } catch (error) {
      console.warn('Cache delete error:', error)
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp > this.DEFAULT_TTL) {
        this.memoryCache.delete(key)
      }
    }
  }

  // Método para invalidar cache por padrão
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
        return
      }
      
      // Para cache em memória, remover chaves que correspondem ao padrão
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key)
        }
      }
    } catch (error) {
      console.warn('Cache invalidate pattern error:', error)
    }
  }
}

export const cacheService = new CacheService()
