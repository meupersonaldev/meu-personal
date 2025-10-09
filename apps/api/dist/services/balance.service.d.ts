export interface StudentClassBalance {
    id: string;
    student_id: string;
    unit_id: string;
    total_purchased: number;
    total_consumed: number;
    locked_qty: number;
    updated_at: string;
}
export interface StudentClassTransaction {
    id: string;
    student_id: string;
    unit_id: string;
    type: 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE';
    source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
    qty: number;
    booking_id?: string;
    meta_json: Record<string, any>;
    created_at: string;
    unlock_at?: string;
}
export interface ProfHourBalance {
    id: string;
    professor_id: string;
    unit_id: string;
    available_hours: number;
    locked_hours: number;
    updated_at: string;
}
export interface HourTransaction {
    id: string;
    professor_id: string;
    unit_id: string;
    type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE';
    source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
    hours: number;
    booking_id?: string;
    meta_json: Record<string, any>;
    created_at: string;
    unlock_at?: string;
}
declare class BalanceService {
    getStudentBalance(studentId: string, unitId: string): Promise<StudentClassBalance>;
    createStudentBalance(studentId: string, unitId: string): Promise<StudentClassBalance>;
    updateStudentBalance(studentId: string, unitId: string, updates: Partial<Pick<StudentClassBalance, 'total_purchased' | 'total_consumed' | 'locked_qty'>>): Promise<StudentClassBalance>;
    createStudentTransaction(studentId: string, unitId: string, type: StudentClassTransaction['type'], qty: number, source?: StudentClassTransaction['source'], bookingId?: string, metaJson?: Record<string, any>, unlockAt?: string): Promise<StudentClassTransaction>;
    purchaseStudentClasses(studentId: string, unitId: string, qty: number, source?: StudentClassTransaction['source'], metaJson?: Record<string, any>): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    lockStudentClasses(studentId: string, unitId: string, qty: number, bookingId: string, unlockAt: string, source?: StudentClassTransaction['source']): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    unlockStudentClasses(studentId: string, unitId: string, qty: number, bookingId: string, source?: StudentClassTransaction['source']): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    consumeStudentClasses(studentId: string, unitId: string, qty: number, bookingId: string, source?: StudentClassTransaction['source']): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    getProfessorBalance(professorId: string, unitId: string): Promise<ProfHourBalance>;
    createProfessorBalance(professorId: string, unitId: string): Promise<ProfHourBalance>;
    updateProfessorBalance(professorId: string, unitId: string, updates: Partial<Pick<ProfHourBalance, 'available_hours' | 'locked_hours'>>): Promise<ProfHourBalance>;
    createHourTransaction(professorId: string, unitId: string, type: HourTransaction['type'], hours: number, source?: HourTransaction['source'], bookingId?: string, metaJson?: Record<string, any>, unlockAt?: string): Promise<HourTransaction>;
    purchaseProfessorHours(professorId: string, unitId: string, hours: number, source?: HourTransaction['source'], metaJson?: Record<string, any>): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    lockProfessorHours(professorId: string, unitId: string, hours: number, bookingId: string, unlockAt: string, source?: HourTransaction['source']): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    consumeProfessorHours(professorId: string, unitId: string, hours: number, bookingId: string, source?: HourTransaction['source']): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    unlockProfessorHours(professorId: string, unitId: string, hours: number, bookingId: string, source?: HourTransaction['source']): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    getTransactionsToUnlock(): Promise<StudentClassTransaction[]>;
    getHourTransactionsToUnlock(): Promise<HourTransaction[]>;
}
export declare const balanceService: BalanceService;
export {};
//# sourceMappingURL=balance.service.d.ts.map