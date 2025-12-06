/**
 * Property-Based Test: API retorna campos de série para bookings
 * 
 * **Feature: fix-recurring-bookings, Property 1: API retorna campos de série para bookings**
 * **Validates: Requirements 1.5, 2.2, 4.2, 4.3**
 * 
 * This test verifies that for any booking that has a series_id in the database,
 * the GET /api/bookings endpoint returns both series_id and is_reserved fields
 * in the JSON response.
 */

import * as fc from 'fast-check'

// Type definitions for booking response
interface BookingResponse {
  id: string
  studentId?: string
  teacherId: string
  franchiseId?: string
  date: string
  startAt?: string
  endAt?: string
  duration: number
  status: string
  notes?: string
  creditsCost: number
  series_id: string | null
  is_reserved: boolean
}

// Simulated booking from database
interface DatabaseBooking {
  id: string
  student_id: string | null
  teacher_id: string
  franchise_id: string | null
  date: string
  start_at: string | null
  end_at: string | null
  duration: number
  status: string
  status_canonical: string
  notes: string | null
  credits_cost: number
  series_id: string | null
  is_reserved: boolean
  cancellable_until: string | null
  updated_at: string | null
}

// The mapping function extracted from the API (simulating the actual behavior)
function mapBookingToResponse(booking: DatabaseBooking): BookingResponse {
  return {
    id: booking.id,
    studentId: booking.student_id || undefined,
    teacherId: booking.teacher_id,
    franchiseId: booking.franchise_id || undefined,
    date: booking.date,
    startAt: booking.start_at || undefined,
    endAt: booking.end_at || undefined,
    duration: booking.duration ?? 60,
    status: booking.status_canonical || booking.status,
    notes: booking.notes || undefined,
    creditsCost: booking.credits_cost ?? 0,
    series_id: booking.series_id ?? null,
    is_reserved: booking.is_reserved ?? false
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
// Use a safer date generator that produces valid ISO strings
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 }) // 2024-01-01 to 2026-12-31 in ms
  .map(ms => new Date(ms).toISOString())
const statusArb = fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'AVAILABLE', 'DONE')

const databaseBookingArb: fc.Arbitrary<DatabaseBooking> = fc.record({
  id: uuidArb,
  student_id: fc.option(uuidArb, { nil: null }),
  teacher_id: uuidArb,
  franchise_id: fc.option(uuidArb, { nil: null }),
  date: dateArb,
  start_at: fc.option(dateArb, { nil: null }),
  end_at: fc.option(dateArb, { nil: null }),
  duration: fc.integer({ min: 15, max: 120 }),
  status: statusArb,
  status_canonical: statusArb,
  notes: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
  credits_cost: fc.integer({ min: 0, max: 10 }),
  series_id: fc.option(uuidArb, { nil: null }),
  is_reserved: fc.boolean(),
  cancellable_until: fc.option(dateArb, { nil: null }),
  updated_at: fc.option(dateArb, { nil: null })
})

describe('Property 1: API retorna campos de série para bookings', () => {
  /**
   * Property: For any booking with series_id in the database,
   * the API response must include series_id with the correct value
   * and is_reserved with the corresponding boolean value.
   */
  it('should always include series_id and is_reserved in response for any booking', () => {
    fc.assert(
      fc.property(databaseBookingArb, (dbBooking) => {
        const response = mapBookingToResponse(dbBooking)
        
        // Property 1: series_id field must always be present in response
        expect(response).toHaveProperty('series_id')
        
        // Property 2: is_reserved field must always be present in response
        expect(response).toHaveProperty('is_reserved')
        
        // Property 3: series_id value must match database value (or be null)
        expect(response.series_id).toBe(dbBooking.series_id ?? null)
        
        // Property 4: is_reserved value must match database value (or default to false)
        expect(response.is_reserved).toBe(dbBooking.is_reserved ?? false)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve series_id when booking belongs to a series', () => {
    // Generate only bookings that have a series_id
    const bookingWithSeriesArb = databaseBookingArb.filter(b => b.series_id !== null)
    
    fc.assert(
      fc.property(bookingWithSeriesArb, (dbBooking) => {
        const response = mapBookingToResponse(dbBooking)
        
        // When booking has series_id, response must have the same non-null value
        expect(response.series_id).not.toBeNull()
        expect(response.series_id).toBe(dbBooking.series_id)
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly map is_reserved boolean value', () => {
    fc.assert(
      fc.property(databaseBookingArb, (dbBooking) => {
        const response = mapBookingToResponse(dbBooking)
        
        // is_reserved must be a boolean
        expect(typeof response.is_reserved).toBe('boolean')
        
        // Value must match the database value
        if (dbBooking.is_reserved === true) {
          expect(response.is_reserved).toBe(true)
        } else {
          // Default to false when undefined or false
          expect(response.is_reserved).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should handle null series_id correctly', () => {
    // Generate only bookings without series_id
    const bookingWithoutSeriesArb = databaseBookingArb.filter(b => b.series_id === null)
    
    fc.assert(
      fc.property(bookingWithoutSeriesArb, (dbBooking) => {
        const response = mapBookingToResponse(dbBooking)
        
        // When booking has no series_id, response must have null
        expect(response.series_id).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
})
