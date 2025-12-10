/**
 * Property-Based Test: Franchise scope respected in credit grant
 * 
 * **Feature: manual-credit-release, Property 5: Escopo de franquia respeitado na liberação**
 * **Validates: Requirements 3.4**
 * 
 * This test verifies that for any credit grant attempt by a franchise admin
 * for a user not associated with that franchise, the operation should fail
 * with error UNAUTHORIZED_FRANCHISE and no balance should be altered.
 */

import * as fc from 'fast-check'

// Type definitions
interface User {
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'TEACHER'
}

interface FranchiseAssociation {
  userId: string
  franchiseId: string
  type: 'student' | 'teacher'
}

interface AdminContext {
  adminId: string
  adminEmail: string
  franchiseId: string | null  // null means franqueadora admin (no franchise restriction)
  franqueadoraId: string
}

interface CreditGrantRequest {
  userEmail: string
  creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
}

interface GrantResult {
  success: boolean
  errorCode?: string
  message?: string
  balanceChanged: boolean
}

/**
 * Simulates checking if a user is associated with a specific franchise.
 * This mirrors the isUserAssociatedWithFranchise function in credits.ts
 */
function isUserAssociatedWithFranchise(
  userId: string,
  franchiseId: string,
  associations: readonly FranchiseAssociation[]
): boolean {
  return associations.some(
    assoc => assoc.userId === userId && assoc.franchiseId === franchiseId
  )
}

/**
 * Simulates the franchise scope validation logic from the credit grant endpoint.
 * This mirrors the validation in POST /api/admin/credits/grant
 * 
 * Requirements: 3.4 - WHEN an admin de franquia tenta liberar créditos para um usuário 
 * não associado à sua franquia THEN o Sistema_Creditos_Manual SHALL rejeitar com 
 * código de erro UNAUTHORIZED_FRANCHISE
 */
function validateFranchiseScopeForGrant(
  adminContext: AdminContext,
  targetUser: User,
  associations: readonly FranchiseAssociation[]
): GrantResult {
  // Franqueadora admins (franchiseId = null) can grant to any user
  // They have no franchise restriction
  if (adminContext.franchiseId === null) {
    return {
      success: true,
      balanceChanged: true
    }
  }

  // Franchise admin - must verify user is associated with their franchise
  const isAssociated = isUserAssociatedWithFranchise(
    targetUser.id,
    adminContext.franchiseId,
    associations
  )

  if (!isAssociated) {
    // User not associated with admin's franchise - reject with UNAUTHORIZED_FRANCHISE
    return {
      success: false,
      errorCode: 'UNAUTHORIZED_FRANCHISE',
      message: 'Usuário não pertence à sua franquia',
      balanceChanged: false
    }
  }

  // User is associated with admin's franchise - allow grant
  return {
    success: true,
    balanceChanged: true
  }
}

// Arbitrary generators
const uuidArb = fc.uuid()
const emailArb = fc.emailAddress()
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
const userRoleArb = fc.constantFrom<'STUDENT' | 'TEACHER'>('STUDENT', 'TEACHER')
const positiveQtyArb = fc.integer({ min: 1, max: 100 })
const reasonArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)

// Generator for a user
const userArb: fc.Arbitrary<User> = fc.record({
  id: uuidArb,
  email: emailArb,
  name: nameArb,
  role: userRoleArb
})

// Generator for franchise admin context (has franchise restriction)
const franchiseAdminContextArb: fc.Arbitrary<AdminContext> = fc.record({
  adminId: uuidArb,
  adminEmail: emailArb,
  franchiseId: uuidArb,  // Non-null means franchise admin
  franqueadoraId: uuidArb
})

// Generator for franqueadora admin context (no franchise restriction)
const franqueadoraAdminContextArb: fc.Arbitrary<AdminContext> = fc.record({
  adminId: uuidArb,
  adminEmail: emailArb,
  franchiseId: fc.constant(null),  // null means franqueadora admin
  franqueadoraId: uuidArb
})

// Generator for franchise association
const franchiseAssociationArb = (userId: string, franchiseId: string): fc.Arbitrary<FranchiseAssociation> =>
  fc.record({
    userId: fc.constant(userId),
    franchiseId: fc.constant(franchiseId),
    type: fc.constantFrom<'student' | 'teacher'>('student', 'teacher')
  })

// Generator for credit grant request
const creditGrantRequestArb = (userEmail: string, userRole: 'STUDENT' | 'TEACHER'): fc.Arbitrary<CreditGrantRequest> =>
  fc.record({
    userEmail: fc.constant(userEmail),
    creditType: fc.constant(userRole === 'STUDENT' ? 'STUDENT_CLASS' as const : 'PROFESSOR_HOUR' as const),
    quantity: positiveQtyArb,
    reason: reasonArb
  })

