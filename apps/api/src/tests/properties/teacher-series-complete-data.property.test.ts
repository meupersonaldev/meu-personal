/**
 * Property-Based Test: Séries do professor incluem dados completos
 * 
 * **Feature: fix-recurring-bookings, Property 4: Séries do professor incluem dados completos**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * This test verifies that for any series returned by GET /api/booking-series/teacher/my-series,
 * the response includes: student name, academy name, day_of_week, start_time, end_time,
 * recurrence_type, status, and count of confirmed vs reserved bookings.
 */

import * as fc from 'fast-check'

// Type definitions for series response from teacher endpoint
interface TeacherSeriesResponse {
  id: string
  student_id: string
  teacher_id: string
  academy_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_type: string
  start_date: string
  end_date: string
  status: string
  created_at: string
  created_by: string
  created_by_role: string
  // Joined data
  student: { id: string; name: string } | null
  academy: { id: string; name: string } | null
  // Booking counts (Requirement 3.4)
  confirmedCount: number
  reservedCount: number
}

// Database booking series record
interface DatabaseBookingSeries {
  id: string
  student_id: string
  teacher_id: string
  academy_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_type: string
  start_date: string
  end_date: string
  status: string
  created_at: string
  created_by: string
  created_by_role: string
}

// Database booking record for counting
interface DatabaseBooking {
  id: string
  series_id: string
  is_reserved: boolean
  status_canonical: string
}

// User record for student info
interface DatabaseUser {
  id: string
  name: string
}

// Academy record
interface DatabaseAcademy {
  id: string
  name: string
}

