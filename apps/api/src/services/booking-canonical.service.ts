import { supabase } from '../lib/supabase';
import {
  balanceService,
  StudentClassBalance,
  ProfHourBalance
} from './balance.service';

async function fetchFranqueadoraIdFromUnit(unitId: string): Promise<string> {
  console.log(`🔍 Buscando franqueadora_id para unitId: ${unitId}`)
  
  const { data: academyDirect, error: academyError } = await supabase
    .from('academies')
    .select('franqueadora_id, name')
    .eq('id', unitId)
    .single();

  console.log('📍 Resultado academies:', { academyDirect, academyError })

  if (academyDirect?.franqueadora_id) {
    console.log(`✅ Franqueadora encontrada direto: ${academyDirect.franqueadora_id}`)
    return academyDirect.franqueadora_id;
  }

  const { data: unitData, error: unitError } = await supabase
    .from('units')
    .select('academy_legacy_id')
    .eq('id', unitId)
    .single();

  console.log('📍 Resultado units:', { unitData, unitError })

  if (unitData?.academy_legacy_id) {
    const { data: legacyAcademy } = await supabase
      .from('academies')
      .select('franqueadora_id, name')
      .eq('id', unitData.academy_legacy_id)
      .single();

    console.log('📍 Resultado legacy academy:', legacyAcademy)

    if (legacyAcademy?.franqueadora_id) {
      console.log(`✅ Franqueadora encontrada via legacy: ${legacyAcademy.franqueadora_id}`)
      return legacyAcademy.franqueadora_id;
    }
  }

  console.error(`❌ Franqueadora não encontrada para unitId: ${unitId}`)
  throw new Error(`Academia inválida ou sem franqueadora configurada (ID: ${unitId}). Por favor, selecione outra academia nas configurações.`);
}

function getAvailableClasses(balance: StudentClassBalance): number {
  return balance.total_purchased - balance.total_consumed - balance.locked_qty;
}

function getAvailableHours(balance: ProfHourBalance): number {
  return balance.available_hours - balance.locked_hours;
}

export interface CreateBookingParams {
  source: 'ALUNO' | 'PROFESSOR';
  studentId?: string;
  professorId: string;
  franchiseId: string; // ID da academia (franchise_id)
  unitId?: string; // Opcional, para compatibilidade
  startAt: Date;
  endAt: Date;
  cancellableUntil?: Date; // Opcional, calculado na rota para preservar hora UTC
  status?: 'AVAILABLE' | 'RESERVED' | 'PAID' | 'DONE' | 'CANCELED';
  studentNotes?: string;
  professorNotes?: string;
}

export interface BookingCanonical {
  id: string;
  source: 'ALUNO' | 'PROFESSOR';
  student_id?: string | null;
  teacher_id: string;
  professor_id?: string;
  unit_id: string;
  start_at: string;
  end_at: string;
  status_canonical: 'RESERVED' | 'PAID' | 'CANCELED' | 'DONE' | 'AVAILABLE';
  cancellable_until?: string | null;
  student_notes?: string | null;
  professor_notes?: string | null;
  created_at: string;
  updated_at: string;
}

class BookingCanonicalService {
  async createBooking(params: CreateBookingParams): Promise<BookingCanonical> {
    // Usar cancellableUntil fornecido (calculado na rota) ou calcular aqui
    // Se fornecido, já está processado com a mesma lógica de startAt/endAt (preservando hora UTC)
    let cancellableUntil: Date
    if (params.cancellableUntil) {
      cancellableUntil = params.cancellableUntil
    } else {
      // Fallback: calcular preservando hora UTC (4 horas antes de startAt)
      // startAt já está como Date UTC puro (processado com parseUtcDate)
      // Subtrair 4 horas do timestamp UTC e criar Date UTC puro usando Date.UTC
      const cancellableUntilTimestamp = params.startAt.getTime() - 4 * 60 * 60 * 1000
      
      // Extrair componentes UTC do timestamp resultante para criar Date UTC puro
      const tempDate = new Date(cancellableUntilTimestamp)
      const cancellableYear = tempDate.getUTCFullYear()
      const cancellableMonth = tempDate.getUTCMonth()
      const cancellableDay = tempDate.getUTCDate()
      const cancellableHour = tempDate.getUTCHours()
      const cancellableMinute = tempDate.getUTCMinutes()
      const cancellableSecond = tempDate.getUTCSeconds()
      
      // Criar Date UTC puro usando Date.UTC (preserva hora como UTC, sem conversão de timezone)
      cancellableUntil = new Date(Date.UTC(cancellableYear, cancellableMonth, cancellableDay, cancellableHour, cancellableMinute, cancellableSecond))
    }

    if (params.source === 'ALUNO') {
      return this.createStudentLedBooking(params, cancellableUntil);
    }

    return this.createProfessorLedBooking(params, cancellableUntil);
  }

