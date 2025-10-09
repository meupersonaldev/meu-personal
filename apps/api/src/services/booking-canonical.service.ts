import { supabase } from '../config/supabase';
import { balanceService } from './balance.service';

export interface CreateBookingParams {
  source: 'ALUNO' | 'PROFESSOR';
  studentId?: string;
  professorId: string;
  unitId: string;
  startAt: Date;
  endAt: Date;
  studentNotes?: string;
  professorNotes?: string;
}

export interface BookingCanonical {
  id: string;
  source: 'ALUNO' | 'PROFESSOR';
  student_id?: string;
  teacher_id: string;
  professor_id?: string;
  unit_id: string;
  start_at: string;
  end_at: string;
  status_canonical: 'RESERVED' | 'PAID' | 'CANCELED' | 'DONE';
  cancellable_until?: string;
  student_notes?: string;
  professor_notes?: string;
  created_at: string;
  updated_at: string;
}

class BookingCanonicalService {
  async createBooking(params: CreateBookingParams): Promise<BookingCanonical> {
    // Calcular data limite para cancelamento (T-4h)
    const cancellableUntil = new Date(params.startAt.getTime() - 4 * 60 * 60 * 1000);

    if (params.source === 'ALUNO') {
      return await this.createStudentLedBooking(params, cancellableUntil);
    } else {
      return await this.createProfessorLedBooking(params, cancellableUntil);
    }
  }

  private async createStudentLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    if (!params.studentId) {
      throw new Error('studentId é obrigatório para agendamento aluno-led');
    }

    try {
      // 1. Validar saldo do aluno
      const studentBalance = await balanceService.getStudentBalance(params.studentId, params.unitId);
      const availableClasses = studentBalance.total_purchased - studentBalance.total_consumed - studentBalance.locked_qty;

      if (availableClasses < 1) {
        throw new Error('Saldo insuficiente de aulas');
      }

      // 2. Criar booking
      const { data: booking, error: bookingError } = await supabase
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

      if (bookingError) throw bookingError;

      // 3. Criar LOCK para aluno
      await balanceService.lockStudentClasses(
        params.studentId,
        params.unitId,
        1,
        booking.id,
        cancellableUntil.toISOString(),
        'ALUNO'
      );

      // 4. Criar BONUS_LOCK para professor
      await balanceService.lockProfessorHours(
        params.professorId,
        params.unitId,
        1,
        booking.id,
        cancellableUntil.toISOString(),
        'SYSTEM'
      );

      // 5. ✅ NOVO: Criar/ativar vínculo aluno-unidade (student_units)
      await this.createOrUpdateStudentUnit(params.studentId!, params.unitId, booking.id);

      return booking;
    } catch (error) {
      throw error;
    }
  }

  private async createProfessorLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    try {
      // 1. Validar horas disponíveis do professor
      const professorBalance = await balanceService.getProfessorBalance(params.professorId, params.unitId);
      const availableHours = professorBalance.available_hours - professorBalance.locked_hours;

      if (availableHours < 1) {
        throw new Error('Saldo de horas insuficiente');
      }

      // 2. Criar booking
      const { data: booking, error: bookingError } = await supabase
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

      if (bookingError) throw bookingError;

      // 3. Criar BONUS_LOCK para professor
      await balanceService.lockProfessorHours(
        params.professorId,
        params.unitId,
        1,
        booking.id,
        cancellableUntil.toISOString(),
        'PROFESSOR'
      );

      return booking;
    } catch (error) {
      throw error;
    }
  }

  private async checkSlotCapacity(unitId: string, startAt: Date): Promise<number> {
    // Verificar capacidade do horário (simplificado)
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('unit_id', unitId)
      .eq('start_at', startAt.toISOString())
      .in('status_canonical', ['RESERVED', 'PAID']);

    if (error) throw error;

    // Retornar capacidade restante (assume capacidade 1 por slot)
    return existingBookings ? 1 - existingBookings.length : 1;
  }

  async cancelBooking(bookingId: string, userId: string): Promise<BookingCanonical> {
    try {
      // 1. Buscar booking
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;
      if (!booking) throw new Error('Booking nao encontrado');

      // 2. Verificar se pode cancelar
      const now = new Date();
      const cancellableUntil = new Date(booking.cancellable_until);

      if (now > cancellableUntil) {
        throw new Error('Booking não pode mais ser cancelado (fora da janela T-4h)');
      }

      // 3. Atualizar status
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status_canonical: 'CANCELED',
          updated_at: now.toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 4. Liberar locks
      if (booking.student_id) {
        await balanceService.unlockStudentClasses(booking.student_id, booking.unit_id, 1, bookingId, 'ALUNO');
      }

      await balanceService.unlockProfessorHours(booking.teacher_id, booking.unit_id, 1, bookingId, 'SYSTEM');

      return updatedBooking;
    } catch (error) {
      throw error;
    }
  }

  async confirmBooking(bookingId: string): Promise<BookingCanonical> {
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;
      if (!booking) throw new Error('Booking nao encontrado');

      const now = new Date();
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status_canonical: 'PAID',
          updated_at: now.toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedBooking;
    } catch (error) {
      throw error;
    }
  }

  async completeBooking(bookingId: string): Promise<BookingCanonical> {
    try {
      // 1. Buscar booking
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;
      if (!booking) throw new Error('Booking não encontrado');

      // 2. Atualizar status
      const now = new Date();
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status_canonical: 'DONE',
          updated_at: now.toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Consumir locks
      if (booking.student_id) {
        await balanceService.consumeStudentClasses(booking.student_id, booking.unit_id, 1, bookingId, 'ALUNO');
      }

      await balanceService.consumeProfessorHours(booking.teacher_id, booking.unit_id, 1, bookingId, 'SYSTEM');

      return updatedBooking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ NOVO: Criar ou atualizar vínculo aluno-unidade
   * Executado automaticamente quando um aluno agenda uma aula
   */
  private async createOrUpdateStudentUnit(studentId: string, unitId: string, bookingId: string): Promise<void> {
    try {
      console.log(`🔗 Criando/Atualizando vínculo aluno-unidade: aluno ${studentId} → unidade ${unitId} (booking: ${bookingId})`);

      // Verificar se já existe vínculo
      const { data: existingStudentUnit } = await supabase
        .from('student_units')
        .select('id, first_booking_date, last_booking_date, total_bookings, active')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .single();

      const now = new Date().toISOString();

      if (existingStudentUnit) {
        // Se existe, atualizar informações
        const { error: updateError } = await supabase
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
      } else {
        // Se não existe, criar novo vínculo
        const { data: newStudentUnit, error: createError } = await supabase
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
    } catch (error) {
      console.error('Erro em createOrUpdateStudentUnit:', error);
      // Não lançar erro para não quebrar o fluxo de agendamento
      console.warn('⚠️ Falha ao criar vínculo aluno-unidade, mas agendamento foi concluído');
    }
  }
}

export const bookingCanonicalService = new BookingCanonicalService();
