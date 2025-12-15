/**
 * NotificationService - Serviço centralizado de notificações
 * 
 * Este serviço encapsula toda a lógica de criação e publicação de notificações,
 * garantindo persistência no banco de dados e entrega em tempo real via SSE.
 * 
 * Requirements: 8.1, 8.2, 8.3 - Entrega em tempo real
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { NotificationType } from '../types/notification-types'
import { NotificationBuilder, NotificationData, NotificationPayload } from './notification-builder'
import { publish, topicForAcademy, topicForUser, topicForFranqueadora } from '../lib/notify'

// Type definitions for entities
export interface User {
  id: string
  name?: string
  full_name?: string
  email?: string
}

export interface Student extends User {
  credits?: number
}

export interface Teacher extends User {
  academy_id?: string
}

export interface Booking {
  id: string
  date: string | Date
  start_time?: string
  end_time?: string
  student_id?: string
  teacher_id?: string
  academy_id?: string
  status?: string
}

export interface Checkin {
  id: string
  booking_id?: string
  student_id?: string
  teacher_id?: string
  academy_id?: string
  created_at?: string | Date
}

export interface Academy {
  id: string
  name?: string
  franqueadora_id?: string
}

export interface Payment {
  id: string
  amount: number
  status?: string
  description?: string
  user_id?: string
}

export interface Rating {
  id: string
  rating: number
  comment?: string
  student_id?: string
  teacher_id?: string
}

export interface Franchise {
  id: string
  name?: string
  franqueadora_id?: string
}

export interface Franqueadora {
  id: string
  name?: string
}

export interface Lead {
  id: string
  name?: string
  email?: string
}

export interface Policy {
  id: string
  name?: string
}

export interface Review {
  id: string
  rating: number
  comment?: string
}

export interface Conflict {
  teacher_id: string
  booking_id: string
  date: string
  time: string
}

interface NotificationRecord {
  id: string
  academy_id?: string
  user_id?: string
  type: string
  title: string
  message: string
  data: Record<string, any>
  link?: string
  actor_id?: string
  role_scope?: string
  read: boolean
  created_at: string
}

export class NotificationService {
  private supabase: SupabaseClient
  private builder: NotificationBuilder
  private publishFn: typeof publish

  constructor(
    supabase: SupabaseClient,
    publishFn: typeof publish = publish
  ) {
    this.supabase = supabase
    this.builder = new NotificationBuilder()
    this.publishFn = publishFn
  }

  /**
   * Método privado que persiste a notificação no banco e publica via SSE
   * Requirements: 8.1, 8.2, 8.3
   */
  private async createAndPublish(params: {
    userId?: string
    academyId?: string
    type: NotificationType
    data: NotificationData
    actorId?: string
    roleScope?: string
  }): Promise<NotificationRecord | null> {
    const { userId, academyId, type, data, actorId, roleScope } = params
    
    // Build notification payload
    const payload = this.builder.build(type, data)
    
    try {
      // Persist to database first (Requirement 8.2)
      const { data: rows, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId || null,
          academy_id: academyId || null,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data,
          link: payload.link || null,
          actor_id: actorId || null,
          role_scope: roleScope || null,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      if (error) {
        console.error('Error persisting notification:', error)
        return null
      }

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (!inserted) return null

      // Publish via SSE (Requirement 8.1 - less than 1 second)
      try {
        if (userId) {
          this.publishFn(topicForUser(userId), {
            event: 'notification',
            notification: inserted
          })
        }
        
        if (academyId) {
          this.publishFn(topicForAcademy(academyId), {
            event: 'notification',
            notification: inserted
          })
          
          // Also publish to franqueadora if academy belongs to one
          const { data: academy } = await this.supabase
            .from('academies')
            .select('franqueadora_id')
            .eq('id', academyId)
            .single()
          
          if (academy?.franqueadora_id) {
            this.publishFn(topicForFranqueadora(academy.franqueadora_id), {
              event: 'notification',
              notification: inserted
            })
          }
        }
      } catch (publishError) {
        // SSE publish failure should not break the flow
        // Notification is already persisted for later delivery (Requirement 8.3)
        console.error('Error publishing notification via SSE:', publishError)
      }

      return inserted as NotificationRecord
    } catch (error) {
      console.error('Error in createAndPublish:', error)
      return null
    }
  }

  /**
   * Helper to get user display name
   */
  private getUserName(user: User | undefined): string {
    if (!user) return ''
    return user.full_name || user.name || ''
  }

  /**
   * Helper to format booking time
   */
  private formatBookingTime(booking: Booking): string {
    return booking.start_time || ''
  }


  // ============================================
  // Bookings - Professor (Requirements 1.1-1.7)
  // ============================================

  /**
   * Notifica professor sobre novo agendamento
   * Requirement 1.1
   */
  async notifyTeacherNewBooking(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_new_booking',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre cancelamento de agendamento
   * Requirement 1.2
   */
  async notifyTeacherBookingCancelled(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_booking_cancelled',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre reagendamento
   * Requirement 1.3
   */
  async notifyTeacherBookingRescheduled(
    booking: Booking,
    student: Student,
    teacher: Teacher,
    oldDate: Date | string
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_booking_rescheduled',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        oldDate,
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre lembrete de aula (24h antes)
   * Requirement 1.4
   */
  async notifyTeacherBookingReminder(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_booking_reminder',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      }
    })
  }

  /**
   * Notifica professor sobre aluno com créditos baixos
   * Requirement 1.5
   */
  async notifyTeacherStudentLowCredits(
    student: Student,
    teacher: Teacher,
    booking: Booking
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_student_low_credits',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        studentName: this.getUserName(student),
        balance: student.credits || 0,
        link: `/professor/alunos`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre novo aluno vinculado
   * Requirement 1.6
   */
  async notifyTeacherNewStudent(
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: teacher.academy_id,
      type: 'teacher_new_student',
      data: {
        studentName: this.getUserName(student),
        link: `/professor/alunos`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre nova avaliação
   * Requirement 1.7
   */
  async notifyTeacherNewRating(
    rating: Rating,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: teacher.academy_id,
      type: 'teacher_new_rating',
      data: {
        rating: rating.rating,
        ratingComment: rating.comment,
        studentName: this.getUserName(student),
        link: `/professor/dashboard`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }


  // ============================================
  // Bookings - Aluno (Requirements 2.1-2.5)
  // ============================================

  /**
   * Notifica aluno sobre confirmação de aula
   * Requirement 2.2
   */
  async notifyStudentBookingConfirmed(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking.academy_id,
      type: 'student_booking_confirmed',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        teacherName: this.getUserName(teacher),
        link: `/aluno/historico`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }

  /**
   * Notifica aluno sobre cancelamento de aula pelo professor
   * Requirement 2.1
   */
  async notifyStudentBookingCancelled(
    booking: Booking,
    student: Student,
    teacher: Teacher,
    reason?: string
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking.academy_id,
      type: 'student_booking_cancelled',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        teacherName: this.getUserName(teacher),
        reason,
        link: `/aluno/agendar`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }

  /**
   * Notifica aluno sobre lembrete de aula (24h antes)
   * Requirement 2.3
   */
  async notifyStudentBookingReminder(
    booking: Booking,
    student: Student,
    teacher: Teacher,
    academyName?: string
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking.academy_id,
      type: 'student_booking_reminder',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        teacherName: this.getUserName(teacher),
        academyName,
        link: `/aluno/historico`
      }
    })
  }

  /**
   * Notifica aluno sobre aula concluída (para avaliar)
   * Requirement 2.4
   */
  async notifyStudentBookingCompleted(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking.academy_id,
      type: 'student_booking_completed',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        teacherName: this.getUserName(teacher),
        link: `/aluno/historico`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }

  /**
   * Notifica aluno sobre agendamento criado com sucesso
   * Requirement 2.5
   */
  async notifyStudentBookingCreated(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking.academy_id,
      type: 'student_booking_created',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        teacherName: this.getUserName(teacher),
        link: `/aluno/historico`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }


  // ============================================
  // Credits - Aluno (Requirements 3.1-3.7)
  // ============================================

  /**
   * Notifica aluno sobre créditos debitados
   * Requirement 3.1
   */
  async notifyStudentCreditsDebited(
    student: Student,
    amount: number,
    balance: number,
    booking?: Booking
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      academyId: booking?.academy_id,
      type: 'student_credits_debited',
      data: {
        amount,
        balance,
        bookingId: booking?.id,
        bookingDate: booking?.date,
        link: `/aluno/comprar`
      }
    })
  }

  /**
   * Notifica aluno sobre saldo baixo (abaixo de 2 aulas)
   * Requirement 3.2
   */
  async notifyStudentCreditsLow(
    student: Student,
    balance: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_low',
      data: {
        balance,
        threshold: 2,
        link: `/aluno/comprar`
      }
    })
  }

  /**
   * Notifica aluno sobre compra de créditos confirmada
   * Requirement 3.3
   */
  async notifyStudentCreditsPurchased(
    student: Student,
    amount: number,
    newBalance: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_purchased',
      data: {
        amount,
        balance: newBalance,
        link: `/aluno/dashboard`
      }
    })
  }

  /**
   * Notifica aluno sobre créditos estornados
   * Requirement 3.4
   */
  async notifyStudentCreditsRefunded(
    student: Student,
    amount: number,
    newBalance: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_refunded',
      data: {
        amount,
        balance: newBalance,
        link: `/aluno/dashboard`
      }
    })
  }

  /**
   * Notifica aluno sobre créditos expirando (7 dias)
   * Requirement 3.5
   */
  async notifyStudentCreditsExpiring(
    student: Student,
    amount: number,
    expirationDate: Date | string
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_expiring',
      data: {
        amount,
        expirationDate,
        link: `/aluno/agendar`
      }
    })
  }

  /**
   * Notifica aluno sobre créditos expirados
   * Requirement 3.6
   */
  async notifyStudentCreditsExpired(
    student: Student,
    amount: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_expired',
      data: {
        amount,
        link: `/aluno/comprar`
      }
    })
  }

  /**
   * Notifica aluno sobre saldo zerado
   * Requirement 3.7
   */
  async notifyStudentCreditsZero(
    student: Student
  ): Promise<void> {
    await this.createAndPublish({
      userId: student.id,
      type: 'student_credits_zero',
      data: {
        balance: 0,
        link: `/aluno/comprar`
      }
    })
  }


  // ============================================
  // Check-in (Requirements 6.1-6.3)
  // ============================================

  /**
   * Notifica professor sobre check-in do aluno
   * Requirement 6.1
   */
  async notifyTeacherStudentCheckin(
    checkin: Checkin,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: checkin.academy_id,
      type: 'teacher_student_checkin',
      data: {
        checkinId: checkin.id,
        bookingId: checkin.booking_id,
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre aluno que não fez check-in (no-show)
   * Requirement 6.3
   */
  async notifyTeacherStudentNoShow(
    booking: Booking,
    student: Student,
    teacher: Teacher
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_student_noshow',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        studentName: this.getUserName(student),
        link: `/professor/agenda`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica franquia sobre check-in
   * Requirement 6.2
   */
  async notifyFranchiseCheckin(
    checkin: Checkin,
    student: Student,
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_checkin',
      data: {
        checkinId: checkin.id,
        bookingId: checkin.booking_id,
        studentName: this.getUserName(student),
        academyName: academy.name
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }


  // ============================================
  // Wallet - Professor (Requirements 9.1-9.4)
  // ============================================

  /**
   * Notifica professor sobre valor creditado na carteira
   * Requirement 9.1
   */
  async notifyTeacherEarnings(
    teacher: Teacher,
    amount: number,
    booking: Booking
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: booking.academy_id,
      type: 'teacher_earnings',
      data: {
        amount,
        bookingId: booking.id,
        bookingDate: booking.date,
        link: `/professor/carteira`
      }
    })
  }

  /**
   * Notifica professor sobre saque solicitado
   * Requirement 9.2
   */
  async notifyTeacherWithdrawRequested(
    teacher: Teacher,
    amount: number,
    deadline?: string
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: teacher.academy_id,
      type: 'teacher_withdraw_requested',
      data: {
        withdrawAmount: amount,
        withdrawDeadline: deadline,
        link: `/professor/carteira`
      }
    })
  }

  /**
   * Notifica professor sobre saque processado
   * Requirement 9.3
   */
  async notifyTeacherWithdrawProcessed(
    teacher: Teacher,
    amount: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: teacher.academy_id,
      type: 'teacher_withdraw_processed',
      data: {
        withdrawAmount: amount,
        link: `/professor/carteira`
      }
    })
  }

  /**
   * Notifica professor sobre saldo disponível para saque
   * Requirement 9.4
   */
  async notifyTeacherWithdrawAvailable(
    teacher: Teacher,
    balance: number
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: teacher.academy_id,
      type: 'teacher_withdraw_available',
      data: {
        balance,
        link: `/professor/carteira`
      }
    })
  }


  // ============================================
  // Payments (Requirements 4.1-4.3)
  // ============================================

  /**
   * Notifica usuário sobre pagamento confirmado
   * Requirement 4.1
   */
  async notifyUserPaymentConfirmed(
    user: User,
    payment: Payment
  ): Promise<void> {
    await this.createAndPublish({
      userId: user.id,
      type: 'payment_confirmed',
      data: {
        paymentId: payment.id,
        paymentValue: payment.amount,
        paymentDescription: payment.description,
        link: `/aluno/comprar`
      }
    })
  }

  /**
   * Notifica usuário sobre pagamento que falhou
   * Requirement 4.2
   */
  async notifyUserPaymentFailed(
    user: User,
    payment: Payment,
    reason?: string
  ): Promise<void> {
    await this.createAndPublish({
      userId: user.id,
      type: 'payment_failed',
      data: {
        paymentId: payment.id,
        paymentValue: payment.amount,
        paymentReason: reason,
        link: `/aluno/comprar`
      }
    })
  }

  /**
   * Notifica usuário sobre reembolso processado
   * Requirement 4.3
   */
  async notifyUserPaymentRefunded(
    user: User,
    payment: Payment
  ): Promise<void> {
    await this.createAndPublish({
      userId: user.id,
      type: 'payment_refunded',
      data: {
        paymentId: payment.id,
        paymentValue: payment.amount,
        link: `/aluno/dashboard`
      }
    })
  }


  // ============================================
  // Approvals (Requirements 5.1-5.4)
  // ============================================

  /**
   * Notifica franquia sobre novo professor cadastrado
   * Requirement 5.1
   */
  async notifyFranchiseNewTeacher(
    teacher: Teacher,
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_new_teacher',
      data: {
        teacherName: this.getUserName(teacher),
        teacherId: teacher.id,
        academyName: academy.name,
        link: `/franquia/dashboard/professores`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }

  /**
   * Notifica franquia sobre novo aluno cadastrado
   * Requirement 5.2
   */
  async notifyFranchiseNewStudent(
    student: Student,
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_new_student',
      data: {
        studentName: this.getUserName(student),
        studentId: student.id,
        academyName: academy.name,
        link: `/franquia/dashboard/alunos`
      },
      actorId: student.id,
      roleScope: 'student'
    })
  }

  /**
   * Notifica professor sobre aprovação
   * Requirement 5.3
   */
  async notifyTeacherApproved(
    teacher: Teacher,
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: academy.id,
      type: 'teacher_approved',
      data: {
        academyName: academy.name,
        academyId: academy.id,
        link: `/professor/dashboard`
      }
    })
  }

  /**
   * Notifica professor sobre rejeição
   * Requirement 5.4
   */
  async notifyTeacherRejected(
    teacher: Teacher,
    academy: Academy,
    reason?: string
  ): Promise<void> {
    await this.createAndPublish({
      userId: teacher.id,
      academyId: academy.id,
      type: 'teacher_rejected',
      data: {
        academyName: academy.name,
        academyId: academy.id,
        reason,
        link: `/professor/dashboard`
      }
    })
  }


  // ============================================
  // Franquia - Academia (Requirements 7.1-7.10)
  // ============================================

  /**
   * Notifica franquia sobre novo agendamento
   * Requirement 7.1
   */
  async notifyFranchiseNewBooking(
    booking: Booking,
    academy: Academy,
    studentName?: string,
    teacherName?: string
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_new_booking',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        bookingTime: this.formatBookingTime(booking),
        studentName,
        teacherName,
        academyName: academy.name
      }
    })
  }

  /**
   * Notifica franquia sobre cancelamento de agendamento
   * Requirement 7.2
   */
  async notifyFranchiseBookingCancelled(
    booking: Booking,
    academy: Academy,
    studentName?: string,
    teacherName?: string
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_booking_cancelled',
      data: {
        bookingId: booking.id,
        bookingDate: booking.date,
        studentName,
        teacherName,
        academyName: academy.name
      }
    })
  }

  /**
   * Notifica franquia sobre pagamento recebido
   * Requirement 7.5
   */
  async notifyFranchisePaymentReceived(
    payment: Payment,
    academy: Academy,
    userName?: string
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_payment_received',
      data: {
        paymentId: payment.id,
        paymentValue: payment.amount,
        userName,
        academyName: academy.name
      }
    })
  }

  /**
   * Notifica franquia sobre pagamento que falhou
   * Requirement 7.6
   */
  async notifyFranchisePaymentFailed(
    payment: Payment,
    academy: Academy,
    userName?: string
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_payment_failed',
      data: {
        paymentId: payment.id,
        paymentValue: payment.amount,
        userName,
        academyName: academy.name
      }
    })
  }

  /**
   * Notifica franquia sobre solicitação de saque
   * Requirement 7.8
   */
  async notifyFranchiseWithdrawRequest(
    teacher: Teacher,
    amount: number,
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_withdraw_request',
      data: {
        teacherName: this.getUserName(teacher),
        teacherId: teacher.id,
        withdrawAmount: amount,
        academyName: academy.name,
        link: `/franquia/dashboard/saques`
      },
      actorId: teacher.id,
      roleScope: 'teacher'
    })
  }

  /**
   * Notifica franquia sobre conflito de horários
   * Requirement 7.9
   */
  async notifyFranchiseScheduleConflict(
    conflicts: Conflict[],
    academy: Academy
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_schedule_conflict',
      data: {
        conflicts,
        conflictCount: conflicts.length,
        academyName: academy.name,
        link: `/franquia/dashboard/agenda`
      }
    })
  }

  /**
   * Notifica franquia sobre aluno inativo
   * Requirement 7.10
   */
  async notifyFranchiseInactiveStudent(
    student: Student,
    academy: Academy,
    daysSinceLastActivity: number
  ): Promise<void> {
    await this.createAndPublish({
      academyId: academy.id,
      type: 'franchise_inactive_student',
      data: {
        studentName: this.getUserName(student),
        studentId: student.id,
        daysSinceLastActivity,
        academyName: academy.name,
        link: `/franquia/dashboard/alunos`
      }
    })
  }


  // ============================================
  // Franqueadora (Requirements 11.1-11.8)
  // ============================================

  /**
   * Notifica franqueadora sobre nova franquia ativada
   * Requirement 11.1
   */
  async notifyFranqueadoraNewFranchise(
    franchise: Franchise,
    franqueadora: Franqueadora
  ): Promise<void> {
    // Publish directly to franqueadora topic
    const payload = this.builder.build('franqueadora_new_franchise', {
      franchiseName: franchise.name,
      franchiseId: franchise.id
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            franqueadoraId: franqueadora.id
          },
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franqueadora sobre novo lead
   * Requirement 11.2
   */
  async notifyFranqueadoraNewLead(
    lead: Lead,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_new_lead', {
      leadName: lead.name,
      leadEmail: lead.email
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            leadId: lead.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/leads`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franquias sobre atualização de políticas
   * Requirement 11.3
   */
  async notifyFranqueadoraPolicyUpdated(
    policy: Policy,
    affectedFranchises: Franchise[]
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_policy_updated', {
      policyName: policy.name
    })

    // Notify each affected franchise
    for (const franchise of affectedFranchises) {
      await this.createAndPublish({
        academyId: franchise.id,
        type: 'franqueadora_policy_updated',
        data: {
          policyId: policy.id,
          policyName: policy.name,
          franchiseId: franchise.id,
          link: `/franquia/dashboard/politicas`
        }
      })
    }
  }

  /**
   * Notifica franqueadora sobre meta de faturamento atingida
   * Requirement 11.4
   */
  async notifyFranqueadoraRevenueMilestone(
    franchise: Franchise,
    milestone: number,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_revenue_milestone', {
      franchiseName: franchise.name,
      milestone
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            franchiseId: franchise.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/relatorios`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franqueadora sobre queda de agendamentos
   * Requirement 11.5
   */
  async notifyFranqueadoraBookingDrop(
    franchise: Franchise,
    dropPercentage: number,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_booking_drop', {
      franchiseName: franchise.name,
      dropPercentage
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            franchiseId: franchise.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/relatorios`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franqueadora sobre professor aprovado
   * Requirement 11.6
   */
  async notifyFranqueadoraTeacherApproved(
    teacher: Teacher,
    franchise: Franchise,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_teacher_approved', {
      teacherName: this.getUserName(teacher),
      franchiseName: franchise.name
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            teacherId: teacher.id,
            franchiseId: franchise.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/professores`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franqueadora sobre avaliação negativa
   * Requirement 11.7
   */
  async notifyFranqueadoraNegativeReview(
    review: Review,
    franchise: Franchise,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_negative_review', {
      franchiseName: franchise.name,
      rating: review.rating,
      ratingComment: review.comment
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            reviewId: review.id,
            franchiseId: franchise.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/avaliacoes`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }

  /**
   * Notifica franqueadora sobre pagamento de royalties
   * Requirement 11.8
   */
  async notifyFranqueadoraRoyaltyPayment(
    payment: Payment,
    franchise: Franchise,
    franqueadora: Franqueadora
  ): Promise<void> {
    const payload = this.builder.build('franqueadora_royalty_payment', {
      franchiseName: franchise.name,
      paymentValue: payment.amount
    })

    try {
      const { data: rows } = await this.supabase
        .from('notifications')
        .insert({
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: {
            ...payload.data,
            paymentId: payment.id,
            franchiseId: franchise.id,
            franqueadoraId: franqueadora.id
          },
          link: `/franqueadora/dashboard/financeiro`,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('*')

      const inserted = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        this.publishFn(topicForFranqueadora(franqueadora.id), {
          event: 'notification',
          notification: inserted
        })
      }
    } catch (error) {
      console.error('Error notifying franqueadora:', error)
    }
  }
}

// Export singleton instance factory
export function createNotificationService(supabase: SupabaseClient): NotificationService {
  return new NotificationService(supabase)
}

export default NotificationService