  private async createStudentLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    if (!params.studentId) {
      throw new Error('studentId eh obrigatorio para agendamento aluno-led');
    }

    // Usar franchiseId diretamente para buscar franqueadora_id
    const franqueadoraId = await fetchFranqueadoraIdFromUnit(params.franchiseId);
    const studentBalance = await balanceService.getStudentBalance(params.studentId, franqueadoraId);
    const availableClasses = getAvailableClasses(studentBalance);

    if (availableClasses < 1) {
      throw new Error('Saldo insuficiente de aulas');
    }

    // Deletar horários AVAILABLE do mesmo professor no mesmo horário/franchise
    const deleteQuery = supabase
      .from('bookings')
      .delete()
      .eq('teacher_id', params.professorId)
      .eq('franchise_id', params.franchiseId)
      .eq('start_at', params.startAt.toISOString())
      .eq('status_canonical', 'AVAILABLE')
      .is('student_id', null);
    
    if (params.unitId) {
      deleteQuery.eq('unit_id', params.unitId);
    }
    
    await deleteQuery;

    const { data: booking, error: bookingError} = await supabase
      .from('bookings')
      .insert({
        source: params.source,
        student_id: params.studentId,
        teacher_id: params.professorId,
        franchise_id: params.franchiseId, // Usar franchise_id diretamente
        unit_id: params.unitId || null, // Opcional
        date: params.startAt.toISOString(),
        start_at: params.startAt.toISOString(),
        end_at: params.endAt.toISOString(),
        status: 'CONFIRMED', // Campo antigo (enum só aceita CONFIRMED)
        status_canonical: 'PAID', // Confirmado direto, sem aprovação
        cancellable_until: cancellableUntil.toISOString(),
        student_notes: params.studentNotes,
        professor_notes: params.professorNotes
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError || new Error('Falha ao criar booking');
    }

    // Como o booking já é criado como PAID (confirmado), consumir créditos direto
    await balanceService.consumeStudentClasses(
      params.studentId,
      franqueadoraId,
      1,
      booking.id,
      {
        unitId: params.unitId || params.franchiseId, // Usar franchiseId como fallback
        source: 'ALUNO',
        metaJson: {
          booking_id: booking.id,
          origin: 'student_led'
        }
      }
    );

    // Professor recebe as horas direto (já confirmado)
    await balanceService.purchaseProfessorHours(
      params.professorId,
      franqueadoraId,
      1,
      {
        unitId: params.unitId || params.franchiseId, // Usar franchiseId como fallback
        source: 'SYSTEM',
        bookingId: booking.id,
        metaJson: {
          booking_id: booking.id,
          origin: 'student_booking_reward'
        }
      }
    );

    if (params.unitId) {
      await this.createOrUpdateStudentUnit(params.studentId, params.unitId, booking.id);
    }

    return booking;
  }

  private async createProfessorLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    // Usar franchiseId diretamente para buscar franqueadora_id
    const franqueadoraId = await fetchFranqueadoraIdFromUnit(params.franchiseId);
    const hasStudent = Boolean(params.studentId);

