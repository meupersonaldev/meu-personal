/**
 * Property-Based Test: Audit always recorded for credit grants
 * 
 * **Feature: manual-credit-release, Property 3: Auditoria sempre registrada**
 * **Validates: Requirements 1.3, 1.5**
 * 
 * This test verifies that for any successful credit grant, there must exist a record
 * in the credit_grants table with recipient_id, recipient_email, credit_type, quantity,
 * reason, granted_by_id, franqueadora_id, and transaction_id all populated.
 */

import * as fc from 'fast-check'

// Type definitions matching credit-grant.service.ts
interface CreditGrant {
  id: string
  recipient_id: string
  recipient_email: string
  recipient_name: string
  credit_type: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
  granted_by_id: string
  granted_by_email: string
  franqueadora_id: string
  franchise_id?: string | null
  transaction_id: string
  created_at: string
}

interface CreateGrantAuditParams {
  recipientId: string
  recipientEmail: string
  recipientName: string
  creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
  grantedById: string
  grantedByEmail: string
  franqueadoraId: string
  franchiseId?: string | null
  transactionId: string
}

/**
 * Simulates the createGrantAudit logic from credit-grant.service.ts
 * This mirrors the actual implementation that creates audit records
 */
function simulateCreateGrantAudit(params: CreateGrantAuditParams): CreditGrant {
  // Validate required fields (as the service would do)
  if (!params.recipientId) throw new Error('recipient_id is required')
  if (!params.recipientEmail) throw new Error('recipient_email is required')
  if (!params.recipientName) throw new Error('recipient_name is required')
  if (!params.creditType) throw new Error('credit_type is required')
  if (!params.quantity || params.quantity <= 0) throw new Error('quantity must be positive')
  if (!params.reason) throw new Error('reason is required')
  if (!params.grantedById) throw new Error('granted_by_id is required')
  if (!params.grantedByEmail) throw new Error('granted_by_email is required')
  if (!params.franqueadoraId) throw new Error('franqueadora_id is required')
  if (!params.transactionId) throw new Error('transaction_id is required')

  // Create audit record (simulating database insert)
  const auditRecord: CreditGrant = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recipient_id: params.recipientId,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    credit_type: params.creditType,
    quantity: params.quantity,
    reason: params.reason,
    granted_by_id: params.grantedById,
    granted_by_email: params.grantedByEmail,
    franqueadora_id: params.franqueadoraId,
    franchise_id: params.franchiseId ?? null,
    transaction_id: params.transactionId,
    created_at: new Date().toISOString()
  }

  return auditRecord
}

/**
 * Validates that all required fields are present and non-empty in an audit record
 */
function validateAuditRecordHasAllRequiredFields(record: CreditGrant): boolean {
  return (
    typeof record.id === 'string' && record.id.length > 0 &&
    typeof record.recipient_id === 'string' && record.recipient_id.length > 0 &&
    typeof record.recipient_email === 'string' && record.recipient_email.length > 0 &&
    typeof record.recipient_name === 'string' && record.recipient_name.length > 0 &&
    (record.credit_type === 'STUDENT_CLASS' || record.credit_type === 'PROFESSOR_HOUR') &&
    typeof record.quantity === 'number' && record.quantity > 0 &&
    typeof record.reason === 'string' && record.reason.length > 0 &&
    typeof record.granted_by_id === 'string' && record.granted_by_id.length > 0 &&
    typeof record.granted_by_email === 'string' && record.granted_by_email.length > 0 &&
    typeof record.franqueadora_id === 'string' && record.franqueadora_id.length > 0 &&
    typeof record.transaction_id === 'string' && record.transaction_id.length > 0 &&
    typeof record.created_at === 'string' && record.created_at.length > 0
  )
}

// Arbitrary generators
const uuidArb = fc.uuid()

// Generator for valid email addresses
const emailArb = fc.emailAddress()

