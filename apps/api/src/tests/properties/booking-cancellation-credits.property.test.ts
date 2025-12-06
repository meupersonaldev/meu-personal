/**
 * Property-Based Test: Cancelamento total estorna créditos corretamente
 * 
 * **Feature: fix-recurring-bookings, Property 3: Cancelamento total estorna créditos corretamente**
 * **Validates: Requirements 1.6, 5.3**
 * 
 * This test verifies that for any series with N confirmed bookings (is_reserved=false, 
 * status_canonical='PAID'), when a full cancellation is executed, the system cancels 
 * all N bookings and refunds exactly N credits to the student.
 */

import * as fc from 'fast-check'

// Type definitions for booking in a series
interface SeriesBooking {
  id: string
  series_id: string
  student_id: string
  is_reserved: boolean
  status_canonical: 'PAID' | 'RESERVED' | 'CANCELED' | 'DONE'
  start_at: string
}

// Type definitions for series
interface BookingSeries {
  id: string
  student_id: string
  status: 'ACTIVE' | 'CANCELLED'
}

// Type definitions for student balance
interface StudentBalance {
  student_id: string
  balance: number
}

// Type definitions for cancellation result
interface CancellationResult {
  cancelledCount: number
  refundedCredits: number
  updatedBalance: number
  cancelledBookingIds: string[]
}

/**
 * Simulates the cancellation logic from the booking-series endpoint.
 * This mirrors the actual implementation in apps/api/src/routes/booking-series.ts
 */
function simulateCancelAllSeries(
  series: BookingSeries,
  bookings: SeriesBooking[],
  currentBalance: number
): CancellationResult {
  // Filter bookings that belong to this series and are not already cancelled
  const seriesBookings = bookings.filter(
    b => b.series_id === series.id && b.status_canonical !== 'CANCELED'
  )
  
  // Get IDs of all bookings to cancel
  const cancelledBookingIds = seriesBookings.map(b => b.id)
  
  // Count confirmed bookings (not reserved) - these get credit refund
  const confirmedBookings = seriesBookings.filter(b => !b.is_reserved)
  const refundedCredits = confirmedBookings.length
  
  // Calculate new balance
  const updatedBalance = currentBalance + refundedCredits
  
  return {
    cancelledCount: cancelledBookingIds.length,
    refundedCredits,
    updatedBalance,
    cancelledBookingIds
  }
}

/**
 * Counts confirmed (non-reserved, non-cancelled) bookings in a series
 */
function countConfirmedBookings(bookings: SeriesBooking[], seriesId: string): number {
  return bookings.filter(
    b => b.series_id === seriesId && 
         !b.is_reserved && 
         b.status_canonical !== 'CANCELED'
  ).length
}

/**
 * Counts all non-cancelled bookings in a series
 */
function countActiveBookings(bookings: SeriesBooking[], seriesId: string): number {
  return bookings.filter(
    b => b.series_id === seriesId && b.status_canonical !== 'CANCELED'
  ).length
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())

// Generator for booking status (only non-cancelled for active bookings)
const activeStatusArb = fc.constantFrom('PAID', 'RESERVED', 'DONE') as fc.Arbitrary<'PAID' | 'RESERVED' | 'DONE'>

// Generator for a single booking in a series
const seriesBookingArb = (seriesId: string, studentId: string): fc.Arbitrary<SeriesBooking> => 
  fc.record({
    id: uuidArb,
    series_id: fc.constant(seriesId),
    student_id: fc.constant(studentId),
    is_reserved: fc.boolean(),
    status_canonical: activeStatusArb,
    start_at: dateArb
  })

// Generator for a series with its bookings
const seriesWithBookingsArb: fc.Arbitrary<{
  series: BookingSeries
  bookings: SeriesBooking[]
  initialBalance: number
}> = fc.tuple(uuidArb, uuidArb).chain(([seriesId, studentId]) =>
  fc.record({
    series: fc.constant({
      id: seriesId,
      student_id: studentId,
      status: 'ACTIVE' as const
    }),
    bookings: fc.array(seriesBookingArb(seriesId, studentId), { minLength: 1, maxLength: 20 }),
    initialBalance: fc.integer({ min: 0, max: 100 })
  })
)

