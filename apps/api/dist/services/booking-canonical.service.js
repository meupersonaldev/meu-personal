"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingCanonicalService = void 0;
const supabase_1 = require("../config/supabase");
const balance_service_1 = require("./balance.service");
class BookingCanonicalService {
    async createBooking(params) {
        const cancellableUntil = new Date(params.startAt.getTime() - 4 * 60 * 60 * 1000);
        if (params.source === 'ALUNO') {
            return await this.createStudentLedBooking(params, cancellableUntil);
        }
        else {
            return await this.createProfessorLedBooking(params, cancellableUntil);
        }
    }
    async createStudentLedBooking(params, cancellableUntil) {
        if (!params.studentId) {
            throw new Error('studentId é obrigatório para agendamento aluno-led');
        }
        try {
            const studentBalance = await balance_service_1.balanceService.getStudentBalance(params.studentId, params.unitId);
            const availableClasses = studentBalance.total_purchased - studentBalance.total_consumed - studentBalance.locked_qty;
            if (availableClasses < 1) {
                throw new Error('Saldo insuficiente de aulas');
            }
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
                status_canonical: 'RESERVED',
                cancellable_until: cancellableUntil.toISOString(),
                student_notes: params.studentNotes,
                professor_notes: params.professorNotes
            })
                .select()
                .single();
            if (bookingError)
                throw bookingError;
            await balance_service_1.balanceService.lockStudentClasses(params.studentId, params.unitId, 1, booking.id, cancellableUntil.toISOString(), 'ALUNO');
            await balance_service_1.balanceService.lockProfessorHours(params.professorId, params.unitId, 1, booking.id, cancellableUntil.toISOString(), 'SYSTEM');
            await this.createOrUpdateStudentUnit(params.studentId, params.unitId, booking.id);
            return booking;
        }
        catch (error) {
            throw error;
        }
    }
    async createProfessorLedBooking(params, cancellableUntil) {
        try {
            const professorBalance = await balance_service_1.balanceService.getProfessorBalance(params.professorId, params.unitId);
            const availableHours = professorBalance.available_hours - professorBalance.locked_hours;
            if (availableHours < 1) {
                throw new Error('Saldo de horas insuficiente');
            }
            const { data: booking, error: bookingError } = await supabase_1.supabase
                .from('bookings')
                .insert({
                source: params.source,
                teacher_id: params.professorId,
                unit_id: params.unitId,
                date: params.startAt.toISOString(),
                start_at: params.startAt.toISOString(),
                end_at: params.endAt.toISOString(),
                status_canonical: 'RESERVED',
                cancellable_until: cancellableUntil.toISOString(),
                student_notes: params.studentNotes,
                professor_notes: params.professorNotes
            })
                .select()
                .single();
            if (bookingError)
                throw bookingError;
            await balance_service_1.balanceService.lockProfessorHours(params.professorId, params.unitId, 1, booking.id, cancellableUntil.toISOString(), 'PROFESSOR');
            return booking;
        }
        catch (error) {
            throw error;
        }
    }
    async checkSlotCapacity(unitId, startAt) {
        const { data: existingBookings, error } = await supabase_1.supabase
            .from('bookings')
            .select('id')
            .eq('unit_id', unitId)
            .eq('start_at', startAt.toISOString())
            .in('status_canonical', ['RESERVED', 'PAID']);
        if (error)
            throw error;
        return existingBookings ? 1 - existingBookings.length : 1;
    }
    async cancelBooking(bookingId, userId) {
        try {
            const { data: booking, error: fetchError } = await supabase_1.supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (fetchError)
                throw fetchError;
            if (!booking)
                throw new Error('Booking nao encontrado');
            const now = new Date();
            const cancellableUntil = new Date(booking.cancellable_until);
            if (now > cancellableUntil) {
                throw new Error('Booking não pode mais ser cancelado (fora da janela T-4h)');
            }
            const { data: updatedBooking, error: updateError } = await supabase_1.supabase
                .from('bookings')
                .update({
                status_canonical: 'CANCELED',
                updated_at: now.toISOString()
            })
                .eq('id', bookingId)
                .select()
                .single();
            if (updateError)
                throw updateError;
            if (booking.student_id) {
                await balance_service_1.balanceService.unlockStudentClasses(booking.student_id, booking.unit_id, 1, bookingId, 'ALUNO');
            }
            await balance_service_1.balanceService.unlockProfessorHours(booking.teacher_id, booking.unit_id, 1, bookingId, 'SYSTEM');
            return updatedBooking;
        }
        catch (error) {
            throw error;
        }
    }
    async confirmBooking(bookingId) {
        try {
            const { data: booking, error: fetchError } = await supabase_1.supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (fetchError)
                throw fetchError;
            if (!booking)
                throw new Error('Booking não encontrado');
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
            if (updateError)
                throw updateError;
            return updatedBooking;
        }
        catch (error) {
            throw error;
        }
    }
    async completeBooking(bookingId) {
        try {
            const { data: booking, error: fetchError } = await supabase_1.supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (fetchError)
                throw fetchError;
            if (!booking)
                throw new Error('Booking não encontrado');
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
            if (updateError)
                throw updateError;
            if (booking.student_id) {
                await balance_service_1.balanceService.consumeStudentClasses(booking.student_id, booking.unit_id, 1, bookingId, 'ALUNO');
            }
            await balance_service_1.balanceService.consumeProfessorHours(booking.teacher_id, booking.unit_id, 1, bookingId, 'SYSTEM');
            return updatedBooking;
        }
        catch (error) {
            throw error;
        }
    }
    async createOrUpdateStudentUnit(studentId, unitId, bookingId) {
        try {
            console.log(`🔗 Criando/Atualizando vínculo aluno-unidade: aluno ${studentId} → unidade ${unitId} (booking: ${bookingId})`);
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
                    console.error('Erro ao atualizar vínculo student_units:', updateError);
                    throw updateError;
                }
                console.log(`✅ Vínculo student_units atualizado: ${existingStudentUnit.id} (total: ${existingStudentUnit.total_bookings + 1} agendamentos)`);
            }
            else {
                const { data: newStudentUnit, error: createError } = await supabase_1.supabase
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
                })
                    .select()
                    .single();
                if (createError) {
                    console.error('Erro ao criar vínculo student_units:', createError);
                    throw createError;
                }
                console.log(`✅ Novo vínculo student_units criado: ${newStudentUnit.id}`);
            }
        }
        catch (error) {
            console.error('Erro em createOrUpdateStudentUnit:', error);
            console.warn('⚠️ Falha ao criar vínculo aluno-unidade, mas agendamento foi concluído');
        }
    }
}
exports.bookingCanonicalService = new BookingCanonicalService();
//# sourceMappingURL=booking-canonical.service.js.map