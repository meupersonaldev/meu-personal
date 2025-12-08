/**
 * Property-Based Test: Check-in authorization validation
 * 
 * **Feature: checkin-system, Property 6: Check-in authorization validation**
 * **Validates: Requirements 5.3, 6.1, 6.3**
 * 
 * This test verifies that for any check-in attempt, the system should validate
 * that the user is either the booking's teacher_id or student_id, rejecting
 * unauthorized users.
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

// Admin roles that bypass authorization check
const ADMIN_ROLES = ['FRANQUIA', 'FRANQUEADORA', 'ADMIN', 'SUPER_ADMIN']

/**
 * Simulates the check-in authorization logic from the booking endpoint.
 * This mirrors the actual implementation in apps/api/src/routes/bookings.ts
 * 
 * The function focuses on authorization validation:
 * - Validates user is teacher_id or student_id of booking
 * - Admin roles bypass authorization check
 * - Returns UNAUTHORIZED for invalid users
 */
function simulateCheckinAuthorization(
  booking: Booking,
  user: User,
  request: CheckinRequest
): { result: CheckinResult; checkinRecord?: CheckinRecord; bookingModified: boolean } {
  // Authorization check - this is the main focus of Property 6
  const isTeacher = booking.teacher_id === user.userId
  const isStudent = booking.student_id === user.userId
  const isAdmin = ADMIN_ROLES.includes(user.role)

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

  // Validate booking status is PAID
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

  // If we reach here, user is authorized and booking is valid for check-in
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

// Generator for non-admin user roles
const nonAdminRoleArb = fc.constantFrom('TEACHER', 'PROFESSOR', 'STUDENT', 'ALUNO', 'USER', 'GUEST')

// Generator for admin user roles
const adminRoleArb = fc.constantFrom(...ADMIN_ROLES)

// Generator for a PAID booking (valid for check-in)
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

// Generator for unauthorized user scenario - user is neither teacher nor student
const unauthorizedUserScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, unauthorizedUserId]) =>
  fc.record({
    booking: paidBookingArb(teacherId, studentId, franchiseId),
    user: fc.record({
      userId: fc.constant(unauthorizedUserId), // Different from both teacher and student
      role: nonAdminRoleArb
    }),
    method: checkinMethodArb
  })
)

// Generator for authorized teacher scenario
const authorizedTeacherScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
  fc.record({
    booking: paidBookingArb(teacherId, studentId, franchiseId),
    user: fc.record({
      userId: fc.constant(teacherId), // Same as teacher_id
      role: fc.constantFrom('TEACHER', 'PROFESSOR')
    }),
    method: checkinMethodArb
  })
)

// Generator for authorized student scenario
const authorizedStudentScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
  fc.record({
    booking: paidBookingArb(teacherId, studentId, franchiseId),
    user: fc.record({
      userId: fc.constant(studentId), // Same as student_id
      role: fc.constantFrom('STUDENT', 'ALUNO')
    }),
    method: checkinMethodArb
  })
)

// Generator for admin user scenario (bypasses authorization)
const adminUserScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
}> = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, adminUserId]) =>
  fc.record({
    booking: paidBookingArb(teacherId, studentId, franchiseId),
    user: fc.record({
      userId: fc.constant(adminUserId), // Different from both teacher and student
      role: adminRoleArb // But has admin role
    }),
    method: checkinMethodArb
  })
)

