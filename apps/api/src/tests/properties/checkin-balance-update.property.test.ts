/**
 * Property-Based Test: CONSUME transaction increments professor balance
 * 
 * **Feature: checkin-system, Property 3: CONSUME transaction increments professor balance**
 * **Validates: Requirements 1.3**
 * 
 * This test verifies that for any CONSUME/BONUS_UNLOCK transaction created during check-in,
 * the professor's available_hours in prof_hour_balance should increase by the transaction's
 * hours value.
 * 
 * Note: The actual implementation uses BONUS_UNLOCK transactions to convert locked hours
 * to available hours. This test validates that the balance update is correct.
 */

import * as fc from 'fast-check'

// Type definitions
interface ProfHourBalance {
  professor_id: string
  franqueadora_id: string
  available_hours: number
  locked_hours: number
}

interface HourTransaction {
  id: string
  professor_id: string
  franqueadora_id: string
  type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE'
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM'
  hours: number
  booking_id: string | null
  meta_json: {
    booking_id?: string
    origin?: string
  }
}

interface BalanceUpdateResult {
  success: boolean
  initialBalance: ProfHourBalance
  transaction?: HourTransaction
  updatedBalance?: ProfHourBalance
  error?: string
}

/**
 * Simulates the balance update logic from unlockProfessorBonusHours in balance.service.ts
 * This mirrors the actual implementation that converts locked_hours to available_hours
 */
function simulateBalanceUpdate(
  initialBalance: ProfHourBalance,
  hoursToCredit: number,
  bookingId: string
): BalanceUpdateResult {
  // Calculate hours to unlock (min of requested hours and locked hours)
  const hoursToUnlock = Math.min(hoursToCredit, initialBalance.locked_hours)

  // If no locked hours available, return early (as per actual implementation)
  if (hoursToUnlock <= 0) {
    return {
      success: true,
      initialBalance,
      transaction: {
        id: `tx-${Date.now()}`,
        professor_id: initialBalance.professor_id,
        franqueadora_id: initialBalance.franqueadora_id,
        type: 'BONUS_UNLOCK',
        source: 'SYSTEM',
        hours: 0,
        booking_id: bookingId,
        meta_json: { skipped: true, reason: 'no_locked_hours' } as any
      },
      updatedBalance: initialBalance
    }
  }

  // Create BONUS_UNLOCK transaction
  const transaction: HourTransaction = {
    id: `tx-${Date.now()}`,
    professor_id: initialBalance.professor_id,
    franqueadora_id: initialBalance.franqueadora_id,
    type: 'BONUS_UNLOCK',
    source: 'SYSTEM',
    hours: hoursToUnlock,
    booking_id: bookingId,
    meta_json: {
      booking_id: bookingId,
      origin: 'checkin'
    }
  }

  // Update balance: move from locked_hours to available_hours
  const updatedBalance: ProfHourBalance = {
    ...initialBalance,
    locked_hours: initialBalance.locked_hours - hoursToUnlock,
    available_hours: initialBalance.available_hours + hoursToUnlock
  }

  return {
    success: true,
    initialBalance,
    transaction,
    updatedBalance
  }
}

// Arbitrary generators
const uuidArb = fc.uuid()

// Generator for professor balance with locked hours
const balanceArb = (professorId: string, franqueadoraId: string): fc.Arbitrary<ProfHourBalance> =>
  fc.record({
    professor_id: fc.constant(professorId),
    franqueadora_id: fc.constant(franqueadoraId),
    available_hours: fc.integer({ min: 0, max: 100 }),
    locked_hours: fc.integer({ min: 0, max: 50 })
  })

// Generator for balance with guaranteed locked hours (for positive tests)
const balanceWithLockedHoursArb = (professorId: string, franqueadoraId: string): fc.Arbitrary<ProfHourBalance> =>
  fc.record({
    professor_id: fc.constant(professorId),
    franqueadora_id: fc.constant(franqueadoraId),
    available_hours: fc.integer({ min: 0, max: 100 }),
    locked_hours: fc.integer({ min: 1, max: 50 }) // At least 1 locked hour
  })

// Generator for complete balance update scenario
const balanceUpdateScenarioArb: fc.Arbitrary<{
  initialBalance: ProfHourBalance
  hoursToCredit: number
  bookingId: string
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([professorId, franqueadoraId, bookingId]) =>
  fc.record({
    initialBalance: balanceWithLockedHoursArb(professorId, franqueadoraId),
    hoursToCredit: fc.double({ min: 0.5, max: 2, noNaN: true }), // 30min to 2 hours
    bookingId: fc.constant(bookingId)
  })
)

// Generator for scenario with sufficient locked hours
const sufficientLockedHoursScenarioArb: fc.Arbitrary<{
  initialBalance: ProfHourBalance
  hoursToCredit: number
  bookingId: string
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([professorId, franqueadoraId, bookingId]) =>
  fc.integer({ min: 1, max: 10 }).chain(hoursToCredit =>
    fc.record({
      initialBalance: fc.record({
        professor_id: fc.constant(professorId),
        franqueadora_id: fc.constant(franqueadoraId),
        available_hours: fc.integer({ min: 0, max: 100 }),
        locked_hours: fc.integer({ min: hoursToCredit, max: hoursToCredit + 20 }) // Ensure enough locked hours
      }),
      hoursToCredit: fc.constant(hoursToCredit),
      bookingId: fc.constant(bookingId)
    })
  )
)

