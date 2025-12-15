import { createUserNotification, createNotification } from '../routes/notifications'
import { NotificationService } from '../services/notification.service'
import { supabase } from './supabase'

// Singleton instance of NotificationService
let notificationServiceInstance: NotificationService | null = null

function getNotificationService(): NotificationService {
    if (!notificationServiceInstance) {
        notificationServiceInstance = new NotificationService(supabase)
    }
    return notificationServiceInstance
}

/**
 * Disparado quando dados sensíveis da conta são alterados (por franqueadora ou admin)
 */
export async function onAccountUpdated(userId: string, actorId: string, roleScope: string) {
    return createUserNotification(
        userId,
        'teacher_approval_needed', // Usando um tipo existente por enquanto
        'Sua conta foi atualizada',
        'Houve uma atualização no seu perfil.',
        {},
        '/minha-conta',
        actorId,
        roleScope
    )
}

/**
 * Disparado quando um professor publica uma nova aula
 */
export async function onNewLessonPublished(alunoIds: string[], professorId: string, aulaId: string, professorName: string) {
    const promises = alunoIds.map(alunoId =>
        createUserNotification(
            alunoId,
            'new_booking', // Tipo genérico
            'Nova aula disponível',
            `O professor ${professorName} publicou uma nova aula.`,
            { aulaId },
            `/aluno/aulas/${aulaId}`,
            professorId,
            'aluno'
        )
    )
    return Promise.all(promises)
}

/**
 * Disparado quando uma solicitação de vínculo é aprovada/rejeitada
 */
export async function onConnectionRequestResponded(teacherId: string, studentId: string, studentName: string, status: 'APPROVED' | 'REJECTED') {
    const message = status === 'APPROVED'
        ? `O aluno ${studentName} aceitou seu convite!`
        : `O aluno ${studentName} recusou seu convite.`

    return createUserNotification(
        teacherId,
        'student_approval_needed',
        'Atualização de Vínculo',
        message,
        { student_id: studentId },
        `/professor/alunos`,
        studentId,
        'professor'
    )
}

/**
 * Disparado quando um professor solicita vínculo a um aluno existente
 */
export async function onConnectionRequested(studentId: string, teacherId: string, teacherName: string, requestId: string) {
    return createUserNotification(
        studentId,
        'student_approval_needed',
        'Solicitação de Vínculo',
        `${teacherName} quer adicionar você como aluno. Aceita o vínculo?`,
        {
            teacher_id: teacherId,
            request_id: requestId,
            action: 'approve_connection'
        },
        '/professor/alunos', // Ou rota de notificações
        teacherId,
        'professor'
    )
}

/**
 * Disparado quando um professor atualiza dados do aluno
 */
export async function onStudentDataUpdated(studentId: string, teacherId: string, teacherName: string) {
    return createUserNotification(
        studentId,
        'student_approval_needed', // Tipo info
        'Dados Atualizados',
        `${teacherName} atualizou seus dados de aluno.`,
        { teacher_id: teacherId },
        undefined, // Sem link específico
        teacherId,
        'professor'
    )
}

/**
 * Disparado quando um professor remove um aluno
 */
export async function onStudentRemoved(studentId: string, teacherId: string, teacherName: string) {
    return createUserNotification(
        studentId,
        'student_approval_needed', // Tipo info
        'Vínculo Encerrado',
        `${teacherName} removeu você da carteira de alunos.`,
        { teacher_id: teacherId },
        undefined,
        teacherId,
        'professor'
    )
}

/**
 * Disparado quando uma nova reserva é criada (pelos alunos ou professores)
 * Requirements: 1.1, 2.5, 7.1
 */
