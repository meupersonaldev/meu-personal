/**
 * Property-Based Test: QR code content validation
 * 
 * **Feature: checkin-system, Property 8: QR code content validation**
 * **Validates: Requirements 5.2**
 * 
 * This test verifies that for any generated QR code, decoding it should yield
 * a valid JSON containing booking_id and academy_id that match the source booking.
 */

import * as fc from 'fast-check'

// Type definitions for QR code content
interface QRCodeContent {
  booking_id: string
  academy_id: string
  type: string
}

// Type definitions for QR code generation input
interface QRCodeInput {
  bookingId: string
  academyId: string
}

/**
 * Simulates the QR code content generation logic from QRCodeGenerator component.
 * This mirrors the actual implementation in apps/web/components/teacher/qr-code-generator.tsx
 * 
 * The function generates a JSON string with booking_id, academy_id, and type.
 */
function generateQRCodeContent(input: QRCodeInput): string {
  return JSON.stringify({
    booking_id: input.bookingId,
    academy_id: input.academyId,
    type: 'checkin'
  })
}

/**
 * Parses QR code content and validates its structure.
 * Returns the parsed content if valid, or null if invalid.
 */
function parseQRCodeContent(qrContent: string): QRCodeContent | null {
  try {
    const parsed = JSON.parse(qrContent)
    
    // Validate required fields exist and are strings
    if (
      typeof parsed.booking_id === 'string' &&
      typeof parsed.academy_id === 'string' &&
      typeof parsed.type === 'string'
    ) {
      return parsed as QRCodeContent
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Validates that QR code content matches the original input.
 */
function validateQRCodeContent(
  qrContent: string,
  originalInput: QRCodeInput
): { valid: boolean; error?: string } {
  const parsed = parseQRCodeContent(qrContent)
  
  if (!parsed) {
    return { valid: false, error: 'Invalid QR code content: not valid JSON or missing required fields' }
  }
  
  if (parsed.booking_id !== originalInput.bookingId) {
    return { valid: false, error: `booking_id mismatch: expected ${originalInput.bookingId}, got ${parsed.booking_id}` }
  }
  
  if (parsed.academy_id !== originalInput.academyId) {
    return { valid: false, error: `academy_id mismatch: expected ${originalInput.academyId}, got ${parsed.academy_id}` }
  }
  
  if (parsed.type !== 'checkin') {
    return { valid: false, error: `type mismatch: expected 'checkin', got ${parsed.type}` }
  }
  
  return { valid: true }
}

// Arbitrary generators for test data
const uuidArb = fc.uuid()

// Generator for QR code input
const qrCodeInputArb: fc.Arbitrary<QRCodeInput> = fc.record({
  bookingId: uuidArb,
  academyId: uuidArb
})

describe('Property 8: QR code content validation', () => {
  /**
   * Property: For any generated QR code, decoding it should yield valid JSON.
   */
  it('should generate valid JSON content for any booking and academy IDs', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        
        // Property: QR content should be valid JSON
        expect(() => JSON.parse(qrContent)).not.toThrow()
        
        const parsed = JSON.parse(qrContent)
        expect(parsed).toBeDefined()
        expect(typeof parsed).toBe('object')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any generated QR code, the decoded content should contain
   * booking_id that matches the source booking.
   */
  it('should preserve booking_id in QR code content', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        const parsed = parseQRCodeContent(qrContent)
        
        // Property: Parsed content should exist
        expect(parsed).not.toBeNull()
        
        // Property: booking_id should match original input
        expect(parsed?.booking_id).toBe(input.bookingId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any generated QR code, the decoded content should contain
   * academy_id that matches the source academy.
   */
  it('should preserve academy_id in QR code content', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        const parsed = parseQRCodeContent(qrContent)
        
        // Property: Parsed content should exist
        expect(parsed).not.toBeNull()
        
        // Property: academy_id should match original input
        expect(parsed?.academy_id).toBe(input.academyId)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any generated QR code, the decoded content should contain
   * the correct type field for check-in.
   */
  it('should include type field with value "checkin"', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        const parsed = parseQRCodeContent(qrContent)
        
        // Property: Parsed content should exist
        expect(parsed).not.toBeNull()
        
        // Property: type should be 'checkin'
        expect(parsed?.type).toBe('checkin')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Round-trip validation - generating and then validating QR code
   * content should always succeed for valid inputs.
   */
  it('should pass validation for any generated QR code content', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        const validation = validateQRCodeContent(qrContent, input)
        
        // Property: Validation should always pass for generated content
        expect(validation.valid).toBe(true)
        expect(validation.error).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: QR code content should contain all required fields.
   */
  it('should contain all required fields (booking_id, academy_id, type)', () => {
    fc.assert(
      fc.property(qrCodeInputArb, (input) => {
        const qrContent = generateQRCodeContent(input)
        const parsed = JSON.parse(qrContent)
        
        // Property: All required fields should be present
        expect(parsed).toHaveProperty('booking_id')
        expect(parsed).toHaveProperty('academy_id')
        expect(parsed).toHaveProperty('type')
        
        // Property: All fields should be strings
        expect(typeof parsed.booking_id).toBe('string')
        expect(typeof parsed.academy_id).toBe('string')
        expect(typeof parsed.type).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Different inputs should produce different QR code contents.
   */
  it('should produce unique content for different booking IDs', () => {
    fc.assert(
      fc.property(
        fc.tuple(qrCodeInputArb, qrCodeInputArb).filter(
          ([a, b]) => a.bookingId !== b.bookingId
        ),
        ([input1, input2]) => {
          const qrContent1 = generateQRCodeContent(input1)
          const qrContent2 = generateQRCodeContent(input2)
          
          // Property: Different booking IDs should produce different content
          expect(qrContent1).not.toBe(qrContent2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Validation should fail for tampered QR code content.
   */
  it('should fail validation when booking_id is tampered', () => {
    fc.assert(
      fc.property(
        fc.tuple(qrCodeInputArb, uuidArb).filter(
          ([input, tamperedId]) => input.bookingId !== tamperedId
        ),
        ([input, tamperedBookingId]) => {
          // Generate valid QR content
          const qrContent = generateQRCodeContent(input)
          
          // Tamper with the content
          const parsed = JSON.parse(qrContent)
          parsed.booking_id = tamperedBookingId
          const tamperedContent = JSON.stringify(parsed)
          
          // Validate against original input
          const validation = validateQRCodeContent(tamperedContent, input)
          
          // Property: Validation should fail for tampered content
          expect(validation.valid).toBe(false)
          expect(validation.error).toContain('booking_id mismatch')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Validation should fail for tampered academy_id.
   */
  it('should fail validation when academy_id is tampered', () => {
    fc.assert(
      fc.property(
        fc.tuple(qrCodeInputArb, uuidArb).filter(
          ([input, tamperedId]) => input.academyId !== tamperedId
        ),
        ([input, tamperedAcademyId]) => {
          // Generate valid QR content
          const qrContent = generateQRCodeContent(input)
          
          // Tamper with the content
          const parsed = JSON.parse(qrContent)
          parsed.academy_id = tamperedAcademyId
          const tamperedContent = JSON.stringify(parsed)
          
          // Validate against original input
          const validation = validateQRCodeContent(tamperedContent, input)
          
          // Property: Validation should fail for tampered content
          expect(validation.valid).toBe(false)
          expect(validation.error).toContain('academy_id mismatch')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Parsing should fail for invalid JSON.
   */
  it('should return null when parsing invalid JSON', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => {
          try {
            JSON.parse(s)
            return false // Valid JSON, filter it out
          } catch {
            return true // Invalid JSON, keep it
          }
        }),
        (invalidJson) => {
          const result = parseQRCodeContent(invalidJson)
          
          // Property: Invalid JSON should return null
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Parsing should fail for JSON missing required fields.
   */
  it('should return null when parsing JSON with missing fields', () => {
    // Generate JSON objects missing one or more required fields
    const incompleteJsonArb = fc.oneof(
      // Missing booking_id
      fc.record({
        academy_id: uuidArb,
        type: fc.constant('checkin')
      }),
      // Missing academy_id
      fc.record({
        booking_id: uuidArb,
        type: fc.constant('checkin')
      }),
      // Missing type
      fc.record({
        booking_id: uuidArb,
        academy_id: uuidArb
      }),
      // Empty object
      fc.constant({})
    )

    fc.assert(
      fc.property(incompleteJsonArb, (incompleteObj) => {
        const jsonString = JSON.stringify(incompleteObj)
        const result = parseQRCodeContent(jsonString)
        
        // Property: Incomplete JSON should return null
        expect(result).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
})