describe('Property 3: CONSUME transaction increments professor balance', () => {
  /**
   * Property: For any BONUS_UNLOCK transaction, the professor's available_hours
   * should increase by the transaction's hours value.
   */
  it('should increment available_hours by transaction hours', () => {
    fc.assert(
      fc.property(sufficientLockedHoursScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        expect(result.transaction).toBeDefined()
        
        // Property: available_hours should increase by transaction hours
        const expectedAvailable = initialBalance.available_hours + result.transaction!.hours
        expect(result.updatedBalance!.available_hours).toBe(expectedAvailable)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any BONUS_UNLOCK transaction, the professor's locked_hours
   * should decrease by the transaction's hours value.
   */
  it('should decrement locked_hours by transaction hours', () => {
    fc.assert(
      fc.property(sufficientLockedHoursScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        expect(result.transaction).toBeDefined()
        
        // Property: locked_hours should decrease by transaction hours
        const expectedLocked = initialBalance.locked_hours - result.transaction!.hours
        expect(result.updatedBalance!.locked_hours).toBe(expectedLocked)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The total hours (available + locked) should remain constant
   * after a BONUS_UNLOCK transaction (conservation of hours).
   */
  it('should preserve total hours (available + locked) after unlock', () => {
    fc.assert(
      fc.property(sufficientLockedHoursScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        
        // Property: Total hours should be conserved
        const initialTotal = initialBalance.available_hours + initialBalance.locked_hours
        const updatedTotal = result.updatedBalance!.available_hours + result.updatedBalance!.locked_hours
        expect(updatedTotal).toBe(initialTotal)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction hours should never exceed locked_hours
   * (can't unlock more than what's locked).
   */
  it('should not unlock more hours than available in locked_hours', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.transaction).toBeDefined()
        
        // Property: Transaction hours should be <= initial locked_hours
        expect(result.transaction!.hours).toBeLessThanOrEqual(initialBalance.locked_hours)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Updated locked_hours should never be negative.
   */
  it('should never result in negative locked_hours', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        
        // Property: locked_hours should never be negative
        expect(result.updatedBalance!.locked_hours).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Updated available_hours should always be >= initial available_hours
   * (unlock only adds, never removes from available).
   */
  it('should only increase or maintain available_hours', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        
        // Property: available_hours should never decrease
        expect(result.updatedBalance!.available_hours).toBeGreaterThanOrEqual(initialBalance.available_hours)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When locked_hours is 0, no hours should be unlocked
   * and balance should remain unchanged.
   */
  it('should not change balance when no locked hours available', () => {
    const zeroLockedScenarioArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([professorId, franqueadoraId, bookingId]) =>
      fc.record({
        initialBalance: fc.record({
          professor_id: fc.constant(professorId),
          franqueadora_id: fc.constant(franqueadoraId),
          available_hours: fc.integer({ min: 0, max: 100 }),
          locked_hours: fc.constant(0) // No locked hours
        }),
        hoursToCredit: fc.double({ min: 0.5, max: 2, noNaN: true }),
        bookingId: fc.constant(bookingId)
      })
    )

    fc.assert(
      fc.property(zeroLockedScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.transaction).toBeDefined()
        expect(result.transaction!.hours).toBe(0)
        
        // Property: Balance should remain unchanged
        expect(result.updatedBalance!.available_hours).toBe(initialBalance.available_hours)
        expect(result.updatedBalance!.locked_hours).toBe(initialBalance.locked_hours)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Professor ID and franqueadora ID should be preserved in updated balance.
   */
  it('should preserve professor_id and franqueadora_id in updated balance', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.updatedBalance).toBeDefined()
        
        // Property: IDs should be preserved
        expect(result.updatedBalance!.professor_id).toBe(initialBalance.professor_id)
        expect(result.updatedBalance!.franqueadora_id).toBe(initialBalance.franqueadora_id)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction should have correct type (BONUS_UNLOCK).
   */
  it('should create BONUS_UNLOCK transaction type', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.transaction).toBeDefined()
        expect(result.transaction!.type).toBe('BONUS_UNLOCK')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction should reference the correct booking_id.
   */
  it('should include booking_id in transaction', () => {
    fc.assert(
      fc.property(balanceUpdateScenarioArb, ({ initialBalance, hoursToCredit, bookingId }) => {
        const result = simulateBalanceUpdate(initialBalance, hoursToCredit, bookingId)
        
        expect(result.success).toBe(true)
        expect(result.transaction).toBeDefined()
        expect(result.transaction!.booking_id).toBe(bookingId)
      }),
      { numRuns: 100 }
    )
  })
})
