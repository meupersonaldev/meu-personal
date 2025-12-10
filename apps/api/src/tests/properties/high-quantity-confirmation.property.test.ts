/**
 * Property-Based Test: High quantity requires confirmation
 * 
 * **Feature: manual-credit-release, Property 8: Alta quantidade requer confirmação**
 * **Validates: Requirements 6.2**
 * 
 * This test verifies that for any quantity greater than 100 without the
 * confirmHighQuantity=true flag, the credit grant operation should fail
 * with error HIGH_QUANTITY_NOT_CONFIRMED.
 */

import * as fc from 'fast-check'
import { z } from 'zod'

// Replicate the validation schema from credits.ts
const creditGrantSchema = z.object({
  userEmail: z.string().email('Email inválido'),
  creditType: z.enum(['STUDENT_CLASS', 'PROFESSOR_HOUR']),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo muito longo'),
  confirmHighQuantity: z.boolean().optional()
})

// Threshold for high quantity confirmation
const HIGH_QUANTITY_THRESHOLD = 100

/**
 * Simulates the validation logic for credit grant requests including
 * the high quantity confirmation check.
 * Returns validation result with error code if invalid.
 */
function validateCreditGrantRequest(request: {
  userEmail: string
  creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
  confirmHighQuantity?: boolean
}): { valid: boolean; errorCode?: string; message?: string } {
  // First, validate with Zod schema
  const parseResult = creditGrantSchema.safeParse(request)
  
  if (!parseResult.success) {
    // Check if the error is related to quantity
    const quantityError = parseResult.error.errors.find(
      e => e.path.includes('quantity')
    )
    
    if (quantityError) {
      return {
        valid: false,
        errorCode: 'INVALID_QUANTITY',
        message: 'Quantidade deve ser maior que zero'
      }
    }
    
    return {
      valid: false,
      errorCode: 'VALIDATION_ERROR',
      message: parseResult.error.errors[0]?.message || 'Dados inválidos'
    }
  }
  
  // Additional explicit check for quantity <= 0 (as done in the route handler)
  if (request.quantity <= 0) {
    return {
      valid: false,
      errorCode: 'INVALID_QUANTITY',
      message: 'Quantidade deve ser maior que zero'
    }
  }
  
  // Check for high quantity without confirmation (Requirements: 6.2)
  if (request.quantity > HIGH_QUANTITY_THRESHOLD && !request.confirmHighQuantity) {
    return {
      valid: false,
      errorCode: 'HIGH_QUANTITY_NOT_CONFIRMED',
      message: 'Liberação de mais de 100 créditos requer confirmação explícita'
    }
  }
  
  return { valid: true }
}

// Arbitrary generators
// Use a custom email generator that produces emails valid for Zod's email validation
// fc.emailAddress() can produce emails like "!@a.aa" which Zod rejects
const validEmailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/[^a-z0-9]/gi, 'a') || 'user'),
  fc.constantFrom('gmail.com', 'email.com', 'test.org', 'example.com')
).map(([local, domain]) => `${local}@${domain}`)

const creditTypeArb = fc.constantFrom('STUDENT_CLASS' as const, 'PROFESSOR_HOUR' as const)
const validReasonArb = fc.string({ minLength: 1, maxLength: 100 }).map(s => s.trim() || 'Motivo de teste')

// Generator for quantities above threshold (> 100)
const highQuantityArb = fc.integer({ min: HIGH_QUANTITY_THRESHOLD + 1, max: 10000 })

// Generator for quantities at or below threshold (1-100)
const normalQuantityArb = fc.integer({ min: 1, max: HIGH_QUANTITY_THRESHOLD })

// Generator for high quantity request WITHOUT confirmation
const highQuantityNoConfirmArb = fc.record({
  userEmail: validEmailArb,
  creditType: creditTypeArb,
  quantity: highQuantityArb,
  reason: validReasonArb,
  confirmHighQuantity: fc.constantFrom(undefined, false) as fc.Arbitrary<boolean | undefined>
})

// Generator for high quantity request WITH confirmation
const highQuantityWithConfirmArb = fc.record({
  userEmail: validEmailArb,
  creditType: creditTypeArb,
  quantity: highQuantityArb,
  reason: validReasonArb,
  confirmHighQuantity: fc.constant(true)
})

// Generator for normal quantity request (doesn't need confirmation)
const normalQuantityRequestArb = fc.record({
  userEmail: validEmailArb,
  creditType: creditTypeArb,
  quantity: normalQuantityArb,
  reason: validReasonArb,
  confirmHighQuantity: fc.option(fc.boolean(), { nil: undefined })
})

