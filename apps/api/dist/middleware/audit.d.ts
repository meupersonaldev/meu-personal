import { Request, Response, NextFunction } from 'express';
export declare function auditMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function auditAuthEvent(operation: 'LOGIN' | 'LOGOUT'): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function auditSensitiveOperation(operation: string, tableName: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare global {
    namespace Express {
        interface Request {
            audit?: {
                ipAddress?: string;
                userAgent?: string;
                timestamp?: string;
            };
        }
    }
}
//# sourceMappingURL=audit.d.ts.map