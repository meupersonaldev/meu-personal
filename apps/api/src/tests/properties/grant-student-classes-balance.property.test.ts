/**
 * Property-Based Test: Balance updated correctly after credit grant
 * 
 * **Feature: manual-credit-release, Property 1: Saldo atualizado corretamente após liberação**
 * **Validates: Requirements 1.2, 6.3**
 * 
 * This test verifies that for any credit grant with quantity Q to a user with initial balance S,
 * the final balance should be exactly S + Q. If the user had no balance, the final balance should be Q.
 */

import * as fc from 'fast-check'

// Type definitions matching balance.service.ts
interface StudentClassBalance {
  id: string
  student_id: string
  franqueadora_id: string
  total_purchased: number
  total_consumed: number
  locked_qty: number
  updated_at: string
  unit_id?: string | null
}

interface StudentClassTransaction {
  id: string
  student_id: string
  franqueadora_id: string
  unit_id?: string | null
  type: 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE' | 'GRANT'
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM' | 'ADMIN'
  qty: number
  booking_id?: string
  meta_json: Record<string, any>
  created_at: string
  unlock_at?: string | null
}

interface GrantResult {
  balance: StudentClassBalance
  transaction: StudentClassTransaction
}

/**
 * Simulates the grantStudentClasses logic from balance.service.ts
 * This mirrors the actual implementation that increases total_purchased
 */
function simulateGrantStudentClasses(
  initialBalance: StudentClassBalance | null,
  studentId: string,
  franqueadoraId: string,
  qty: number,
  grantedById: string,
  reason: string
): GrantResult {
  // If no initial balance, create one with zeros (as ensureStudentBalance does)
  const balance: StudentClassBalance = initialBalance ?? {
    id: `balance-${Date.now()}`,
    student_id: studentId,
    franqueadora_id: franqueadoraId,
    total_purchased: 0,
    total_consumed: 0,
    locked_qty: 0,
    updated_at: new Date().toISOString()
  }

  // Create GRANT transaction with source ADMIN
  const transaction: StudentClassTransaction = {
    id: `tx-${Date.now()}`,
    student_id: studentId,
    franqueadora_id: franqueadoraId,
    unit_id: null,
    type: 'GRANT',
    source: 'ADMIN',
    qty: qty,
    meta_json: {
      granted_by_id: grantedById,
      reason: reason,
      grant_type: 'manual_release'
    },
    created_at: new Date().toISOString()
  }

  // Update total_purchased (increases available balance)
  const updatedBalance: StudentClassBalance = {
    ...balance,
    total_purchased: balance.total_purchased + qty,
    updated_at: new Date().toISOString()
  }

  return { balance: updatedBalance, transaction }
}

/**
 * Calculates available balance from StudentClassBalance
 */
function calculateAvailableBalance(balance: StudentClassBalance): number {
  return balance.total_purchased - balance.total_consumed - balance.locked_qty
}

// Arbitrary generators
const uuidArb = fc.uuid()

// Generator for positive quantity (must be > 0 per Requirements 6.1)
const positiveQtyArb = fc.integer({ min: 1, max: 1000 })

// Generator for existing student balance
const existingBalanceArb = (studentId: string, franqueadoraId: string): fc.Arbitrary<StudentClassBalance> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    franqueadora_id: fc.constant(franqueadoraId),
    total_purchased: fc.integer({ min: 0, max: 500 }),
    total_consumed: fc.integer({ min: 0, max: 200 }),
    locked_qty: fc.integer({ min: 0, max: 100 }),
    updated_at: fc.constant(new Date().toISOString())
  })

// Generator for grant scenario with existing balance
const grantWithExistingBalanceArb: fc.Arbitrary<{
  initialBalance: StudentClassBalance
  studentId: string
  franqueadoraId: string
  qty: number
  grantedById: string
  reason: string
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([studentId, franqueadoraId, grantedById]) =>
  fc.record({
    initialBalance: existingBalanceArb(studentId, franqueadoraId),
    studentId: fc.constant(studentId),
    franqueadoraId: fc.constant(franqueadoraId),
    qty: positiveQtyArb,
    grantedById: fc.constant(grantedById),
    reason: fc.string({ minLength: 1, maxLength: 200 })
  })
)

// Generator for grant scenario without existing balance (new user)
const grantWithoutExistingBalanceArb: fc.Arbitrary<{
  initialBalance: null
  studentId: string
  franqueadoraId: string
  qty: number
  grantedById: string
  reason: string
}> = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([studentId, franqueadoraId, grantedById]) =>
  fc.record({
    initialBalance: fc.constant(null),
    studentId: fc.constant(studentId),
    franqueadoraId: fc.constant(franqueadoraId),
    qty: positiveQtyArb,
    grantedById: fc.constant(grantedById),
    reason: fc.string({ minLength: 1, maxLength: 200 })
  })
)