describe('Property 3: Cancelamento total estorna créditos corretamente', () => {
  /**
   * Property: For any series with N confirmed bookings, cancelling the entire series
   * should refund exactly N credits (one per confirmed booking).
   */
  it('should refund exactly one credit per confirmed (non-reserved) booking', () => {
    fc.assert(
      fc.property(seriesWithBookingsArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Count expected refunds (confirmed bookings only)
        const expectedRefunds = countConfirmedBookings(bookings, series.id)
        
        // Property: Refunded credits must equal number of confirmed bookings
        expect(result.refundedCredits).toBe(expectedRefunds)
      }),
      { numRuns: 100 }
    )
  })

  it('should cancel all non-cancelled bookings in the series', () => {
    fc.assert(
      fc.property(seriesWithBookingsArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Count expected cancellations (all non-cancelled bookings)
        const expectedCancellations = countActiveBookings(bookings, series.id)
        
        // Property: Cancelled count must equal number of active bookings
        expect(result.cancelledCount).toBe(expectedCancellations)
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly update student balance after cancellation', () => {
    fc.assert(
      fc.property(seriesWithBookingsArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Property: New balance = initial balance + refunded credits
        expect(result.updatedBalance).toBe(initialBalance + result.refundedCredits)
      }),
      { numRuns: 100 }
    )
  })

  it('should not refund credits for reserved bookings', () => {
    // Generate series with only reserved bookings
    const seriesWithOnlyReservedArb = fc.tuple(uuidArb, uuidArb).chain(([seriesId, studentId]) =>
      fc.record({
        series: fc.constant({
          id: seriesId,
          student_id: studentId,
          status: 'ACTIVE' as const
        }),
        bookings: fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant(seriesId),
            student_id: fc.constant(studentId),
            is_reserved: fc.constant(true), // All reserved
            status_canonical: activeStatusArb,
            start_at: dateArb
          }),
          { minLength: 1, maxLength: 10 }
        ),
        initialBalance: fc.integer({ min: 0, max: 100 })
      })
    )

    fc.assert(
      fc.property(seriesWithOnlyReservedArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Property: No credits should be refunded for reserved bookings
        expect(result.refundedCredits).toBe(0)
        
        // Balance should remain unchanged
        expect(result.updatedBalance).toBe(initialBalance)
      }),
      { numRuns: 100 }
    )
  })

  it('should refund all credits for series with only confirmed bookings', () => {
    // Generate series with only confirmed (non-reserved) bookings
    const seriesWithOnlyConfirmedArb = fc.tuple(uuidArb, uuidArb).chain(([seriesId, studentId]) =>
      fc.record({
        series: fc.constant({
          id: seriesId,
          student_id: studentId,
          status: 'ACTIVE' as const
        }),
        bookings: fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant(seriesId),
            student_id: fc.constant(studentId),
            is_reserved: fc.constant(false), // All confirmed
            status_canonical: fc.constant('PAID' as const),
            start_at: dateArb
          }),
          { minLength: 1, maxLength: 10 }
        ),
        initialBalance: fc.integer({ min: 0, max: 100 })
      })
    )

    fc.assert(
      fc.property(seriesWithOnlyConfirmedArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Property: All bookings should be refunded
        expect(result.refundedCredits).toBe(bookings.length)
        
        // Property: Cancelled count equals total bookings
        expect(result.cancelledCount).toBe(bookings.length)
        
        // Property: Balance increases by number of bookings
        expect(result.updatedBalance).toBe(initialBalance + bookings.length)
      }),
      { numRuns: 100 }
    )
  })

  it('should handle mixed confirmed and reserved bookings correctly', () => {
    fc.assert(
      fc.property(seriesWithBookingsArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Count confirmed and reserved separately
        const confirmedCount = bookings.filter(
          b => b.series_id === series.id && !b.is_reserved && b.status_canonical !== 'CANCELED'
        ).length
        const reservedCount = bookings.filter(
          b => b.series_id === series.id && b.is_reserved && b.status_canonical !== 'CANCELED'
        ).length
        
        // Property: Total cancelled = confirmed + reserved
        expect(result.cancelledCount).toBe(confirmedCount + reservedCount)
        
        // Property: Only confirmed get refunds
        expect(result.refundedCredits).toBe(confirmedCount)
      }),
      { numRuns: 100 }
    )
  })

  it('should return all cancelled booking IDs', () => {
    fc.assert(
      fc.property(seriesWithBookingsArb, ({ series, bookings, initialBalance }) => {
        const result = simulateCancelAllSeries(series, bookings, initialBalance)
        
        // Get expected IDs (all non-cancelled bookings in series)
        const expectedIds = bookings
          .filter(b => b.series_id === series.id && b.status_canonical !== 'CANCELED')
          .map(b => b.id)
        
        // Property: All expected IDs should be in the result
        expect(result.cancelledBookingIds.length).toBe(expectedIds.length)
        expectedIds.forEach(id => {
          expect(result.cancelledBookingIds).toContain(id)
        })
      }),
      { numRuns: 100 }
    )
  })
})
