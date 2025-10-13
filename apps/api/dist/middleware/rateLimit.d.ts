import { Request, Response, NextFunction } from 'express';
export declare const rateLimitConfig: {
    auth: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
    api: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
    upload: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
};
export declare const createRateLimit: (config: typeof rateLimitConfig.auth) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const createWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const createBlacklist: (blockedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const createUserRateLimit: (config: typeof rateLimitConfig.api) => (req: Request & {
    user?: any;
}, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rateLimit.d.ts.map