export async function onBookingCreated(
    franchiseId: string,
    teacherId: string,
    studentId: string,
    date: string,
    bookingId: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch student and teacher data for proper notification messages
        const [studentResult, teacherResult, academyResult] = await Promise.all([
            supabase.from('users').select('id, name, full_name, email').eq('id', studentId).single(),
            supabase.from('users').select('id, name, full_name, email, academy_id').eq('id', teacherId).single(),
            supabase.from('academies').select('id, name, franqueadora_id').eq('id', franchiseId).single()
        ])

        const studentData = studentResult.data
        const teacherData = teacherResult.data
        const academyData = academyResult.data

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }
        
        const teacher = {
            id: teacherId,
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: teacherData?.academy_id
        }
        
        const academy = {
            id: franchiseId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        const booking = {
            id: bookingId,
            date,
            academy_id: franchiseId,
            student_id: studentId,
            teacher_id: teacherId
        }

        // 1. Notificar Professor (Requirement 1.1)
        await notificationService.notifyTeacherNewBooking(booking, student, teacher)

        // 2. Notificar Aluno (Requirement 2.5)
        await notificationService.notifyStudentBookingCreated(booking, student, teacher)

        // 3. Notificar Franquia (Requirement 7.1)
        await notificationService.notifyFranchiseNewBooking(
            booking,
            academy,
            student.name || student.full_name,
            teacher.name || teacher.full_name
        )

        console.log(`[onBookingCreated] Notificações enviadas para booking ${bookingId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onBookingCreated] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando uma reserva é cancelada
 * Requirements: 1.2, 2.1, 7.2
 */
export async function onBookingCancelled(
    franchiseId: string | null,
    teacherId: string | null,
    studentId: string | null,
    bookingId: string,
    cancelledBy: 'student' | 'teacher' | 'admin'
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch booking details
        const { data: bookingData } = await supabase
            .from('bookings')
            .select('id, date, start_at, end_at, franchise_id, student_id, teacher_id')
            .eq('id', bookingId)
            .single()

        const booking = bookingData || {
            id: bookingId,
            date: new Date().toISOString(),
            academy_id: franchiseId
        }

        // Fetch related entities
        const [studentResult, teacherResult, academyResult] = await Promise.all([
            studentId ? supabase.from('users').select('id, name, full_name, email').eq('id', studentId).single() : Promise.resolve({ data: null }),
            teacherId ? supabase.from('users').select('id, name, full_name, email, academy_id').eq('id', teacherId).single() : Promise.resolve({ data: null }),
            franchiseId ? supabase.from('academies').select('id, name, franqueadora_id').eq('id', franchiseId).single() : Promise.resolve({ data: null })
        ])

        const studentData = studentResult.data
        const teacherData = teacherResult.data
        const academyData = academyResult.data

        const student = {
            id: studentId || '',
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }
        
        const teacher = {
            id: teacherId || '',
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: teacherData?.academy_id
        }
        
        const academy = {
            id: franchiseId || '',
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Determine who to notify based on who cancelled
        // Requirement 1.2: If student cancels, notify teacher
        // Requirement 2.1: If teacher cancels, notify student
        if (cancelledBy === 'student' && teacherId) {
            // Student cancelled - notify teacher (Requirement 1.2)
            await notificationService.notifyTeacherBookingCancelled(booking, student, teacher)
        } else if (cancelledBy === 'teacher' && studentId) {
            // Teacher cancelled - notify student (Requirement 2.1)
            await notificationService.notifyStudentBookingCancelled(booking, student, teacher)
        } else if (cancelledBy === 'admin') {
            // Admin cancelled - notify both parties
            if (teacherId) {
                await notificationService.notifyTeacherBookingCancelled(booking, student, teacher)
            }
            if (studentId) {
                await notificationService.notifyStudentBookingCancelled(booking, student, teacher)
            }
        }

        // Notify franchise (Requirement 7.2)
        if (franchiseId) {
            await notificationService.notifyFranchiseBookingCancelled(
                booking,
                academy,
                student.name || student.full_name,
                teacher.name || teacher.full_name
            )
        }

        console.log(`[onBookingCancelled] Notificações enviadas para booking ${bookingId} (cancelledBy: ${cancelledBy})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onBookingCancelled] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando uma reserva é reagendada
 * Requirement: 1.3
 */
export async function onBookingRescheduled(
    franchiseId: string,
    teacherId: string,
    studentId: string,
    bookingId: string,
    oldDate: string,
    newDate: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch related entities
        const [studentResult, teacherResult] = await Promise.all([
            supabase.from('users').select('id, name, full_name, email').eq('id', studentId).single(),
            supabase.from('users').select('id, name, full_name, email, academy_id').eq('id', teacherId).single()
        ])

        const studentData = studentResult.data
        const teacherData = teacherResult.data

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }
        
        const teacher = {
            id: teacherId,
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: teacherData?.academy_id
        }

        const booking = {
            id: bookingId,
            date: newDate,
            academy_id: franchiseId,
            student_id: studentId,
            teacher_id: teacherId
        }

        // Notificar Professor sobre reagendamento (Requirement 1.3)
        await notificationService.notifyTeacherBookingRescheduled(booking, student, teacher, oldDate)

        console.log(`[onBookingRescheduled] Notificação enviada para booking ${bookingId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onBookingRescheduled] Erro ao enviar notificação:', error)
    }
}

/**
 * Disparado quando check-in é negado na recepção
 */
export async function onCheckinDenied(
    academyId: string,
    reasonMsg: string,
    booking: { id: string, student_id?: string | null, teacher_id?: string | null }
) {
    const promises = []

    // 1. Notificar Recepção/Admin
    promises.push(createNotification(
        academyId,
        'checkin',
        'Check-in negado',
        reasonMsg,
        { booking_id: booking.id }
    ))

    // 2. Notificar Aluno
    if (booking.student_id) {
        promises.push(createUserNotification(
            booking.student_id,
            'checkin',
            'Check-in negado',
            reasonMsg,
            { booking_id: booking.id }
        ))
    }

    // 3. Notificar Professor
    if (booking.teacher_id) {
        promises.push(createUserNotification(
            booking.teacher_id,
            'checkin',
            'Check-in negado',
            reasonMsg,
            { booking_id: booking.id }
        ))
    }

    return Promise.all(promises)
}

/**
 * Disparado quando check-in é realizado com sucesso
 * Requirements: 6.1, 6.2, 7.7
 */
export async function onCheckinGranted(
    academyId: string,
    booking: { id: string, student_id?: string | null, teacher_id?: string | null }
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch related entities for proper notification messages
        const [studentResult, teacherResult, academyResult] = await Promise.all([
            booking.student_id 
                ? supabase.from('users').select('id, name, full_name, email').eq('id', booking.student_id).single()
                : Promise.resolve({ data: null }),
            booking.teacher_id 
                ? supabase.from('users').select('id, name, full_name, email, academy_id').eq('id', booking.teacher_id).single()
                : Promise.resolve({ data: null }),
            supabase.from('academies').select('id, name, franqueadora_id').eq('id', academyId).single()
        ])

        const studentData = studentResult.data
        const teacherData = teacherResult.data
        const academyData = academyResult.data

        const student = {
            id: booking.student_id || '',
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }
        
        const teacher = {
            id: booking.teacher_id || '',
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: teacherData?.academy_id
        }
        
        const academy = {
            id: academyId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Create checkin object for notification
        const checkin = {
            id: `checkin-${booking.id}-${Date.now()}`,
            booking_id: booking.id,
            student_id: booking.student_id || undefined,
            teacher_id: booking.teacher_id || undefined,
            academy_id: academyId,
            created_at: new Date().toISOString()
        }

        // 1. Notificar Professor sobre check-in do aluno (Requirement 6.1)
        if (booking.teacher_id && booking.student_id) {
            await notificationService.notifyTeacherStudentCheckin(checkin, student, teacher)
        }

        // 2. Notificar Franquia/Recepção sobre check-in (Requirements 6.2, 7.7)
        if (booking.student_id) {
            await notificationService.notifyFranchiseCheckin(checkin, student, academy)
        }

        console.log(`[onCheckinGranted] Notificações enviadas para booking ${booking.id}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onCheckinGranted] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando um plano é comprado (Assinatura criada)
 */
export async function onPlanPurchased(
    adminId: string,
    planType: 'teacher' | 'student',
    purchaserName: string,
    planName: string,
    details: {
        teacher_id?: string,
        student_id?: string,
        plan_id: string,
        subscription_id: string,
        amount: number,
        academy_id?: string,
        academy_name?: string
    }
) {
    const title = planType === 'teacher' ? 'Nova Assinatura de Professor' : 'Nova Assinatura de Aluno'
    const message = planType === 'teacher'
        ? `${purchaserName} adquiriu o plano ${planName}`
        : `${purchaserName} adquiriu o plano ${planName} na academia ${details.academy_name || ''}`

    return createNotification(
        adminId,
        'plan_purchased',
        title,
        message,
        details
    )
}

/**
 * Disparado quando uma solicitação de aprovação é criada
 */
export async function onApprovalRequested(
    adminId: string,
    type: 'teacher_registration' | 'student_registration',
    userName: string,
    details: {
        approval_request_id: string,
        user_id: string,
        requested_data: any,
        academy_name?: string
    }
) {
    const title = type === 'teacher_registration' ? 'Nova Solicitação de Professor' : 'Nova Solicitação de Aluno'
    const message = type === 'teacher_registration'
        ? `${userName} solicitou cadastro como professor`
        : `${userName} solicitou cadastro como aluno${details.academy_name ? ` na academia ${details.academy_name}` : ''}`

    const notifType = type === 'teacher_registration' ? 'teacher_approval_needed' : 'student_approval_needed'

    return createNotification(
        adminId,
        notifType,
        title,
        message,
        {
            approval_request_id: details.approval_request_id,
            user_id: details.user_id,
            type,
            requested_data: details.requested_data
        }
    )
}

/**
 * Disparado quando uma solicitação de cadastro é aprovada
 */
export async function onRegistrationApproved(
    adminId: string,
    type: 'new_teacher' | 'new_student',
    approvedName: string,
    details: {
        teacher_id?: string,
        student_id?: string,
        approval_request_id: string,
        academy_id?: string
    }
) {
    const title = type === 'new_teacher' ? 'Novo Professor Aprovado' : 'Novo Aluno Aprovado'
    const message = type === 'new_teacher'
        ? `${approvedName} foi aprovado como professor`
        : `${approvedName} foi aprovado como aluno`

    return createNotification(
        adminId,
        type,
        title,
        message,
        details
    )
}


/**
 * Disparado quando créditos são debitados do aluno
 * Requirement: 3.1
 */
export async function onCreditsDebited(
    studentId: string,
    amount: number,
    newBalance: number,
    bookingId?: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch student data
        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', studentId)
            .single()

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }

        // Fetch booking data if provided
        let booking = undefined
        if (bookingId) {
            const { data: bookingData } = await supabase
                .from('bookings')
                .select('id, date, start_at, franchise_id')
                .eq('id', bookingId)
                .single()
            
            if (bookingData) {
                booking = {
                    id: bookingData.id,
                    date: bookingData.date,
                    start_time: bookingData.start_at,
                    academy_id: bookingData.franchise_id
                }
            }
        }

        // Notify student about credits debited (Requirement 3.1)
        await notificationService.notifyStudentCreditsDebited(student, amount, newBalance, booking)

        // Check if balance is low (below 2 classes) - Requirement 3.2
        if (newBalance > 0 && newBalance < 2) {
            await notificationService.notifyStudentCreditsLow(student, newBalance)
        }

        // Check if balance is zero - Requirement 3.7
        if (newBalance === 0) {
            await notificationService.notifyStudentCreditsZero(student)
        }

        console.log(`[onCreditsDebited] Notificações enviadas para student ${studentId} (amount: ${amount}, balance: ${newBalance})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onCreditsDebited] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando créditos são comprados pelo aluno
 * Requirement: 3.3
 */
export async function onCreditsPurchased(
    studentId: string,
    amount: number,
    newBalance: number
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch student data
        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', studentId)
            .single()

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }

        // Notify student about credits purchased (Requirement 3.3)
        await notificationService.notifyStudentCreditsPurchased(student, amount, newBalance)

        console.log(`[onCreditsPurchased] Notificação enviada para student ${studentId} (amount: ${amount}, balance: ${newBalance})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onCreditsPurchased] Erro ao enviar notificação:', error)
    }
}

