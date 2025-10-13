declare class CacheService {
    private redis;
    private memoryCache;
    private readonly DEFAULT_TTL;
    constructor();
    get(key: string): Promise<any | null>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    private cleanupMemoryCache;
    invalidatePattern(pattern: string): Promise<void>;
}
export declare const cacheService: CacheService;
export {};
//# sourceMappingURL=cache.service.d.ts.map