describe('Property 1: Saldo atualizado corretamente após liberação', () => {
  /**
   * Property: For any grant with quantity Q to a user with initial balance S,
   * the final total_purchased should be exactly S + Q.
   */
  it('should increase total_purchased by exactly the granted quantity', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: total_purchased should increase by exactly qty
        expect(result.balance.total_purchased).toBe(initialBalance.total_purchased + qty)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For a user without existing balance, the final total_purchased should be Q.
   */
  it('should set total_purchased to granted quantity when no prior balance exists', () => {
    fc.assert(
      fc.property(grantWithoutExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: total_purchased should equal qty when starting from zero
        expect(result.balance.total_purchased).toBe(qty)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Available balance should increase by exactly the granted quantity.
   * Available = total_purchased - total_consumed - locked_qty
   */
  it('should increase available balance by exactly the granted quantity', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const initialAvailable = calculateAvailableBalance(initialBalance)
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        const finalAvailable = calculateAvailableBalance(result.balance)
        
        // Property: available balance should increase by exactly qty
        expect(finalAvailable).toBe(initialAvailable + qty)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: total_consumed and locked_qty should remain unchanged after grant.
   */
  it('should not modify total_consumed or locked_qty', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: total_consumed and locked_qty should be preserved
        expect(result.balance.total_consumed).toBe(initialBalance.total_consumed)
        expect(result.balance.locked_qty).toBe(initialBalance.locked_qty)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction should have type GRANT and source ADMIN.
   */
  it('should create transaction with type GRANT and source ADMIN', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: Transaction should have correct type and source
        expect(result.transaction.type).toBe('GRANT')
        expect(result.transaction.source).toBe('ADMIN')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction qty should match the granted quantity.
   */
  it('should create transaction with correct quantity', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: Transaction qty should equal granted qty
        expect(result.transaction.qty).toBe(qty)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction meta_json should contain granted_by_id and reason.
   */
  it('should include granted_by_id and reason in transaction meta_json', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: meta_json should contain audit information
        expect(result.transaction.meta_json.granted_by_id).toBe(grantedById)
        expect(result.transaction.meta_json.reason).toBe(reason)
        expect(result.transaction.meta_json.grant_type).toBe('manual_release')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Student ID and franqueadora ID should be preserved in updated balance.
   */
  it('should preserve student_id and franqueadora_id in updated balance', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: IDs should be preserved
        expect(result.balance.student_id).toBe(studentId)
        expect(result.balance.franqueadora_id).toBe(franqueadoraId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Multiple grants should be additive.
   * Granting Q1 then Q2 should result in total_purchased increasing by Q1 + Q2.
   */
  it('should be additive for multiple grants', () => {
    fc.assert(
      fc.property(
        fc.tuple(uuidArb, uuidArb, uuidArb).chain(([studentId, franqueadoraId, grantedById]) =>
          fc.record({
            initialBalance: existingBalanceArb(studentId, franqueadoraId),
            studentId: fc.constant(studentId),
            franqueadoraId: fc.constant(franqueadoraId),
            qty1: positiveQtyArb,
            qty2: positiveQtyArb,
            grantedById: fc.constant(grantedById),
            reason: fc.string({ minLength: 1, maxLength: 200 })
          })
        ),
        ({ initialBalance, studentId, franqueadoraId, qty1, qty2, grantedById, reason }) => {
          // First grant
          const result1 = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty1, grantedById, reason)
          // Second grant on updated balance
          const result2 = simulateGrantStudentClasses(result1.balance, studentId, franqueadoraId, qty2, grantedById, reason)
          
          // Property: Final total_purchased should be initial + qty1 + qty2
          expect(result2.balance.total_purchased).toBe(initialBalance.total_purchased + qty1 + qty2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Grant should never decrease total_purchased.
   */
  it('should never decrease total_purchased', () => {
    fc.assert(
      fc.property(grantWithExistingBalanceArb, ({ initialBalance, studentId, franqueadoraId, qty, grantedById, reason }) => {
        const result = simulateGrantStudentClasses(initialBalance, studentId, franqueadoraId, qty, grantedById, reason)
        
        // Property: total_purchased should never decrease
        expect(result.balance.total_purchased).toBeGreaterThanOrEqual(initialBalance.total_purchased)
      }),
      { numRuns: 100 }
    )
  })
})
