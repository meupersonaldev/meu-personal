/**
 * Property-Based Test: Feature disabled rejects operation
 * 
 * **Feature: manual-credit-release, Property 10: Funcionalidade desabilitada rejeita operação**
 * **Validates: Requirements 2.4**
 * 
 * This test verifies that for any franchise with settings.manualCreditReleaseEnabled=false,
 * attempts to grant credits by a franchise admin should fail with error FEATURE_DISABLED.
 * Franqueadora admins should always have access regardless of franchise settings.
 */

import * as fc from 'fast-check'

// Type definitions
interface AcademySettings {
  requireApproval?: boolean
  allowSameTimeBookings?: boolean
  manualCreditReleaseEnabled?: boolean
}

interface Academy {
  id: string
  name: string
  settings: AcademySettings
}

interface AdminContext {
  adminId: string
  adminEmail: string
  canonicalRole: 'FRANCHISOR' | 'SUPER_ADMIN' | 'ADMIN' | 'FRANCHISE_ADMIN'
  franchiseId: string | null  // null for franqueadora admins
  franqueadoraId: string
}

interface FeatureCheckResult {
  allowed: boolean
  errorCode?: string
  message?: string
}

/**
 * Simulates the checkCreditReleaseEnabled middleware logic from credits.ts
 * 
 * Requirements: 2.4 - WHEN um admin de franquia com funcionalidade desabilitada 
 * tenta usar a API de liberação THEN o Sistema_Creditos_Manual SHALL rejeitar 
 * com código de erro FEATURE_DISABLED
 */
function checkCreditReleaseEnabled(
  adminContext: AdminContext,
  academy: Academy | null
): FeatureCheckResult {
  // Admins de franqueadora sempre têm acesso
  if (
    adminContext.canonicalRole === 'FRANCHISOR' ||
    adminContext.canonicalRole === 'SUPER_ADMIN' ||
    adminContext.canonicalRole === 'ADMIN'
  ) {
    return { allowed: true }
  }

  // Para admin de franquia, verificar se a funcionalidade está habilitada
  if (adminContext.canonicalRole === 'FRANCHISE_ADMIN') {
    // Se não encontrou a academia, rejeitar
    if (!academy) {
      return {
        allowed: false,
        errorCode: 'ACADEMY_NOT_FOUND',
        message: 'Academia não encontrada'
      }
    }

    const settings = academy.settings || {}
    if (!settings.manualCreditReleaseEnabled) {
      return {
        allowed: false,
        errorCode: 'FEATURE_DISABLED',
        message: 'Funcionalidade de liberação manual de créditos não está habilitada para esta franquia'
      }
    }
  }

  return { allowed: true }
}

// Arbitrary generators
const uuidArb = fc.uuid()
const emailArb = fc.emailAddress()
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generator for academy settings with feature DISABLED
const disabledSettingsArb: fc.Arbitrary<AcademySettings> = fc.record({
  requireApproval: fc.boolean(),
  allowSameTimeBookings: fc.boolean(),
  manualCreditReleaseEnabled: fc.constant(false)
})

// Generator for academy settings with feature ENABLED
const enabledSettingsArb: fc.Arbitrary<AcademySettings> = fc.record({
  requireApproval: fc.boolean(),
  allowSameTimeBookings: fc.boolean(),
  manualCreditReleaseEnabled: fc.constant(true)
})

// Generator for academy settings with feature UNDEFINED (defaults to disabled)
const undefinedSettingsArb: fc.Arbitrary<AcademySettings> = fc.oneof(
  fc.record({
    requireApproval: fc.boolean(),
    allowSameTimeBookings: fc.boolean()
    // manualCreditReleaseEnabled is intentionally omitted
  }),
  fc.constant({})  // Empty settings
)

// Generator for academy with disabled feature
const academyWithDisabledFeatureArb: fc.Arbitrary<Academy> = fc.record({
  id: uuidArb,
  name: nameArb,
  settings: disabledSettingsArb
})

// Generator for academy with enabled feature
const academyWithEnabledFeatureArb: fc.Arbitrary<Academy> = fc.record({
  id: uuidArb,
  name: nameArb,
  settings: enabledSettingsArb
})

// Generator for academy with undefined feature (should be treated as disabled)
const academyWithUndefinedFeatureArb: fc.Arbitrary<Academy> = fc.record({
  id: uuidArb,
  name: nameArb,
  settings: undefinedSettingsArb
})

// Generator for franchise admin context
const franchiseAdminContextArb: fc.Arbitrary<AdminContext> = fc.record({
  adminId: uuidArb,
  adminEmail: emailArb,
  canonicalRole: fc.constant('FRANCHISE_ADMIN' as const),
  franchiseId: uuidArb,
  franqueadoraId: uuidArb
})

// Generator for franqueadora admin context (various roles that bypass the check)
const franqueadoraAdminContextArb: fc.Arbitrary<AdminContext> = fc.record({
  adminId: uuidArb,
  adminEmail: emailArb,
  canonicalRole: fc.constantFrom<'FRANCHISOR' | 'SUPER_ADMIN' | 'ADMIN'>('FRANCHISOR', 'SUPER_ADMIN', 'ADMIN'),
  franchiseId: fc.constant(null),
  franqueadoraId: uuidArb
})

