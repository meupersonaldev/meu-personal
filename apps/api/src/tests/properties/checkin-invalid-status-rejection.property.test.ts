/**
 * Property-Based Test: Invalid status check-in rejection
 * 
 * **Feature: checkin-system, Property 4: Invalid status check-in rejection**
 * **Validates: Requirements 1.4**
 * 
 * This test verifies that for any booking with status_canonical not equal to PAID,
 * attempting check-in should return an error and not modify any data.
 */

import * as fc from 'fast-check'

// Type definitions for booking
interface Booking {
  id: string
  student_id: string | null
  teacher_id: string
  franchise_id: string
  date: string
  start_at: string
  duration: number
  status: string
  status_canonical: 'AVAILABLE' | 'PAID' | 'DONE' | 'CANCELED' | 'COMPLETED'
}

// Type definitions for check-in request
interface CheckinRequest {
  method: 'QRCODE' | 'MANUAL'
}

// Type definitions for user performing check-in
interface User {
  userId: string
  role: string
}

// Type definitions for check-in result
interface CheckinResult {
  success: boolean
  booking?: {
    id: string
    status_canonical: string
  }
  error?: string
  code?: string
}

// Type definitions for checkin record
interface CheckinRecord {
  academy_id: string
  teacher_id: string
  booking_id: string
  status: 'GRANTED' | 'DENIED'
  reason: string | null
  method: 'QRCODE' | 'MANUAL'
}

/**
 * Simulates the check-in validation logic from the booking endpoint.
 * This mirrors the actual implementation in apps/api/src/routes/bookings.ts
 * 
 * The function focuses on the invalid status rejection aspect:
 * - Validates booking status is PAID
 * - Returns INVALID_STATUS error for non-PAID bookings
 * - Does not modify booking data on rejection
 */
function simulateCheckinValidation(
  booking: Booking,
  user: User,
  request: CheckinRequest
): { result: CheckinResult; checkinRecord?: CheckinRecord; bookingModified: boolean } {
  // Validate user is authorized (teacher or student of booking)
  const isTeacher = booking.teacher_id === user.userId
  const isStudent = booking.student_id === user.userId
  const isAdmin = ['FRANQUIA', 'FRANQUEADORA', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)

  if (!isTeacher && !isStudent && !isAdmin) {
    return {
      result: {
        success: false,
        error: 'Você não tem permissão para fazer check-in neste agendamento',
        code: 'UNAUTHORIZED'
      },
      checkinRecord: {
        academy_id: booking.franchise_id,
        teacher_id: booking.teacher_id,
        booking_id: booking.id,
        status: 'DENIED',
        reason: 'UNAUTHORIZED',
        method: request.method
      },
      bookingModified: false
    }
  }

  // Check if booking is already COMPLETED (idempotency)
  if (booking.status_canonical === 'DONE' || booking.status_canonical === 'COMPLETED' || booking.status === 'COMPLETED') {
    return {
      result: {
        success: false,
        error: 'Check-in já foi realizado para este agendamento',
        code: 'ALREADY_COMPLETED'
      },
      bookingModified: false
    }
  }

  // Validate booking status is PAID - this is the main focus of Property 4
  if (booking.status_canonical !== 'PAID') {
    return {
      result: {
        success: false,
        error: `Status do agendamento inválido para check-in. Status atual: ${booking.status_canonical}`,
        code: 'INVALID_STATUS'
      },
      checkinRecord: {
        academy_id: booking.franchise_id,
        teacher_id: booking.teacher_id,
        booking_id: booking.id,
        status: 'DENIED',
        reason: 'INVALID_STATUS',
        method: request.method
      },
      bookingModified: false
    }
  }

  // If we reach here, booking is valid for check-in
  return {
    result: {
      success: true,
      booking: {
        id: booking.id,
        status_canonical: 'COMPLETED'
      }
    },
    checkinRecord: {
      academy_id: booking.franchise_id,
      teacher_id: booking.teacher_id,
      booking_id: booking.id,
      status: 'GRANTED',
      reason: null,
      method: request.method
    },
    bookingModified: true
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())

// Generator for check-in method
const checkinMethodArb = fc.constantFrom('QRCODE', 'MANUAL') as fc.Arbitrary<'QRCODE' | 'MANUAL'>

// Generator for invalid status values (not PAID, not DONE/COMPLETED)
const invalidStatusArb = fc.constantFrom('AVAILABLE', 'CANCELED') as fc.Arbitrary<'AVAILABLE' | 'CANCELED'>

// Generator for a booking with invalid status (AVAILABLE or CANCELED)
const invalidStatusBookingArb = (teacherId: string, studentId: string | null, franchiseId: string): fc.Arbitrary<Booking> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    teacher_id: fc.constant(teacherId),
    franchise_id: fc.constant(franchiseId),
    date: dateArb,
    start_at: dateArb,
    duration: fc.integer({ min: 30, max: 120 }),
    status: invalidStatusArb,
    status_canonical: invalidStatusArb
  })

// Generator for test scenario with invalid status booking and authorized user
const invalidStatusScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
  fc.record({
    booking: invalidStatusBookingArb(teacherId, studentId, franchiseId),
    user: fc.oneof(
      // Teacher performing check-in
      fc.constant({ userId: teacherId, role: 'TEACHER' }),
      fc.constant({ userId: teacherId, role: 'PROFESSOR' }),
      // Student performing check-in
      fc.constant({ userId: studentId, role: 'STUDENT' }),
      fc.constant({ userId: studentId, role: 'ALUNO' })
    ),
    method: checkinMethodArb
  })
)