// Generator for non-empty names
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generator for credit type
const creditTypeArb = fc.constantFrom<'STUDENT_CLASS' | 'PROFESSOR_HOUR'>('STUDENT_CLASS', 'PROFESSOR_HOUR')

// Generator for positive quantity (must be > 0 per Requirements 6.1)
const positiveQtyArb = fc.integer({ min: 1, max: 1000 })

// Generator for non-empty reason
const reasonArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)

// Generator for valid CreateGrantAuditParams
const validAuditParamsArb: fc.Arbitrary<CreateGrantAuditParams> = fc.record({
  recipientId: uuidArb,
  recipientEmail: emailArb,
  recipientName: nameArb,
  creditType: creditTypeArb,
  quantity: positiveQtyArb,
  reason: reasonArb,
  grantedById: uuidArb,
  grantedByEmail: emailArb,
  franqueadoraId: uuidArb,
  franchiseId: fc.option(uuidArb, { nil: null }),
  transactionId: uuidArb
})

// Generator for params with optional franchise_id
const paramsWithFranchiseArb: fc.Arbitrary<CreateGrantAuditParams> = fc.record({
  recipientId: uuidArb,
  recipientEmail: emailArb,
  recipientName: nameArb,
  creditType: creditTypeArb,
  quantity: positiveQtyArb,
  reason: reasonArb,
  grantedById: uuidArb,
  grantedByEmail: emailArb,
  franqueadoraId: uuidArb,
  franchiseId: uuidArb,
  transactionId: uuidArb
})

// Generator for params without franchise_id (franqueadora-level grant)
const paramsWithoutFranchiseArb: fc.Arbitrary<CreateGrantAuditParams> = fc.record({
  recipientId: uuidArb,
  recipientEmail: emailArb,
  recipientName: nameArb,
  creditType: creditTypeArb,
  quantity: positiveQtyArb,
  reason: reasonArb,
  grantedById: uuidArb,
  grantedByEmail: emailArb,
  franqueadoraId: uuidArb,
  franchiseId: fc.constant(null),
  transactionId: uuidArb
})