    if (!hasStudent) {
      // CRIAÇÃO DE DISPONIBILIDADE (sem aluno)
      const statusToUse = params.status || 'AVAILABLE';
      const { data: availability, error: availabilityError } = await supabase
        .from('bookings')
        .insert({
          source: params.source,
          student_id: null,
          teacher_id: params.professorId,
          franchise_id: params.franchiseId, // Usar franchise_id diretamente
          unit_id: params.unitId || null, // Opcional
          date: params.startAt.toISOString(),
          start_at: params.startAt.toISOString(),
          end_at: params.endAt.toISOString(),
          status: statusToUse === 'AVAILABLE' ? 'AVAILABLE' : 'CONFIRMED',
          status_canonical: statusToUse,
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

    // CRIAÇÃO COM ALUNO (agendamento direto do professor)
    // Neste caso, professor está agendando para um aluno específico
    const professorBalance = await balanceService.getProfessorBalance(
      params.professorId,
      franqueadoraId
    );
    const availableHours = getAvailableHours(professorBalance);

    if (availableHours < 1) {
      throw new Error('Saldo de horas insuficiente');
    }

    // Deletar horários AVAILABLE do mesmo professor no mesmo horário/franchise
    const deleteQuery = supabase
      .from('bookings')
      .delete()
      .eq('teacher_id', params.professorId)
      .eq('franchise_id', params.franchiseId)
      .eq('start_at', params.startAt.toISOString())
      .eq('status_canonical', 'AVAILABLE')
      .is('student_id', null);
    
    if (params.unitId) {
      deleteQuery.eq('unit_id', params.unitId);
    }
    
    await deleteQuery;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        source: params.source,
        student_id: params.studentId ?? null,
        teacher_id: params.professorId,
        franchise_id: params.franchiseId, // Usar franchise_id diretamente
        unit_id: params.unitId || null, // Opcional
        date: params.startAt.toISOString(),
        start_at: params.startAt.toISOString(),
        end_at: params.endAt.toISOString(),
        status: 'CONFIRMED', // Campo antigo (enum só aceita CONFIRMED)
        status_canonical: 'PAID', // Confirmado direto, sem aprovação
        cancellable_until: cancellableUntil.toISOString(),
        student_notes: params.studentNotes,
        professor_notes: params.professorNotes
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError || new Error('Falha ao criar booking professor-led com aluno');
    }

    // Professor agendando para aluno: consome horas do PROFESSOR
    // (Professor paga pela aula do aluno)
    const profBalance = await balanceService.getProfessorBalance(params.professorId, franqueadoraId);
    
    if (profBalance.available_hours < 1) {
      throw new Error('Saldo de horas insuficiente');
    }
    
    // Decrementar available_hours direto (já confirmado como PAID)
    await balanceService.updateProfessorBalance(
      params.professorId,
      franqueadoraId,
      {
        available_hours: profBalance.available_hours - 1
      }
    );
    
    // Registrar transação de consumo
    await balanceService.createHourTransaction(
      params.professorId,
      franqueadoraId,
      'CONSUME',
      1,
      {
        unitId: params.unitId || params.franchiseId, // Usar franchiseId como fallback
        source: 'PROFESSOR',
        bookingId: booking.id,
        metaJson: {
          booking_id: booking.id,
          origin: 'professor_led_booking',
          student_id: params.studentId || null
        }
      }
    );

    if (params.studentId && params.unitId) {
      await this.createOrUpdateStudentUnit(params.studentId, params.unitId, booking.id);
    }

    return booking;
  }

  private async checkSlotCapacity(unitId: string, startAt: Date): Promise<number> {
    const startIso = startAt.toISOString();

    const { data: unit } = await supabase
      .from('units')
      .select('capacity_per_slot')
      .eq('id', unitId)
      .single();

    const capacity = unit?.capacity_per_slot ?? 1;

    const { data: currentBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('unit_id', unitId)
      .eq('date', startIso)
      .neq('status_canonical', 'CANCELED');

    const usedSlots = currentBookings?.length ?? 0;
    return Math.max(0, capacity - usedSlots);
  }

  async cancelBooking(bookingId: string, userId: string): Promise<BookingCanonical> {
    const { data: booking, error: fetchError } = await supabase
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

    // Verificar quem fez o agendamento (source) para aplicar política de cancelamento
    const hasStudent = Boolean(booking.student_id);
    
    if (hasStudent && booking.source === 'ALUNO') {
      // Regra 4h: cancelamento gratuito até 4h antes; dentro da janela, crédito do aluno é consumido.
      const nowUtc = new Date();
      const cutoff = booking.cancellable_until ? new Date(booking.cancellable_until) : new Date(new Date(booking.start_at || booking.date).getTime() - 4 * 60 * 60 * 1000);
      const freeCancel = nowUtc <= cutoff;

      if (freeCancel) {
        // Sem débito de crédito do aluno; reverter a hora do professor (ele não recebe)
        await balanceService.revokeProfessorHours(
          booking.teacher_id,
          franqueadoraId,
          1,
          bookingId,
          {
            unitId: booking.unit_id,
            source: 'SYSTEM',
            metaJson: {
              booking_id: bookingId,
              actor: userId,
              reason: 'booking_cancelled_before_4h'
            }
          }
        );
      } else {
        // Cancelamento tardio: consumir 1 crédito do aluno
        await balanceService.consumeStudentClasses(
          booking.student_id,
          franqueadoraId,
          1,
          bookingId,
          {
            unitId: booking.unit_id,
            source: 'ALUNO',
            metaJson: {
              booking_id: bookingId,
              actor: userId,
              reason: 'booking_late_cancel_after_4h'
            }
          }
        );
        // Professor mantém a hora que recebeu no agendamento
      }
    } else if (hasStudent && booking.source === 'PROFESSOR') {
      // PROFESSOR agendou para aluno: devolver horas ao PROFESSOR
      const profBalance = await balanceService.getProfessorBalance(booking.teacher_id, franqueadoraId);
      
      // Incrementar available_hours de volta (refund)
      await balanceService.updateProfessorBalance(
        booking.teacher_id,
        franqueadoraId,
        {
          available_hours: profBalance.available_hours + 1
        }
      );
      
      // Registrar transação de refund
      await balanceService.createHourTransaction(
        booking.teacher_id,
        franqueadoraId,
        'REFUND',
        1,
        {
          unitId: booking.unit_id,
          source: 'SYSTEM',
          bookingId: bookingId,
          metaJson: {
            booking_id: bookingId,
            actor: userId,
            reason: 'booking_cancelled_refund_professor'
          }
        }
      );
    }
    // Caso contrário: disponibilidade sem aluno - nenhum crédito afetado

    const now = new Date();
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'CANCELLED', // Campo antigo
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

  async confirmBooking(bookingId: string): Promise<BookingCanonical> {
    const { data: booking, error: fetchError } = await supabase
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

    // Confirmação não altera saldos: 
    // - Em aluno-led, o professor já recebeu 1h no agendamento e o aluno só consome em DONE ou late-cancel.
    // - Em professor-led, a hora foi debitada na criação e o aluno não consome aqui.

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

    if (updateError || !updatedBooking) {
      throw updateError || new Error('Falha ao confirmar booking');
    }

    return updatedBooking;
  }

  async completeBooking(bookingId: string): Promise<BookingCanonical> {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw fetchError || new Error('Booking nao encontrado');
    }

    const franqueadoraId = await fetchFranqueadoraIdFromUnit(booking.unit_id);

    if (booking.student_id) {
      await balanceService.consumeStudentClasses(
        booking.student_id,
        franqueadoraId,
        1,
        bookingId,
        {
          unitId: booking.unit_id,
          source: 'ALUNO',
          metaJson: {
            booking_id: bookingId,
            reason: 'booking_completed'
          }
        }
      );
    }

    // Observação: para agendamentos aluno-led, o professor já recebeu 1h (pagamento) no ato do agendamento.
    // Para agendamentos professor-led, a hora foi consumida na criação do booking.
    // Portanto, não há consumo adicional de horas do professor na conclusão.

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

    if (updateError || !updatedBooking) {
      throw updateError || new Error('Falha ao concluir booking');
    }

    return updatedBooking;
  }

  private async createOrUpdateStudentUnit(studentId: string, unitId: string, bookingId: string): Promise<void> {
    try {
      const { data: existingStudentUnit } = await supabase
        .from('student_units')
        .select('id, first_booking_date, last_booking_date, total_bookings, active')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .single();

      const now = new Date().toISOString();

      if (existingStudentUnit) {
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
          throw updateError;
        }
      } else {
        const { error: createError } = await supabase
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
    } catch (error) {
      console.error('Erro em createOrUpdateStudentUnit:', error);
      console.warn('Falha ao atualizar vinculo aluno-unidade; prosseguindo com agendamento.');
    }
  }
}

export const bookingCanonicalService = new BookingCanonicalService();