/**
 * Disparado quando créditos são estornados para o aluno
 * Requirement: 3.4
 */
export async function onCreditsRefunded(
    studentId: string,
    amount: number,
    newBalance: number
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch student data
        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', studentId)
            .single()

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }

        // Notify student about credits refunded (Requirement 3.4)
        await notificationService.notifyStudentCreditsRefunded(student, amount, newBalance)

        console.log(`[onCreditsRefunded] Notificação enviada para student ${studentId} (amount: ${amount}, balance: ${newBalance})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onCreditsRefunded] Erro ao enviar notificação:', error)
    }
}


/**
 * Disparado quando um pagamento é confirmado
 * Requirements: 4.1, 7.5
 */
export async function onPaymentConfirmed(
    userId: string,
    paymentId: string,
    amount: number,
    description?: string,
    academyId?: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch user data
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', userId)
            .single()

        const user = {
            id: userId,
            name: userData?.name,
            full_name: userData?.full_name,
            email: userData?.email
        }

        const payment = {
            id: paymentId,
            amount,
            status: 'CONFIRMED',
            description: description || 'Pagamento confirmado',
            user_id: userId
        }

        // Notify user about payment confirmed (Requirement 4.1)
        await notificationService.notifyUserPaymentConfirmed(user, payment)

        // Notify franchise about payment received (Requirement 7.5)
        if (academyId) {
            const { data: academyData } = await supabase
                .from('academies')
                .select('id, name, franqueadora_id')
                .eq('id', academyId)
                .single()

            if (academyData) {
                const academy = {
                    id: academyId,
                    name: academyData.name,
                    franqueadora_id: academyData.franqueadora_id
                }
                await notificationService.notifyFranchisePaymentReceived(
                    payment,
                    academy,
                    user.name || user.full_name
                )
            }
        }

        console.log(`[onPaymentConfirmed] Notificações enviadas para payment ${paymentId} (user: ${userId})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onPaymentConfirmed] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando um pagamento falha
 * Requirements: 4.2, 7.6
 */