describe('Property 6: Check-in authorization validation', () => {
  /**
   * Property: For any check-in attempt by an unauthorized user (not teacher, not student, not admin),
   * the system should reject with UNAUTHORIZED error code.
   */
  it('should reject check-in for unauthorized users', () => {
    fc.assert(
      fc.property(unauthorizedUserScenarioArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Check-in should fail
        expect(result.success).toBe(false)
        
        // Property: Error code should be UNAUTHORIZED
        expect(result.code).toBe('UNAUTHORIZED')
        
        // Property: Booking should not be modified
        expect(bookingModified).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('should allow check-in for the booking teacher', () => {
    fc.assert(
      fc.property(authorizedTeacherScenarioArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Check-in should succeed for teacher
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

  it('should allow check-in for the booking student', () => {
    fc.assert(
      fc.property(authorizedStudentScenarioArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Check-in should succeed for student
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

  it('should allow check-in for admin users regardless of booking ownership', () => {
    fc.assert(
      fc.property(adminUserScenarioArb, ({ booking, user, method }) => {
        const { result, bookingModified } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Check-in should succeed for admin
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

  it('should record DENIED check-in attempt for unauthorized users', () => {
    fc.assert(
      fc.property(unauthorizedUserScenarioArb, ({ booking, user, method }) => {
        const { checkinRecord } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: A check-in record should be created
        expect(checkinRecord).toBeDefined()
        
        // Property: Check-in record should have DENIED status
        expect(checkinRecord?.status).toBe('DENIED')
        
        // Property: Check-in record should have UNAUTHORIZED reason
        expect(checkinRecord?.reason).toBe('UNAUTHORIZED')
        
        // Property: Check-in record should reference the booking
        expect(checkinRecord?.booking_id).toBe(booking.id)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve check-in method in denied record', () => {
    fc.assert(
      fc.property(unauthorizedUserScenarioArb, ({ booking, user, method }) => {
        const { checkinRecord } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Check-in record should preserve the method used
        expect(checkinRecord?.method).toBe(method)
      }),
      { numRuns: 100 }
    )
  })

  it('should include appropriate error message for unauthorized users', () => {
    fc.assert(
      fc.property(unauthorizedUserScenarioArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Error message should indicate lack of permission
        expect(result.error).toBeDefined()
        expect(result.error).toContain('permissão')
      }),
      { numRuns: 100 }
    )
  })

  it('should not return booking data on unauthorized rejection', () => {
    fc.assert(
      fc.property(unauthorizedUserScenarioArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Result should not contain booking data
        expect(result.booking).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should reject regardless of check-in method (QRCODE or MANUAL) for unauthorized users', () => {
    const dualMethodArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, unauthorizedUserId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        user: fc.record({
          userId: fc.constant(unauthorizedUserId),
          role: nonAdminRoleArb
        })
      })
    )

    fc.assert(
      fc.property(dualMethodArb, ({ booking, user }) => {
        // Test QRCODE method
        const qrcodeResult = simulateCheckinAuthorization(booking, user, { method: 'QRCODE' })
        expect(qrcodeResult.result.success).toBe(false)
        expect(qrcodeResult.result.code).toBe('UNAUTHORIZED')
        
        // Test MANUAL method
        const manualResult = simulateCheckinAuthorization(booking, user, { method: 'MANUAL' })
        expect(manualResult.result.success).toBe(false)
        expect(manualResult.result.code).toBe('UNAUTHORIZED')
      }),
      { numRuns: 100 }
    )
  })

  it('should reject for all non-admin roles when user is not teacher or student', () => {
    const allNonAdminRolesArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, unauthorizedUserId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        unauthorizedUserId: fc.constant(unauthorizedUserId),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(allNonAdminRolesArb, ({ booking, unauthorizedUserId, method }) => {
        const nonAdminRoles = ['TEACHER', 'PROFESSOR', 'STUDENT', 'ALUNO', 'USER', 'GUEST']
        
        for (const role of nonAdminRoles) {
          const user = { userId: unauthorizedUserId, role }
          const { result } = simulateCheckinAuthorization(booking, user, { method })
          
          // Property: All non-admin roles should be rejected when user is not teacher/student
          expect(result.success).toBe(false)
          expect(result.code).toBe('UNAUTHORIZED')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should allow all admin roles to perform check-in', () => {
    const allAdminRolesArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, adminUserId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        adminUserId: fc.constant(adminUserId),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(allAdminRolesArb, ({ booking, adminUserId, method }) => {
        for (const role of ADMIN_ROLES) {
          const user = { userId: adminUserId, role }
          const { result } = simulateCheckinAuthorization(booking, user, { method })
          
          // Property: All admin roles should be allowed
          expect(result.success).toBe(true)
          expect(result.booking?.status_canonical).toBe('COMPLETED')
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Student attempting check-in for another student's booking should be rejected.
   * Validates: Requirements 6.3
   */
  it('should reject student attempting check-in for another student booking', () => {
    const wrongStudentArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, wrongStudentId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        user: fc.record({
          userId: fc.constant(wrongStudentId), // Different student
          role: fc.constantFrom('STUDENT', 'ALUNO')
        }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(wrongStudentArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Wrong student should be rejected
        expect(result.success).toBe(false)
        expect(result.code).toBe('UNAUTHORIZED')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Teacher attempting check-in for another teacher's booking should be rejected.
   */
  it('should reject teacher attempting check-in for another teacher booking', () => {
    const wrongTeacherArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, wrongTeacherId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        user: fc.record({
          userId: fc.constant(wrongTeacherId), // Different teacher
          role: fc.constantFrom('TEACHER', 'PROFESSOR')
        }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(wrongTeacherArb, ({ booking, user, method }) => {
        const { result } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: Wrong teacher should be rejected
        expect(result.success).toBe(false)
        expect(result.code).toBe('UNAUTHORIZED')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Student check-in validates student is the booking's student_id.
   * Validates: Requirements 6.1
   */
  it('should validate student is the booking student_id', () => {
    fc.assert(
      fc.property(authorizedStudentScenarioArb, ({ booking, user, method }) => {
        // Pre-condition: user.userId equals booking.student_id
        expect(user.userId).toBe(booking.student_id)
        
        const { result } = simulateCheckinAuthorization(booking, user, { method })
        
        // Property: When student_id matches, check-in should succeed
        expect(result.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: QR code scan validates booking belongs to scanning user's context.
   * Validates: Requirements 5.3
   */
  it('should validate booking belongs to user context on QR scan', () => {
    const qrScanArb = fc.tuple(uuidArb, uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId, scannerId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        scanner: fc.record({
          userId: fc.constant(scannerId),
          role: nonAdminRoleArb
        })
      })
    )

    fc.assert(
      fc.property(qrScanArb, ({ booking, scanner }) => {
        const { result } = simulateCheckinAuthorization(booking, scanner, { method: 'QRCODE' })
        
        // Property: Scanner who is not teacher/student/admin should be rejected
        expect(result.success).toBe(false)
        expect(result.code).toBe('UNAUTHORIZED')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Student check-in triggers same CONSUME flow as teacher check-in.
   * Validates: Requirements 6.2
   */
  it('should trigger same success flow for both teacher and student check-in', () => {
    const bothUsersArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: paidBookingArb(teacherId, studentId, franchiseId),
        teacherUser: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        studentUser: fc.constant({ userId: studentId, role: 'STUDENT' }),
        method: checkinMethodArb
      })
    )

    fc.assert(
      fc.property(bothUsersArb, ({ booking, teacherUser, studentUser, method }) => {
        const teacherResult = simulateCheckinAuthorization(booking, teacherUser, { method })
        const studentResult = simulateCheckinAuthorization(booking, studentUser, { method })
        
        // Property: Both should succeed
        expect(teacherResult.result.success).toBe(true)
        expect(studentResult.result.success).toBe(true)
        
        // Property: Both should result in COMPLETED status
        expect(teacherResult.result.booking?.status_canonical).toBe('COMPLETED')
        expect(studentResult.result.booking?.status_canonical).toBe('COMPLETED')
        
        // Property: Both should modify booking
        expect(teacherResult.bookingModified).toBe(true)
        expect(studentResult.bookingModified).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
