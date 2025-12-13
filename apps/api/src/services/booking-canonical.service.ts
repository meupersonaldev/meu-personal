import { supabase } from '../lib/supabase';
import {
  balanceService,
  StudentClassBalance,
  ProfHourBalance
} from './balance.service';
import { policyService } from './policy.service';

async function fetchFranqueadoraIdFromAcademy(academyId: string): Promise<string> {
  console.log(`🔍 Buscando franqueadora_id para academyId: ${academyId}`)

  const { data: academy, error: academyError } = await supabase
    .from('academies')
    .select('franqueadora_id, name')
    .eq('id', academyId)
    .single();

  console.log('📍 Resultado academies:', { academy, academyError })

  if (academy?.franqueadora_id) {
    console.log(`✅ Franqueadora encontrada: ${academy.franqueadora_id}`)
    return academy.franqueadora_id;
  }

  console.error(`❌ Franqueadora não encontrada para academyId: ${academyId}`)
  throw new Error(`Academia inválida ou sem franqueadora configurada (ID: ${academyId}). Por favor, selecione outra academia nas configurações.`);
}

function getAvailableClasses(balance: StudentClassBalance): number {
  return balance.total_purchased - balance.total_consumed - balance.locked_qty;
}

function getAvailableHours(balance: ProfHourBalance): number {
  return balance.available_hours - balance.locked_hours;
}

/**
 * Extrai a data (YYYY-MM-DD) no fuso horário de São Paulo (UTC-3)
 * Isso é necessário porque o campo 'date' deve refletir a data local, não UTC
 */