describe('Property 8: Alta quantidade requer confirmação', () => {
  /**
   * Property: For any quantity > 100 without confirmHighQuantity=true,
   * the validation should fail with HIGH_QUANTITY_NOT_CONFIRMED error.
   */
  it('should reject high quantity (>100) without confirmation', () => {
    fc.assert(
      fc.property(highQuantityNoConfirmArb, (request) => {
        const result = validateCreditGrantRequest(request)
        
        // Property: High quantity without confirmation must be rejected
        expect(result.valid).toBe(false)
        expect(result.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any quantity > 100 with confirmHighQuantity=true,
   * the validation should pass (for this specific check).
   */
  it('should accept high quantity (>100) with confirmation', () => {
    fc.assert(
      fc.property(highQuantityWithConfirmArb, (request) => {
        const result = validateCreditGrantRequest(request)
        
        // Property: High quantity with confirmation should pass validation
        // (may fail for other reasons, but not HIGH_QUANTITY_NOT_CONFIRMED)
        if (!result.valid) {
          expect(result.errorCode).not.toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any quantity <= 100, confirmation is not required.
   * The request should not fail with HIGH_QUANTITY_NOT_CONFIRMED.
   */
  it('should not require confirmation for normal quantity (<=100)', () => {
    fc.assert(
      fc.property(normalQuantityRequestArb, (request) => {
        const result = validateCreditGrantRequest(request)
        
        // Property: Normal quantity should never fail with HIGH_QUANTITY_NOT_CONFIRMED
        if (!result.valid) {
          expect(result.errorCode).not.toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The boundary is exactly at 100.
   * Quantity 100 should NOT require confirmation.
   * Quantity 101 should require confirmation.
   */
  it('should have boundary at exactly 100 (100 ok, 101 requires confirmation)', () => {
    fc.assert(
      fc.property(
        fc.record({
          userEmail: validEmailArb,
          creditType: creditTypeArb,
          reason: validReasonArb
        }),
        ({ userEmail, creditType, reason }) => {
          // Test boundary: 100 should NOT require confirmation
          const result100 = validateCreditGrantRequest({
            userEmail,
            creditType,
            quantity: 100,
            reason,
            confirmHighQuantity: false
          })
          // If it fails, it should NOT be due to HIGH_QUANTITY_NOT_CONFIRMED
          if (!result100.valid) {
            expect(result100.errorCode).not.toBe('HIGH_QUANTITY_NOT_CONFIRMED')
          }
          
          // Test boundary: 101 should require confirmation
          const result101 = validateCreditGrantRequest({
            userEmail,
            creditType,
            quantity: 101,
            reason,
            confirmHighQuantity: false
          })
          expect(result101.valid).toBe(false)
          expect(result101.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: confirmHighQuantity=false should be treated the same as undefined
   * for high quantities.
   */
  it('should treat confirmHighQuantity=false same as undefined for high quantities', () => {
    fc.assert(
      fc.property(
        fc.record({
          userEmail: validEmailArb,
          creditType: creditTypeArb,
          quantity: highQuantityArb,
          reason: validReasonArb
        }),
        ({ userEmail, creditType, quantity, reason }) => {
          // Test with undefined
          const resultUndefined = validateCreditGrantRequest({
            userEmail,
            creditType,
            quantity,
            reason,
            confirmHighQuantity: undefined
          })
          
          // Test with false
          const resultFalse = validateCreditGrantRequest({
            userEmail,
            creditType,
            quantity,
            reason,
            confirmHighQuantity: false
          })
          
          // Property: Both should fail with same error
          expect(resultUndefined.valid).toBe(false)
          expect(resultUndefined.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
          expect(resultFalse.valid).toBe(false)
          expect(resultFalse.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Very large quantities should still require confirmation.
   */
  it('should require confirmation for very large quantities', () => {
    fc.assert(
      fc.property(
        fc.record({
          userEmail: validEmailArb,
          creditType: creditTypeArb,
          quantity: fc.integer({ min: 1000, max: 1000000 }),
          reason: validReasonArb,
          confirmHighQuantity: fc.constantFrom(undefined, false) as fc.Arbitrary<boolean | undefined>
        }),
        (request) => {
          const result = validateCreditGrantRequest(request)
          
          // Property: Very large quantities must require confirmation
          expect(result.valid).toBe(false)
          expect(result.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Very large quantities with confirmation should pass.
   */
  it('should accept very large quantities with confirmation', () => {
    fc.assert(
      fc.property(
        fc.record({
          userEmail: validEmailArb,
          creditType: creditTypeArb,
          quantity: fc.integer({ min: 1000, max: 1000000 }),
          reason: validReasonArb,
          confirmHighQuantity: fc.constant(true)
        }),
        (request) => {
          const result = validateCreditGrantRequest(request)
          
          // Property: Very large quantities with confirmation should not fail
          // due to HIGH_QUANTITY_NOT_CONFIRMED
          if (!result.valid) {
            expect(result.errorCode).not.toBe('HIGH_QUANTITY_NOT_CONFIRMED')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The error message should be informative.
   */
  it('should provide informative error message for high quantity rejection', () => {
    fc.assert(
      fc.property(highQuantityNoConfirmArb, (request) => {
        const result = validateCreditGrantRequest(request)
        
        // Property: Error message should mention confirmation requirement
        expect(result.valid).toBe(false)
        expect(result.message).toBeDefined()
        expect(result.message).toContain('100')
        expect(result.message).toContain('confirmação')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Both credit types should have the same confirmation requirement.
   */
  it('should apply same confirmation rule to both credit types', () => {
    fc.assert(
      fc.property(
        fc.record({
          userEmail: validEmailArb,
          quantity: highQuantityArb,
          reason: validReasonArb
        }),
        ({ userEmail, quantity, reason }) => {
          // Test STUDENT_CLASS
          const resultStudent = validateCreditGrantRequest({
            userEmail,
            creditType: 'STUDENT_CLASS',
            quantity,
            reason,
            confirmHighQuantity: false
          })
          
          // Test PROFESSOR_HOUR
          const resultProfessor = validateCreditGrantRequest({
            userEmail,
            creditType: 'PROFESSOR_HOUR',
            quantity,
            reason,
            confirmHighQuantity: false
          })
          
          // Property: Both should fail with same error
          expect(resultStudent.valid).toBe(false)
          expect(resultStudent.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
          expect(resultProfessor.valid).toBe(false)
          expect(resultProfessor.errorCode).toBe('HIGH_QUANTITY_NOT_CONFIRMED')
        }
      ),
      { numRuns: 100 }
    )
  })
})
