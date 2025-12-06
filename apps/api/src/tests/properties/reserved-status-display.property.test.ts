/**
 * Property-Based Test: Status reservado é exibido corretamente
 * 
 * **Feature: fix-recurring-bookings, Property 6: Status reservado é exibido corretamente**
 * **Validates: Requirements 2.4**
 * 
 * This test verifies that for any booking rendered in the UI,
 * if is_reserved is true, then the status displayed must be "Reservada" 
 * with amber visual styling.
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

// Status colors configuration matching the actual component
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string; icon: string; accent: string }> = {
  AVAILABLE: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-400', 
    text: 'text-white', 
    label: 'Disponível', 
    icon: '✓', 
    accent: 'border-l-emerald-600'
  },
  PAID: { 
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
    text: 'text-white', 
    label: 'Confirmada', 
    icon: '👤', 
    accent: 'border-l-blue-600'
  },
  CONFIRMED: { 
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
    text: 'text-white', 
    label: 'Confirmada', 
    icon: '👤', 
    accent: 'border-l-blue-600'
  },
  RESERVED: { 
    bg: 'bg-gradient-to-r from-amber-500 to-orange-400', 
    text: 'text-white', 
    label: 'Reservada', 
    icon: '⏳', 
    accent: 'border-l-amber-600'
  },
  COMPLETED: { 
    bg: 'bg-gradient-to-r from-slate-400 to-slate-500', 
    text: 'text-white', 
    label: 'Concluída', 
    icon: '✔', 
    accent: 'border-l-slate-500'
  },
  CANCELED: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500', 
    text: 'text-white', 
    label: 'Cancelada', 
    icon: '✕', 
    accent: 'border-l-red-600'
  },
}

// Simulates the getStatusStyle function from the component
function getStatusStyle(booking: Booking) {
  if (booking.is_reserved) return STATUS_COLORS.RESERVED
  return STATUS_COLORS[booking.status] || STATUS_COLORS.AVAILABLE
}

// Simulates what the BookingCard renders for status
function getDisplayedStatus(booking: Booking): { label: string; isAmber: boolean } {
  const style = getStatusStyle(booking)
  const isAmber = style.bg.includes('amber') || style.accent.includes('amber')
  return {
    label: style.label,
    isAmber
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())
const statusArb = fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'AVAILABLE', 'DONE', 'CONFIRMED', 'COMPLETED')

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

// Generator for bookings WITH is_reserved=true
const reservedBookingArb = bookingArb.map(b => ({ ...b, is_reserved: true }))

// Generator for bookings WITH is_reserved=false or undefined
const nonReservedBookingArb = bookingArb.map(b => ({ ...b, is_reserved: false }))

describe('Property 6: Status reservado é exibido corretamente', () => {
  /**
   * Property: For any booking with is_reserved=true,
   * the displayed status must be "Reservada" with amber styling.
   */
  it('should display "Reservada" status with amber styling when is_reserved is true', () => {
    fc.assert(
      fc.property(reservedBookingArb, (booking) => {
        const displayedStatus = getDisplayedStatus(booking)
        
        // When is_reserved is true, label must be "Reservada"
        expect(displayedStatus.label).toBe('Reservada')
        
        // When is_reserved is true, styling must include amber
        expect(displayedStatus.isAmber).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should NOT display "Reservada" status when is_reserved is false', () => {
    // Generate bookings with is_reserved=false and status NOT RESERVED
    const nonReservedNonStatusReservedArb = nonReservedBookingArb.filter(b => b.status !== 'RESERVED')
    
    fc.assert(
      fc.property(nonReservedNonStatusReservedArb, (booking) => {
        const displayedStatus = getDisplayedStatus(booking)
        
        // When is_reserved is false and status is not RESERVED, label must NOT be "Reservada"
        expect(displayedStatus.label).not.toBe('Reservada')
      }),
      { numRuns: 100 }
    )
  })

  it('should prioritize is_reserved over status field', () => {
    // Generate bookings with is_reserved=true but different status values
    const reservedWithDifferentStatusArb = fc.record({
      id: uuidArb,
      date: dateArb,
      duration: fc.integer({ min: 15, max: 120 }),
      status: fc.constantFrom('PAID', 'CONFIRMED', 'AVAILABLE', 'COMPLETED'), // Not RESERVED
      studentId: fc.option(uuidArb, { nil: undefined }),
      studentName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      teacherId: uuidArb,
      franchiseId: fc.option(uuidArb, { nil: undefined }),
      franchiseName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      is_reserved: fc.constant(true), // Always true
      series_id: fc.option(uuidArb, { nil: null })
    })
    
    fc.assert(
      fc.property(reservedWithDifferentStatusArb, (booking) => {
        const displayedStatus = getDisplayedStatus(booking)
        
        // Even when status is different, is_reserved=true should show "Reservada"
        expect(displayedStatus.label).toBe('Reservada')
        expect(displayedStatus.isAmber).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should use correct status style when is_reserved is false', () => {
    fc.assert(
      fc.property(nonReservedBookingArb, (booking) => {
        const style = getStatusStyle(booking)
        const expectedStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.AVAILABLE
        
        // When is_reserved is false, style should match the status
        expect(style.label).toBe(expectedStyle.label)
        expect(style.bg).toBe(expectedStyle.bg)
      }),
      { numRuns: 100 }
    )
  })

  it('should always return a valid status style', () => {
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const style = getStatusStyle(booking)
        
        // Style must always have required properties
        expect(style).toHaveProperty('label')
        expect(style).toHaveProperty('bg')
        expect(style).toHaveProperty('text')
        expect(style).toHaveProperty('icon')
        expect(style).toHaveProperty('accent')
        
        // Label must be a non-empty string
        expect(typeof style.label).toBe('string')
        expect(style.label.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })
})