describe('Property 10: Funcionalidade desabilitada rejeita operação', () => {
  /**
   * Property: For any franchise admin with manualCreditReleaseEnabled=false,
   * the operation must fail with FEATURE_DISABLED error.
   */
  it('should reject with FEATURE_DISABLED when feature is explicitly disabled', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          academy: academyWithDisabledFeatureArb
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Operation must fail with FEATURE_DISABLED
          expect(result.allowed).toBe(false)
          expect(result.errorCode).toBe('FEATURE_DISABLED')
          expect(result.message).toBeDefined()
          expect(result.message).toContain('não está habilitada')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any franchise admin with manualCreditReleaseEnabled undefined
   * (not set), the operation should also fail with FEATURE_DISABLED.
   * The feature is disabled by default.
   */
  it('should reject with FEATURE_DISABLED when feature is undefined (default disabled)', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          academy: academyWithUndefinedFeatureArb
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Operation must fail with FEATURE_DISABLED (default is disabled)
          expect(result.allowed).toBe(false)
          expect(result.errorCode).toBe('FEATURE_DISABLED')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any franchise admin with manualCreditReleaseEnabled=true,
   * the operation should be allowed.
   */
  it('should allow operation when feature is enabled', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          academy: academyWithEnabledFeatureArb
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Operation should be allowed
          expect(result.allowed).toBe(true)
          expect(result.errorCode).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Franqueadora admins (FRANCHISOR, SUPER_ADMIN, ADMIN roles)
   * should always have access regardless of franchise settings.
   */
  it('should always allow franqueadora admins regardless of feature setting', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franqueadoraAdminContextArb,
          // Academy can have any settings - doesn't matter for franqueadora admin
          academy: fc.oneof(
            academyWithDisabledFeatureArb,
            academyWithEnabledFeatureArb,
            academyWithUndefinedFeatureArb,
            fc.constant(null)  // Even if academy is null
          )
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Franqueadora admin should always be allowed
          expect(result.allowed).toBe(true)
          expect(result.errorCode).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When academy is not found for a franchise admin,
   * the operation should fail with ACADEMY_NOT_FOUND.
   */
  it('should reject with ACADEMY_NOT_FOUND when academy is null for franchise admin', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          academy: fc.constant(null)
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Operation must fail with ACADEMY_NOT_FOUND
          expect(result.allowed).toBe(false)
          expect(result.errorCode).toBe('ACADEMY_NOT_FOUND')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The feature check should be consistent - same inputs
   * should always produce the same output.
   */
  it('should be deterministic for same inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: fc.oneof(franchiseAdminContextArb, franqueadoraAdminContextArb),
          academy: fc.oneof(
            academyWithDisabledFeatureArb,
            academyWithEnabledFeatureArb,
            fc.constant(null)
          )
        }),
        ({ adminContext, academy }) => {
          const result1 = checkCreditReleaseEnabled(adminContext, academy)
          const result2 = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Same inputs should produce same outputs
          expect(result1.allowed).toBe(result2.allowed)
          expect(result1.errorCode).toBe(result2.errorCode)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The error message should be informative when feature is disabled.
   */
  it('should provide informative error message when feature is disabled', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          academy: academyWithDisabledFeatureArb
        }),
        ({ adminContext, academy }) => {
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Error message should be defined and informative
          expect(result.allowed).toBe(false)
          expect(result.message).toBeDefined()
          expect(typeof result.message).toBe('string')
          expect(result.message!.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Other settings in the academy should not affect the feature check.
   * Only manualCreditReleaseEnabled matters.
   */
  it('should only check manualCreditReleaseEnabled, ignoring other settings', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb,
        fc.boolean(),  // requireApproval
        fc.boolean(),  // allowSameTimeBookings
        fc.boolean(),  // manualCreditReleaseEnabled
        (adminContext, requireApproval, allowSameTimeBookings, manualCreditReleaseEnabled) => {
          const academy: Academy = {
            id: adminContext.franchiseId!,
            name: 'Test Academy',
            settings: {
              requireApproval,
              allowSameTimeBookings,
              manualCreditReleaseEnabled
            }
          }
          
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: Result should only depend on manualCreditReleaseEnabled
          if (manualCreditReleaseEnabled) {
            expect(result.allowed).toBe(true)
          } else {
            expect(result.allowed).toBe(false)
            expect(result.errorCode).toBe('FEATURE_DISABLED')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: All franqueadora role types should bypass the feature check.
   */
  it('should bypass feature check for all franqueadora role types', () => {
    const franqueadoraRoles: Array<'FRANCHISOR' | 'SUPER_ADMIN' | 'ADMIN'> = ['FRANCHISOR', 'SUPER_ADMIN', 'ADMIN']
    
    fc.assert(
      fc.property(
        fc.constantFrom(...franqueadoraRoles),
        uuidArb,
        emailArb,
        uuidArb,
        academyWithDisabledFeatureArb,
        (role, adminId, adminEmail, franqueadoraId, academy) => {
          const adminContext: AdminContext = {
            adminId,
            adminEmail,
            canonicalRole: role,
            franchiseId: null,
            franqueadoraId
          }
          
          const result = checkCreditReleaseEnabled(adminContext, academy)
          
          // Property: All franqueadora roles should be allowed
          expect(result.allowed).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
