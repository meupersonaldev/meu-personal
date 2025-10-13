export type NormalizedBookingStatus = 'PENDING' | 'RESERVED' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'DONE' | 'CANCELED' | 'CANCELLED' | 'BLOCKED' | 'AVAILABLE';
export declare function normalizeBookingStatus(status?: string | null, canonical?: string | null): NormalizedBookingStatus;
export declare function isActiveBookingStatus(s: NormalizedBookingStatus): boolean;
export declare function isCompletedStatus(s: NormalizedBookingStatus): boolean;
export declare function isCanceledStatus(s: NormalizedBookingStatus): boolean;
//# sourceMappingURL=booking-status.d.ts.map