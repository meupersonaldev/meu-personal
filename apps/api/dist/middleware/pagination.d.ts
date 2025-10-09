import { Request, Response, NextFunction } from 'express';
export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    filters?: any;
}
export declare const extractPagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const extractFilters: (allowedFilters: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const buildPaginatedResponse: <T>(data: T[], total: number, pagination: PaginationParams, filters?: any) => PaginatedResponse<T>;
export declare const buildOrderClause: (sortBy?: string, sortOrder?: "asc" | "desc") => any;
export declare const buildFilterClauses: (filters: any, query: any) => any;
export declare const addPaginationHeaders: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=pagination.d.ts.map