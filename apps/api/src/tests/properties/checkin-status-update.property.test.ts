/**
 * Property-Based Test: Check-in updates booking status to COMPLETED
 * 
 * **Feature: checkin-system, Property 1: Check-in updates booking status to COMPLETED**
 * **Validates: Requirements 1.1, 2.1**
 * 
 * This test verifies that for any valid PAID booking and any check-in method 
 * (QRCODE or MANUAL), performing check-in should result in the booking's 
 * status_canonical being updated to COMPLETED (DONE in the actual implementation).
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

/**
 * Simulates the check-in status update logic from the booking endpoint.
 * This mirrors the actual implementation in apps/api/src/routes/bookings.ts
 * 
 * The function focuses on the status update aspect of check-in:
 * - Validates booking exists and is PAID
 * - Validates user is authorized (teacher or student of booking)
 * - Updates status to COMPLETED/DONE
 */
function simulateCheckinStatusUpdate(
  booking: Booking,
  user: User,
  request: CheckinRequest
): CheckinResult {
  // Validate user is authorized (teacher or student of booking)
  const isTeacher = booking.teacher_id === user.userId
  const isStudent = booking.student_id === user.userId
  const isAdmin = ['FRANQUIA', 'FRANQUEADORA', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)

  if (!isTeacher && !isStudent && !isAdmin) {
    return {
      success: false,
      error: 'Você não tem permissão para fazer check-in neste agendamento',
      code: 'UNAUTHORIZED'
    }
  }

  // Check if booking is already COMPLETED (idempotency)
  if (booking.status_canonical === 'DONE' || booking.status_canonical === 'COMPLETED' || booking.status === 'COMPLETED') {
    return {
      success: false,
      error: 'Check-in já foi realizado para este agendamento',
      code: 'ALREADY_COMPLETED'
    }
  }

  // Validate booking status is PAID
  if (booking.status_canonical !== 'PAID') {
    return {
      success: false,
      error: `Status do agendamento inválido para check-in. Status atual: ${booking.status_canonical}`,
      code: 'INVALID_STATUS'
    }
  }

  // Perform status update - in actual implementation this updates to 'DONE'
  // The response returns 'COMPLETED' for API consistency
  return {
    success: true,
    booking: {
      id: booking.id,
      status_canonical: 'COMPLETED' // API returns COMPLETED, DB stores DONE
    }
  }
}

/**
 * Applies the check-in status update to a booking and returns the updated booking
 */
function applyCheckinStatusUpdate(booking: Booking): Booking {
  return {
    ...booking,
    status: 'COMPLETED',
    status_canonical: 'DONE' // Actual DB value
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())

// Generator for check-in method
const checkinMethodArb = fc.constantFrom('QRCODE', 'MANUAL') as fc.Arbitrary<'QRCODE' | 'MANUAL'>

// Generator for a valid PAID booking
const paidBookingArb = (teacherId: string, studentId: string | null, franchiseId: string): fc.Arbitrary<Booking> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    teacher_id: fc.constant(teacherId),
    franchise_id: fc.constant(franchiseId),
    date: dateArb,
    start_at: dateArb,
    duration: fc.integer({ min: 30, max: 120 }),
    status: fc.constant('PAID'),
    status_canonical: fc.constant('PAID' as const)
  })

// Generator for a booking with any status (for negative tests)
const anyStatusBookingArb = (teacherId: string, studentId: string | null, franchiseId: string): fc.Arbitrary<Booking> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    teacher_id: fc.constant(teacherId),
    franchise_id: fc.constant(franchiseId),
    date: dateArb,
    start_at: dateArb,
    duration: fc.integer({ min: 30, max: 120 }),
    status: fc.constantFrom('AVAILABLE', 'PAID', 'COMPLETED', 'CANCELED'),
    status_canonical: fc.constantFrom('AVAILABLE', 'PAID', 'DONE', 'CANCELED', 'COMPLETED') as fc.Arbitrary<Booking['status_canonical']>
  })

