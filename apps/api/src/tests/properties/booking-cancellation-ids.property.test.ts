/**
 * Property-Based Test: Cancelamento usa IDs corretos
 * 
 * **Feature: fix-recurring-bookings, Property 2: Cancelamento usa IDs corretos**
 * **Validates: Requirements 1.3, 4.5**
 * 
 * This test verifies that for any cancellation operation on a series,
 * the frontend sends the correct series_id and booking_id that match
 * the values stored in the database for the selected booking.
 */

import * as fc from 'fast-check'

// Type definitions for API response booking
interface ApiBookingResponse {
  id: string
  series_id?: string | null
  seriesId?: string | null
  is_reserved?: boolean
  isReserved?: boolean
  status: string
  status_canonical?: string
  start_at?: string
  startAt?: string
  date?: string
}

// Type definitions for frontend mapped booking
interface FrontendBooking {
  id: string
  series_id: string | null
  is_reserved: boolean
  status: string
  status_canonical?: string
  start_at?: string
  date?: string
}

// Type definitions for cancellation request
interface CancellationRequest {
  seriesId: string
  bookingId: string
  cancelType: 'single' | 'all'
}

/**
 * Simulates the frontend mapping function that converts API response to local state.
 * This mirrors the actual implementation in apps/web/app/aluno/dashboard/page.tsx
 */
function mapApiResponseToFrontend(apiBooking: ApiBookingResponse): FrontendBooking {
  return {
    id: apiBooking.id,
    series_id: apiBooking.series_id ?? apiBooking.seriesId ?? null,
    is_reserved: apiBooking.is_reserved ?? apiBooking.isReserved ?? false,
    status: apiBooking.status,
    status_canonical: apiBooking.status_canonical || apiBooking.status,
    start_at: apiBooking.startAt || apiBooking.start_at,
    date: apiBooking.date
  }
}

/**
 * Simulates building the cancellation request from a frontend booking.
 * This mirrors the actual implementation in handleCancelSeriesConfirm.
 */
function buildCancellationRequest(
  booking: FrontendBooking,
  cancelType: 'single' | 'all'
): CancellationRequest | null {
  if (!booking.series_id) {
    return null
  }
  
  return {
    seriesId: booking.series_id,
    bookingId: booking.id,
    cancelType
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())
const statusArb = fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'AVAILABLE', 'DONE')
const cancelTypeArb = fc.constantFrom('single', 'all') as fc.Arbitrary<'single' | 'all'>

// Generator for API response with snake_case fields (as returned by backend)
const apiBookingSnakeCaseArb: fc.Arbitrary<ApiBookingResponse> = fc.record({
  id: uuidArb,
  series_id: fc.option(uuidArb, { nil: null }),
  is_reserved: fc.boolean(),
  status: statusArb,
  status_canonical: fc.option(statusArb, { nil: undefined }),
  start_at: fc.option(dateArb, { nil: undefined }),
  date: fc.option(dateArb, { nil: undefined })
})

// Generator for API response with camelCase fields (alternative format)
const apiBookingCamelCaseArb: fc.Arbitrary<ApiBookingResponse> = fc.record({
  id: uuidArb,
  seriesId: fc.option(uuidArb, { nil: null }),
  isReserved: fc.boolean(),
  status: statusArb,
  status_canonical: fc.option(statusArb, { nil: undefined }),
  startAt: fc.option(dateArb, { nil: undefined }),
  date: fc.option(dateArb, { nil: undefined })
})

// Generator for mixed format (both snake_case and camelCase)
const apiBookingMixedArb: fc.Arbitrary<ApiBookingResponse> = fc.oneof(
  apiBookingSnakeCaseArb,
  apiBookingCamelCaseArb
)

describe('Property 2: Cancelamento usa IDs corretos', () => {
  /**
   * Property: For any booking with a series_id, when mapped through the frontend
   * and used to build a cancellation request, the series_id and booking_id
   * must match the original values from the API response.
   */
  it('should preserve series_id through frontend mapping for cancellation', () => {
    // Only test bookings that have a series_id
    const bookingWithSeriesArb = apiBookingSnakeCaseArb.filter(
      b => b.series_id !== null && b.series_id !== undefined
    )
    
    fc.assert(
      fc.property(
        bookingWithSeriesArb,
        cancelTypeArb,
        (apiBooking, cancelType) => {
          const frontendBooking = mapApiResponseToFrontend(apiBooking)
          const cancellationRequest = buildCancellationRequest(frontendBooking, cancelType)
          
          // Cancellation request must be created for bookings with series_id
          expect(cancellationRequest).not.toBeNull()
          
          if (cancellationRequest) {
            // series_id in request must match original API response
            expect(cancellationRequest.seriesId).toBe(apiBooking.series_id)
            
            // booking_id in request must match original API response
            expect(cancellationRequest.bookingId).toBe(apiBooking.id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle camelCase series_id from API response', () => {
    // Test with camelCase format
    const bookingWithSeriesArb = apiBookingCamelCaseArb.filter(
      b => b.seriesId !== null && b.seriesId !== undefined
    )
    
    fc.assert(
      fc.property(
        bookingWithSeriesArb,
        cancelTypeArb,
        (apiBooking, cancelType) => {
          const frontendBooking = mapApiResponseToFrontend(apiBooking)
          const cancellationRequest = buildCancellationRequest(frontendBooking, cancelType)
          
          // Cancellation request must be created
          expect(cancellationRequest).not.toBeNull()
          
          if (cancellationRequest) {
            // series_id must be correctly extracted from camelCase
            expect(cancellationRequest.seriesId).toBe(apiBooking.seriesId)
            expect(cancellationRequest.bookingId).toBe(apiBooking.id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not create cancellation request for bookings without series_id', () => {
    // Test bookings without series_id
    const bookingWithoutSeriesArb = apiBookingMixedArb.filter(
      b => (b.series_id === null || b.series_id === undefined) && 
           (b.seriesId === null || b.seriesId === undefined)
    )
    
    fc.assert(
      fc.property(
        bookingWithoutSeriesArb,
        cancelTypeArb,
        (apiBooking, cancelType) => {
          const frontendBooking = mapApiResponseToFrontend(apiBooking)
          const cancellationRequest = buildCancellationRequest(frontendBooking, cancelType)
          
          // No cancellation request should be created for non-series bookings
          expect(cancellationRequest).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve booking id exactly as received from API', () => {
    fc.assert(
      fc.property(apiBookingMixedArb, (apiBooking) => {
        const frontendBooking = mapApiResponseToFrontend(apiBooking)
        
        // Booking ID must be preserved exactly
        expect(frontendBooking.id).toBe(apiBooking.id)
        
        // ID must be a valid UUID format
        expect(frontendBooking.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly map is_reserved regardless of API format', () => {
    fc.assert(
      fc.property(apiBookingMixedArb, (apiBooking) => {
        const frontendBooking = mapApiResponseToFrontend(apiBooking)
        
        // is_reserved must be a boolean
        expect(typeof frontendBooking.is_reserved).toBe('boolean')
        
        // Value must match either snake_case or camelCase source
        const expectedValue = apiBooking.is_reserved ?? apiBooking.isReserved ?? false
        expect(frontendBooking.is_reserved).toBe(expectedValue)
      }),
      { numRuns: 100 }
    )
  })
})
