/**
 * Property-Based Test: Check-in idempotency
 * 
 * **Feature: checkin-system, Property 5: Check-in idempotency**
 * **Validates: Requirements 1.5**
 * 
 * This test verifies that for any booking that is already COMPLETED,
 * attempting check-in should return "already completed" without creating
 * duplicate transactions or modifying balance.
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

// Type definitions for hour transaction
interface HourTransaction {
  id: string
  professor_id: string
  type: 'CONSUME' | 'PURCHASE' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE'
  hours: number
  booking_id: string
}

// Type definitions for professor balance
interface ProfessorBalance {
  professor_id: string
  available_hours: number
  locked_hours: number
}

// State tracking for idempotency verification
interface SystemState {
  transactions: HourTransaction[]
  balances: Map<string, ProfessorBalance>
  bookingStatus: string
}

/**
 * Simulates the check-in idempotency logic from the booking endpoint.
 * This mirrors the actual implementation in apps/api/src/routes/bookings.ts
 * 
 * The function focuses on idempotency:
 * - Detects already completed bookings
 * - Returns ALREADY_COMPLETED error without side effects
 * - Does not create duplicate transactions
 * - Does not modify professor balance
 */
function simulateCheckinWithIdempotency(
  booking: Booking,
  user: User,
  request: CheckinRequest,
  currentState: SystemState
): { result: CheckinResult; newState: SystemState } {
  // Clone state to track modifications
  const newState: SystemState = {
    transactions: [...currentState.transactions],
    balances: new Map(currentState.balances),
    bookingStatus: currentState.bookingStatus
  }

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
      newState // State unchanged
    }
  }

  // IDEMPOTENCY CHECK: If booking is already COMPLETED/DONE, return early
  // This is the main focus of Property 5
  if (booking.status_canonical === 'DONE' || 
      booking.status_canonical === 'COMPLETED' || 
      booking.status === 'COMPLETED') {
    return {
      result: {
        success: false,
        error: 'Check-in já foi realizado para este agendamento',
        code: 'ALREADY_COMPLETED'
      },
      newState // State unchanged - no duplicate transactions or balance modifications
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
      newState // State unchanged
    }
  }

  // Successful check-in - create transaction and update balance
  const newTransaction: HourTransaction = {
    id: `tx-${Date.now()}-${Math.random()}`,
    professor_id: booking.teacher_id,
    type: 'CONSUME',
    hours: booking.duration / 60, // Convert minutes to hours
    booking_id: booking.id
  }
  newState.transactions.push(newTransaction)

  // Update professor balance
  const currentBalance = newState.balances.get(booking.teacher_id) || {
    professor_id: booking.teacher_id,
    available_hours: 0,
    locked_hours: 0
  }
  newState.balances.set(booking.teacher_id, {
    ...currentBalance,
    available_hours: currentBalance.available_hours + newTransaction.hours
  })

  // Update booking status
  newState.bookingStatus = 'COMPLETED'

  return {
    result: {
      success: true,
      booking: {
        id: booking.id,
        status_canonical: 'COMPLETED'
      }
    },
    newState
  }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()
const dateArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())

// Generator for check-in method
const checkinMethodArb = fc.constantFrom('QRCODE', 'MANUAL') as fc.Arbitrary<'QRCODE' | 'MANUAL'>

// Generator for completed status values
const completedStatusArb = fc.constantFrom('DONE', 'COMPLETED') as fc.Arbitrary<'DONE' | 'COMPLETED'>

// Generator for an already completed booking
const completedBookingArb = (teacherId: string, studentId: string | null, franchiseId: string): fc.Arbitrary<Booking> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    teacher_id: fc.constant(teacherId),
    franchise_id: fc.constant(franchiseId),
    date: dateArb,
    start_at: dateArb,
    duration: fc.integer({ min: 30, max: 120 }),
    status: fc.constantFrom('COMPLETED', 'DONE'),
    status_canonical: completedStatusArb
  })

