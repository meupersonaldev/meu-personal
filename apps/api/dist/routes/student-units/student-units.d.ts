import { Request, Response } from 'express';
export interface Unit {
    id: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    is_active: boolean;
    capacity_per_slot: number;
    opening_hours_json: Record<string, any>;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}
export interface StudentUnit {
    id: string;
    student_id: string;
    unit_id: string;
    unit: Unit;
    is_active: boolean;
    first_booking_date?: string;
    last_booking_date?: string;
    total_bookings: number;
    created_at: string;
    updated_at: string;
}
export declare function getStudentUnits(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAvailableUnits(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function activateStudentUnit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getStudentActiveUnit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function joinUnit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=student-units.d.ts.map