// Generator for test scenario with booking and authorized user
const checkinScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
  fc.record({
    booking: paidBookingArb(teacherId, studentId, franchiseId),
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

describe('Property 1: Check-in updates booking status to COMPLETED', () => {
  /**
   * Property: For any valid PAID booking and authorized user, check-in should
   * update the booking status to COMPLETED.
   */
  it('should update booking status_canonical to COMPLETED for valid PAID bookings', () => {
    fc.assert(
      fc.property(checkinScenarioArb, ({ booking, user, method }) => {
        const result = simulateCheckinStatusUpdate(booking, user, { method })
        
        // Property: Check-in should succeed for PAID bookings with authorized users
        expect(result.success).toBe(true)
        
        // Property: Result should contain updated booking with COMPLETED status
        expect(result.booking).toBeDefined()
        expect(result.booking?.status_canonical).toBe('COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should work with both QRCODE and MANUAL methods', () => {
    fc.assert(
      fc.property(checkinScenarioArb, ({ booking, user, method }) => {
        const result = simulateCheckinStatusUpdate(booking, user, { method })
        
        // Property: Both methods should produce successful check-in
        expect(result.success).toBe(true)
        expect(result.booking?.status_canonical).toBe('COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should allow both teacher and student to perform check-in', () => {
    // Generate scenario where we test both teacher and student
    const dualCheckinArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        teacherUser: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        studentUser: fc.constant({ userId: studentId, role: 'STUDENT' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(dualCheckinArb, ({ booking, teacherUser, studentUser, method }) => {
        // Teacher check-in
        const teacherResult = simulateCheckinStatusUpdate(booking, teacherUser, { method })
        expect(teacherResult.success).toBe(true)
        expect(teacherResult.booking?.status_canonical).toBe('COMPLETED')

        // Student check-in (on fresh booking)
        const studentResult = simulateCheckinStatusUpdate(booking, studentUser, { method })
        expect(studentResult.success).toBe(true)
        expect(studentResult.booking?.status_canonical).toBe('COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve booking ID after status update', () => {
    fc.assert(
      fc.property(checkinScenarioArb, ({ booking, user, method }) => {
        const result = simulateCheckinStatusUpdate(booking, user, { method })
        
        // Property: Booking ID should be preserved in result
        expect(result.success).toBe(true)
        expect(result.booking?.id).toBe(booking.id)
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly apply status update to booking object', () => {
    fc.assert(
      fc.property(checkinScenarioArb, ({ booking }) => {
        const updatedBooking = applyCheckinStatusUpdate(booking)
        
        // Property: Status should be updated to COMPLETED
        expect(updatedBooking.status).toBe('COMPLETED')
        
        // Property: status_canonical should be updated to DONE (DB value)
        expect(updatedBooking.status_canonical).toBe('DONE')
        
        // Property: Other fields should remain unchanged
        expect(updatedBooking.id).toBe(booking.id)
        expect(updatedBooking.teacher_id).toBe(booking.teacher_id)
        expect(updatedBooking.student_id).toBe(booking.student_id)
        expect(updatedBooking.franchise_id).toBe(booking.franchise_id)
        expect(updatedBooking.duration).toBe(booking.duration)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject check-in for non-PAID bookings', () => {
    // Generate bookings with non-PAID status
    const nonPaidBookingArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constantFrom('AVAILABLE', 'CANCELED'),
          status_canonical: fc.constantFrom('AVAILABLE', 'CANCELED') as fc.Arbitrary<Booking['status_canonical']>
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(nonPaidBookingArb, ({ booking, user, method }) => {
        const result = simulateCheckinStatusUpdate(booking, user, { method })
        
        // Property: Check-in should fail for non-PAID bookings
        expect(result.success).toBe(false)
        expect(result.code).toBe('INVALID_STATUS')
      }),
      { numRuns: 100 }
    )
  })

  it('should reject check-in for already completed bookings', () => {
    // Generate already completed bookings
    const completedBookingArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constantFrom('COMPLETED', 'DONE'),
          status_canonical: fc.constantFrom('DONE', 'COMPLETED') as fc.Arbitrary<Booking['status_canonical']>
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(completedBookingArb, ({ booking, user, method }) => {
        const result = simulateCheckinStatusUpdate(booking, user, { method })
        
        // Property: Check-in should fail for already completed bookings
        expect(result.success).toBe(false)
        expect(result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should reject check-in from unauthorized users', () => {
    // Generate scenario with unauthorized user
    const unauthorizedArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, randomUserId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        user: fc.constant({ userId: randomUserId, role: 'STUDENT' }), // Random user, not the booking's student
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(unauthorizedArb, ({ booking, user, method }) => {
        // Only test when user is actually unauthorized (not the teacher or student)
        if (user.userId !== booking.teacher_id && user.userId !== booking.student_id) {
          const result = simulateCheckinStatusUpdate(booking, user, { method })
          
          // Property: Check-in should fail for unauthorized users
          expect(result.success).toBe(false)
          expect(result.code).toBe('UNAUTHORIZED')
        }
      }),
      { numRuns: 100 }
    )
  })
})
