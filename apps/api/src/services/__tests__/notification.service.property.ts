/**
 * Property-Based Tests for NotificationService
 * 
 * These tests verify correctness properties using fast-check.
 * Each test runs a minimum of 100 iterations with random inputs.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NotificationService, Student, Teacher, Booking, User, Payment, Checkin, Academy } from '../notification.service'
import { NotificationType, notificationTypes } from '../../types/notification-types'

/**
 * Mock Supabase client that tracks database operations
 */
function createMockSupabase() {
  const insertedNotifications: any[] = []
  let shouldFail = false
  
  return {
    insertedNotifications,
    setShouldFail: (fail: boolean) => { shouldFail = fail },
    from: (table: string) => ({
      insert: (data: any) => ({
        select: (columns: string) => {
          if (shouldFail) {
            return Promise.resolve({ data: null, error: new Error('DB Error') })
          }
          const inserted = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            created_at: data.created_at || new Date().toISOString()
          }
          insertedNotifications.push(inserted)
          return Promise.resolve({ data: [inserted], error: null })
        }
      }),
      select: (columns: string) => ({
        eq: (col: string, val: any) => ({
          single: () => Promise.resolve({ data: { franqueadora_id: 'franq-123' }, error: null })
        })
      })
    }),
    reset: () => {
      insertedNotifications.length = 0
      shouldFail = false
    }
  }
}

/**
 * Mock publish function that tracks SSE publications
 */
function createMockPublish() {
  const publications: { topic: string; payload: any }[] = []
  
  return {
    publications,
    publish: (topic: string, payload: any) => {
      publications.push({ topic, payload })
    },
    reset: () => {
      publications.length = 0
    }
  }
}

// Arbitraries for generating test data
const userIdArb = fc.uuid()
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
const emailArb = fc.emailAddress()
const amountArb = fc.integer({ min: 1, max: 1000 })
const balanceArb = fc.integer({ min: 0, max: 10000 })
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
const timeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m]) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)

const studentArb: fc.Arbitrary<Student> = fc.record({
  id: userIdArb,
  name: nameArb,
  full_name: fc.option(nameArb, { nil: undefined }),
  email: fc.option(emailArb, { nil: undefined }),
  credits: fc.option(balanceArb, { nil: undefined })
})

const teacherArb: fc.Arbitrary<Teacher> = fc.record({
  id: userIdArb,
  name: nameArb,
  full_name: fc.option(nameArb, { nil: undefined }),
  email: fc.option(emailArb, { nil: undefined }),
  academy_id: fc.option(userIdArb, { nil: undefined })
})

const bookingArb: fc.Arbitrary<Booking> = fc.record({
  id: userIdArb,
  date: dateArb.map(d => d.toISOString()),
  start_time: fc.option(timeArb, { nil: undefined }),
  end_time: fc.option(timeArb, { nil: undefined }),
  student_id: fc.option(userIdArb, { nil: undefined }),
  teacher_id: fc.option(userIdArb, { nil: undefined }),
  academy_id: fc.option(userIdArb, { nil: undefined }),
  status: fc.option(fc.constantFrom('PAID', 'CONFIRMED', 'CANCELLED', 'DONE'), { nil: undefined })
})

const academyArb: fc.Arbitrary<Academy> = fc.record({
  id: userIdArb,
  name: fc.option(nameArb, { nil: undefined }),
  franqueadora_id: fc.option(userIdArb, { nil: undefined })
})

const paymentArb: fc.Arbitrary<Payment> = fc.record({
  id: userIdArb,
  amount: amountArb,
  status: fc.option(fc.constantFrom('CONFIRMED', 'PENDING', 'FAILED'), { nil: undefined }),
  description: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  user_id: fc.option(userIdArb, { nil: undefined })
})

const checkinArb: fc.Arbitrary<Checkin> = fc.record({
  id: userIdArb,
  booking_id: fc.option(userIdArb, { nil: undefined }),
  student_id: fc.option(userIdArb, { nil: undefined }),
  teacher_id: fc.option(userIdArb, { nil: undefined }),
  academy_id: fc.option(userIdArb, { nil: undefined }),
  created_at: fc.option(dateArb.map(d => d.toISOString()), { nil: undefined })
})

