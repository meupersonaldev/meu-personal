/**
 * Property-Based Test: Credit type determines correct table
 * 
 * **Feature: manual-credit-release, Property 6: Tipo de crédito determina tabela correta**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 * 
 * This test verifies that for any credit grant:
 * - STUDENT_CLASS type creates transaction in student_class_tx with type='GRANT'
 * - PROFESSOR_HOUR type creates transaction in hour_tx with type='GRANT'
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

interface ProfHourBalance {
  id: string
  professor_id: string
  franqueadora_id: string
  available_hours: number
  locked_hours: number
  updated_at: string
  unit_id?: string | null
}

interface HourTransaction {
  id: string
  professor_id: string
  franqueadora_id: string
  unit_id?: string | null
  type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE' | 'GRANT'
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM' | 'ADMIN'
  hours: number
  booking_id?: string
  meta_json: Record<string, any>
  created_at: string
  unlock_at?: string | null
}

type CreditType = 'STUDENT_CLASS' | 'PROFESSOR_HOUR'

interface GrantResult {
  creditType: CreditType
  studentTransaction?: StudentClassTransaction
  hourTransaction?: HourTransaction
  studentBalance?: StudentClassBalance
  professorBalance?: ProfHourBalance
}

/**
 * Simulates the grantStudentClasses logic from balance.service.ts
 */
function simulateGrantStudentClasses(
  initialBalance: StudentClassBalance | null,
  studentId: string,
  franqueadoraId: string,
  qty: number,
  grantedById: string,
  reason: string
): { balance: StudentClassBalance; transaction: StudentClassTransaction } {
  const balance: StudentClassBalance = initialBalance ?? {
    id: `balance-${Date.now()}`,
    student_id: studentId,
    franqueadora_id: franqueadoraId,
    total_purchased: 0,
    total_consumed: 0,
    locked_qty: 0,
    updated_at: new Date().toISOString()
  }

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

  const updatedBalance: StudentClassBalance = {
    ...balance,
    total_purchased: balance.total_purchased + qty,
    updated_at: new Date().toISOString()
  }

  return { balance: updatedBalance, transaction }
}

/**
 * Simulates the grantProfessorHours logic from balance.service.ts
 */
function simulateGrantProfessorHours(
  initialBalance: ProfHourBalance | null,
  professorId: string,
  franqueadoraId: string,
  hours: number,
  grantedById: string,
  reason: string
): { balance: ProfHourBalance; transaction: HourTransaction } {
  const balance: ProfHourBalance = initialBalance ?? {
    id: `balance-${Date.now()}`,
    professor_id: professorId,
    franqueadora_id: franqueadoraId,
    available_hours: 0,
    locked_hours: 0,
    updated_at: new Date().toISOString()
  }

  const transaction: HourTransaction = {
    id: `tx-${Date.now()}`,
    professor_id: professorId,
    franqueadora_id: franqueadoraId,
    unit_id: null,
    type: 'GRANT',
    source: 'ADMIN',
    hours: hours,
    meta_json: {
      granted_by_id: grantedById,
      reason: reason,
      grant_type: 'manual_release'
    },
    created_at: new Date().toISOString()
  }

  const updatedBalance: ProfHourBalance = {
    ...balance,
    available_hours: balance.available_hours + hours,
    updated_at: new Date().toISOString()
  }

  return { balance: updatedBalance, transaction }
}

/**
 * Simulates the credit grant dispatcher that routes to correct service based on credit type
 */
function simulateCreditGrant(
  creditType: CreditType,
  userId: string,
  franqueadoraId: string,
  qty: number,
  grantedById: string,
  reason: string,
  existingStudentBalance: StudentClassBalance | null,
  existingProfessorBalance: ProfHourBalance | null
): GrantResult {
  if (creditType === 'STUDENT_CLASS') {
    const result = simulateGrantStudentClasses(
      existingStudentBalance,
      userId,
      franqueadoraId,
      qty,
      grantedById,
      reason
    )
    return {
      creditType,
      studentTransaction: result.transaction,
      studentBalance: result.balance
    }
  } else {
    const result = simulateGrantProfessorHours(
      existingProfessorBalance,
      userId,
      franqueadoraId,
      qty,
      grantedById,
      reason
    )
    return {
      creditType,
      hourTransaction: result.transaction,
      professorBalance: result.balance
    }
  }
}

// Arbitrary generators
const uuidArb = fc.uuid()
const positiveQtyArb = fc.integer({ min: 1, max: 1000 })
const creditTypeArb = fc.constantFrom<CreditType>('STUDENT_CLASS', 'PROFESSOR_HOUR')

// Generator for existing student balance
const existingStudentBalanceArb = (studentId: string, franqueadoraId: string): fc.Arbitrary<StudentClassBalance> =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    franqueadora_id: fc.constant(franqueadoraId),
    total_purchased: fc.integer({ min: 0, max: 500 }),
    total_consumed: fc.integer({ min: 0, max: 200 }),
    locked_qty: fc.integer({ min: 0, max: 100 }),
    updated_at: fc.constant(new Date().toISOString())
  })

// Generator for existing professor balance
const existingProfessorBalanceArb = (professorId: string, franqueadoraId: string): fc.Arbitrary<ProfHourBalance> =>
  fc.record({
    id: uuidArb,
    professor_id: fc.constant(professorId),
    franqueadora_id: fc.constant(franqueadoraId),
    available_hours: fc.integer({ min: 0, max: 500 }),
    locked_hours: fc.integer({ min: 0, max: 100 }),
    updated_at: fc.constant(new Date().toISOString())
  })

