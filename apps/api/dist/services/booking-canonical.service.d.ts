export interface CreateBookingParams {
    source: 'ALUNO' | 'PROFESSOR';
    studentId?: string;
    professorId: string;
    unitId: string;
    startAt: Date;
    endAt: Date;
    studentNotes?: string;
    professorNotes?: string;
}
export interface BookingCanonical {
    id: string;
    source: 'ALUNO' | 'PROFESSOR';
    student_id?: string;
    teacher_id: string;
    professor_id?: string;
    unit_id: string;
    start_at: string;
    end_at: string;
    status_canonical: 'RESERVED' | 'PAID' | 'CANCELED' | 'DONE';
    cancellable_until?: string;
    student_notes?: string;
    professor_notes?: string;
    created_at: string;
    updated_at: string;
}
declare class BookingCanonicalService {
    createBooking(params: CreateBookingParams): Promise<BookingCanonical>;
    private createStudentLedBooking;
    private createProfessorLedBooking;
    private checkSlotCapacity;
    cancelBooking(bookingId: string, userId: string): Promise<BookingCanonical>;
    confirmBooking(bookingId: string): Promise<BookingCanonical>;
    completeBooking(bookingId: string): Promise<BookingCanonical>;
    private createOrUpdateStudentUnit;
}
export declare const bookingCanonicalService: BookingCanonicalService;
export {};
//# sourceMappingURL=booking-canonical.service.d.ts.map