export async function onPaymentFailed(
    userId: string,
    paymentId: string,
    amount: number,
    reason?: string,
    academyId?: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch user data
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', userId)
            .single()

        const user = {
            id: userId,
            name: userData?.name,
            full_name: userData?.full_name,
            email: userData?.email
        }

        const payment = {
            id: paymentId,
            amount,
            status: 'FAILED',
            description: 'Pagamento falhou',
            user_id: userId
        }

        // Notify user about payment failed (Requirement 4.2)
        await notificationService.notifyUserPaymentFailed(user, payment, reason)

        // Notify franchise about payment failed (Requirement 7.6)
        if (academyId) {
            const { data: academyData } = await supabase
                .from('academies')
                .select('id, name, franqueadora_id')
                .eq('id', academyId)
                .single()

            if (academyData) {
                const academy = {
                    id: academyId,
                    name: academyData.name,
                    franqueadora_id: academyData.franqueadora_id
                }
                await notificationService.notifyFranchisePaymentFailed(
                    payment,
                    academy,
                    user.name || user.full_name
                )
            }
        }

        console.log(`[onPaymentFailed] Notificações enviadas para payment ${paymentId} (user: ${userId})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onPaymentFailed] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando um pagamento é estornado/reembolsado
 * Requirement: 4.3
 */
export async function onPaymentRefunded(
    userId: string,
    paymentId: string,
    amount: number
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch user data
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', userId)
            .single()

        const user = {
            id: userId,
            name: userData?.name,
            full_name: userData?.full_name,
            email: userData?.email
        }

        const payment = {
            id: paymentId,
            amount,
            status: 'REFUNDED',
            description: 'Pagamento estornado',
            user_id: userId
        }

        // Notify user about payment refunded (Requirement 4.3)
        await notificationService.notifyUserPaymentRefunded(user, payment)

        console.log(`[onPaymentRefunded] Notificação enviada para payment ${paymentId} (user: ${userId})`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onPaymentRefunded] Erro ao enviar notificação:', error)
    }
}


/**
 * Disparado quando um professor é aprovado
 * Requirements: 5.3, 11.6
 */
export async function onTeacherApproved(
    teacherId: string,
    academyId: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch teacher data
        const { data: teacherData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', teacherId)
            .single()

        // Fetch academy data with franqueadora
        const { data: academyData } = await supabase
            .from('academies')
            .select('id, name, franqueadora_id')
            .eq('id', academyId)
            .single()

        const teacher = {
            id: teacherId,
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: academyId
        }

        const academy = {
            id: academyId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Notify teacher about approval (Requirement 5.3)
        await notificationService.notifyTeacherApproved(teacher, academy)

        // Notify franqueadora about teacher approval (Requirement 11.6)
        if (academyData?.franqueadora_id) {
            const franchise = {
                id: academyId,
                name: academyData.name,
                franqueadora_id: academyData.franqueadora_id
            }
            const franqueadora = {
                id: academyData.franqueadora_id,
                name: 'Franqueadora'
            }
            await notificationService.notifyFranqueadoraTeacherApproved(teacher, franchise, franqueadora)
        }

        console.log(`[onTeacherApproved] Notificações enviadas para teacher ${teacherId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onTeacherApproved] Erro ao enviar notificações:', error)
    }
}