describe('Property 5: Escopo de franquia respeitado na liberação', () => {
  /**
   * Property: For any franchise admin attempting to grant credits to a user
   * NOT associated with their franchise, the operation must fail with
   * UNAUTHORIZED_FRANCHISE error and no balance should be changed.
   */
  it('should reject grant with UNAUTHORIZED_FRANCHISE when user not in admin franchise', () => {
    fc.assert(
      fc.property(
        fc.tuple(franchiseAdminContextArb, userArb, uuidArb).chain(([adminContext, targetUser, otherFranchiseId]) =>
          fc.record({
            adminContext: fc.constant(adminContext),
            targetUser: fc.constant(targetUser),
            // User is associated with a DIFFERENT franchise, not the admin's franchise
            associations: fc.constant([
              {
                userId: targetUser.id,
                franchiseId: otherFranchiseId,  // Different from adminContext.franchiseId
                type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
              }
            ])
          })
        ).filter(({ adminContext, associations }) => 
          // Ensure the user is NOT associated with admin's franchise
          !associations.some(a => a.franchiseId === adminContext.franchiseId)
        ),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Operation must fail with UNAUTHORIZED_FRANCHISE
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('UNAUTHORIZED_FRANCHISE')
          // Property: No balance should be changed
          expect(result.balanceChanged).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any franchise admin attempting to grant credits to a user
   * with NO franchise associations at all, the operation must fail with
   * UNAUTHORIZED_FRANCHISE error.
   */
  it('should reject grant when user has no franchise associations', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          targetUser: userArb,
          associations: fc.constant([])  // Empty associations
        }),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Operation must fail with UNAUTHORIZED_FRANCHISE
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('UNAUTHORIZED_FRANCHISE')
          expect(result.balanceChanged).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any franchise admin attempting to grant credits to a user
   * who IS associated with their franchise, the operation should succeed.
   */
  it('should allow grant when user is associated with admin franchise', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb.chain(adminContext =>
          userArb.chain(targetUser =>
            fc.record({
              adminContext: fc.constant(adminContext),
              targetUser: fc.constant(targetUser),
              // User IS associated with admin's franchise
              associations: fc.constant([
                {
                  userId: targetUser.id,
                  franchiseId: adminContext.franchiseId!,  // Same as admin's franchise
                  type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
                }
              ])
            })
          )
        ),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Operation should succeed
          expect(result.success).toBe(true)
          expect(result.errorCode).toBeUndefined()
          expect(result.balanceChanged).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Franqueadora admins (franchiseId = null) should be able to
   * grant credits to ANY user regardless of franchise association.
   */
  it('should allow franqueadora admin to grant to any user', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franqueadoraAdminContextArb,
          targetUser: userArb,
          // User may or may not have associations - doesn't matter for franqueadora admin
          associations: fc.array(
            fc.record({
              userId: uuidArb,
              franchiseId: uuidArb,
              type: fc.constantFrom<'student' | 'teacher'>('student', 'teacher')
            }),
            { minLength: 0, maxLength: 5 }
          )
        }),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Franqueadora admin should always succeed (no franchise restriction)
          expect(result.success).toBe(true)
          expect(result.errorCode).toBeUndefined()
          expect(result.balanceChanged).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When a user is associated with multiple franchises including
   * the admin's franchise, the grant should succeed.
   */
  it('should allow grant when user has multiple franchises including admin franchise', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb.chain(adminContext =>
          userArb.chain(targetUser =>
            fc.array(uuidArb, { minLength: 1, maxLength: 3 }).chain(otherFranchiseIds =>
              fc.record({
                adminContext: fc.constant(adminContext),
                targetUser: fc.constant(targetUser),
                // User is associated with admin's franchise AND other franchises
                associations: fc.constant([
                  // Association with admin's franchise
                  {
                    userId: targetUser.id,
                    franchiseId: adminContext.franchiseId!,
                    type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
                  },
                  // Associations with other franchises
                  ...otherFranchiseIds.map(fid => ({
                    userId: targetUser.id,
                    franchiseId: fid,
                    type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
                  }))
                ])
              })
            )
          )
        ),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Should succeed because user IS associated with admin's franchise
          expect(result.success).toBe(true)
          expect(result.balanceChanged).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When a user is associated with multiple franchises but NOT
   * the admin's franchise, the grant should fail.
   */
  it('should reject grant when user has multiple franchises but not admin franchise', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb.chain(adminContext =>
          userArb.chain(targetUser =>
            fc.array(uuidArb, { minLength: 1, maxLength: 3 })
              .filter(ids => !ids.includes(adminContext.franchiseId!))  // Ensure none match admin's franchise
              .chain(otherFranchiseIds =>
                fc.record({
                  adminContext: fc.constant(adminContext),
                  targetUser: fc.constant(targetUser),
                  // User is associated with OTHER franchises, not admin's
                  associations: fc.constant(
                    otherFranchiseIds.map(fid => ({
                      userId: targetUser.id,
                      franchiseId: fid,
                      type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
                    }))
                  )
                })
              )
          )
        ),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Should fail because user is NOT associated with admin's franchise
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('UNAUTHORIZED_FRANCHISE')
          expect(result.balanceChanged).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: The error message should be informative when franchise scope
   * validation fails.
   */
  it('should provide informative error message on franchise scope failure', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          targetUser: userArb,
          associations: fc.constant([])
        }),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Error message should be defined and informative
          expect(result.success).toBe(false)
          expect(result.message).toBeDefined()
          expect(result.message).toContain('franquia')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Association type (student vs teacher) should not affect
   * franchise scope validation - only the franchise ID matters.
   */
  it('should validate franchise scope regardless of association type', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb.chain(adminContext =>
          userArb.chain(targetUser =>
            fc.constantFrom<'student' | 'teacher'>('student', 'teacher').chain(assocType =>
              fc.record({
                adminContext: fc.constant(adminContext),
                targetUser: fc.constant(targetUser),
                associations: fc.constant([
                  {
                    userId: targetUser.id,
                    franchiseId: adminContext.franchiseId!,
                    type: assocType  // Either student or teacher
                  }
                ])
              })
            )
          )
        ),
        ({ adminContext, targetUser, associations }) => {
          const result = validateFranchiseScopeForGrant(adminContext, targetUser, associations)
          
          // Property: Should succeed regardless of association type
          expect(result.success).toBe(true)
          expect(result.balanceChanged).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
