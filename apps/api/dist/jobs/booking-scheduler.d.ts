export declare class BookingScheduler {
    private readonly FOUR_HOURS_MS;
    processExpiredLocks(): Promise<{
        processed: number;
        errors: string[];
    }>;
    private processStudentLocks;
    private processProfessorBonusLocks;
    private cleanupCanceledBookingLocks;
    private createLockExpiredNotification;
    private createBonusEarnedNotification;
    startScheduler(intervalMinutes?: number): void;
}
export declare const bookingScheduler: BookingScheduler;
//# sourceMappingURL=booking-scheduler.d.ts.map