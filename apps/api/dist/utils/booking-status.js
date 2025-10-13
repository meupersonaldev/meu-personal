"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBookingStatus = normalizeBookingStatus;
exports.isActiveBookingStatus = isActiveBookingStatus;
exports.isCompletedStatus = isCompletedStatus;
exports.isCanceledStatus = isCanceledStatus;
function normalizeBookingStatus(status, canonical) {
    const raw = String(status || canonical || '').toUpperCase();
    if (raw === 'DONE' || raw === 'COMPLETED')
        return 'COMPLETED';
    if (raw === 'CANCELED' || raw === 'CANCELLED')
        return 'CANCELED';
    if (raw === 'PAID' || raw === 'CONFIRMED')
        return 'PAID';
    if (raw === 'RESERVED')
        return 'RESERVED';
    if (raw === 'PENDING')
        return 'PENDING';
    if (raw === 'BLOCKED')
        return 'BLOCKED';
    if (raw === 'AVAILABLE')
        return 'AVAILABLE';
    return 'PENDING';
}
function isActiveBookingStatus(s) {
    return s === 'PENDING' || s === 'RESERVED' || s === 'PAID';
}
function isCompletedStatus(s) {
    return s === 'COMPLETED';
}
function isCanceledStatus(s) {
    return s === 'CANCELED';
}
//# sourceMappingURL=booking-status.js.map