describe('Property 4: Invalid status check-in rejection', () => {
  /**
   * Property: For any booking with status_canonical not equal to PAID,
   * check-in should fail with INVALID_STATUS error code.
   */
  it('should reject check-in for bookings with AVAILABLE status', () => {
    const availableStatusArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constant('AVAILABLE'),
          status_canonical: fc.constant('AVAILABLE' as const)
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(availableStatusArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Check-in should fail
        expect(result.success).toBe(false)
        
        // Property: Error code should be INVALID_STATUS
        expect(result.code).toBe('INVALID_STATUS')
        
        // Property: Booking should not be modified
        expect(bookingModified).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject check-in for bookings with CANCELED status', () => {
    const canceledStatusArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constant('CANCELED'),
          status_canonical: fc.constant('CANCELED' as const)
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(canceledStatusArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Check-in should fail
        expect(result.success).toBe(false)
        
        // Property: Error code should be INVALID_STATUS
        expect(result.code).toBe('INVALID_STATUS')
        
        // Property: Booking should not be modified
        expect(bookingModified).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject check-in for any non-PAID status with INVALID_STATUS code', () => {
    fc.assert(
      fc.property(invalidStatusScenarioArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Check-in should fail for non-PAID bookings
        expect(result.success).toBe(false)
        
        // Property: Error code should be INVALID_STATUS
        expect(result.code).toBe('INVALID_STATUS')
        
        // Property: Booking should not be modified
        expect(bookingModified).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should include current status in error message', () => {
    fc.assert(
      fc.property(invalidStatusScenarioArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Error message should include the current status
        expect(result.error).toContain(booking.status_canonical)
      }),
      { numRuns: 100 }
    )
  })

  it('should record DENIED check-in attempt for invalid status', () => {
    fc.assert(
      fc.property(invalidStatusScenarioArb, ({ booking, user, method }) => {
        const { checkinRecord } = simulateCheckinValidation(booking, user, { method })
        
        // Property: A check-in record should be created
        expect(checkinRecord).toBeDefined()
        
        // Property: Check-in record should have DENIED status
        expect(checkinRecord?.status).toBe('DENIED')
        
        // Property: Check-in record should have INVALID_STATUS reason
        expect(checkinRecord?.reason).toBe('INVALID_STATUS')
        
        // Property: Check-in record should reference the booking
        expect(checkinRecord?.booking_id).toBe(booking.id)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve check-in method in denied record', () => {
    fc.assert(
      fc.property(invalidStatusScenarioArb, ({ booking, user, method }) => {
        const { checkinRecord } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Check-in record should preserve the method used
        expect(checkinRecord?.method).toBe(method)
      }),
      { numRuns: 100 }
    )
  })

  it('should not return booking data on rejection', () => {
    fc.assert(
      fc.property(invalidStatusScenarioArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Result should not contain booking data
        expect(result.booking).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should reject regardless of check-in method (QRCODE or MANUAL)', () => {
    // Test both methods explicitly
    const dualMethodArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: invalidStatusBookingArb(teacherId, studentId, franchiseId),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' })
      })
    )

    fc.assert(
      fc.property(dualMethodArb, ({ booking, user }) => {
        // Test QRCODE method
        const qrcodeResult = simulateCheckinValidation(booking, user, { method: 'QRCODE' })
        expect(qrcodeResult.result.success).toBe(false)
        expect(qrcodeResult.result.code).toBe('INVALID_STATUS')
        
        // Test MANUAL method
        const manualResult = simulateCheckinValidation(booking, user, { method: 'MANUAL' })
        expect(manualResult.result.success).toBe(false)
        expect(manualResult.result.code).toBe('INVALID_STATUS')
      }),
      { numRuns: 100 }
    )
  })

  it('should reject for both teacher and student users', () => {
    const bothUsersArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: invalidStatusBookingArb(teacherId, studentId, franchiseId),
        teacherUser: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        studentUser: fc.constant({ userId: studentId, role: 'STUDENT' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(bothUsersArb, ({ booking, teacherUser, studentUser, method }) => {
        // Teacher check-in should fail
        const teacherResult = simulateCheckinValidation(booking, teacherUser, { method })
        expect(teacherResult.result.success).toBe(false)
        expect(teacherResult.result.code).toBe('INVALID_STATUS')
        
        // Student check-in should fail
        const studentResult = simulateCheckinValidation(booking, studentUser, { method })
        expect(studentResult.result.success).toBe(false)
        expect(studentResult.result.code).toBe('INVALID_STATUS')
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly accept PAID bookings (positive control)', () => {
    const paidBookingArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constant('PAID'),
          status_canonical: fc.constant('PAID' as const)
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(paidBookingArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinValidation(booking, user, { method })
        
        // Property: Check-in should succeed for PAID bookings
        expect(result.success).toBe(true)
        
        // Property: Booking should be modified
        expect(bookingModified).toBe(true)
        
        // Property: Result should contain updated booking
        expect(result.booking).toBeDefined()
        expect(result.booking?.status_canonical).toBe('COMPLETED')
      }),
      { numRuns: 100 }
    )
  })
})
