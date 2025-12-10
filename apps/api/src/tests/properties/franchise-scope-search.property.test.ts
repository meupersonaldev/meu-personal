/**
 * Property-Based Test: Franchise scope respected in user search
 * 
 * **Feature: manual-credit-release, Property 4: Escopo de franquia respeitado na busca**
 * **Validates: Requirements 3.2**
 * 
 * This test verifies that for any search performed by a franchise admin,
 * all returned users must be associated with that specific franchise
 * through academy_students or academy_teachers.
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

interface SearchResult {
  user: User | null
  studentBalance: any | null
  professorBalance: any | null
  franchises: Array<{ id: string; name: string }>
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
 * Simulates the search-user endpoint logic for franchise scope validation.
 * This mirrors the validation in GET /api/admin/credits/search-user
 * 
 * Requirements: 3.2 - WHEN um admin de franquia busca usuários THEN o 
 * Sistema_Creditos_Manual SHALL retornar apenas usuários associados 
 * àquela franquia específica
 */
function searchUserWithFranchiseScope(
  adminContext: AdminContext,
  targetUser: User | null,
  associations: readonly FranchiseAssociation[]
): SearchResult {
  // If user not found, return empty result
  if (!targetUser) {
    return {
      user: null,
      studentBalance: null,
      professorBalance: null,
      franchises: []
    }
  }

  // Franqueadora admins (franchiseId = null) can see all users
  // They have no franchise restriction (Requirements: 3.1)
  if (adminContext.franchiseId === null) {
    const userFranchises = associations
      .filter(a => a.userId === targetUser.id)
      .map(a => ({ id: a.franchiseId, name: `Franchise ${a.franchiseId.slice(0, 8)}` }))
    
    return {
      user: targetUser,
      studentBalance: targetUser.role === 'STUDENT' ? { available: 10 } : null,
      professorBalance: targetUser.role === 'TEACHER' ? { available_hours: 5 } : null,
      franchises: userFranchises
    }
  }

  // Franchise admin - must verify user is associated with their franchise
  const isAssociated = isUserAssociatedWithFranchise(
    targetUser.id,
    adminContext.franchiseId,
    associations
  )

  if (!isAssociated) {
    // User not associated with admin's franchise - return empty result
    // This is the key behavior: franchise admin cannot see users outside their franchise
    return {
      user: null,
      studentBalance: null,
      professorBalance: null,
      franchises: []
    }
  }

  // User is associated with admin's franchise - return user data
  const userFranchises = associations
    .filter(a => a.userId === targetUser.id)
    .map(a => ({ id: a.franchiseId, name: `Franchise ${a.franchiseId.slice(0, 8)}` }))

  return {
    user: targetUser,
    studentBalance: targetUser.role === 'STUDENT' ? { available: 10 } : null,
    professorBalance: targetUser.role === 'TEACHER' ? { available_hours: 5 } : null,
    franchises: userFranchises
  }
}

// Arbitrary generators
const uuidArb = fc.uuid()
const emailArb = fc.emailAddress()
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
const userRoleArb = fc.constantFrom<'STUDENT' | 'TEACHER'>('STUDENT', 'TEACHER')

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

describe('Property 4: Escopo de franquia respeitado na busca', () => {
  /**
   * Property: For any search by a franchise admin for a user NOT associated
   * with their franchise, the result should be empty (user: null).
   */
  it('should return empty result when user not in admin franchise', () => {
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Result should be empty (user not visible to this admin)
          expect(result.user).toBeNull()
          expect(result.studentBalance).toBeNull()
          expect(result.professorBalance).toBeNull()
          expect(result.franchises).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any search by a franchise admin for a user with NO
   * franchise associations, the result should be empty.
   */
  it('should return empty result when user has no franchise associations', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: franchiseAdminContextArb,
          targetUser: userArb,
          associations: fc.constant([])  // Empty associations
        }),
        ({ adminContext, targetUser, associations }) => {
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Result should be empty
          expect(result.user).toBeNull()
          expect(result.studentBalance).toBeNull()
          expect(result.professorBalance).toBeNull()
          expect(result.franchises).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any search by a franchise admin for a user who IS
   * associated with their franchise, the result should contain the user.
   */
  it('should return user when associated with admin franchise', () => {
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: User should be returned
          expect(result.user).not.toBeNull()
          expect(result.user?.id).toBe(targetUser.id)
          expect(result.user?.email).toBe(targetUser.email)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Franqueadora admins (franchiseId = null) should be able to
   * search and find ANY user regardless of franchise association.
   */
  it('should allow franqueadora admin to find any user', () => {
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Franqueadora admin should always see the user
          expect(result.user).not.toBeNull()
          expect(result.user?.id).toBe(targetUser.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When a user is associated with multiple franchises including
   * the admin's franchise, the search should return the user.
   */
  it('should return user when associated with multiple franchises including admin franchise', () => {
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: User should be returned
          expect(result.user).not.toBeNull()
          expect(result.user?.id).toBe(targetUser.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When a user is associated with multiple franchises but NOT
   * the admin's franchise, the search should return empty.
   */
  it('should return empty when user has multiple franchises but not admin franchise', () => {
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Result should be empty
          expect(result.user).toBeNull()
          expect(result.franchises).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When user is not found (null), the result should always be empty
   * regardless of admin type.
   */
  it('should return empty result when user not found', () => {
    fc.assert(
      fc.property(
        fc.record({
          adminContext: fc.oneof(franchiseAdminContextArb, franqueadoraAdminContextArb),
          targetUser: fc.constant(null),
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Result should be empty when user not found
          expect(result.user).toBeNull()
          expect(result.studentBalance).toBeNull()
          expect(result.professorBalance).toBeNull()
          expect(result.franchises).toEqual([])
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Should return user regardless of association type
          expect(result.user).not.toBeNull()
          expect(result.user?.id).toBe(targetUser.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When franchise admin searches, returned franchises list should
   * only contain franchises the user is actually associated with.
   */
  it('should return correct franchises list for found user', () => {
    fc.assert(
      fc.property(
        franchiseAdminContextArb.chain(adminContext =>
          userArb.chain(targetUser =>
            fc.array(uuidArb, { minLength: 0, maxLength: 2 }).chain(additionalFranchiseIds =>
              fc.record({
                adminContext: fc.constant(adminContext),
                targetUser: fc.constant(targetUser),
                // User is associated with admin's franchise and possibly others
                associations: fc.constant([
                  {
                    userId: targetUser.id,
                    franchiseId: adminContext.franchiseId!,
                    type: targetUser.role === 'STUDENT' ? 'student' as const : 'teacher' as const
                  },
                  ...additionalFranchiseIds.map(fid => ({
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
          const result = searchUserWithFranchiseScope(adminContext, targetUser, associations)
          
          // Property: Franchises list should match user's associations
          expect(result.user).not.toBeNull()
          const expectedFranchiseIds = associations
            .filter(a => a.userId === targetUser.id)
            .map(a => a.franchiseId)
          const returnedFranchiseIds = result.franchises.map(f => f.id)
          
          expect(returnedFranchiseIds.sort()).toEqual(expectedFranchiseIds.sort())
        }
      ),
      { numRuns: 100 }
    )
  })
})
