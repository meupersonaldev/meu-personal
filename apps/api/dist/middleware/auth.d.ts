import { Request, Response, NextFunction } from 'express';
type JwtUser = {
    userId: string;
    email: string;
    role?: string;
};
declare global {
    namespace Express {
        interface Request {
            user?: JwtUser & {
                canonicalRole?: string;
            };
            franqueadoraAdmin?: {
                franqueadora_id: string;
            };
            timezone?: string;
        }
    }
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireRole(roles: string[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function requireFranqueadoraAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=auth.d.ts.map