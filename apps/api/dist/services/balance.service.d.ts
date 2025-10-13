export interface BalanceScope {
    franqueadoraId: string;
    unitId?: string | null;
}
export interface StudentClassBalance {
    id: string;
    student_id: string;
    franqueadora_id: string;
    total_purchased: number;
    total_consumed: number;
    locked_qty: number;
    updated_at: string;
    unit_id?: string | null;
}
export interface StudentClassTransaction {
    id: string;
    student_id: string;
    franqueadora_id: string;
    unit_id?: string | null;
    type: 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE';
    source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
    qty: number;
    booking_id?: string;
    meta_json: Record<string, any>;
    created_at: string;
    unlock_at?: string | null;
}
export interface ProfHourBalance {
    id: string;
    professor_id: string;
    franqueadora_id: string;
    available_hours: number;
    locked_hours: number;
    updated_at: string;
    unit_id?: string | null;
}
export interface HourTransaction {
    id: string;
    professor_id: string;
    franqueadora_id: string;
    unit_id?: string | null;
    type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE';
    source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
    hours: number;
    booking_id?: string;
    meta_json: Record<string, any>;
    created_at: string;
    unlock_at?: string | null;
}
interface StudentTransactionOptions {
    unitId?: string | null;
    source?: StudentClassTransaction['source'];
    bookingId?: string;
    metaJson?: Record<string, any>;
    unlockAt?: string;
}
interface ProfessorTransactionOptions {
    unitId?: string | null;
    source?: HourTransaction['source'];
    bookingId?: string;
    metaJson?: Record<string, any>;
    unlockAt?: string;
}
declare class BalanceService {
    private ensureStudentBalance;
    getStudentBalance(studentId: string, franqueadoraId: string): Promise<StudentClassBalance>;
    createStudentBalance(studentId: string, franqueadoraId: string): Promise<StudentClassBalance>;
    updateStudentBalance(studentId: string, franqueadoraId: string, updates: Partial<Pick<StudentClassBalance, 'total_purchased' | 'total_consumed' | 'locked_qty'>>): Promise<StudentClassBalance>;
    createStudentTransaction(studentId: string, franqueadoraId: string, type: StudentClassTransaction['type'], qty: number, options?: StudentTransactionOptions): Promise<StudentClassTransaction>;
    purchaseStudentClasses(studentId: string, franqueadoraId: string, qty: number, options?: StudentTransactionOptions): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    lockStudentClasses(studentId: string, franqueadoraId: string, qty: number, bookingId: string, unlockAt: string, options?: StudentTransactionOptions): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    unlockStudentClasses(studentId: string, franqueadoraId: string, qty: number, bookingId: string, options?: StudentTransactionOptions): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    consumeStudentClasses(studentId: string, franqueadoraId: string, qty: number, bookingId: string, options?: StudentTransactionOptions): Promise<{
        balance: StudentClassBalance;
        transaction: StudentClassTransaction;
    }>;
    private ensureProfessorBalance;
    getProfessorBalance(professorId: string, franqueadoraId: string): Promise<ProfHourBalance>;
    createProfessorBalance(professorId: string, franqueadoraId: string): Promise<ProfHourBalance>;
    updateProfessorBalance(professorId: string, franqueadoraId: string, updates: Partial<Pick<ProfHourBalance, 'available_hours' | 'locked_hours'>>): Promise<ProfHourBalance>;
    createHourTransaction(professorId: string, franqueadoraId: string, type: HourTransaction['type'], hours: number, options?: ProfessorTransactionOptions): Promise<HourTransaction>;
    purchaseProfessorHours(professorId: string, franqueadoraId: string, hours: number, options?: ProfessorTransactionOptions): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    lockProfessorHours(professorId: string, franqueadoraId: string, hours: number, bookingId: string, unlockAt: string, options?: ProfessorTransactionOptions): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    consumeProfessorHours(professorId: string, franqueadoraId: string, hours: number, bookingId: string, options?: ProfessorTransactionOptions): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    unlockProfessorHours(professorId: string, franqueadoraId: string, hours: number, bookingId: string, options?: ProfessorTransactionOptions): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    revokeProfessorHours(professorId: string, franqueadoraId: string, hours: number, bookingId: string, options?: ProfessorTransactionOptions): Promise<{
        balance: ProfHourBalance;
        transaction: HourTransaction;
    }>;
    getTransactionsToUnlock(): Promise<StudentClassTransaction[]>;
    getHourTransactionsToUnlock(): Promise<HourTransaction[]>;
}
export declare const balanceService: BalanceService;
export {};
//# sourceMappingURL=balance.service.d.ts.map