/**
 * Disparado quando um professor é rejeitado
 * Requirement: 5.4
 */
export async function onTeacherRejected(
    teacherId: string,
    academyId: string,
    reason?: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch teacher data
        const { data: teacherData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', teacherId)
            .single()

        // Fetch academy data
        const { data: academyData } = await supabase
            .from('academies')
            .select('id, name, franqueadora_id')
            .eq('id', academyId)
            .single()

        const teacher = {
            id: teacherId,
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: academyId
        }

        const academy = {
            id: academyId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Notify teacher about rejection (Requirement 5.4)
        await notificationService.notifyTeacherRejected(teacher, academy, reason)

        console.log(`[onTeacherRejected] Notificação enviada para teacher ${teacherId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onTeacherRejected] Erro ao enviar notificação:', error)
    }
}

/**
 * Disparado quando um novo professor se cadastra na academia
 * Requirements: 5.1, 7.4
 */
export async function onNewTeacherRegistered(
    teacherId: string,
    academyId: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch teacher data
        const { data: teacherData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', teacherId)
            .single()

        // Fetch academy data
        const { data: academyData } = await supabase
            .from('academies')
            .select('id, name, franqueadora_id')
            .eq('id', academyId)
            .single()

        const teacher = {
            id: teacherId,
            name: teacherData?.name,
            full_name: teacherData?.full_name,
            email: teacherData?.email,
            academy_id: academyId
        }

        const academy = {
            id: academyId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Notify franchise about new teacher (Requirements 5.1, 7.4)
        await notificationService.notifyFranchiseNewTeacher(teacher, academy)

        console.log(`[onNewTeacherRegistered] Notificação enviada para academy ${academyId} sobre teacher ${teacherId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onNewTeacherRegistered] Erro ao enviar notificação:', error)
    }
}

/**
 * Disparado quando um novo aluno se cadastra na academia
 * Requirements: 5.2, 7.3
 */
export async function onNewStudentRegistered(
    studentId: string,
    academyId: string
) {
    const notificationService = getNotificationService()
    
    try {
        // Fetch student data
        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, full_name, email')
            .eq('id', studentId)
            .single()

        // Fetch academy data
        const { data: academyData } = await supabase
            .from('academies')
            .select('id, name, franqueadora_id')
            .eq('id', academyId)
            .single()

        const student = {
            id: studentId,
            name: studentData?.name,
            full_name: studentData?.full_name,
            email: studentData?.email
        }

        const academy = {
            id: academyId,
            name: academyData?.name,
            franqueadora_id: academyData?.franqueadora_id
        }

        // Notify franchise about new student (Requirements 5.2, 7.3)
        await notificationService.notifyFranchiseNewStudent(student, academy)

        console.log(`[onNewStudentRegistered] Notificação enviada para academy ${academyId} sobre student ${studentId}`)
    } catch (error) {
        // Log error but don't break the main flow
        console.error('[onNewStudentRegistered] Erro ao enviar notificação:', error)
    }
}