function getDateInSaoPaulo(utcDate: Date): string {
  // São Paulo é UTC-3 (sem horário de verão desde 2019)
  // Se UTC é 00:00 do dia 9, São Paulo é 21:00 do dia 8
  // Então subtraímos 3 horas para obter o horário de São Paulo
  const saoPauloTime = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
  const dateOnly = saoPauloTime.toISOString().split('T')[0];
  
  console.log('[DEBUG getDateInSaoPaulo]', {
    utcDateISO: utcDate.toISOString(),
    saoPauloTimeISO: saoPauloTime.toISOString(),
    dateOnly
  });
  
  return dateOnly;
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
      // Fallback: calcular 4 horas antes de startAt (mais simples e confiável)
      // Regra: cancelamento gratuito até 4 horas antes do horário agendado
      const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
      cancellableUntil = new Date(params.startAt.getTime() - FOUR_HOURS_MS)
    }

    if (params.source === 'ALUNO') {
      return this.createStudentLedBooking(params, cancellableUntil);
    }

    return this.createProfessorLedBooking(params, cancellableUntil);
  }

  async updateBookingToStudent(params: {
    bookingId: string;
    studentId: string;
    source: 'ALUNO' | 'PROFESSOR';
    studentNotes?: string;
    professorNotes?: string;
    skipBalance?: boolean; // Professor vinculado - não requer créditos
  }): Promise<BookingCanonical> {
    // Buscar o booking existente
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, teacher_id, franchise_id, student_id, status_canonical, start_at, date, professor_notes')
      .eq('id', params.bookingId)
      .single();

    if (fetchError || !existingBooking) {
      throw new Error('Booking não encontrado');
    }

    // Verificar se o booking está disponível (student_id IS NULL e status_canonical = 'AVAILABLE')
    if (existingBooking.student_id !== null) {
      throw new Error('Este horário já está ocupado por outro aluno');
    }

    if (existingBooking.status_canonical !== 'AVAILABLE') {
      throw new Error('Este horário não está disponível para agendamento');
    }

    // Verificar saldo do aluno (pular se for professor vinculado)
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(existingBooking.franchise_id);

    if (!params.skipBalance) {
      const studentBalance = await balanceService.getStudentBalance(params.studentId, franqueadoraId);
      const availableClasses = getAvailableClasses(studentBalance);

      if (availableClasses < 1) {
        throw new Error('Saldo insuficiente de aulas');
      }
    }

    // Calcular cancellable_until baseado no horário do booking existente
    // Regra: 4 horas antes do horário de início
    const bookingStartAt = existingBooking.start_at
      ? new Date(existingBooking.start_at)
      : existingBooking.date
        ? new Date(existingBooking.date)
        : null;

    if (!bookingStartAt) {
      throw new Error('Booking não possui horário válido');
    }

    // Simplificar: subtrair 4 horas em milissegundos (mais confiável)
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const cancellableUntil = new Date(bookingStartAt.getTime() - FOUR_HOURS_MS);

    // Atualizar o booking existente
    const updateData: any = {
      source: params.source,
      student_id: params.studentId,
      status: 'CONFIRMED',
      status_canonical: 'PAID',
      cancellable_until: cancellableUntil.toISOString(),
      student_notes: params.studentNotes,
      professor_notes: params.professorNotes || existingBooking.professor_notes,
      updated_at: new Date().toISOString()
    };

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', params.bookingId)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      console.error('[updateBookingToStudent] Erro ao atualizar booking:', updateError);
      throw updateError || new Error('Falha ao atualizar booking');
    }

    // Consumir créditos do aluno (pular se for professor vinculado)
    if (!params.skipBalance) {
      await balanceService.consumeStudentClasses(
        params.studentId,
        franqueadoraId,
        1,
        updatedBooking.id,
        {
          unitId: null,
          source: params.source,
          metaJson: {
            booking_id: updatedBooking.id,
            origin: 'student_booking_update'
          }
        }
      );

      // Sincronizar cache de créditos do usuário
      await this.syncUserCredits(params.studentId, franqueadoraId);
    }

    // Professor recebe as horas TRAVADAS (visíveis mas não utilizáveis)
    // Serão liberadas quando a aula for marcada como COMPLETED/DONE
    if (existingBooking.teacher_id) {
      try {
        await balanceService.lockProfessorBonusHours(
          existingBooking.teacher_id,
          franqueadoraId,
          1,
          updatedBooking.id,
          null, // unlock_at = null, liberado via completeBooking
          {
            unitId: null,
            source: 'SYSTEM',
            metaJson: {
              booking_id: updatedBooking.id,
              origin: 'student_booking_reward',
              student_id: params.studentId
            }
          }
        );
        console.log(`[updateBookingToStudent] ✅ Hora bônus travada para professor ${existingBooking.teacher_id}`);
      } catch (bonusError) {
        console.error(`[updateBookingToStudent] ❌ Erro ao travar hora bônus:`, bonusError);
        // Não impedir o agendamento se falhar
      }
    }

    return updatedBooking;
  }

  private async syncUserCredits(studentId: string, franqueadoraId: string): Promise<void> {
    try {
      const balance = await balanceService.getStudentBalance(studentId, franqueadoraId);
      const available = getAvailableClasses(balance);

      const { error } = await supabase
        .from('users')
        .update({
          credits: Math.max(0, available),
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) {
        console.error('[syncUserCredits] Erro ao sincronizar créditos:', error);
      } else {
        console.log(`[syncUserCredits] Créditos sincronizados para usuário ${studentId}: ${available}`);
      }
    } catch (err) {
      console.error('[syncUserCredits] Erro ao buscar saldo:', err);
    }
  }

  private async createStudentLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    if (!params.studentId) {
      throw new Error('studentId eh obrigatorio para agendamento aluno-led');
    }

    // Usar franchiseId (academyId) diretamente para buscar franqueadora_id
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(params.franchiseId);
    const studentBalance = await balanceService.getStudentBalance(params.studentId, franqueadoraId);
    const availableClasses = getAvailableClasses(studentBalance);

    if (availableClasses < 1) {
      throw new Error('Saldo insuficiente de aulas');
    }

    // VALIDAÇÃO DE POLÍTICAS: Verificar regras da franqueadora/franquia
    const policyValidation = await policyService.validateBookingCreation({
      academyId: params.franchiseId,
      startAt: params.startAt,
      studentId: params.studentId
    });

    if (!policyValidation.valid) {
      throw new Error(policyValidation.errors.join('. '));
    }

    // VALIDAÇÃO 1: Verificar capacidade da unidade
    let unitCapacity = 1; // padrão
    const { data: unit } = await supabase
      .from('units')
      .select('capacity_per_slot')
      .or(`id.eq.${params.franchiseId},academy_legacy_id.eq.${params.franchiseId}`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (unit?.capacity_per_slot) {
      unitCapacity = unit.capacity_per_slot;
    } else {
      // Fallback: buscar de academies se não encontrar em units
      const { data: academy } = await supabase
        .from('academies')
        .select('capacity_per_slot')
        .eq('id', params.franchiseId)
        .single();

      if (academy?.capacity_per_slot) {
        unitCapacity = academy.capacity_per_slot;
      }
    }

    // Buscar todos os bookings da unidade que não estão cancelados
    const { data: unitBookings, error: unitBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at, student_id')
      .or(`franchise_id.eq.${params.franchiseId},academy_id.eq.${params.franchiseId},unit_id.eq.${params.franchiseId}`)
      .neq('status_canonical', 'CANCELED')
      .not('student_id', 'is', null); // Apenas bookings com aluno

    if (unitBookingsError) {
      console.error('[createStudentLedBooking] Erro ao validar capacidade da unidade:', unitBookingsError);
      throw new Error('Erro ao validar capacidade da unidade');
    }

    // Verificar sobreposição de horários na unidade
    const overlappingUnitBookings = (unitBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);

      // Verificar se há sobreposição: o novo agendamento começa antes do existente terminar
      // e o novo agendamento termina depois do existente começar
      return (params.startAt < bookingEnd && params.endAt > bookingStart);
    });

    if (overlappingUnitBookings.length >= unitCapacity) {
      throw new Error(`Capacidade da unidade excedida. Máximo de ${unitCapacity} agendamento(s) simultâneo(s) permitido(s).`);
    }

    // VALIDAÇÃO 2: Verificar conflito de professor (mesmo professor não pode atender 2 alunos ao mesmo tempo)
    const startAtISO = params.startAt.toISOString();

    // Buscar bookings do professor que sobrepõem com o horário solicitado
    const { data: teacherBookings, error: teacherBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at, student_id')
      .eq('teacher_id', params.professorId)
      .or(`franchise_id.eq.${params.franchiseId},academy_id.eq.${params.franchiseId},unit_id.eq.${params.franchiseId}`)
      .neq('status_canonical', 'CANCELED')
      .not('student_id', 'is', null); // Apenas bookings com aluno

    if (teacherBookingsError) {
      console.error('[createStudentLedBooking] Erro ao verificar conflitos do professor:', teacherBookingsError);
      throw new Error('Erro ao verificar disponibilidade do professor');
    }

    // Verificar sobreposição de horários do professor
    const teacherOverlapping = (teacherBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);

      // Verificar se há sobreposição
      return (params.startAt < bookingEnd && params.endAt > bookingStart);
    });

    if (teacherOverlapping.length > 0) {
      throw new Error('Professor indisponível neste horário. O professor já possui um agendamento com outro aluno no mesmo período.');
    }

    // CORREÇÃO: Buscar booking AVAILABLE existente para ATUALIZAR ao invés de deletar e criar novo
    // Fazer duas queries: uma com start_at e outra com date
    const { data: availableByStartAt, error: availableError1 } = await supabase
      .from('bookings')
      .select('id, start_at, date, status_canonical, source, professor_notes')
      .eq('teacher_id', params.professorId)
      .eq('franchise_id', params.franchiseId)
      .eq('status_canonical', 'AVAILABLE')
      .is('student_id', null)
      .eq('start_at', startAtISO)
      .limit(1);

    const { data: availableByDate, error: availableError2 } = await supabase
      .from('bookings')
      .select('id, start_at, date, status_canonical, source, professor_notes')
      .eq('teacher_id', params.professorId)
      .eq('franchise_id', params.franchiseId)
      .eq('status_canonical', 'AVAILABLE')
      .is('student_id', null)
      .is('start_at', null)
      .eq('date', startAtISO)
      .limit(1);

    if (availableError1 || availableError2) {
      console.error('[createStudentLedBooking] Erro ao buscar booking AVAILABLE:', availableError1 || availableError2);
      throw new Error('Erro ao verificar disponibilidade do horário');
    }

    // Combinar resultados
    const availableBookings = [
      ...(availableByStartAt || []),
      ...(availableByDate || [])
    ];

    let booking: BookingCanonical;

    if (availableBookings && availableBookings.length > 0) {
      // ATUALIZAR booking AVAILABLE existente
      const existingBooking = availableBookings[0];
      console.log('[createStudentLedBooking] Atualizando booking AVAILABLE existente:', existingBooking.id);

      // Preparar dados de atualização
      const updateData: any = {
        source: params.source,
        student_id: params.studentId,
        status: 'CONFIRMED', // Campo antigo (enum só aceita CONFIRMED)
        status_canonical: 'PAID', // Confirmado direto, sem aprovação
        cancellable_until: cancellableUntil.toISOString(),
        student_notes: params.studentNotes,
        professor_notes: params.professorNotes || existingBooking.professor_notes,
        updated_at: new Date().toISOString()
      };

      // Garantir que start_at e end_at estejam definidos
      if (!existingBooking.start_at) {
        updateData.start_at = params.startAt.toISOString();
        updateData.date = params.startAt.toISOString(); // Manter date também
      }
      updateData.end_at = params.endAt.toISOString();

      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', existingBooking.id)
        .select()
        .single();

      if (updateError || !updatedBooking) {
        console.error('[createStudentLedBooking] Erro ao atualizar booking:', updateError);
        throw updateError || new Error('Falha ao atualizar booking');
      }

      booking = updatedBooking;
    } else {
      // Se não houver booking AVAILABLE, criar novo (caso raro, mas mantém compatibilidade)
      console.log('[createStudentLedBooking] Nenhum booking AVAILABLE encontrado, criando novo');

      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          source: params.source,
          student_id: params.studentId,
          teacher_id: params.professorId,
          franchise_id: params.franchiseId, // Usar franchise_id diretamente
          unit_id: null, // NÃO usar unit_id
          date: getDateInSaoPaulo(params.startAt), // Data no fuso de São Paulo
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

      if (bookingError || !newBooking) {
        throw bookingError || new Error('Falha ao criar booking');
      }

      booking = newBooking;
    }

    // Como o booking já é criado como PAID (confirmado), consumir créditos direto
    // NÃO passar unitId - sempre null
    await balanceService.consumeStudentClasses(
      params.studentId,
      franqueadoraId,
      1,
      booking.id,
      {
        unitId: null, // NÃO usar unit_id
        source: 'ALUNO',
        metaJson: {
          booking_id: booking.id,
          origin: 'student_led'
        }
      }
    );

    // Sincronizar cache de créditos
    await this.syncUserCredits(params.studentId, franqueadoraId);

    // Professor recebe as horas TRAVADAS (visíveis mas não utilizáveis)
    // Serão liberadas quando a aula for marcada como COMPLETED
    await balanceService.lockProfessorBonusHours(
      params.professorId,
      franqueadoraId,
      1,
      booking.id,
      null, // unlock_at = null, liberado via completeBooking
      {
        unitId: null,
        source: 'SYSTEM',
        metaJson: {
          booking_id: booking.id,
          origin: 'student_booking_reward',
          student_id: params.studentId
        }
      }
    );

    return booking;
  }

  private async createProfessorLedBooking(
    params: CreateBookingParams,
    cancellableUntil: Date
  ): Promise<BookingCanonical> {
    // Usar franchiseId (academyId) diretamente para buscar franqueadora_id
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(params.franchiseId);
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
          date: getDateInSaoPaulo(params.startAt), // Data no fuso de São Paulo
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

    // VALIDAÇÃO DE POLÍTICAS: Verificar limite diário do professor
    const teacherDailyLimit = await policyService.validateTeacherDailyLimit({
      academyId: params.franchiseId,
      teacherId: params.professorId,
      date: params.startAt
    });

    if (!teacherDailyLimit.valid) {
      throw new Error(teacherDailyLimit.error || 'Limite diário de aulas atingido');
    }

    // VALIDAÇÃO 1: Verificar capacidade da unidade
    let unitCapacity = 1; // padrão
    const { data: unit } = await supabase
      .from('units')
      .select('capacity_per_slot')
      .or(`id.eq.${params.franchiseId},academy_legacy_id.eq.${params.franchiseId}`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (unit?.capacity_per_slot) {
      unitCapacity = unit.capacity_per_slot;
    } else {
      // Fallback: buscar de academies se não encontrar em units
      const { data: academy } = await supabase
        .from('academies')
        .select('capacity_per_slot')
        .eq('id', params.franchiseId)
        .single();

      if (academy?.capacity_per_slot) {
        unitCapacity = academy.capacity_per_slot;
      }
    }

    // Buscar todos os bookings da unidade que não estão cancelados
    const { data: unitBookings, error: unitBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at, student_id')
      .or(`franchise_id.eq.${params.franchiseId},academy_id.eq.${params.franchiseId},unit_id.eq.${params.franchiseId}`)
      .neq('status_canonical', 'CANCELED')
      .not('student_id', 'is', null); // Apenas bookings com aluno

    if (unitBookingsError) {
      console.error('[createProfessorLedBooking] Erro ao validar capacidade da unidade:', unitBookingsError);
      throw new Error('Erro ao validar capacidade da unidade');
    }

    // Verificar sobreposição de horários na unidade
    const overlappingUnitBookings = (unitBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);

      // Verificar se há sobreposição: o novo agendamento começa antes do existente terminar
      // e o novo agendamento termina depois do existente começar
      return (params.startAt < bookingEnd && params.endAt > bookingStart);
    });

    if (overlappingUnitBookings.length >= unitCapacity) {
      throw new Error(`Capacidade da unidade excedida. Máximo de ${unitCapacity} agendamento(s) simultâneo(s) permitido(s).`);
    }

    // VALIDAÇÃO 2: Verificar conflito de professor (mesmo professor não pode atender 2 alunos ao mesmo tempo)
    // Buscar bookings do professor que sobrepõem com o horário solicitado
    const { data: teacherBookings, error: teacherBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at, student_id')
      .eq('teacher_id', params.professorId)
      .or(`franchise_id.eq.${params.franchiseId},academy_id.eq.${params.franchiseId},unit_id.eq.${params.franchiseId}`)
      .neq('status_canonical', 'CANCELED')
      .not('student_id', 'is', null); // Apenas bookings com aluno

    if (teacherBookingsError) {
      console.error('[createProfessorLedBooking] Erro ao verificar conflitos do professor:', teacherBookingsError);
      throw new Error('Erro ao verificar disponibilidade do professor');
    }

    // Verificar sobreposição de horários do professor
    const teacherOverlapping = (teacherBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);

      // Verificar se há sobreposição
      return (params.startAt < bookingEnd && params.endAt > bookingStart);
    });

    if (teacherOverlapping.length > 0) {
      throw new Error('Professor indisponível neste horário. O professor já possui um agendamento com outro aluno no mesmo período.');
    }

    // Deletar horários AVAILABLE do mesmo professor no mesmo horário/franchise
    await supabase
      .from('bookings')
      .delete()
      .eq('teacher_id', params.professorId)
      .eq('franchise_id', params.franchiseId)
      .eq('start_at', params.startAt.toISOString())
      .eq('status_canonical', 'AVAILABLE')
      .is('student_id', null);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        source: params.source,
        student_id: params.studentId ?? null,
        teacher_id: params.professorId,
        franchise_id: params.franchiseId, // Usar franchise_id diretamente
        unit_id: null, // NÃO usar unit_id
        date: getDateInSaoPaulo(params.startAt), // Data no fuso de São Paulo
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
        unitId: null, // NÃO usar unit_id
        source: 'PROFESSOR',
        bookingId: booking.id,
        metaJson: {
          booking_id: booking.id,
          origin: 'professor_led_booking',
          student_id: params.studentId || null
        }
      }
    );

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

    // Usar franchise_id (academyId) ao invés de unit_id
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(booking.franchise_id);

    // Verificar quem fez o agendamento (source) para aplicar política de cancelamento
    const hasStudent = Boolean(booking.student_id);

    if (hasStudent && booking.source === 'ALUNO') {
      // VALIDAÇÃO DE POLÍTICAS: Verificar regras de cancelamento
      const bookingStartAt = new Date(booking.start_at || booking.date);
      const cancellationValidation = await policyService.validateCancellation({
        academyId: booking.franchise_id,
        bookingStartAt,
        studentId: booking.student_id
      });

      if (!cancellationValidation.canCancel) {
        throw new Error(cancellationValidation.errors.join('. '));
      }

      // Usar política efetiva para determinar late cancel
      const nowUtc = new Date();
      const policy = await policyService.getEffectivePolicy(booking.franchise_id);
      const lateCancelMs = policy.late_cancel_threshold_minutes * 60 * 1000;
      const cutoff = booking.cancellable_until 
        ? new Date(booking.cancellable_until) 
        : new Date(bookingStartAt.getTime() - lateCancelMs);
      const freeCancel = nowUtc <= cutoff;

      console.log('[CANCEL BOOKING] Verificando cancelamento gratuito:', {
        bookingId,
        studentId: booking.student_id,
        nowUtc: nowUtc.toISOString(),
        cutoff: cutoff.toISOString(),
        cancellable_until: booking.cancellable_until,
        start_at: booking.start_at,
        date: booking.date,
        freeCancel
      });

      if (freeCancel) {
        try {
          console.log('[CANCEL BOOKING] ✅ Cancelamento dentro do prazo - estornando crédito');

          // Cancelamento antes de 4h: estornar o crédito do aluno e reverter a hora do professor
          const studentBalance = await balanceService.getStudentBalance(booking.student_id, franqueadoraId);

          console.log('[CANCEL BOOKING] Balance antes do estorno:', {
            total_purchased: studentBalance.total_purchased,
            total_consumed: studentBalance.total_consumed,
            locked_qty: studentBalance.locked_qty,
            available: getAvailableClasses(studentBalance)
          });

          // Criar transação de estorno (REFUND)
          const refundTransaction = await balanceService.createStudentTransaction(
            booking.student_id,
            franqueadoraId,
            'REFUND',
            1,
            {
              unitId: null, // NÃO usar unit_id
              source: 'SYSTEM',
              bookingId,
              metaJson: {
                booking_id: bookingId,
                actor: userId,
                reason: 'booking_cancelled_before_4h_refund'
              }
            }
          );

          console.log('[CANCEL BOOKING] Transação de estorno criada:', refundTransaction.id);

          // Atualizar balance: reduzir total_consumed em 1
          // Buscar balance novamente para garantir que está atualizado
          const currentBalance = await balanceService.getStudentBalance(booking.student_id, franqueadoraId);
          const newConsumed = Math.max(0, currentBalance.total_consumed - 1);

          const restoredBalance = await balanceService.updateStudentBalance(
            booking.student_id,
            franqueadoraId,
            {
              total_consumed: newConsumed
            }
          );

          console.log('[CANCEL BOOKING] Balance após estorno:', {
            total_purchased: restoredBalance.total_purchased,
            total_consumed: restoredBalance.total_consumed,
            expected_consumed: newConsumed,
            locked_qty: restoredBalance.locked_qty,
            available: getAvailableClasses(restoredBalance)
          });

          // Verificar se a atualização foi bem-sucedida
          if (restoredBalance.total_consumed !== newConsumed) {
            console.error('[CANCEL BOOKING] ❌ Balance não foi atualizado corretamente!', {
              expected: newConsumed,
              actual: restoredBalance.total_consumed
            });
            // Tentar atualizar novamente
            const retryBalance = await balanceService.updateStudentBalance(
              booking.student_id,
              franqueadoraId,
              {
                total_consumed: newConsumed
              }
            );
            console.log('[CANCEL BOOKING] Retry balance:', {
              total_consumed: retryBalance.total_consumed
            });
          }

          // Sincronizar cache de créditos
          await this.syncUserCredits(booking.student_id, franqueadoraId);
        } catch (error) {
          console.error('[CANCEL BOOKING] ❌ Erro ao estornar crédito:', error);
          // Não lançar o erro para não impedir o cancelamento, mas logar para debug
        }

        // Reverter a hora TRAVADA do professor (ele não recebe pois a aula foi cancelada)
        await balanceService.revokeBonusLock(
          booking.teacher_id,
          franqueadoraId,
          1,
          bookingId,
          {
            source: 'SYSTEM',
            metaJson: {
              booking_id: bookingId,
              actor: userId,
              reason: 'student_cancelled_before_4h'
            }
          }
        );
      } else {
        console.log('[CANCEL BOOKING] ⚠️ Cancelamento após o prazo - professor recebe a hora como compensação');
        // Cancelamento após 4h: aluno não recebe estorno
        // Professor recebe a hora como compensação (liberar de locked para available)
        try {
          await balanceService.unlockProfessorBonusHours(
            booking.teacher_id,
            franqueadoraId,
            1,
            bookingId,
            {
              source: 'SYSTEM',
              metaJson: {
                booking_id: bookingId,
                actor: userId,
                reason: 'late_cancellation_compensation'
              }
            }
          );
          console.log(`[CANCEL BOOKING] ✅ Hora bônus liberada para professor ${booking.teacher_id} (compensação)`);
        } catch (error) {
          console.error(`[CANCEL BOOKING] ❌ Erro ao liberar hora bônus:`, error);
        }
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
          unitId: null, // NÃO usar unit_id
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
        status: 'CANCELLED', // Campo antigo (mantido para compatibilidade)
        status_canonical: 'AVAILABLE', // Voltar para AVAILABLE para que o horário fique disponível novamente
        student_id: null, // Limpar student_id para que o horário volte a estar disponível
        updated_at: now.toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      throw updateError || new Error('Falha ao cancelar booking');
    }

    // Verificar se era a primeira aula grátis do aluno e devolver o direito
    // Só devolver se o aluno não tem outros bookings PAID ou DONE
    if (hasStudent && booking.student_id) {
      try {
        // Verificar se o aluno tem outros bookings ativos (PAID ou DONE)
        const { data: otherBookings, error: otherError } = await supabase
          .from('bookings')
          .select('id')
          .eq('student_id', booking.student_id)
          .in('status_canonical', ['PAID', 'DONE'])
          .neq('id', bookingId)
          .limit(1);
        
        // Se não tem outros bookings ativos, devolver o direito à primeira aula
        if (!otherError && (!otherBookings || otherBookings.length === 0)) {
          const { error: resetError } = await supabase
            .from('users')
            .update({ 
              first_class_used: false,
              updated_at: now.toISOString()
            })
            .eq('id', booking.student_id)
            .eq('first_class_used', true); // Só atualiza se estava true
          
          if (resetError) {
            console.error(`[cancelBooking] Erro ao resetar first_class_used para aluno ${booking.student_id}:`, resetError);
          } else {
            console.log(`[cancelBooking] first_class_used resetado para false para aluno ${booking.student_id} (cancelamento)`);
          }
        }
      } catch (error) {
        console.error(`[cancelBooking] Erro ao verificar/resetar first_class_used:`, error);
      }
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

    // Usar franchise_id (academyId) ao invés de unit_id
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(booking.franchise_id);

    // Verificar se o aluno e professor estão vinculados (carteira)
    // Se estiverem, NÃO consumir créditos na conclusão (pois já foi "pago" externamente ou pulado no agendamento)
    let isLinkedTeacher = false;
    if (booking.student_id && booking.teacher_id) {
      const { data: link } = await supabase
        .from('teacher_students')
        .select('id')
        .eq('teacher_id', booking.teacher_id)
        .eq('student_id', booking.student_id)
        .single();

      if (link) {
        console.log(`[completeBooking] Professor ${booking.teacher_id} e Aluno ${booking.student_id} vinculados. Pulando consumo de crédito.`);
        isLinkedTeacher = true;
      }
    }

    if (booking.student_id && !isLinkedTeacher) {
      // TODO: Verificar se isso não gera cobrança dupla para alunos da academia
      // (pois o crédito geralmente é consumido no booking PAID).
      // Por segurança, mantemos o comportamento atual para não-vinculados,
      // mas seria ideal verificar se já foi consumido.

      await balanceService.consumeStudentClasses(
        booking.student_id,
        franqueadoraId,
        1,
        bookingId,
        {
          unitId: null, // NÃO usar unit_id
          source: 'ALUNO',
          metaJson: {
            booking_id: bookingId,
            reason: 'booking_completed'
          }
        }
      );
    }

    // Observação: para agendamentos aluno-led, o professor recebeu horas TRAVADAS no agendamento.
    // Agora que a aula foi concluída, liberamos as horas para uso.
    if (booking.source === 'ALUNO' && booking.teacher_id) {
      try {
        console.log(`[completeBooking] Liberando hora bônus do professor ${booking.teacher_id}`);
        await balanceService.unlockProfessorBonusHours(
          booking.teacher_id,
          franqueadoraId,
          1,
          bookingId,
          {
            source: 'SYSTEM',
            metaJson: {
              booking_id: bookingId,
              reason: 'class_completed',
              student_id: booking.student_id
            }
          }
        );
        console.log(`[completeBooking] ✅ Hora bônus liberada para professor ${booking.teacher_id}`);
      } catch (error) {
        console.error(`[completeBooking] ❌ Erro ao liberar hora bônus do professor:`, error);
        // Não impedir a conclusão do booking
      }
    }
    // Para agendamentos professor-led, a hora foi consumida na criação do booking.

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

    // Marcar primeira aula utilizada (idempotente e não bloqueante)
    if (updatedBooking.student_id) {
      try {
        const { data: flagData, error: flagError } = await supabase
          .from('users')
          .update({
            first_class_used: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', updatedBooking.student_id)
          .eq('first_class_used', false)
          .select('id');

        if (flagError) {
          console.error(
            `[completeBooking] Erro ao marcar primeira aula como utilizada para aluno ${updatedBooking.student_id}:`,
            flagError
          );
        } else if (flagData?.length) {
          console.log(
            `[completeBooking] Primeira aula marcada como utilizada para aluno ${updatedBooking.student_id}`
          );
        }
      } catch (error) {
        console.error(
          `[completeBooking] Erro inesperado ao atualizar first_class_used para aluno ${updatedBooking.student_id}:`,
          error
        );
      }
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

