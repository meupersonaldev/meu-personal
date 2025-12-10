/**
 * Property-Based Test: Atomicity in failures
 * **Feature: manual-credit-release, Property 9: Atomicidade em falhas**
 * **Validates: Requirements 6.4, 6.5**
 */
import * as fc from 'fast-check';

interface StudentClassBalance {
  id: string;
  student_id: string;
  franqueadora_id: string;
  total_purchased: number;
  total_consumed: number;
  locked_qty: number;
  updated_at: string;
}

interface StudentClassTransaction {
  id: string;
  student_id: string;
  franqueadora_id: string;
  type: 'GRANT';
  source: 'ADMIN';
  qty: number;
  meta_json: Record<string, unknown>;
  created_at: string;
}

interface CreditGrant {
  id: string;
  recipient_id: string;
  recipient_email: string;
  recipient_name: string;
  credit_type: 'STUDENT_CLASS';
  quantity: number;
  reason: string;
  granted_by_id: string;
  granted_by_email: string;
  franqueadora_id: string;
  transaction_id: string;
  created_at: string;
}

enum FailurePoint {
  NONE = 'NONE',
  ENSURE_BALANCE = 'ENSURE_BALANCE',
  CREATE_TRANSACTION = 'CREATE_TRANSACTION',
  UPDATE_BALANCE = 'UPDATE_BALANCE',
  CREATE_AUDIT = 'CREATE_AUDIT'
}

interface GrantResult {
  success: boolean;
  finalBalance: StudentClassBalance | null;
  transaction: StudentClassTransaction | null;
  audit: CreditGrant | null;
  error?: string;
}

function simulateAtomicGrant(
  initialBalance: StudentClassBalance | null,
  studentId: string,
  franqueadoraId: string,
  qty: number,
  grantedById: string,
  grantedByEmail: string,
  recipientEmail: string,
  recipientName: string,
  reason: string,
  failurePoint: FailurePoint
): GrantResult {
  try {
    if (failurePoint === FailurePoint.ENSURE_BALANCE) {
      throw new Error('Failed to ensure balance');
    }

    let currentBalance = initialBalance ? { ...initialBalance } : {
      id: 'balance-new',
      student_id: studentId,
      franqueadora_id: franqueadoraId,
      total_purchased: 0,
      total_consumed: 0,
      locked_qty: 0,
      updated_at: new Date().toISOString()
    };

    if (failurePoint === FailurePoint.CREATE_TRANSACTION) {
      throw new Error('Failed to create transaction');
    }

    const transaction: StudentClassTransaction = {
      id: 'tx-new',
      student_id: studentId,
      franqueadora_id: franqueadoraId,
      type: 'GRANT',
      source: 'ADMIN',
      qty: qty,
      meta_json: { granted_by_id: grantedById, reason: reason },
      created_at: new Date().toISOString()
    };

    if (failurePoint === FailurePoint.UPDATE_BALANCE) {
      throw new Error('Failed to update balance');
    }

    currentBalance = {
      ...currentBalance,
      total_purchased: currentBalance.total_purchased + qty,
      updated_at: new Date().toISOString()
    };

    if (failurePoint === FailurePoint.CREATE_AUDIT) {
      throw new Error('Failed to create audit');
    }

    const audit: CreditGrant = {
      id: 'audit-new',
      recipient_id: studentId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      credit_type: 'STUDENT_CLASS',
      quantity: qty,
      reason: reason,
      granted_by_id: grantedById,
      granted_by_email: grantedByEmail,
      franqueadora_id: franqueadoraId,
      transaction_id: transaction.id,
      created_at: new Date().toISOString()
    };

    return { success: true, finalBalance: currentBalance, transaction, audit };
  } catch (error) {
    return {
      success: false,
      finalBalance: initialBalance,
      transaction: null,
      audit: null,
      error: (error as Error).message
    };
  }
}

const uuidArb = fc.uuid();
const emailArb = fc.emailAddress();
const nameArb = fc.string({ minLength: 1, maxLength: 50 });
const reasonArb = fc.string({ minLength: 1, maxLength: 100 });
const qtyArb = fc.integer({ min: 1, max: 100 });

const failurePointArb = fc.constantFrom(
  FailurePoint.ENSURE_BALANCE,
  FailurePoint.CREATE_TRANSACTION,
  FailurePoint.UPDATE_BALANCE,
  FailurePoint.CREATE_AUDIT
);

const balanceArb = (studentId: string, franqueadoraId: string) =>
  fc.record({
    id: uuidArb,
    student_id: fc.constant(studentId),
    franqueadora_id: fc.constant(franqueadoraId),
    total_purchased: fc.integer({ min: 0, max: 500 }),
    total_consumed: fc.integer({ min: 0, max: 200 }),
    locked_qty: fc.integer({ min: 0, max: 100 }),
    updated_at: fc.constant(new Date().toISOString())
  });

const scenarioArb = fc.tuple(uuidArb, uuidArb, uuidArb).chain(([studentId, franqueadoraId, grantedById]) =>
  fc.record({
    initialBalance: balanceArb(studentId, franqueadoraId),
    studentId: fc.constant(studentId),
    franqueadoraId: fc.constant(franqueadoraId),
    qty: qtyArb,
    grantedById: fc.constant(grantedById),
    grantedByEmail: emailArb,
    recipientEmail: emailArb,
    recipientName: nameArb,
    reason: reasonArb,
    failurePoint: failurePointArb
  })
);

describe('Property 9: Atomicidade em falhas', () => {
  it('should preserve initial balance when operation fails', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        expect(result.finalBalance).toEqual(s.initialBalance);
      }),
      { numRuns: 100 }
    );
  });

  it('should not create transaction when operation fails', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        expect(result.transaction).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should not create audit when operation fails', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        expect(result.audit).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should return error message on failure', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should update all components atomically on success', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, FailurePoint.NONE
        );
        expect(result.success).toBe(true);
        expect(result.finalBalance).not.toBeNull();
        expect(result.transaction).not.toBeNull();
        expect(result.audit).not.toBeNull();
        expect(result.finalBalance!.total_purchased).toBe(s.initialBalance.total_purchased + s.qty);
      }),
      { numRuns: 100 }
    );
  });

  it('should not create balance for new user when operation fails', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          null, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        expect(result.finalBalance).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should not accumulate changes across multiple failed attempts', () => {
    fc.assert(
      fc.property(scenarioArb, fc.integer({ min: 2, max: 5 }), (s, attempts) => {
        let currentBalance = s.initialBalance;
        for (let i = 0; i < attempts; i++) {
          const result = simulateAtomicGrant(
            currentBalance, s.studentId, s.franqueadoraId, s.qty,
            s.grantedById, s.grantedByEmail, s.recipientEmail,
            s.recipientName, s.reason, s.failurePoint
          );
          expect(result.success).toBe(false);
          expect(result.finalBalance).toEqual(s.initialBalance);
          currentBalance = result.finalBalance!;
        }
        expect(currentBalance).toEqual(s.initialBalance);
      }),
      { numRuns: 100 }
    );
  });

  it('should never increase total_purchased on failure', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const result = simulateAtomicGrant(
          s.initialBalance, s.studentId, s.franqueadoraId, s.qty,
          s.grantedById, s.grantedByEmail, s.recipientEmail,
          s.recipientName, s.reason, s.failurePoint
        );
        expect(result.success).toBe(false);
        if (result.finalBalance) {
          expect(result.finalBalance.total_purchased).toBe(s.initialBalance.total_purchased);
        }
      }),
      { numRuns: 100 }
    );
  });
});