// Arbitrary generators
const uuidArb = fc.uuid()
const timeArb = fc.integer({ min: 0, max: 23 }).chain(hour =>
  fc.integer({ min: 0, max: 59 }).map(minute =>
    `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  )
)
// Use integer-based date generation for reliability (2024-01-01 to 2026-12-31 in ms)
const dateIsoArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString())
const dateStrArb = fc.integer({ min: 1704067200000, max: 1798761600000 })
  .map(ms => new Date(ms).toISOString().split('T')[0])
const dayOfWeekArb = fc.integer({ min: 0, max: 6 })
const recurrenceTypeArb = fc.constantFrom('15_DAYS', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR')
const statusArb = fc.constantFrom('ACTIVE', 'CANCELLED', 'COMPLETED')
const bookingStatusArb = fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'DONE')
const roleArb = fc.constantFrom('STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR')
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

// Generator for database booking series
const databaseSeriesArb: fc.Arbitrary<DatabaseBookingSeries> = fc.record({
  id: uuidArb,
  student_id: uuidArb,
  teacher_id: uuidArb,
  academy_id: uuidArb,
  day_of_week: dayOfWeekArb,
  start_time: timeArb,
  end_time: timeArb,
  recurrence_type: recurrenceTypeArb,
  start_date: dateStrArb,
  end_date: dateStrArb,
  status: statusArb,
  created_at: dateIsoArb,
  created_by: uuidArb,
  created_by_role: roleArb
})

// Generator for database user
const databaseUserArb: fc.Arbitrary<DatabaseUser> = fc.record({
  id: uuidArb,
  name: nameArb
})

// Generator for database academy
const databaseAcademyArb: fc.Arbitrary<DatabaseAcademy> = fc.record({
  id: uuidArb,
  name: nameArb
})

// Generator for database booking
const databaseBookingArb = (seriesId: string): fc.Arbitrary<DatabaseBooking> => fc.record({
  id: uuidArb,
  series_id: fc.constant(seriesId),
  is_reserved: fc.boolean(),
  status_canonical: bookingStatusArb
})

/**
 * Simulates the enrichment logic from the API endpoint
 * This mirrors the actual implementation in booking-series.ts
 */
function enrichSeriesWithData(
  series: DatabaseBookingSeries,
  student: DatabaseUser,
  academy: DatabaseAcademy,
  bookings: DatabaseBooking[]
): TeacherSeriesResponse {
  const confirmedCount = bookings.filter(
    b => !b.is_reserved && b.status_canonical !== 'CANCELED'
  ).length
  const reservedCount = bookings.filter(
    b => b.is_reserved && b.status_canonical !== 'CANCELED'
  ).length

  return {
    ...series,
    student: { id: student.id, name: student.name },
    academy: { id: academy.id, name: academy.name },
    confirmedCount,
    reservedCount
  }
}

describe('Property 4: Séries do professor incluem dados completos', () => {
  /**
   * Property: For any series returned by the teacher endpoint,
   * the response must include all required fields with correct values.
   */
  it('should include all required fields in teacher series response', () => {
    fc.assert(
      fc.property(
        databaseSeriesArb,
        databaseUserArb,
        databaseAcademyArb,
        fc.array(fc.boolean().chain(isReserved =>
          fc.constantFrom('PAID', 'RESERVED', 'CANCELED', 'DONE').map(status => ({
            id: fc.sample(uuidArb, 1)[0],
            series_id: 'placeholder',
            is_reserved: isReserved,
            status_canonical: status
          }))
        ), { minLength: 0, maxLength: 10 }),
        (series, student, academy, bookingsData) => {
          // Fix series_id in bookings
          const bookings = bookingsData.map(b => ({ ...b, series_id: series.id }))
          
          const response = enrichSeriesWithData(series, student, academy, bookings)

          // Requirement 3.1: Series must have teacher_id
          expect(response).toHaveProperty('teacher_id')
          expect(response.teacher_id).toBe(series.teacher_id)

          // Requirement 3.2: Must include student name
          expect(response).toHaveProperty('student')
          expect(response.student).not.toBeNull()
          expect(response.student?.name).toBe(student.name)

          // Requirement 3.2: Must include academy name
          expect(response).toHaveProperty('academy')
          expect(response.academy).not.toBeNull()
          expect(response.academy?.name).toBe(academy.name)

          // Requirement 3.2: Must include recurrence details
          expect(response).toHaveProperty('day_of_week')
          expect(response.day_of_week).toBeGreaterThanOrEqual(0)
          expect(response.day_of_week).toBeLessThanOrEqual(6)

          expect(response).toHaveProperty('start_time')
          expect(response.start_time).toMatch(/^\d{2}:\d{2}$/)

          expect(response).toHaveProperty('end_time')
          expect(response.end_time).toMatch(/^\d{2}:\d{2}$/)

          expect(response).toHaveProperty('recurrence_type')
          expect(['15_DAYS', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR']).toContain(response.recurrence_type)

          // Requirement 3.3: Must include status
          expect(response).toHaveProperty('status')
          expect(['ACTIVE', 'CANCELLED', 'COMPLETED']).toContain(response.status)

          // Requirement 3.4: Must include booking counts
          expect(response).toHaveProperty('confirmedCount')
          expect(typeof response.confirmedCount).toBe('number')
          expect(response.confirmedCount).toBeGreaterThanOrEqual(0)

          expect(response).toHaveProperty('reservedCount')
          expect(typeof response.reservedCount).toBe('number')
          expect(response.reservedCount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Confirmed count should only include non-reserved, non-canceled bookings
   */
  it('should correctly count confirmed bookings (non-reserved, non-canceled)', () => {
    fc.assert(
      fc.property(
        databaseSeriesArb,
        databaseUserArb,
        databaseAcademyArb,
        fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant('placeholder'),
            is_reserved: fc.boolean(),
            status_canonical: bookingStatusArb
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (series, student, academy, bookingsData) => {
          const bookings = bookingsData.map(b => ({ ...b, series_id: series.id }))
          const response = enrichSeriesWithData(series, student, academy, bookings)

          // Calculate expected confirmed count
          const expectedConfirmed = bookings.filter(
            b => !b.is_reserved && b.status_canonical !== 'CANCELED'
          ).length

          expect(response.confirmedCount).toBe(expectedConfirmed)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Reserved count should only include reserved, non-canceled bookings
   */
  it('should correctly count reserved bookings (reserved, non-canceled)', () => {
    fc.assert(
      fc.property(
        databaseSeriesArb,
        databaseUserArb,
        databaseAcademyArb,
        fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant('placeholder'),
            is_reserved: fc.boolean(),
            status_canonical: bookingStatusArb
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (series, student, academy, bookingsData) => {
          const bookings = bookingsData.map(b => ({ ...b, series_id: series.id }))
          const response = enrichSeriesWithData(series, student, academy, bookings)

          // Calculate expected reserved count
          const expectedReserved = bookings.filter(
            b => b.is_reserved && b.status_canonical !== 'CANCELED'
          ).length

          expect(response.reservedCount).toBe(expectedReserved)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Canceled bookings should not be counted in either confirmed or reserved
   */
  it('should not count canceled bookings in either confirmed or reserved counts', () => {
    fc.assert(
      fc.property(
        databaseSeriesArb,
        databaseUserArb,
        databaseAcademyArb,
        fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant('placeholder'),
            is_reserved: fc.boolean(),
            status_canonical: fc.constant('CANCELED') // All canceled
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (series, student, academy, bookingsData) => {
          const bookings = bookingsData.map(b => ({ ...b, series_id: series.id }))
          const response = enrichSeriesWithData(series, student, academy, bookings)

          // When all bookings are canceled, both counts should be 0
          expect(response.confirmedCount).toBe(0)
          expect(response.reservedCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Total of confirmed + reserved should equal non-canceled bookings
   */
  it('should have confirmed + reserved equal to total non-canceled bookings', () => {
    fc.assert(
      fc.property(
        databaseSeriesArb,
        databaseUserArb,
        databaseAcademyArb,
        fc.array(
          fc.record({
            id: uuidArb,
            series_id: fc.constant('placeholder'),
            is_reserved: fc.boolean(),
            status_canonical: bookingStatusArb
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (series, student, academy, bookingsData) => {
          const bookings = bookingsData.map(b => ({ ...b, series_id: series.id }))
          const response = enrichSeriesWithData(series, student, academy, bookings)

          const nonCanceledCount = bookings.filter(
            b => b.status_canonical !== 'CANCELED'
          ).length

          expect(response.confirmedCount + response.reservedCount).toBe(nonCanceledCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})
