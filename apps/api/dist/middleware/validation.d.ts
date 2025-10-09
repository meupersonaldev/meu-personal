import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export interface ValidationRequest extends Request {
    validatedBody?: any;
    validatedParams?: any;
    validatedQuery?: any;
}
export declare const validateBody: (schema: ZodSchema) => (req: ValidationRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const validateParams: (schema: ZodSchema) => (req: ValidationRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const validateQuery: (schema: ZodSchema) => (req: ValidationRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=validation.d.ts.map