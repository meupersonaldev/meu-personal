"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingCanonicalService = void 0;
const supabase_1 = require("../lib/supabase");
const balance_service_1 = require("./balance.service");
async function fetchFranqueadoraIdFromUnit(unitId) {
    const { data: academyDirect } = await supabase_1.supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', unitId)
        .single();
    if (academyDirect?.franqueadora_id) {
        return academyDirect.franqueadora_id;
    }
    const { data: unitData } = await supabase_1.supabase
        .from('units')
        .select('academy_legacy_id')
        .eq('id', unitId)
        .single();
    if (unitData?.academy_legacy_id) {
        const { data: legacyAcademy } = await supabase_1.supabase
            .from('academies')
            .select('franqueadora_id')
            .eq('id', unitData.academy_legacy_id)
            .single();
        if (legacyAcademy?.franqueadora_id) {
            return legacyAcademy.franqueadora_id;
        }
    }
    throw new Error('Franqueadora nao identificada para unidade informada');
}
function getAvailableClasses(balance) {
    return balance.total_purchased - balance.total_consumed - balance.locked_qty;
}
function getAvailableHours(balance) {
    return balance.available_hours - balance.locked_hours;
}
class BookingCanonicalService {
    async createBooking(params) {
        const cancellableUntil = new Date(params.startAt.getTime() - 4 * 60 * 60 * 1000);
        if (params.source === 'ALUNO') {
            return this.createStudentLedBooking(params, cancellableUntil);
        }
        return this.createProfessorLedBooking(params, cancellableUntil);
    }
    async createStudentLedBooking(params, cancellableUntil) {
        if (!params.studentId) {
            throw new Error('studentId eh obrigatorio para agendamento aluno-led');
        }
        const franqueadoraId = await fetchFranqueadoraIdFromUnit(params.unitId);
        const studentBalance = await balance_service_1.balanceService.getStudentBalance(params.studentId, franqueadoraId);
        const availableClasses = getAvailableClasses(studentBalance);
        if (availableClasses < 1) {
            throw new Error('Saldo insuficiente de aulas');
        }
        await supabase_1.supabase
            .from('bookings')
            .delete()
            .eq('teacher_id', params.professorId)
            .eq('unit_id', params.unitId)
            .eq('start_at', params.startAt.toISOString())
            .eq('status_canonical', 'AVAILABLE')
            .is('student_id', null);
        const { data: booking, error: bookingError } = await supabase_1.supabase
            .from('bookings')
            .insert({
            source: params.source,
            student_id: params.studentId,
            teacher_id: params.professorId,
            unit_id: params.unitId,
            date: params.startAt.toISOString(),
            start_at: params.startAt.toISOString(),
            end_at: params.endAt.toISOString(),
            status: 'CONFIRMED',
            status_canonical: 'PAID',
            cancellable_until: cancellableUntil.toISOString(),
            student_notes: params.studentNotes,
            professor_notes: params.professorNotes
        })
            .select()
            .single();
        if (bookingError || !booking) {
            throw bookingError || new Error('Falha ao criar booking');
        }
        await balance_service_1.balanceService.consumeStudentClasses(params.studentId, franqueadoraId, 1, booking.id, {
            unitId: params.unitId,
            source: 'ALUNO',
            metaJson: {
                booking_id: booking.id,
                origin: 'student_led'
            }
        });
        await balance_service_1.balanceService.purchaseProfessorHours(params.professorId, franqueadoraId, 1, {
            unitId: params.unitId,
            source: 'SYSTEM',
            bookingId: booking.id,
            metaJson: {
                booking_id: booking.id,
                origin: 'student_booking_reward'
            }
        });
        await this.createOrUpdateStudentUnit(params.studentId, params.unitId, booking.id);
        return booking;
    }
    async createProfessorLedBooking(params, cancellableUntil) {
        const franqueadoraId = await fetchFranqueadoraIdFromUnit(params.unitId);
        const hasStudent = Boolean(params.studentId);
        if (!hasStudent) {
            const { data: availability, error: availabilityError } = await supabase_1.supabase
                .from('bookings')
                .insert({
                source: params.source,
                student_id: null,
                teacher_id: params.professorId,
                unit_id: params.unitId,
                date: params.startAt.toISOString(),
                start_at: params.startAt.toISOString(),
                end_at: params.endAt.toISOString(),
                status: 'AVAILABLE',
                status_canonical: 'AVAILABLE',
                cancellable_until: cancellableUntil.toISOString(),
                student_notes: params.studentNotes,
                professor_notes: params.professorNotes
            })
                .select()
                .single();
            if (availabilityError || !availability) {
                throw availabilityError || new Error('Falha ao criar disponibilidade do professor');
            }
            return availability;
        }
        const professorBalance = await balance_service_1.balanceService.getProfessorBalance(params.professorId, franqueadoraId);
        const availableHours = getAvailableHours(professorBalance);
        if (availableHours < 1) {
            throw new Error('Saldo de horas insuficiente');
        }
        await supabase_1.supabase
            .from('bookings')
            .delete()
            .eq('teacher_id', params.professorId)
            .eq('unit_id', params.unitId)
            .eq('start_at', params.startAt.toISOString())
            .eq('status_canonical', 'AVAILABLE')
            .is('student_id', null);
        const { data: booking, error: bookingError } = await supabase_1.supabase
            .from('bookings')
            .insert({
            source: params.source,
            student_id: params.studentId ?? null,
            teacher_id: params.professorId,
            unit_id: params.unitId,
            date: params.startAt.toISOString(),
            start_at: params.startAt.toISOString(),
            end_at: params.endAt.toISOString(),
            status: 'CONFIRMED',
            status_canonical: 'PAID',
            cancellable_until: cancellableUntil.toISOString(),
            student_notes: params.studentNotes,
            professor_notes: params.professorNotes
        })
            .select()
            .single();
        if (bookingError || !booking) {
            throw bookingError || new Error('Falha ao criar booking professor-led com aluno');
        }
        const profBalance = await balance_service_1.balanceService.getProfessorBalance(params.professorId, franqueadoraId);
        if (profBalance.available_hours < 1) {
            throw new Error('Saldo de horas insuficiente');
        }
        await balance_service_1.balanceService.updateProfessorBalance(params.professorId, franqueadoraId, {
            available_hours: profBalance.available_hours - 1
        });
        await balance_service_1.balanceService.createHourTransaction(params.professorId, franqueadoraId, 'CONSUME', 1, {
            unitId: params.unitId,
            source: 'PROFESSOR',
            bookingId: booking.id,
            metaJson: {
                booking_id: booking.id,
                origin: 'professor_led_booking',
                student_id: params.studentId || null
            }
        });
        if (params.studentId) {
            await this.createOrUpdateStudentUnit(params.studentId, params.unitId, booking.id);
        }
        return booking;
    }
    async checkSlotCapacity(unitId, startAt) {
        const startIso = startAt.toISOString();
        const { data: unit } = await supabase_1.supabase
            .from('units')
            .select('capacity_per_slot')
            .eq('id', unitId)
            .single();
        const capacity = unit?.capacity_per_slot ?? 1;
        const { data: currentBookings } = await supabase_1.supabase
            .from('bookings')
            .select('id')
            .eq('unit_id', unitId)
            .eq('date', startIso)
            .neq('status_canonical', 'CANCELED');
        const usedSlots = currentBookings?.length ?? 0;
        return Math.max(0, capacity - usedSlots);
    }
    async cancelBooking(bookingId, userId) {
        const { data: booking, error: fetchError } = await supabase_1.supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (fetchError || !booking) {
            throw fetchError || new Error('Booking nao encontrado');
        }
        if (booking.status_canonical === 'CANCELED') {
            return booking;
        }
        const franqueadoraId = await fetchFranqueadoraIdFromUnit(booking.unit_id);
        const hasStudent = Boolean(booking.student_id);
        if (hasStudent && booking.source === 'ALUNO') {
            const nowUtc = new Date();
            const cutoff = booking.cancellable_until ? new Date(booking.cancellable_until) : new Date(new Date(booking.start_at || booking.date).getTime() - 4 * 60 * 60 * 1000);
            const freeCancel = nowUtc <= cutoff;
            if (freeCancel) {
                await balance_service_1.balanceService.revokeProfessorHours(booking.teacher_id, franqueadoraId, 1, bookingId, {
                    unitId: booking.unit_id,
                    source: 'SYSTEM',
                    metaJson: {
                        booking_id: bookingId,
                        actor: userId,
                        reason: 'booking_cancelled_before_4h'
                    }
                });
            }
            else {
                await balance_service_1.balanceService.consumeStudentClasses(booking.student_id, franqueadoraId, 1, bookingId, {
                    unitId: booking.unit_id,
                    source: 'ALUNO',
                    metaJson: {
                        booking_id: bookingId,
                        actor: userId,
                        reason: 'booking_late_cancel_after_4h'
                    }
                });
            }
        }
        else if (hasStudent && booking.source === 'PROFESSOR') {
            const profBalance = await balance_service_1.balanceService.getProfessorBalance(booking.teacher_id, franqueadoraId);
            await balance_service_1.balanceService.updateProfessorBalance(booking.teacher_id, franqueadoraId, {
                available_hours: profBalance.available_hours + 1
            });
            await balance_service_1.balanceService.createHourTransaction(booking.teacher_id, franqueadoraId, 'REFUND', 1, {
                unitId: booking.unit_id,
                source: 'SYSTEM',
                bookingId: bookingId,
                metaJson: {
                    booking_id: bookingId,
                    actor: userId,
                    reason: 'booking_cancelled_refund_professor'
                }
            });
        }
        const now = new Date();
        const { data: updatedBooking, error: updateError } = await supabase_1.supabase
            .from('bookings')
            .update({
            status: 'CANCELLED',
            status_canonical: 'CANCELED',
            updated_at: now.toISOString()
        })
            .eq('id', bookingId)
            .select()
            .single();
        if (updateError || !updatedBooking) {
            throw updateError || new Error('Falha ao cancelar booking');
        }
        return updatedBooking;
    }
    async confirmBooking(bookingId) {
        const { data: booking, error: fetchError } = await supabase_1.supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (fetchError || !booking) {
            throw fetchError || new Error('Booking nao encontrado');
        }
        if (booking.status_canonical === 'PAID') {
            return booking;
        }
        const now = new Date();
        const { data: updatedBooking, error: updateError } = await supabase_1.supabase
            .from('bookings')
            .update({
            status_canonical: 'PAID',
            updated_at: now.toISOString()
        })
            .eq('id', bookingId)
            .select()
            .single();
        if (updateError || !updatedBooking) {
            throw updateError || new Error('Falha ao confirmar booking');
        }
        return updatedBooking;
    }
    async completeBooking(bookingId) {
        const { data: booking, error: fetchError } = await supabase_1.supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
        if (fetchError || !booking) {
            throw fetchError || new Error('Booking nao encontrado');
        }
        const franqueadoraId = await fetchFranqueadoraIdFromUnit(booking.unit_id);
        if (booking.student_id) {
            await balance_service_1.balanceService.consumeStudentClasses(booking.student_id, franqueadoraId, 1, bookingId, {
                unitId: booking.unit_id,
                source: 'ALUNO',
                metaJson: {
                    booking_id: bookingId,
                    reason: 'booking_completed'
                }
            });
        }
        const now = new Date();
        const { data: updatedBooking, error: updateError } = await supabase_1.supabase
            .from('bookings')
            .update({
            status_canonical: 'DONE',
            updated_at: now.toISOString()
        })
            .eq('id', bookingId)
            .select()
            .single();
        if (updateError || !updatedBooking) {
            throw updateError || new Error('Falha ao concluir booking');
        }
        return updatedBooking;
    }
    async createOrUpdateStudentUnit(studentId, unitId, bookingId) {
        try {
            const { data: existingStudentUnit } = await supabase_1.supabase
                .from('student_units')
                .select('id, first_booking_date, last_booking_date, total_bookings, active')
                .eq('student_id', studentId)
                .eq('unit_id', unitId)
                .single();
            const now = new Date().toISOString();
            if (existingStudentUnit) {
                const { error: updateError } = await supabase_1.supabase
                    .from('student_units')
                    .update({
                    last_booking_date: now,
                    total_bookings: existingStudentUnit.total_bookings + 1,
                    active: true,
                    updated_at: now
                })
                    .eq('id', existingStudentUnit.id);
                if (updateError) {
                    throw updateError;
                }
            }
            else {
                const { error: createError } = await supabase_1.supabase
                    .from('student_units')
                    .insert({
                    student_id: studentId,
                    unit_id: unitId,
                    first_booking_date: now,
                    last_booking_date: now,
                    total_bookings: 1,
                    active: true,
                    created_at: now,
                    updated_at: now
                });
                if (createError) {
                    throw createError;
                }
            }
        }
        catch (error) {
            console.error('Erro em createOrUpdateStudentUnit:', error);
            console.warn('Falha ao atualizar vinculo aluno-unidade; prosseguindo com agendamento.');
        }
    }
}
exports.bookingCanonicalService = new BookingCanonicalService();
//# sourceMappingURL=booking-canonical.service.js.map