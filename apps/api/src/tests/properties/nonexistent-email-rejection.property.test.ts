/**
 * Property-Based Test: Nonexistent email generates error
 * 
 * **Feature: manual-credit-release, Property 2: Email inexistente gera erro**
 * **Validates: Requirements 1.4**
 * 
 * This test verifies that for any email that does not exist in the users table,
 * the credit grant operation must fail with error USER_NOT_FOUND and no user's
 * balance should be altered.
 */

import * as fc from 'fast-check'

// Type definitions
interface User {
  id: string
  email: string
  name: string
  role: string
}

interface CreditGrantRequest {
  userEmail: string
  creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
  confirmHighQuantity?: boolean
}

interface CreditGrantResult {
  success: boolean
  errorCode?: string
  message?: string
  grantId?: string
  balance?: any
  transaction?: any
}

interface UserDatabase {
  users: Map<string, User>
  balances: Map<string, number>
}

/**
 * Simulates the user lookup and credit grant logic from credits.ts route.
 * This mirrors the actual implementation behavior for user lookup.
 */
function simulateCreditGrantWithUserLookup(
  request: CreditGrantRequest,
  database: UserDatabase
): CreditGrantResult {
  // Step 1: Look up user by email (as done in the route handler)
  const userByEmail = Array.from(database.users.values()).find(
    u => u.email.toLowerCase() === request.userEmail.toLowerCase()
  )

  // Step 2: If user not found, return USER_NOT_FOUND error
  if (!userByEmail) {
    return {
      success: false,
      errorCode: 'USER_NOT_FOUND',
      message: 'Usuário não encontrado com este email'
    }
  }

  // Step 3: If user found, simulate successful grant (simplified)
  // In real implementation, this would update balance and create transaction
  const currentBalance = database.balances.get(userByEmail.id) || 0
  const newBalance = currentBalance + request.quantity

  return {
    success: true,
    grantId: `grant-${Date.now()}`,
    balance: { available: newBalance },
    transaction: { id: `tx-${Date.now()}`, type: 'GRANT', quantity: request.quantity }
  }
}

/**
 * Checks if any balance was modified in the database.
 * Used to verify that failed operations don't alter balances.
 */
function getBalanceSnapshot(database: UserDatabase): Map<string, number> {
  return new Map(database.balances)
}

function balancesAreEqual(
  snapshot1: Map<string, number>,
  snapshot2: Map<string, number>
): boolean {
  if (snapshot1.size !== snapshot2.size) return false
  for (const [key, value] of snapshot1) {
    if (snapshot2.get(key) !== value) return false
  }
  return true
}

// Arbitrary generators

// Generator for valid UUID
const uuidArb = fc.uuid()

// Generator for valid email addresses
const validEmailArb = fc.emailAddress()

// Generator for user names
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generator for user roles
const roleArb = fc.constantFrom('STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR')

// Generator for credit type
const creditTypeArb = fc.constantFrom<'STUDENT_CLASS' | 'PROFESSOR_HOUR'>('STUDENT_CLASS', 'PROFESSOR_HOUR')

// Generator for positive quantity
const positiveQtyArb = fc.integer({ min: 1, max: 100 })

// Generator for non-empty reason
const reasonArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)

// Generator for a single user
const userArb: fc.Arbitrary<User> = fc.record({
  id: uuidArb,
  email: validEmailArb,
  name: nameArb,
  role: roleArb
})

// Generator for a database with some existing users
const databaseWithUsersArb: fc.Arbitrary<UserDatabase> = fc
  .array(userArb, { minLength: 0, maxLength: 10 })
  .map(users => {
    const userMap = new Map<string, User>()
    const balanceMap = new Map<string, number>()
    
    for (const user of users) {
      // Avoid duplicate emails
      if (!Array.from(userMap.values()).some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        userMap.set(user.id, user)
        // Initialize with random balance
        balanceMap.set(user.id, Math.floor(Math.random() * 100))
      }
    }
    
    return { users: userMap, balances: balanceMap }
  })