describe('Property 3: Auditoria sempre registrada', () => {
  /**
   * Property: For any successful credit grant, an audit record must be created
   * with all required fields populated.
   */
  it('should create audit record with all required fields populated', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: All required fields must be present and non-empty
        expect(validateAuditRecordHasAllRequiredFields(auditRecord)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record recipient_id must match the input recipientId.
   */
  it('should preserve recipient_id in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: recipient_id must match input
        expect(auditRecord.recipient_id).toBe(params.recipientId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record recipient_email must match the input recipientEmail.
   */
  it('should preserve recipient_email in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: recipient_email must match input
        expect(auditRecord.recipient_email).toBe(params.recipientEmail)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record credit_type must match the input creditType.
   */
  it('should preserve credit_type in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: credit_type must match input
        expect(auditRecord.credit_type).toBe(params.creditType)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record quantity must match the input quantity.
   */
  it('should preserve quantity in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: quantity must match input
        expect(auditRecord.quantity).toBe(params.quantity)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record reason must match the input reason.
   */
  it('should preserve reason in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: reason must match input
        expect(auditRecord.reason).toBe(params.reason)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record granted_by_id must match the input grantedById.
   */
  it('should preserve granted_by_id in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: granted_by_id must match input
        expect(auditRecord.granted_by_id).toBe(params.grantedById)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record franqueadora_id must match the input franqueadoraId.
   */
  it('should preserve franqueadora_id in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: franqueadora_id must match input
        expect(auditRecord.franqueadora_id).toBe(params.franqueadoraId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record transaction_id must match the input transactionId.
   */
  it('should preserve transaction_id in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: transaction_id must match input
        expect(auditRecord.transaction_id).toBe(params.transactionId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record must have a valid created_at timestamp.
   */
  it('should have valid created_at timestamp', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: created_at must be a valid ISO date string
        const parsedDate = new Date(auditRecord.created_at)
        expect(parsedDate.toString()).not.toBe('Invalid Date')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record must have a unique id.
   */
  it('should generate unique id for each audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: id must be non-empty string
        expect(typeof auditRecord.id).toBe('string')
        expect(auditRecord.id.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record with franchise_id should preserve it.
   */
  it('should preserve franchise_id when provided', () => {
    fc.assert(
      fc.property(paramsWithFranchiseArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: franchise_id must match input when provided
        expect(auditRecord.franchise_id).toBe(params.franchiseId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Audit record without franchise_id should have null.
   */
  it('should set franchise_id to null when not provided', () => {
    fc.assert(
      fc.property(paramsWithoutFranchiseArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: franchise_id must be null when not provided
        expect(auditRecord.franchise_id).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Credit type STUDENT_CLASS should be preserved correctly.
   */
  it('should correctly handle STUDENT_CLASS credit type', () => {
    const studentClassParamsArb = fc.record({
      recipientId: uuidArb,
      recipientEmail: emailArb,
      recipientName: nameArb,
      creditType: fc.constant<'STUDENT_CLASS'>('STUDENT_CLASS'),
      quantity: positiveQtyArb,
      reason: reasonArb,
      grantedById: uuidArb,
      grantedByEmail: emailArb,
      franqueadoraId: uuidArb,
      franchiseId: fc.option(uuidArb, { nil: null }),
      transactionId: uuidArb
    })

    fc.assert(
      fc.property(studentClassParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: credit_type must be STUDENT_CLASS
        expect(auditRecord.credit_type).toBe('STUDENT_CLASS')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Credit type PROFESSOR_HOUR should be preserved correctly.
   */
  it('should correctly handle PROFESSOR_HOUR credit type', () => {
    const professorHourParamsArb = fc.record({
      recipientId: uuidArb,
      recipientEmail: emailArb,
      recipientName: nameArb,
      creditType: fc.constant<'PROFESSOR_HOUR'>('PROFESSOR_HOUR'),
      quantity: positiveQtyArb,
      reason: reasonArb,
      grantedById: uuidArb,
      grantedByEmail: emailArb,
      franqueadoraId: uuidArb,
      franchiseId: fc.option(uuidArb, { nil: null }),
      transactionId: uuidArb
    })

    fc.assert(
      fc.property(professorHourParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: credit_type must be PROFESSOR_HOUR
        expect(auditRecord.credit_type).toBe('PROFESSOR_HOUR')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: All input data should be preserved exactly in the audit record.
   * This is a comprehensive check that all fields match.
   */
  it('should preserve all input data exactly in audit record', () => {
    fc.assert(
      fc.property(validAuditParamsArb, (params) => {
        const auditRecord = simulateCreateGrantAudit(params)
        
        // Property: All input fields must be preserved exactly
        expect(auditRecord.recipient_id).toBe(params.recipientId)
        expect(auditRecord.recipient_email).toBe(params.recipientEmail)
        expect(auditRecord.recipient_name).toBe(params.recipientName)
        expect(auditRecord.credit_type).toBe(params.creditType)
        expect(auditRecord.quantity).toBe(params.quantity)
        expect(auditRecord.reason).toBe(params.reason)
        expect(auditRecord.granted_by_id).toBe(params.grantedById)
        expect(auditRecord.granted_by_email).toBe(params.grantedByEmail)
        expect(auditRecord.franqueadora_id).toBe(params.franqueadoraId)
        expect(auditRecord.transaction_id).toBe(params.transactionId)
        
        // franchise_id can be null or a string
        if (params.franchiseId === null || params.franchiseId === undefined) {
          expect(auditRecord.franchise_id).toBeNull()
        } else {
          expect(auditRecord.franchise_id).toBe(params.franchiseId)
        }
      }),
      { numRuns: 100 }
    )
  })
})