// Generator for initial system state with existing transactions
const initialStateArb = (professorId: string): fc.Arbitrary<SystemState> =>
  fc.record({
    transactions: fc.array(
      fc.record({
        id: uuidArb,
        professor_id: fc.constant(professorId),
        type: fc.constant('CONSUME' as const),
        hours: fc.integer({ min: 1, max: 10 }),
        booking_id: uuidArb
      }),
      { minLength: 0, maxLength: 5 }
    ),
    balances: fc.integer({ min: 0, max: 100 }).map(hours => {
      const map = new Map<string, ProfessorBalance>()
      map.set(professorId, {
        professor_id: professorId,
        available_hours: hours,
        locked_hours: 0
      })
      return map
    }),
    bookingStatus: fc.constant('COMPLETED')
  })

// Generator for test scenario with completed booking and authorized user
const idempotencyScenarioArb: fc.Arbitrary<{
  booking: Booking
  user: User
  method: 'QRCODE' | 'MANUAL'
  initialState: SystemState
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
  fc.record({
    booking: completedBookingArb(teacherId, studentId, franchiseId),
    user: fc.oneof(
      fc.constant({ userId: teacherId, role: 'TEACHER' }),
      fc.constant({ userId: teacherId, role: 'PROFESSOR' }),
      fc.constant({ userId: studentId, role: 'STUDENT' }),
      fc.constant({ userId: studentId, role: 'ALUNO' })
    ),
    method: checkinMethodArb,
    initialState: initialStateArb(teacherId)
  })
)