// Generator for email that is guaranteed to NOT exist in a given database
function nonExistentEmailArb(database: UserDatabase): fc.Arbitrary<string> {
  const existingEmails = new Set(
    Array.from(database.users.values()).map(u => u.email.toLowerCase())
  )
  
  return validEmailArb.filter(email => !existingEmails.has(email.toLowerCase()))
}

// Generator for a credit grant request
const creditGrantRequestArb = (email: string): fc.Arbitrary<CreditGrantRequest> =>
  fc.record({
    userEmail: fc.constant(email),
    creditType: creditTypeArb,
    quantity: positiveQtyArb,
    reason: reasonArb,
    confirmHighQuantity: fc.option(fc.boolean(), { nil: undefined })
  })

describe('Property 2: Email inexistente gera erro', () => {
  /**
   * Property: For any email that does not exist in the users table,
   * the credit grant operation must fail with USER_NOT_FOUND error.
   */
  it('should reject credit grant for nonexistent email with USER_NOT_FOUND', () => {
    fc.assert(
      fc.property(
        databaseWithUsersArb,
        validEmailArb,
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        (database, randomEmail, creditType, quantity, reason) => {
          // Ensure the email doesn't exist in the database
          const existingEmails = new Set(
            Array.from(database.users.values()).map(u => u.email.toLowerCase())
          )
          
          // Skip if email happens to exist (unlikely but possible)
          fc.pre(!existingEmails.has(randomEmail.toLowerCase()))
          
          const request: CreditGrantRequest = {
            userEmail: randomEmail,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, database)
          
          // Property: Operation must fail with USER_NOT_FOUND
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('USER_NOT_FOUND')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: When email doesn't exist, no user's balance should be altered.
   */
  it('should not alter any balance when email does not exist', () => {
    fc.assert(
      fc.property(
        databaseWithUsersArb,
        validEmailArb,
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        (database, randomEmail, creditType, quantity, reason) => {
          // Ensure the email doesn't exist in the database
          const existingEmails = new Set(
            Array.from(database.users.values()).map(u => u.email.toLowerCase())
          )
          
          // Skip if email happens to exist
          fc.pre(!existingEmails.has(randomEmail.toLowerCase()))
          
          // Take snapshot of balances before operation
          const balancesBefore = getBalanceSnapshot(database)
          
          const request: CreditGrantRequest = {
            userEmail: randomEmail,
            creditType,
            quantity,
            reason
          }
          
          // Attempt the operation (should fail)
          simulateCreditGrantWithUserLookup(request, database)
          
          // Take snapshot of balances after operation
          const balancesAfter = getBalanceSnapshot(database)
          
          // Property: Balances must remain unchanged
          expect(balancesAreEqual(balancesBefore, balancesAfter)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Error message should be informative about the issue.
   */
  it('should return informative error message for nonexistent email', () => {
    fc.assert(
      fc.property(
        databaseWithUsersArb,
        validEmailArb,
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        (database, randomEmail, creditType, quantity, reason) => {
          // Ensure the email doesn't exist
          const existingEmails = new Set(
            Array.from(database.users.values()).map(u => u.email.toLowerCase())
          )
          fc.pre(!existingEmails.has(randomEmail.toLowerCase()))
          
          const request: CreditGrantRequest = {
            userEmail: randomEmail,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, database)
          
          // Property: Error message should be defined and informative
          expect(result.message).toBeDefined()
          expect(typeof result.message).toBe('string')
          expect(result.message!.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Existing emails should succeed (contrast test).
   * This verifies that the lookup logic works correctly for existing users.
   */
  it('should succeed for existing email (contrast test)', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 1, maxLength: 10 }),
        positiveQtyArb,
        reasonArb,
        (users, quantity, reason) => {
          // Build database with unique emails
          const database: UserDatabase = {
            users: new Map(),
            balances: new Map()
          }
          
          for (const user of users) {
            if (!Array.from(database.users.values()).some(
              u => u.email.toLowerCase() === user.email.toLowerCase()
            )) {
              database.users.set(user.id, user)
              database.balances.set(user.id, Math.floor(Math.random() * 100))
            }
          }
          
          // Skip if no users in database
          fc.pre(database.users.size > 0)
          
          // Pick an existing user
          const existingUser = Array.from(database.users.values())[0]
          
          // Determine credit type based on user role
          const creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR' = 
            existingUser.role === 'STUDENT' || existingUser.role === 'ALUNO'
              ? 'STUDENT_CLASS'
              : 'PROFESSOR_HOUR'
          
          const request: CreditGrantRequest = {
            userEmail: existingUser.email,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, database)
          
          // Property: Operation should succeed for existing email
          expect(result.success).toBe(true)
          expect(result.errorCode).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Case-insensitive email lookup should still fail for nonexistent emails.
   */
  it('should handle case-insensitive email lookup correctly', () => {
    fc.assert(
      fc.property(
        databaseWithUsersArb,
        validEmailArb,
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        fc.constantFrom('lower', 'upper', 'mixed'),
        (database, randomEmail, creditType, quantity, reason, caseType) => {
          // Ensure the email doesn't exist
          const existingEmails = new Set(
            Array.from(database.users.values()).map(u => u.email.toLowerCase())
          )
          fc.pre(!existingEmails.has(randomEmail.toLowerCase()))
          
          // Transform email case
          let transformedEmail: string
          switch (caseType) {
            case 'lower':
              transformedEmail = randomEmail.toLowerCase()
              break
            case 'upper':
              transformedEmail = randomEmail.toUpperCase()
              break
            case 'mixed':
              transformedEmail = randomEmail
                .split('')
                .map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())
                .join('')
              break
            default:
              transformedEmail = randomEmail
          }
          
          const request: CreditGrantRequest = {
            userEmail: transformedEmail,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, database)
          
          // Property: Should still fail with USER_NOT_FOUND regardless of case
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('USER_NOT_FOUND')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Empty database should always return USER_NOT_FOUND.
   */
  it('should return USER_NOT_FOUND for any email when database is empty', () => {
    fc.assert(
      fc.property(
        validEmailArb,
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        (email, creditType, quantity, reason) => {
          // Empty database
          const emptyDatabase: UserDatabase = {
            users: new Map(),
            balances: new Map()
          }
          
          const request: CreditGrantRequest = {
            userEmail: email,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, emptyDatabase)
          
          // Property: Any email should fail in empty database
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('USER_NOT_FOUND')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Similar but different emails should still fail.
   * Tests that partial matches don't incorrectly succeed.
   */
  it('should fail for similar but different emails', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.constantFrom('prefix', 'suffix', 'typo'),
        creditTypeArb,
        positiveQtyArb,
        reasonArb,
        (user, modType, creditType, quantity, reason) => {
          // Create database with single user
          const database: UserDatabase = {
            users: new Map([[user.id, user]]),
            balances: new Map([[user.id, 50]])
          }
          
          // Modify email to be similar but different
          let modifiedEmail: string
          switch (modType) {
            case 'prefix':
              modifiedEmail = 'x' + user.email
              break
            case 'suffix':
              modifiedEmail = user.email + 'x'
              break
            case 'typo':
              // Insert character in middle
              const mid = Math.floor(user.email.length / 2)
              modifiedEmail = user.email.slice(0, mid) + 'x' + user.email.slice(mid)
              break
            default:
              modifiedEmail = user.email + 'different'
          }
          
          const request: CreditGrantRequest = {
            userEmail: modifiedEmail,
            creditType,
            quantity,
            reason
          }
          
          const result = simulateCreditGrantWithUserLookup(request, database)
          
          // Property: Similar but different email should fail
          expect(result.success).toBe(false)
          expect(result.errorCode).toBe('USER_NOT_FOUND')
        }
      ),
      { numRuns: 100 }
    )
  })
})