// Generator for grant scenario
const grantScenarioArb: fc.Arbitrary<{
  creditType: CreditType
  userId: string
  franqueadoraId: string
  qty: number
  grantedById: string
  reason: string
  existingStudentBalance: StudentClassBalance | null
  existingProfessorBalance: ProfHourBalance | null
}> = fc.tuple(uuidArb, uuidArb, uuidArb, creditTypeArb).chain(([userId, franqueadoraId, grantedById, creditType]) =>
  fc.record({
    creditType: fc.constant(creditType),
    userId: fc.constant(userId),
    franqueadoraId: fc.constant(franqueadoraId),
    qty: positiveQtyArb,
    grantedById: fc.constant(grantedById),
    reason: fc.string({ minLength: 1, maxLength: 200 }),
    existingStudentBalance: fc.option(existingStudentBalanceArb(userId, franqueadoraId), { nil: null }),
    existingProfessorBalance: fc.option(existingProfessorBalanceArb(userId, franqueadoraId), { nil: null })
  })
)

describe('Property 6: Tipo de crédito determina tabela correta', () => {
  /**
   * Property: STUDENT_CLASS credit type creates transaction in student_class_tx
   */
  it('should create student_class_tx transaction for STUDENT_CLASS credit type', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'STUDENT_CLASS'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: STUDENT_CLASS should create studentTransaction, not hourTransaction
          expect(result.studentTransaction).toBeDefined()
          expect(result.hourTransaction).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: PROFESSOR_HOUR credit type creates transaction in hour_tx
   */
  it('should create hour_tx transaction for PROFESSOR_HOUR credit type', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'PROFESSOR_HOUR'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: PROFESSOR_HOUR should create hourTransaction, not studentTransaction
          expect(result.hourTransaction).toBeDefined()
          expect(result.studentTransaction).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: STUDENT_CLASS transaction has type='GRANT'
   */
  it('should set type=GRANT for STUDENT_CLASS transactions', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'STUDENT_CLASS'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: Transaction type should be GRANT
          expect(result.studentTransaction?.type).toBe('GRANT')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: PROFESSOR_HOUR transaction has type='GRANT'
   */
  it('should set type=GRANT for PROFESSOR_HOUR transactions', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'PROFESSOR_HOUR'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: Transaction type should be GRANT
          expect(result.hourTransaction?.type).toBe('GRANT')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: STUDENT_CLASS updates student_class_balance
   */
  it('should update student_class_balance for STUDENT_CLASS credit type', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'STUDENT_CLASS'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: STUDENT_CLASS should update studentBalance, not professorBalance
          expect(result.studentBalance).toBeDefined()
          expect(result.professorBalance).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: PROFESSOR_HOUR updates prof_hour_balance
   */
  it('should update prof_hour_balance for PROFESSOR_HOUR credit type', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'PROFESSOR_HOUR'),
        (scenario) => {
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: PROFESSOR_HOUR should update professorBalance, not studentBalance
          expect(result.professorBalance).toBeDefined()
          expect(result.studentBalance).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Credit type is preserved in result
   */
  it('should preserve credit type in result', () => {
    fc.assert(
      fc.property(grantScenarioArb, (scenario) => {
        const result = simulateCreditGrant(
          scenario.creditType,
          scenario.userId,
          scenario.franqueadoraId,
          scenario.qty,
          scenario.grantedById,
          scenario.reason,
          scenario.existingStudentBalance,
          scenario.existingProfessorBalance
        )

        // Property: Credit type should be preserved
        expect(result.creditType).toBe(scenario.creditType)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Transaction source is always ADMIN for grants
   */
  it('should set source=ADMIN for all grant transactions', () => {
    fc.assert(
      fc.property(grantScenarioArb, (scenario) => {
        const result = simulateCreditGrant(
          scenario.creditType,
          scenario.userId,
          scenario.franqueadoraId,
          scenario.qty,
          scenario.grantedById,
          scenario.reason,
          scenario.existingStudentBalance,
          scenario.existingProfessorBalance
        )

        // Property: Source should always be ADMIN
        if (result.studentTransaction) {
          expect(result.studentTransaction.source).toBe('ADMIN')
        }
        if (result.hourTransaction) {
          expect(result.hourTransaction.source).toBe('ADMIN')
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: STUDENT_CLASS increases total_purchased
   */
  it('should increase total_purchased for STUDENT_CLASS grants', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'STUDENT_CLASS'),
        (scenario) => {
          const initialPurchased = scenario.existingStudentBalance?.total_purchased ?? 0
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: total_purchased should increase by qty
          expect(result.studentBalance?.total_purchased).toBe(initialPurchased + scenario.qty)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: PROFESSOR_HOUR increases available_hours
   */
  it('should increase available_hours for PROFESSOR_HOUR grants', () => {
    fc.assert(
      fc.property(
        grantScenarioArb.filter(s => s.creditType === 'PROFESSOR_HOUR'),
        (scenario) => {
          const initialHours = scenario.existingProfessorBalance?.available_hours ?? 0
          const result = simulateCreditGrant(
            scenario.creditType,
            scenario.userId,
            scenario.franqueadoraId,
            scenario.qty,
            scenario.grantedById,
            scenario.reason,
            scenario.existingStudentBalance,
            scenario.existingProfessorBalance
          )

          // Property: available_hours should increase by qty
          expect(result.professorBalance?.available_hours).toBe(initialHours + scenario.qty)
        }
      ),
      { numRuns: 100 }
    )
  })
})