describe('Property 5: Check-in idempotency', () => {
  /**
   * Property: For any already COMPLETED booking, check-in should return
   * ALREADY_COMPLETED error code.
   */
  it('should return ALREADY_COMPLETED for completed bookings', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        const { result } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: Check-in should fail with ALREADY_COMPLETED
        expect(result.success).toBe(false)
        expect(result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should not create duplicate transactions for completed bookings', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        const initialTransactionCount = initialState.transactions.length
        const { newState } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: No new transactions should be created
        expect(newState.transactions.length).toBe(initialTransactionCount)
      }),
      { numRuns: 100 }
    )
  })

  it('should not modify professor balance for completed bookings', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        const initialBalance = initialState.balances.get(booking.teacher_id)?.available_hours || 0
        const { newState } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: Professor balance should remain unchanged
        const newBalance = newState.balances.get(booking.teacher_id)?.available_hours || 0
        expect(newBalance).toBe(initialBalance)
      }),
      { numRuns: 100 }
    )
  })

  it('should return informative error message for completed bookings', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        const { result } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: Error message should inform about already completed check-in
        expect(result.error).toBeDefined()
        expect(result.error).toContain('já foi realizado')
      }),
      { numRuns: 100 }
    )
  })

  it('should handle multiple check-in attempts on same completed booking', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        // First attempt
        const { result: result1, newState: state1 } = simulateCheckinWithIdempotency(
          booking, user, { method }, initialState
        )
        
        // Second attempt
        const { result: result2, newState: state2 } = simulateCheckinWithIdempotency(
          booking, user, { method }, state1
        )
        
        // Third attempt
        const { result: result3, newState: state3 } = simulateCheckinWithIdempotency(
          booking, user, { method }, state2
        )
        
        // Property: All attempts should fail with same error
        expect(result1.code).toBe('ALREADY_COMPLETED')
        expect(result2.code).toBe('ALREADY_COMPLETED')
        expect(result3.code).toBe('ALREADY_COMPLETED')
        
        // Property: State should remain unchanged across all attempts
        expect(state1.transactions.length).toBe(initialState.transactions.length)
        expect(state2.transactions.length).toBe(initialState.transactions.length)
        expect(state3.transactions.length).toBe(initialState.transactions.length)
      }),
      { numRuns: 100 }
    )
  })

  it('should reject regardless of check-in method (QRCODE or MANUAL)', () => {
    const dualMethodArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: completedBookingArb(teacherId, studentId, franchiseId),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        initialState: initialStateArb(teacherId)
      })
    )

    fc.assert(
      fc.property(dualMethodArb, ({ booking, user, initialState }) => {
        // Test QRCODE method
        const qrcodeResult = simulateCheckinWithIdempotency(booking, user, { method: 'QRCODE' }, initialState)
        expect(qrcodeResult.result.code).toBe('ALREADY_COMPLETED')
        
        // Test MANUAL method
        const manualResult = simulateCheckinWithIdempotency(booking, user, { method: 'MANUAL' }, initialState)
        expect(manualResult.result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should reject for both teacher and student users on completed bookings', () => {
    const bothUsersArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: completedBookingArb(teacherId, studentId, franchiseId),
        teacherUser: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        studentUser: fc.constant({ userId: studentId, role: 'STUDENT' }),
        method: checkinMethodArb,
        initialState: initialStateArb(teacherId)
      })
    )

    fc.assert(
      fc.property(bothUsersArb, ({ booking, teacherUser, studentUser, method, initialState }) => {
        // Teacher check-in should fail
        const teacherResult = simulateCheckinWithIdempotency(booking, teacherUser, { method }, initialState)
        expect(teacherResult.result.code).toBe('ALREADY_COMPLETED')
        
        // Student check-in should fail
        const studentResult = simulateCheckinWithIdempotency(booking, studentUser, { method }, initialState)
        expect(studentResult.result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should handle both DONE and COMPLETED status_canonical values', () => {
    // Test with DONE status
    const doneStatusArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constant('DONE'),
          status_canonical: fc.constant('DONE' as const)
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb,
        initialState: initialStateArb(teacherId)
      })
    )

    fc.assert(
      fc.property(doneStatusArb, ({ booking, user, method, initialState }) => {
        const { result } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        expect(result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )

    // Test with COMPLETED status
    const completedStatusArb2 = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([teacherId, studentId, franchiseId]) =>
      fc.record({
        booking: fc.record({
          id: uuidArb,
          student_id: fc.constant(studentId),
          teacher_id: fc.constant(teacherId),
          franchise_id: fc.constant(franchiseId),
          date: dateArb,
          start_at: dateArb,
          duration: fc.integer({ min: 30, max: 120 }),
          status: fc.constant('COMPLETED'),
          status_canonical: fc.constant('COMPLETED' as const)
        }),
        user: fc.constant({ userId: teacherId, role: 'TEACHER' }),
        method: checkinMethodArb,
        initialState: initialStateArb(teacherId)
      })
    )

    fc.assert(
      fc.property(completedStatusArb2, ({ booking, user, method, initialState }) => {
        const { result } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        expect(result.code).toBe('ALREADY_COMPLETED')
      }),
      { numRuns: 100 }
    )
  })

  it('should not return booking data on idempotent rejection', () => {
    fc.assert(
      fc.property(idempotencyScenarioArb, ({ booking, user, method, initialState }) => {
        const { result } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: Result should not contain booking data
        expect(result.booking).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Positive control: Verify that PAID bookings DO create transactions
   * This ensures our idempotency check is correctly placed
   */
  it('should create transaction for PAID bookings (positive control)', () => {
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
        method: checkinMethodArb,
        initialState: initialStateArb(teacherId)
      })
    )

    fc.assert(
      fc.property(paidBookingArb, ({ booking, user, method, initialState }) => {
        const initialTransactionCount = initialState.transactions.length
        const { result, newState } = simulateCheckinWithIdempotency(booking, user, { method }, initialState)
        
        // Property: Check-in should succeed for PAID bookings
        expect(result.success).toBe(true)
        
        // Property: A new transaction should be created
        expect(newState.transactions.length).toBe(initialTransactionCount + 1)
        
        // Property: Balance should be updated
        const initialBalance = initialState.balances.get(booking.teacher_id)?.available_hours || 0
        const newBalance = newState.balances.get(booking.teacher_id)?.available_hours || 0
        expect(newBalance).toBeGreaterThan(initialBalance)
      }),
      { numRuns: 100 }
    )
  })
})
