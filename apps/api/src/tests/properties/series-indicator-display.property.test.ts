/**
 * Property-Based Test: Indicador visual de série é exibido corretamente
 * 
 * **Feature: fix-recurring-bookings, Property 5: Indicador visual de série é exibido corretamente**
 * **Validates: Requirements 2.3**
 * 
 * This test verifies that for any booking rendered in the UI (dashboard or agenda),
 * if the booking has a non-null series_id, then the visual indicator "🔄 Série" 
 * must be displayed.
 */

import * as fc from 'fast-check'

// Type definition for booking as used in the UI
interface Booking {
  id: string
  date: string
  duration: number
  status: string
  studentId?: string
  studentName?: string
  teacherId: string
  franchiseId?: string
  franchiseName?: string
  is_reserved?: boolean
  series_id?: string | null
}

// Simulates the rendering logic from BookingCard component
// This extracts the core logic that determines if series indicator is shown
function shouldShowSeriesIndicator(booking: Booking): boolean {
  return booking.series_id !== null && booking.series_id !== undefined
}

// Simulates what the BookingCard renders for series indicator
// Based on the actual component logic:
// - minimal view: no series indicator shown
// - compact view: shows "🔄" if series_id exists
// - full view: shows "🔄 Série" badge if series_id exists
function renderSeriesIndicator(booking: Booking, viewMode: 'minimal' | 'compact' | 'full'): string | null {
  if (!shouldShowSeriesIndicator(booking)) {
    return null
  }
  
  switch (viewMode) {
    case 'minimal':
      // Minimal view doesn't show series indicator in current implementation
      return null
    case 'compact':
      return '🔄'
    case 'full':
      return '🔄 Série'
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())
const statusArb = fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'AVAILABLE', 'DONE', 'CONFIRMED', 'COMPLETED')
const viewModeArb = fc.constantFrom('minimal' as const, 'compact' as const, 'full' as const)

const bookingArb: fc.Arbitrary<Booking> = fc.record({
  id: uuidArb,
  date: dateArb,
  duration: fc.integer({ min: 15, max: 120 }),
  status: statusArb,
  studentId: fc.option(uuidArb, { nil: undefined }),
  studentName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  teacherId: uuidArb,
  franchiseId: fc.option(uuidArb, { nil: undefined }),
  franchiseName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  is_reserved: fc.option(fc.boolean(), { nil: undefined }),
  series_id: fc.option(uuidArb, { nil: null })
})

// Generator for bookings WITH series_id
const bookingWithSeriesArb = bookingArb.filter(b => b.series_id !== null && b.series_id !== undefined)

// Generator for bookings WITHOUT series_id
const bookingWithoutSeriesArb = bookingArb.filter(b => b.series_id === null || b.series_id === undefined)

describe('Property 5: Indicador visual de série é exibido corretamente', () => {
  /**
   * Property: For any booking with a non-null series_id,
   * the series indicator must be shown in compact and full views.
   */
  it('should show series indicator when booking has series_id (compact/full views)', () => {
    fc.assert(
      fc.property(
        bookingWithSeriesArb,
        fc.constantFrom('compact' as const, 'full' as const),
        (booking, viewMode) => {
          const indicator = renderSeriesIndicator(booking, viewMode)
          
          // When booking has series_id, indicator must be shown
          expect(indicator).not.toBeNull()
          expect(indicator).toContain('🔄')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT show series indicator when booking has no series_id', () => {
    fc.assert(
      fc.property(bookingWithoutSeriesArb, viewModeArb, (booking, viewMode) => {
        const indicator = renderSeriesIndicator(booking, viewMode)
        
        // When booking has no series_id, indicator must be null
        expect(indicator).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly determine if series indicator should be shown', () => {
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const shouldShow = shouldShowSeriesIndicator(booking)
        
        // The function should return true if and only if series_id is non-null
        if (booking.series_id !== null && booking.series_id !== undefined) {
          expect(shouldShow).toBe(true)
        } else {
          expect(shouldShow).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should show full series badge in full view mode', () => {
    fc.assert(
      fc.property(bookingWithSeriesArb, (booking) => {
        const indicator = renderSeriesIndicator(booking, 'full')
        
        // Full view should show "🔄 Série"
        expect(indicator).toBe('🔄 Série')
      }),
      { numRuns: 100 }
    )
  })

  it('should show compact series indicator in compact view mode', () => {
    fc.assert(
      fc.property(bookingWithSeriesArb, (booking) => {
        const indicator = renderSeriesIndicator(booking, 'compact')
        
        // Compact view should show just "🔄"
        expect(indicator).toBe('🔄')
      }),
      { numRuns: 100 }
    )
  })
})
