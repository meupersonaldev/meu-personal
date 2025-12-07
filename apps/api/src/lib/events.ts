import { createUserNotification, createNotification } from '../routes/notifications'

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
 */
export async function onBookingCreated(
    franchiseId: string,
    teacherId: string,
    studentId: string,
    date: string,
    bookingId: string
) {
    // 1. Notificar Franqueadora/Unidade
    const notifyAdmin = createNotification(
        franchiseId,
        'new_booking',
        'Nova reserva',
        'Um aluno confirmou uma nova reserva.',
        { student_id: studentId, teacher_id: teacherId, date, booking_id: bookingId }
    )

    // 2. Notificar Professor
    const notifyTeacher = createUserNotification(
        teacherId,
        'new_booking',
        'Nova reserva confirmada',
        'Você tem uma nova aula confirmada.',
        { student_id: studentId, date, booking_id: bookingId },
        undefined, // Sem link específico por enquanto
        studentId,
        'student'
    )

    // 3. Notificar Aluno (Confirmação)
    const notifyStudent = createUserNotification(
        studentId,
        'new_booking',
        'Reserva confirmada',
        'Sua reserva foi confirmada com sucesso.',
        { teacher_id: teacherId, date, booking_id: bookingId },
        undefined,
        teacherId,
        'teacher' // context
    )

    return Promise.all([notifyAdmin, notifyTeacher, notifyStudent])
}

/**
 * Disparado quando uma reserva é cancelada
 */
export async function onBookingCancelled(
    franchiseId: string | null,
    teacherId: string | null,
    studentId: string | null,
    bookingId: string,
    cancelledBy: 'student' | 'teacher' | 'admin'
) {
    const promises = []

    if (franchiseId) {
        promises.push(createNotification(
            franchiseId,
            'booking_cancelled',
            'Reserva cancelada',
            'Uma reserva foi cancelada.',
            { booking_id: bookingId }
        ))
    }

    if (studentId) {
        promises.push(createUserNotification(
            studentId,
            'booking_cancelled',
            'Reserva cancelada',
            'Sua reserva foi cancelada.',
            { booking_id: bookingId },
            undefined,
            teacherId || undefined,
            'teacher'
        ))
    }

    if (teacherId) {
        promises.push(createUserNotification(
            teacherId,
            'booking_cancelled',
            'Reserva cancelada',
            'Uma reserva da sua agenda foi cancelada.',
            { booking_id: bookingId },
            undefined,
            studentId || undefined,
            'student'
        ))
    }

    return Promise.all(promises)
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
 */
export async function onCheckinGranted(
    academyId: string,
    booking: { id: string, student_id?: string | null, teacher_id?: string | null }
) {
    const promises = []

    // 1. Notificar Recepção/Admin
    promises.push(createNotification(
        academyId,
        'checkin',
        'Check-in realizado',
        'Entrada registrada na recepção.',
        { booking_id: booking.id }
    ))

    // 2. Notificar Aluno
    if (booking.student_id) {
        promises.push(createUserNotification(
            booking.student_id,
            'checkin',
            'Check-in realizado',
            'Seu check-in foi confirmado.',
            { booking_id: booking.id }
        ))
    }

    // 3. Notificar Professor
    if (booking.teacher_id) {
        promises.push(createUserNotification(
            booking.teacher_id,
            'checkin',
            'Check-in realizado',
            'Seu aluno realizou check-in.',
            { booking_id: booking.id }
        ))
    }

    return Promise.all(promises)
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
