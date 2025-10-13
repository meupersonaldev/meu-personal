export type NormalizedBookingStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'PAID'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'DONE'
  | 'CANCELED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'AVAILABLE'

export function normalizeBookingStatus(
  status?: string | null,
  canonical?: string | null
): NormalizedBookingStatus {
  const raw = String(status || canonical || '').toUpperCase()
  if (raw === 'DONE' || raw === 'COMPLETED') return 'COMPLETED'
  if (raw === 'CANCELED' || raw === 'CANCELLED') return 'CANCELED'
  if (raw === 'PAID' || raw === 'CONFIRMED') return 'PAID'
  if (raw === 'RESERVED') return 'RESERVED'
  if (raw === 'PENDING') return 'PENDING'
  if (raw === 'BLOCKED') return 'BLOCKED'
  if (raw === 'AVAILABLE') return 'AVAILABLE'
  return 'PENDING'
}

export function isActiveBookingStatus(s: NormalizedBookingStatus): boolean {
  // 'CONFIRMED' é normalizado para 'PAID' acima
  return s === 'PENDING' || s === 'RESERVED' || s === 'PAID'
}

export function isCompletedStatus(s: NormalizedBookingStatus): boolean {
  return s === 'COMPLETED'
}

export function isCanceledStatus(s: NormalizedBookingStatus): boolean {
  return s === 'CANCELED'
}