describe('NotificationService Property Tests', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>
  let mockPublish: ReturnType<typeof createMockPublish>
  let service: NotificationService

  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockPublish = createMockPublish()
    service = new NotificationService(mockSupabase as any, mockPublish.publish)
  })

  /**
   * **Feature: notification-system, Property 1: Booking Creation Notifies Both Parties**
   * **Validates: Requirements 1.1, 2.5**
   * 
   * Property 1: Booking Creation Notifies Both Parties
   * *For any* valid booking creation, the Notification_System should create exactly one 
   * notification for the teacher AND one notification for the student, both containing 
   * the booking details.
   */
  describe('Property 1: Booking Creation Notifies Both Parties', () => {
    it('should create exactly one notification for teacher and one for student when booking is created', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Simulate booking creation by calling both notification methods
            // This is what happens when a booking is created in the system
            await service.notifyTeacherNewBooking(booking, student, teacher)
            await service.notifyStudentBookingCreated(booking, student, teacher)

            // Property: Exactly 2 notifications should be created (one for each party)
            expect(mockSupabase.insertedNotifications.length).toBe(2)

            // Find teacher notification
            const teacherNotification = mockSupabase.insertedNotifications.find(
              n => n.user_id === teacher.id && n.type === 'teacher_new_booking'
            )
            
            // Find student notification
            const studentNotification = mockSupabase.insertedNotifications.find(
              n => n.user_id === student.id && n.type === 'student_booking_created'
            )

            // Property: Both parties must receive exactly one notification
            expect(teacherNotification).toBeDefined()
            expect(studentNotification).toBeDefined()

            // Property: Teacher notification must contain booking details
            expect(teacherNotification?.data.bookingId).toBe(booking.id)
            expect(teacherNotification?.data.bookingDate).toBe(booking.date)
            expect(teacherNotification?.data.studentName).toBe(student.full_name || student.name || '')

            // Property: Student notification must contain booking details
            expect(studentNotification?.data.bookingId).toBe(booking.id)
            expect(studentNotification?.data.bookingDate).toBe(booking.date)
            expect(studentNotification?.data.teacherName).toBe(teacher.full_name || teacher.name || '')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE events to both teacher and student topics', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherNewBooking(booking, student, teacher)
            await service.notifyStudentBookingCreated(booking, student, teacher)

            // Property: SSE events should be published to both user topics
            const teacherPublication = mockPublish.publications.find(
              p => p.topic.includes(teacher.id)
            )
            const studentPublication = mockPublish.publications.find(
              p => p.topic.includes(student.id)
            )

            expect(teacherPublication).toBeDefined()
            expect(studentPublication).toBeDefined()

            // Property: Each publication should contain the correct notification type
            expect(teacherPublication?.payload.notification.type).toBe('teacher_new_booking')
            expect(studentPublication?.payload.notification.type).toBe('student_booking_created')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include booking time in notifications when available', async () => {
      // Generate bookings that always have start_time defined
      const bookingWithTimeArb = fc.record({
        id: userIdArb,
        date: dateArb.map(d => d.toISOString()),
        start_time: timeArb, // Always defined
        end_time: fc.option(timeArb, { nil: undefined }),
        student_id: fc.option(userIdArb, { nil: undefined }),
        teacher_id: fc.option(userIdArb, { nil: undefined }),
        academy_id: fc.option(userIdArb, { nil: undefined }),
        status: fc.option(fc.constantFrom('PAID', 'CONFIRMED', 'CANCELLED', 'DONE'), { nil: undefined })
      })

      await fc.assert(
        fc.asyncProperty(
          bookingWithTimeArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherNewBooking(booking, student, teacher)
            await service.notifyStudentBookingCreated(booking, student, teacher)

            const teacherNotification = mockSupabase.insertedNotifications.find(
              n => n.user_id === teacher.id
            )
            const studentNotification = mockSupabase.insertedNotifications.find(
              n => n.user_id === student.id
            )

            // Property: When booking has start_time, it should be included in notification data
            expect(teacherNotification?.data.bookingTime).toBe(booking.start_time)
            expect(studentNotification?.data.bookingTime).toBe(booking.start_time)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle bookings with different student and teacher IDs correctly', async () => {
      // Ensure student and teacher have different IDs
      const distinctIdsArb = fc.tuple(userIdArb, userIdArb).filter(([a, b]) => a !== b)

      await fc.assert(
        fc.asyncProperty(
          distinctIdsArb,
          bookingArb,
          nameArb,
          nameArb,
          async ([studentId, teacherId], booking, studentName, teacherName) => {
            mockSupabase.reset()
            mockPublish.reset()

            const student: Student = { id: studentId, name: studentName }
            const teacher: Teacher = { id: teacherId, name: teacherName }

            await service.notifyTeacherNewBooking(booking, student, teacher)
            await service.notifyStudentBookingCreated(booking, student, teacher)

            // Property: Notifications should go to different users
            const userIds = mockSupabase.insertedNotifications.map(n => n.user_id)
            expect(userIds).toContain(studentId)
            expect(userIds).toContain(teacherId)
            
            // Property: Each user should receive exactly one notification
            const teacherNotifications = mockSupabase.insertedNotifications.filter(
              n => n.user_id === teacherId
            )
            const studentNotifications = mockSupabase.insertedNotifications.filter(
              n => n.user_id === studentId
            )
            
            expect(teacherNotifications.length).toBe(1)
            expect(studentNotifications.length).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 2: Booking Cancellation Notifies Affected Party**
   * **Validates: Requirements 1.2, 2.1**
   * 
   * Property 2: Booking Cancellation Notifies Affected Party
   * *For any* booking cancellation, the Notification_System should create a notification 
   * for the party that did NOT initiate the cancellation (teacher notified if student 
   * cancels, student notified if teacher cancels).
   */
  describe('Property 2: Booking Cancellation Notifies Affected Party', () => {
    it('should notify teacher when student cancels a booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Student cancels the booking - teacher should be notified
            await service.notifyTeacherBookingCancelled(booking, student, teacher)

            // Property: Exactly 1 notification should be created for the teacher
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher (the affected party)
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_booking_cancelled')

            // Property: Notification must contain booking details
            expect(notification.data.bookingId).toBe(booking.id)
            expect(notification.data.bookingDate).toBe(booking.date)
            expect(notification.data.studentName).toBe(student.full_name || student.name || '')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should notify student when teacher cancels a booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          async (booking, student, teacher, reason) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Teacher cancels the booking - student should be notified
            await service.notifyStudentBookingCancelled(booking, student, teacher, reason)

            // Property: Exactly 1 notification should be created for the student
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student (the affected party)
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_booking_cancelled')

            // Property: Notification must contain booking details
            expect(notification.data.bookingId).toBe(booking.id)
            expect(notification.data.bookingDate).toBe(booking.date)
            expect(notification.data.teacherName).toBe(teacher.full_name || teacher.name || '')

            // Property: If reason is provided, it should be included
            if (reason !== undefined) {
              expect(notification.data.reason).toBe(reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to the affected party only', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Student cancels - only teacher should receive SSE
            await service.notifyTeacherBookingCancelled(booking, student, teacher)

            // Property: SSE should be published to teacher's topic
            const teacherPublication = mockPublish.publications.find(
              p => p.topic.includes(teacher.id)
            )
            expect(teacherPublication).toBeDefined()
            expect(teacherPublication?.payload.notification.type).toBe('teacher_booking_cancelled')

            // Property: SSE should NOT be published to student's topic for this notification
            const studentPublication = mockPublish.publications.find(
              p => p.topic.includes(student.id) && p.payload.notification.type === 'teacher_booking_cancelled'
            )
            expect(studentPublication).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure cancellation notifications go to different parties based on initiator', async () => {
      // Ensure student and teacher have different IDs
      const distinctIdsArb = fc.tuple(userIdArb, userIdArb).filter(([a, b]) => a !== b)

      await fc.assert(
        fc.asyncProperty(
          distinctIdsArb,
          bookingArb,
          nameArb,
          nameArb,
          async ([studentId, teacherId], booking, studentName, teacherName) => {
            mockSupabase.reset()
            mockPublish.reset()

            const student: Student = { id: studentId, name: studentName }
            const teacher: Teacher = { id: teacherId, name: teacherName }

            // Test both cancellation scenarios
            // Scenario 1: Student cancels -> Teacher notified
            await service.notifyTeacherBookingCancelled(booking, student, teacher)
            
            const teacherNotification = mockSupabase.insertedNotifications[0]
            expect(teacherNotification.user_id).toBe(teacherId)
            expect(teacherNotification.user_id).not.toBe(studentId)

            mockSupabase.reset()
            mockPublish.reset()

            // Scenario 2: Teacher cancels -> Student notified
            await service.notifyStudentBookingCancelled(booking, student, teacher)
            
            const studentNotification = mockSupabase.insertedNotifications[0]
            expect(studentNotification.user_id).toBe(studentId)
            expect(studentNotification.user_id).not.toBe(teacherId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include booking time in cancellation notifications when available', async () => {
      // Generate bookings that always have start_time defined
      const bookingWithTimeArb = fc.record({
        id: userIdArb,
        date: dateArb.map(d => d.toISOString()),
        start_time: timeArb, // Always defined
        end_time: fc.option(timeArb, { nil: undefined }),
        student_id: fc.option(userIdArb, { nil: undefined }),
        teacher_id: fc.option(userIdArb, { nil: undefined }),
        academy_id: fc.option(userIdArb, { nil: undefined }),
        status: fc.option(fc.constantFrom('PAID', 'CONFIRMED', 'CANCELLED', 'DONE'), { nil: undefined })
      })

      await fc.assert(
        fc.asyncProperty(
          bookingWithTimeArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherBookingCancelled(booking, student, teacher)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: When booking has start_time, it should be included in notification data
            expect(notification.data.bookingTime).toBe(booking.start_time)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 9: Notification Persistence**
   * **Validates: Requirements 8.2, 8.3**
   * 
   * Property 9: Notification Persistence
   * *For any* notification created, the notification should be persisted in the database 
   * before being published via SSE, ensuring offline users receive it upon reconnection.
   */
  describe('Property 9: Notification Persistence', () => {
    it('should persist notification to database before publishing via SSE for teacher new booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherNewBooking(booking, student, teacher)

            // Verify notification was persisted
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            // Verify required fields are present
            expect(persisted.type).toBe('teacher_new_booking')
            expect(persisted.user_id).toBe(teacher.id)
            expect(persisted.title).toBeDefined()
            expect(persisted.message).toBeDefined()
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()

            // Verify SSE was published after persistence
            expect(mockPublish.publications.length).toBeGreaterThanOrEqual(1)
            const publication = mockPublish.publications.find(p => p.topic.includes(teacher.id))
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist notification to database before publishing via SSE for student booking created', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentBookingCreated(booking, student, teacher)

            // Verify notification was persisted
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            // Verify required fields are present
            expect(persisted.type).toBe('student_booking_created')
            expect(persisted.user_id).toBe(student.id)
            expect(persisted.title).toBeDefined()
            expect(persisted.message).toBeDefined()
            expect(persisted.read).toBe(false)

            // Verify SSE was published with the persisted notification
            const publication = mockPublish.publications.find(p => p.topic.includes(student.id))
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist notification to database before publishing via SSE for credit transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          async (student, amount, balance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsDebited(student, amount, balance)

            // Verify notification was persisted
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            expect(persisted.type).toBe('student_credits_debited')
            expect(persisted.user_id).toBe(student.id)
            expect(persisted.data.amount).toBe(amount)
            expect(persisted.data.balance).toBe(balance)
            expect(persisted.read).toBe(false)

            // Verify SSE was published
            const publication = mockPublish.publications.find(p => p.topic.includes(student.id))
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist notification to database before publishing via SSE for payment confirmations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ id: userIdArb, name: nameArb }) as fc.Arbitrary<User>,
          paymentArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentConfirmed(user, payment)

            // Verify notification was persisted
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            expect(persisted.type).toBe('payment_confirmed')
            expect(persisted.user_id).toBe(user.id)
            expect(persisted.data.paymentId).toBe(payment.id)
            expect(persisted.data.paymentValue).toBe(payment.amount)
            expect(persisted.read).toBe(false)

            // Verify SSE was published
            const publication = mockPublish.publications.find(p => p.topic.includes(user.id))
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist notification to database before publishing via SSE for check-in events', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          teacherArb,
          async (checkin, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherStudentCheckin(checkin, student, teacher)

            // Verify notification was persisted
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            expect(persisted.type).toBe('teacher_student_checkin')
            expect(persisted.user_id).toBe(teacher.id)
            expect(persisted.read).toBe(false)

            // Verify SSE was published
            const publication = mockPublish.publications.find(p => p.topic.includes(teacher.id))
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should still persist notification even if SSE publish fails (offline user support)', async () => {
      await fc.assert(
        fc.asyncProperty(
          bookingArb,
          studentArb,
          teacherArb,
          async (booking, student, teacher) => {
            mockSupabase.reset()
            
            // Create a service with a failing publish function
            const failingPublish = () => { throw new Error('SSE connection failed') }
            const serviceWithFailingSSE = new NotificationService(mockSupabase as any, failingPublish)

            await serviceWithFailingSSE.notifyTeacherNewBooking(booking, student, teacher)

            // Verify notification was still persisted despite SSE failure
            // This ensures offline users can receive notifications upon reconnection (Requirement 8.3)
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            expect(persisted.type).toBe('teacher_new_booking')
            expect(persisted.user_id).toBe(teacher.id)
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist notification with all required fields for any notification type', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          teacherArb,
          bookingArb,
          academyArb,
          async (student, teacher, booking, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Test multiple notification types to ensure persistence works for all
            await service.notifyTeacherApproved(teacher, academy)

            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]
            
            // All notifications must have these fields for proper persistence
            expect(persisted.id).toBeDefined()
            expect(persisted.type).toBeDefined()
            expect(persisted.title).toBeDefined()
            expect(persisted.message).toBeDefined()
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()
            expect(typeof persisted.data).toBe('object')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 3: Credit Transaction Creates Notification**
   * **Validates: Requirements 3.1, 3.3, 3.4, 3.6**
   * 
   * Property 3: Credit Transaction Creates Notification
   * *For any* credit transaction (debit, credit, refund, expiration), the Notification_System 
   * should create a notification for the student with the transaction amount and resulting balance.
   */
  describe('Property 3: Credit Transaction Creates Notification', () => {
    it('should create notification with amount and balance for credit debit transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          fc.option(bookingArb, { nil: undefined }),
          async (student, amount, balance, booking) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsDebited(student, amount, balance, booking)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_debited')

            // Property: Notification must contain transaction amount and resulting balance
            expect(notification.data.amount).toBe(amount)
            expect(notification.data.balance).toBe(balance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with amount and balance for credit purchase transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          async (student, amount, newBalance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsPurchased(student, amount, newBalance)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_purchased')

            // Property: Notification must contain transaction amount and resulting balance
            expect(notification.data.amount).toBe(amount)
            expect(notification.data.balance).toBe(newBalance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with amount and balance for credit refund transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          async (student, amount, newBalance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsRefunded(student, amount, newBalance)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_refunded')

            // Property: Notification must contain transaction amount and resulting balance
            expect(notification.data.amount).toBe(amount)
            expect(notification.data.balance).toBe(newBalance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with amount for credit expiration transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          async (student, amount) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsExpired(student, amount)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_expired')

            // Property: Notification must contain the expired amount
            expect(notification.data.amount).toBe(amount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to student topic for all credit transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          async (student, amount, balance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsDebited(student, amount, balance)

            // Property: SSE event should be published to student's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(student.id)
            )
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.type).toBe('student_credits_debited')
            expect(publication?.payload.notification.data.amount).toBe(amount)
            expect(publication?.payload.notification.data.balance).toBe(balance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include booking reference when credit debit is associated with a booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          amountArb,
          balanceArb,
          bookingArb,
          async (student, amount, balance, booking) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsDebited(student, amount, balance, booking)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: When booking is provided, notification should reference it
            expect(notification.data.bookingId).toBe(booking.id)
            expect(notification.data.bookingDate).toBe(booking.date)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 4: Low Balance Threshold Triggers Alert**
   * **Validates: Requirements 3.2, 3.7**
   * 
   * Property 4: Low Balance Threshold Triggers Alert
   * *For any* credit balance that transitions below the threshold of 2 classes, 
   * the Notification_System should create exactly one low-balance notification for the student.
   */
  describe('Property 4: Low Balance Threshold Triggers Alert', () => {
    // Arbitrary for balance values below threshold (0 or 1)
    const lowBalanceArb = fc.integer({ min: 0, max: 1 })
    
    it('should create low-balance notification when balance is below threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          lowBalanceArb,
          async (student, balance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsLow(student, balance)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_low')

            // Property: Notification must contain balance and threshold
            expect(notification.data.balance).toBe(balance)
            expect(notification.data.threshold).toBe(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create zero-balance notification when balance reaches zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          async (student) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsZero(student)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the student
            expect(notification.user_id).toBe(student.id)
            expect(notification.type).toBe('student_credits_zero')

            // Property: Notification must indicate zero balance
            expect(notification.data.balance).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to student topic for low-balance alerts', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          lowBalanceArb,
          async (student, balance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsLow(student, balance)

            // Property: SSE event should be published to student's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(student.id)
            )
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.type).toBe('student_credits_low')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include purchase link in low-balance notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          lowBalanceArb,
          async (student, balance) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsLow(student, balance)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Low-balance notification should include link to purchase page
            expect(notification.data.link).toBe('/aluno/comprar')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include purchase link in zero-balance notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          async (student) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyStudentCreditsZero(student)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Zero-balance notification should include link to purchase page
            expect(notification.data.link).toBe('/aluno/comprar')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create distinct notifications for low-balance vs zero-balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          async (student) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Test low balance (1 credit)
            await service.notifyStudentCreditsLow(student, 1)
            const lowNotification = mockSupabase.insertedNotifications[0]

            mockSupabase.reset()
            mockPublish.reset()

            // Test zero balance
            await service.notifyStudentCreditsZero(student)
            const zeroNotification = mockSupabase.insertedNotifications[0]

            // Property: Different notification types for low vs zero balance
            expect(lowNotification.type).toBe('student_credits_low')
            expect(zeroNotification.type).toBe('student_credits_zero')
            expect(lowNotification.type).not.toBe(zeroNotification.type)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 5: Check-in Creates Notifications**
   * **Validates: Requirements 6.1, 6.2**
   * 
   * Property 5: Check-in Creates Notifications
   * *For any* successful check-in, the Notification_System should create a notification 
   * for the teacher of the scheduled class AND a notification for the franchise admin.
   */
  describe('Property 5: Check-in Creates Notifications', () => {
    it('should create notification for teacher when student checks in', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          teacherArb,
          async (checkin, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherStudentCheckin(checkin, student, teacher)

            // Property: Exactly 1 notification should be created for the teacher
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_student_checkin')

            // Property: Notification must contain check-in details
            expect(notification.data.checkinId).toBe(checkin.id)
            expect(notification.data.studentName).toBe(student.full_name || student.name || '')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification for franchise admin when student checks in', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          academyArb,
          async (checkin, student, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseCheckin(checkin, student, academy)

            // Property: Exactly 1 notification should be created for the franchise
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the academy (franchise admin)
            expect(notification.academy_id).toBe(academy.id)
            expect(notification.type).toBe('franchise_checkin')

            // Property: Notification must contain check-in details
            expect(notification.data.checkinId).toBe(checkin.id)
            expect(notification.data.studentName).toBe(student.full_name || student.name || '')
            expect(notification.data.academyName).toBe(academy.name)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notifications for both teacher and franchise when check-in occurs', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          teacherArb,
          academyArb,
          async (checkin, student, teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Simulate full check-in flow: notify both teacher and franchise
            await service.notifyTeacherStudentCheckin(checkin, student, teacher)
            await service.notifyFranchiseCheckin(checkin, student, academy)

            // Property: Exactly 2 notifications should be created (one for each party)
            expect(mockSupabase.insertedNotifications.length).toBe(2)

            // Find teacher notification
            const teacherNotification = mockSupabase.insertedNotifications.find(
              n => n.user_id === teacher.id && n.type === 'teacher_student_checkin'
            )

            // Find franchise notification
            const franchiseNotification = mockSupabase.insertedNotifications.find(
              n => n.academy_id === academy.id && n.type === 'franchise_checkin'
            )

            // Property: Both parties must receive exactly one notification
            expect(teacherNotification).toBeDefined()
            expect(franchiseNotification).toBeDefined()

            // Property: Both notifications must reference the same check-in
            expect(teacherNotification?.data.checkinId).toBe(checkin.id)
            expect(franchiseNotification?.data.checkinId).toBe(checkin.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to teacher topic when student checks in', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          teacherArb,
          async (checkin, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherStudentCheckin(checkin, student, teacher)

            // Property: SSE event should be published to teacher's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(teacher.id)
            )
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.type).toBe('teacher_student_checkin')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to academy topic when student checks in', async () => {
      await fc.assert(
        fc.asyncProperty(
          checkinArb,
          studentArb,
          academyArb,
          async (checkin, student, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseCheckin(checkin, student, academy)

            // Property: SSE event should be published to academy's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(academy.id)
            )
            expect(publication).toBeDefined()
            expect(publication?.payload.notification.type).toBe('franchise_checkin')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include booking reference in teacher check-in notification when available', async () => {
      // Generate check-ins that always have booking_id defined
      const checkinWithBookingArb = fc.record({
        id: userIdArb,
        booking_id: userIdArb, // Always defined
        student_id: fc.option(userIdArb, { nil: undefined }),
        teacher_id: fc.option(userIdArb, { nil: undefined }),
        academy_id: fc.option(userIdArb, { nil: undefined }),
        created_at: fc.option(dateArb.map(d => d.toISOString()), { nil: undefined })
      })

      await fc.assert(
        fc.asyncProperty(
          checkinWithBookingArb,
          studentArb,
          teacherArb,
          async (checkin, student, teacher) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherStudentCheckin(checkin, student, teacher)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: When check-in has booking_id, it should be included in notification data
            expect(notification.data.bookingId).toBe(checkin.booking_id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include booking reference in franchise check-in notification when available', async () => {
      // Generate check-ins that always have booking_id defined
      const checkinWithBookingArb = fc.record({
        id: userIdArb,
        booking_id: userIdArb, // Always defined
        student_id: fc.option(userIdArb, { nil: undefined }),
        teacher_id: fc.option(userIdArb, { nil: undefined }),
        academy_id: fc.option(userIdArb, { nil: undefined }),
        created_at: fc.option(dateArb.map(d => d.toISOString()), { nil: undefined })
      })

      await fc.assert(
        fc.asyncProperty(
          checkinWithBookingArb,
          studentArb,
          academyArb,
          async (checkin, student, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseCheckin(checkin, student, academy)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: When check-in has booking_id, it should be included in notification data
            expect(notification.data.bookingId).toBe(checkin.booking_id)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 6: Payment Status Creates Notification**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   * 
   * Property 6: Payment Status Creates Notification
   * *For any* payment status change (confirmed, failed, refunded), the Notification_System 
   * should create a notification for the user with the payment details and status.
   */
  describe('Property 6: Payment Status Creates Notification', () => {
    // Arbitrary for user
    const userArb: fc.Arbitrary<User> = fc.record({
      id: userIdArb,
      name: nameArb,
      full_name: fc.option(nameArb, { nil: undefined }),
      email: fc.option(emailArb, { nil: undefined })
    })

    it('should create notification with payment details when payment is confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentConfirmed(user, payment)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the user
            expect(notification.user_id).toBe(user.id)
            expect(notification.type).toBe('payment_confirmed')

            // Property: Notification must contain payment details
            expect(notification.data.paymentId).toBe(payment.id)
            expect(notification.data.paymentValue).toBe(payment.amount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with payment details when payment fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          async (user, payment, reason) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentFailed(user, payment, reason)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the user
            expect(notification.user_id).toBe(user.id)
            expect(notification.type).toBe('payment_failed')

            // Property: Notification must contain payment details
            expect(notification.data.paymentId).toBe(payment.id)
            expect(notification.data.paymentValue).toBe(payment.amount)

            // Property: If reason is provided, it should be included
            if (reason !== undefined) {
              expect(notification.data.paymentReason).toBe(reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with payment details when payment is refunded', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentRefunded(user, payment)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the user
            expect(notification.user_id).toBe(user.id)
            expect(notification.type).toBe('payment_refunded')

            // Property: Notification must contain payment details
            expect(notification.data.paymentId).toBe(payment.id)
            expect(notification.data.paymentValue).toBe(payment.amount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to user topic for all payment status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          fc.constantFrom('confirmed', 'failed', 'refunded') as fc.Arbitrary<'confirmed' | 'failed' | 'refunded'>,
          async (user, payment, status) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Call appropriate method based on status
            if (status === 'confirmed') {
              await service.notifyUserPaymentConfirmed(user, payment)
            } else if (status === 'failed') {
              await service.notifyUserPaymentFailed(user, payment)
            } else {
              await service.notifyUserPaymentRefunded(user, payment)
            }

            // Property: SSE event should be published to user's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(user.id)
            )
            expect(publication).toBeDefined()

            // Property: Publication should contain correct notification type
            const expectedType = status === 'confirmed' ? 'payment_confirmed' 
              : status === 'failed' ? 'payment_failed' 
              : 'payment_refunded'
            expect(publication?.payload.notification.type).toBe(expectedType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create distinct notifications for each payment status type', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          async (user, payment) => {
            // Test confirmed
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyUserPaymentConfirmed(user, payment)
            const confirmedNotification = mockSupabase.insertedNotifications[0]

            // Test failed
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyUserPaymentFailed(user, payment)
            const failedNotification = mockSupabase.insertedNotifications[0]

            // Test refunded
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyUserPaymentRefunded(user, payment)
            const refundedNotification = mockSupabase.insertedNotifications[0]

            // Property: Each status should have a distinct notification type
            expect(confirmedNotification.type).toBe('payment_confirmed')
            expect(failedNotification.type).toBe('payment_failed')
            expect(refundedNotification.type).toBe('payment_refunded')

            // Property: All types should be different
            const types = [confirmedNotification.type, failedNotification.type, refundedNotification.type]
            const uniqueTypes = new Set(types)
            expect(uniqueTypes.size).toBe(3)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include payment description in confirmed notification when available', async () => {
      // Generate payments that always have description defined
      const paymentWithDescriptionArb = fc.record({
        id: userIdArb,
        amount: amountArb,
        status: fc.option(fc.constantFrom('CONFIRMED', 'PENDING', 'FAILED'), { nil: undefined }),
        description: fc.string({ minLength: 1, maxLength: 100 }), // Always defined
        user_id: fc.option(userIdArb, { nil: undefined })
      })

      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentWithDescriptionArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentConfirmed(user, payment)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: When payment has description, it should be included in notification data
            expect(notification.data.paymentDescription).toBe(payment.description)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include retry link in failed payment notification', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentFailed(user, payment)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Failed payment notification should include link to retry
            expect(notification.data.link).toBe('/aluno/comprar')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist payment notifications before publishing via SSE', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          paymentArb,
          async (user, payment) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyUserPaymentConfirmed(user, payment)

            // Property: Notification should be persisted first
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]

            // Property: Persisted notification should have all required fields
            expect(persisted.id).toBeDefined()
            expect(persisted.type).toBe('payment_confirmed')
            expect(persisted.user_id).toBe(user.id)
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()

            // Property: SSE publication should reference the persisted notification
            const publication = mockPublish.publications.find(p => p.topic.includes(user.id))
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 10: Wallet Transaction Creates Notification**
   * **Validates: Requirements 9.1, 9.2, 9.3**
   * 
   * Property 10: Wallet Transaction Creates Notification
   * *For any* wallet transaction (earnings, withdraw request, withdraw processed), 
   * the Notification_System should create a notification for the teacher with the 
   * amount and transaction type.
   */
  describe('Property 10: Wallet Transaction Creates Notification', () => {
    it('should create notification with amount when teacher earns from a booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          bookingArb,
          async (teacher, amount, booking) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherEarnings(teacher, amount, booking)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_earnings')

            // Property: Notification must contain the earnings amount
            expect(notification.data.amount).toBe(amount)

            // Property: Notification must reference the booking
            expect(notification.data.bookingId).toBe(booking.id)
            expect(notification.data.bookingDate).toBe(booking.date)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with amount when teacher requests a withdraw', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          async (teacher, amount, deadline) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherWithdrawRequested(teacher, amount, deadline)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_withdraw_requested')

            // Property: Notification must contain the withdraw amount
            expect(notification.data.withdrawAmount).toBe(amount)

            // Property: If deadline is provided, it should be included
            if (deadline !== undefined) {
              expect(notification.data.withdrawDeadline).toBe(deadline)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification with amount when teacher withdraw is processed', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          async (teacher, amount) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherWithdrawProcessed(teacher, amount)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_withdraw_processed')

            // Property: Notification must contain the withdraw amount
            expect(notification.data.withdrawAmount).toBe(amount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to teacher topic for all wallet transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          bookingArb,
          fc.constantFrom('earnings', 'withdraw_requested', 'withdraw_processed') as fc.Arbitrary<'earnings' | 'withdraw_requested' | 'withdraw_processed'>,
          async (teacher, amount, booking, transactionType) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Call appropriate method based on transaction type
            if (transactionType === 'earnings') {
              await service.notifyTeacherEarnings(teacher, amount, booking)
            } else if (transactionType === 'withdraw_requested') {
              await service.notifyTeacherWithdrawRequested(teacher, amount)
            } else {
              await service.notifyTeacherWithdrawProcessed(teacher, amount)
            }

            // Property: SSE event should be published to teacher's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(teacher.id)
            )
            expect(publication).toBeDefined()

            // Property: Publication should contain correct notification type
            const expectedType = transactionType === 'earnings' ? 'teacher_earnings' 
              : transactionType === 'withdraw_requested' ? 'teacher_withdraw_requested' 
              : 'teacher_withdraw_processed'
            expect(publication?.payload.notification.type).toBe(expectedType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create distinct notifications for each wallet transaction type', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          bookingArb,
          async (teacher, amount, booking) => {
            // Test earnings
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherEarnings(teacher, amount, booking)
            const earningsNotification = mockSupabase.insertedNotifications[0]

            // Test withdraw requested
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherWithdrawRequested(teacher, amount)
            const withdrawRequestedNotification = mockSupabase.insertedNotifications[0]

            // Test withdraw processed
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherWithdrawProcessed(teacher, amount)
            const withdrawProcessedNotification = mockSupabase.insertedNotifications[0]

            // Property: Each transaction type should have a distinct notification type
            expect(earningsNotification.type).toBe('teacher_earnings')
            expect(withdrawRequestedNotification.type).toBe('teacher_withdraw_requested')
            expect(withdrawProcessedNotification.type).toBe('teacher_withdraw_processed')

            // Property: All types should be different
            const types = [earningsNotification.type, withdrawRequestedNotification.type, withdrawProcessedNotification.type]
            const uniqueTypes = new Set(types)
            expect(uniqueTypes.size).toBe(3)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include wallet link in all wallet transaction notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          bookingArb,
          async (teacher, amount, booking) => {
            // Test earnings
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherEarnings(teacher, amount, booking)
            const earningsNotification = mockSupabase.insertedNotifications[0]

            // Test withdraw requested
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherWithdrawRequested(teacher, amount)
            const withdrawRequestedNotification = mockSupabase.insertedNotifications[0]

            // Test withdraw processed
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherWithdrawProcessed(teacher, amount)
            const withdrawProcessedNotification = mockSupabase.insertedNotifications[0]

            // Property: All wallet notifications should include link to wallet page
            expect(earningsNotification.data.link).toBe('/professor/carteira')
            expect(withdrawRequestedNotification.data.link).toBe('/professor/carteira')
            expect(withdrawProcessedNotification.data.link).toBe('/professor/carteira')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist wallet notifications before publishing via SSE', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          amountArb,
          bookingArb,
          async (teacher, amount, booking) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherEarnings(teacher, amount, booking)

            // Property: Notification should be persisted first
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]

            // Property: Persisted notification should have all required fields
            expect(persisted.id).toBeDefined()
            expect(persisted.type).toBe('teacher_earnings')
            expect(persisted.user_id).toBe(teacher.id)
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()

            // Property: SSE publication should reference the persisted notification
            const publication = mockPublish.publications.find(p => p.topic.includes(teacher.id))
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle positive amounts for all wallet transactions', async () => {
      // Ensure amounts are always positive (valid wallet transactions)
      const positiveAmountArb = fc.integer({ min: 1, max: 100000 })

      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          positiveAmountArb,
          bookingArb,
          async (teacher, amount, booking) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherEarnings(teacher, amount, booking)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Amount in notification should match the input amount
            expect(notification.data.amount).toBe(amount)
            expect(notification.data.amount).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 7: Approval Status Creates Notification**
   * **Validates: Requirements 5.3, 5.4**
   * 
   * Property 7: Approval Status Creates Notification
   * *For any* approval decision (approved or rejected), the Notification_System should 
   * create a notification for the teacher with the decision and reason (if rejected).
   */
  describe('Property 7: Approval Status Creates Notification', () => {
    it('should create notification for teacher when approved', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherApproved(teacher, academy)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_approved')

            // Property: Notification must contain academy details
            expect(notification.data.academyName).toBe(academy.name)
            expect(notification.data.academyId).toBe(academy.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification for teacher when rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          async (teacher, academy, reason) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherRejected(teacher, academy, reason)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the teacher
            expect(notification.user_id).toBe(teacher.id)
            expect(notification.type).toBe('teacher_rejected')

            // Property: Notification must contain academy details
            expect(notification.data.academyName).toBe(academy.name)
            expect(notification.data.academyId).toBe(academy.id)

            // Property: If reason is provided, it should be included
            if (reason !== undefined) {
              expect(notification.data.reason).toBe(reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to teacher topic for approval decisions', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          fc.constantFrom('approved', 'rejected') as fc.Arbitrary<'approved' | 'rejected'>,
          async (teacher, academy, decision) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Call appropriate method based on decision
            if (decision === 'approved') {
              await service.notifyTeacherApproved(teacher, academy)
            } else {
              await service.notifyTeacherRejected(teacher, academy, 'Test rejection reason')
            }

            // Property: SSE event should be published to teacher's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(teacher.id)
            )
            expect(publication).toBeDefined()

            // Property: Publication should contain correct notification type
            const expectedType = decision === 'approved' ? 'teacher_approved' : 'teacher_rejected'
            expect(publication?.payload.notification.type).toBe(expectedType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create distinct notifications for approved vs rejected decisions', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            // Test approved
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherApproved(teacher, academy)
            const approvedNotification = mockSupabase.insertedNotifications[0]

            // Test rejected
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherRejected(teacher, academy, 'Test reason')
            const rejectedNotification = mockSupabase.insertedNotifications[0]

            // Property: Each decision should have a distinct notification type
            expect(approvedNotification.type).toBe('teacher_approved')
            expect(rejectedNotification.type).toBe('teacher_rejected')

            // Property: Types should be different
            expect(approvedNotification.type).not.toBe(rejectedNotification.type)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include dashboard link in approval notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            // Test approved
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherApproved(teacher, academy)
            const approvedNotification = mockSupabase.insertedNotifications[0]

            // Test rejected
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyTeacherRejected(teacher, academy)
            const rejectedNotification = mockSupabase.insertedNotifications[0]

            // Property: Both approval notifications should include link to dashboard
            expect(approvedNotification.data.link).toBe('/professor/dashboard')
            expect(rejectedNotification.data.link).toBe('/professor/dashboard')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist approval notifications before publishing via SSE', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherApproved(teacher, academy)

            // Property: Notification should be persisted first
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]

            // Property: Persisted notification should have all required fields
            expect(persisted.id).toBeDefined()
            expect(persisted.type).toBe('teacher_approved')
            expect(persisted.user_id).toBe(teacher.id)
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()

            // Property: SSE publication should reference the persisted notification
            const publication = mockPublish.publications.find(p => p.topic.includes(teacher.id))
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include academy_id in notification for proper routing', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyTeacherApproved(teacher, academy)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification should include academy_id for proper routing
            expect(notification.academy_id).toBe(academy.id)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-system, Property 8: New Registration Creates Admin Notification**
   * **Validates: Requirements 5.1, 5.2**
   * 
   * Property 8: New Registration Creates Admin Notification
   * *For any* new teacher or student registration requiring approval, the Notification_System 
   * should create a notification for the franchise administrators.
   */
  describe('Property 8: New Registration Creates Admin Notification', () => {
    it('should create notification for franchise admin when new teacher registers', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseNewTeacher(teacher, academy)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the academy (franchise admin)
            expect(notification.academy_id).toBe(academy.id)
            expect(notification.type).toBe('franchise_new_teacher')

            // Property: Notification must contain teacher details
            expect(notification.data.teacherName).toBe(teacher.full_name || teacher.name || '')
            expect(notification.data.teacherId).toBe(teacher.id)
            expect(notification.data.academyName).toBe(academy.name)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create notification for franchise admin when new student registers', async () => {
      await fc.assert(
        fc.asyncProperty(
          studentArb,
          academyArb,
          async (student, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseNewStudent(student, academy)

            // Property: Exactly 1 notification should be created
            expect(mockSupabase.insertedNotifications.length).toBe(1)

            const notification = mockSupabase.insertedNotifications[0]

            // Property: Notification must go to the academy (franchise admin)
            expect(notification.academy_id).toBe(academy.id)
            expect(notification.type).toBe('franchise_new_student')

            // Property: Notification must contain student details
            expect(notification.data.studentName).toBe(student.full_name || student.name || '')
            expect(notification.data.studentId).toBe(student.id)
            expect(notification.data.academyName).toBe(academy.name)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should publish SSE event to academy topic for new registrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          studentArb,
          academyArb,
          fc.constantFrom('teacher', 'student') as fc.Arbitrary<'teacher' | 'student'>,
          async (teacher, student, academy, registrationType) => {
            mockSupabase.reset()
            mockPublish.reset()

            // Call appropriate method based on registration type
            if (registrationType === 'teacher') {
              await service.notifyFranchiseNewTeacher(teacher, academy)
            } else {
              await service.notifyFranchiseNewStudent(student, academy)
            }

            // Property: SSE event should be published to academy's topic
            const publication = mockPublish.publications.find(
              p => p.topic.includes(academy.id)
            )
            expect(publication).toBeDefined()

            // Property: Publication should contain correct notification type
            const expectedType = registrationType === 'teacher' ? 'franchise_new_teacher' : 'franchise_new_student'
            expect(publication?.payload.notification.type).toBe(expectedType)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create distinct notifications for teacher vs student registrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          studentArb,
          academyArb,
          async (teacher, student, academy) => {
            // Test teacher registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewTeacher(teacher, academy)
            const teacherNotification = mockSupabase.insertedNotifications[0]

            // Test student registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewStudent(student, academy)
            const studentNotification = mockSupabase.insertedNotifications[0]

            // Property: Each registration type should have a distinct notification type
            expect(teacherNotification.type).toBe('franchise_new_teacher')
            expect(studentNotification.type).toBe('franchise_new_student')

            // Property: Types should be different
            expect(teacherNotification.type).not.toBe(studentNotification.type)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include management link in registration notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          studentArb,
          academyArb,
          async (teacher, student, academy) => {
            // Test teacher registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewTeacher(teacher, academy)
            const teacherNotification = mockSupabase.insertedNotifications[0]

            // Test student registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewStudent(student, academy)
            const studentNotification = mockSupabase.insertedNotifications[0]

            // Property: Teacher registration notification should link to teachers management
            expect(teacherNotification.data.link).toBe('/franquia/dashboard/professores')

            // Property: Student registration notification should link to students management
            expect(studentNotification.data.link).toBe('/franquia/dashboard/alunos')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist registration notifications before publishing via SSE', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          academyArb,
          async (teacher, academy) => {
            mockSupabase.reset()
            mockPublish.reset()

            await service.notifyFranchiseNewTeacher(teacher, academy)

            // Property: Notification should be persisted first
            expect(mockSupabase.insertedNotifications.length).toBe(1)
            const persisted = mockSupabase.insertedNotifications[0]

            // Property: Persisted notification should have all required fields
            expect(persisted.id).toBeDefined()
            expect(persisted.type).toBe('franchise_new_teacher')
            expect(persisted.academy_id).toBe(academy.id)
            expect(persisted.read).toBe(false)
            expect(persisted.created_at).toBeDefined()

            // Property: SSE publication should reference the persisted notification
            const publication = mockPublish.publications.find(p => p.topic.includes(academy.id))
            expect(publication?.payload.notification.id).toBe(persisted.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include actor_id and role_scope for audit trail', async () => {
      await fc.assert(
        fc.asyncProperty(
          teacherArb,
          studentArb,
          academyArb,
          async (teacher, student, academy) => {
            // Test teacher registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewTeacher(teacher, academy)
            const teacherNotification = mockSupabase.insertedNotifications[0]

            // Test student registration
            mockSupabase.reset()
            mockPublish.reset()
            await service.notifyFranchiseNewStudent(student, academy)
            const studentNotification = mockSupabase.insertedNotifications[0]

            // Property: Teacher registration should have teacher as actor
            expect(teacherNotification.actor_id).toBe(teacher.id)
            expect(teacherNotification.role_scope).toBe('teacher')

            // Property: Student registration should have student as actor
            expect(studentNotification.actor_id).toBe(student.id)
            expect(studentNotification.role_scope).toBe('student')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle registrations for different academies correctly', async () => {
      // Ensure academies have different IDs
      const distinctAcademyIdsArb = fc.tuple(userIdArb, userIdArb).filter(([a, b]) => a !== b)

      await fc.assert(
        fc.asyncProperty(
          distinctAcademyIdsArb,
          teacherArb,
          nameArb,
          nameArb,
          async ([academyId1, academyId2], teacher, academyName1, academyName2) => {
            mockSupabase.reset()
            mockPublish.reset()

            const academy1: Academy = { id: academyId1, name: academyName1 }
            const academy2: Academy = { id: academyId2, name: academyName2 }

            // Register teacher in academy1
            await service.notifyFranchiseNewTeacher(teacher, academy1)
            const notification1 = mockSupabase.insertedNotifications[0]

            mockSupabase.reset()
            mockPublish.reset()

            // Register same teacher in academy2
            await service.notifyFranchiseNewTeacher(teacher, academy2)
            const notification2 = mockSupabase.insertedNotifications[0]

            // Property: Notifications should go to different academies
            expect(notification1.academy_id).toBe(academyId1)
            expect(notification2.academy_id).toBe(academyId2)
            expect(notification1.academy_id).not.toBe(notification2.academy_id)

            // Property: Academy names should be correctly included
            expect(notification1.data.academyName).toBe(academyName1)
            expect(notification2.data.academyName).toBe(academyName2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
