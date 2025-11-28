import express from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { balanceService } from '../services/balance.service';
import { createNotification, createUserNotification } from './notifications';

const router = express.Router();

async function fetchFranqueadoraIdFromUnit(unitId: string): Promise<string | null> {
  const { data: academyDirect } = await supabase
    .from('academies')
    .select('franqueadora_id')
    .eq('id', unitId)
    .single();

  if (academyDirect?.franqueadora_id) {
    return academyDirect.franqueadora_id;
  }

  const { data: unitData } = await supabase
    .from('units')
    .select('academy_legacy_id')
    .eq('id', unitId)
    .single();

  if (unitData?.academy_legacy_id) {
    const { data: legacyAcademy } = await supabase
      .from('academies')
      .select('franqueadora_id')
      .eq('id', unitData.academy_legacy_id)
      .single();

    if (legacyAcademy?.franqueadora_id) {
      return legacyAcademy.franqueadora_id;
    }
  }

  return null;
}

function calculateAvailableClasses(totalPurchased: number, totalConsumed: number, lockedQty: number): number {
  return totalPurchased - totalConsumed - lockedQty;
}

// POST /api/bookings/student - agendamento feito pelo aluno com creditos globais
router.post('/student', async (req, res) => {
  try {
    const schema = z.object({
      student_id: z.string().uuid(),
      teacher_id: z.string().uuid(),
      franchise_id: z.string().uuid(),
      date: z.string(),
      duration: z.number().min(15).max(240).optional(),
      notes: z.string().optional()
    });

    const { student_id, teacher_id, franchise_id, date, duration, notes } = schema.parse(req.body);

    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, credits')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ message: 'Aluno nao encontrado' });
    }

    const franqueadoraId = await fetchFranqueadoraIdFromUnit(franchise_id);
    if (!franqueadoraId) {
      return res.status(400).json({ message: 'Franqueadora nao localizada para a unidade informada' });
    }

    const { data: academyCfg } = await supabase
      .from('academies')
      .select('credits_per_class, class_duration_minutes')
      .eq('id', franchise_id)
      .single();

    const defaultCredits = Number.parseInt(process.env.DEFAULT_CREDITS_PER_CLASS || '1', 10);
    const effectiveCost = Math.max(1, academyCfg?.credits_per_class ?? defaultCredits);
    const effectiveDuration = (typeof duration === 'number' && !Number.isNaN(duration))
      ? duration
      : Math.max(15, academyCfg?.class_duration_minutes ?? 60);

    const studentBalance = await balanceService.getStudentBalance(student_id, franqueadoraId);
    const availableClasses = calculateAvailableClasses(
      studentBalance.total_purchased,
      studentBalance.total_consumed,
      studentBalance.locked_qty
    );

    if (availableClasses < effectiveCost) {
      return res.status(400).json({ message: 'Creditos insuficientes do aluno' });
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + effectiveDuration * 60000);

    // VALIDAÇÃO 1: Verificar capacidade da unidade
    // Buscar capacidade da unidade (pode estar em units ou academies)
    let unitCapacity = 1; // padrão
    const { data: unit } = await supabase
      .from('units')
      .select('capacity_per_slot')
      .or(`id.eq.${franchise_id},academy_legacy_id.eq.${franchise_id}`)
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
        .eq('id', franchise_id)
        .single();
      
      if (academy?.capacity_per_slot) {
        unitCapacity = academy.capacity_per_slot;
      }
    }

    // Contar agendamentos no mesmo horário na unidade (considerando sobreposição)
    const { data: unitBookings, error: unitBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at')
      .or(`franchise_id.eq.${franchise_id},academy_id.eq.${franchise_id},unit_id.eq.${franchise_id}`)
      .neq('status', 'CANCELLED')
      .neq('status_canonical', 'CANCELED');

    if (unitBookingsError) {
      console.error('Erro ao validar capacidade da unidade:', unitBookingsError);
      return res.status(500).json({ message: 'Erro ao validar capacidade da unidade' });
    }

    // Verificar sobreposição de horários
    const overlappingBookings = (unitBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at 
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);
      
      // Verificar se há sobreposição: o novo agendamento começa antes do existente terminar
      // e o novo agendamento termina depois do existente começar
      return (startDate < bookingEnd && endDate > bookingStart);
    });

    if (overlappingBookings.length >= unitCapacity) {
      return res.status(409).json({ 
        message: `Capacidade da unidade excedida. Máximo de ${unitCapacity} agendamento(s) simultâneo(s) permitido(s).` 
      });
    }

    // VALIDAÇÃO 2: Verificar conflito de professor (mesmo professor não pode atender 2 alunos ao mesmo tempo)
    // Buscar bookings do professor que sobrepõem com o horário solicitado
    const { data: teacherBookings, error: teacherBookingsError } = await supabase
      .from('bookings')
      .select('id, date, duration, start_at, end_at, student_id')
      .eq('teacher_id', teacher_id)
      .or(`franchise_id.eq.${franchise_id},academy_id.eq.${franchise_id},unit_id.eq.${franchise_id}`)
      .neq('status', 'CANCELLED')
      .neq('status_canonical', 'CANCELED')
      .not('student_id', 'is', null); // Apenas bookings com aluno

    if (teacherBookingsError) {
      console.error('Erro ao validar disponibilidade do professor:', teacherBookingsError);
      return res.status(500).json({ message: 'Erro ao validar disponibilidade do professor' });
    }

    // Verificar sobreposição de horários do professor
    const teacherOverlapping = (teacherBookings || []).filter((b: any) => {
      const bookingStart = b.start_at ? new Date(b.start_at) : new Date(b.date);
      const bookingEnd = b.end_at 
        ? new Date(b.end_at)
        : new Date(bookingStart.getTime() + (b.duration || 60) * 60000);
      
      // Verificar se há sobreposição
      return (startDate < bookingEnd && endDate > bookingStart);
    });

    if (teacherOverlapping.length > 0) {
      return res.status(409).json({ 
        message: 'Professor indisponível neste horário. O professor já possui um agendamento com outro aluno no mesmo período.' 
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id,
        teacher_id,
        franchise_id,
        date: startDate.toISOString(),
        duration: effectiveDuration,
        notes,
        credits_cost: effectiveCost,
        status: 'CONFIRMED',
        payment_source: 'student_credits',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name),
        teacher:users!bookings_teacher_id_fkey (id, name),
        franchise:academies!bookings_franchise_id_fkey (id, name)
      `)
      .single();

    if (bookingError || !booking) {
      console.error('Erro ao criar agendamento do aluno:', bookingError);
      return res.status(500).json({ message: 'Erro ao criar agendamento' });
    }

    const { balance: updatedBalance } = await balanceService.consumeStudentClasses(
      student_id,
      franqueadoraId,
      effectiveCost,
      booking.id,
      {
        unitId: franchise_id,
        source: 'ALUNO',
        metaJson: {
          booking_id: booking.id,
          origin: 'student_booking'
        }
      }
    );

    const remainingCredits = calculateAvailableClasses(
      updatedBalance.total_purchased,
      updatedBalance.total_consumed,
      updatedBalance.locked_qty
    );

    await supabase
      .from('users')
      .update({ credits: Math.max(0, remainingCredits), updated_at: new Date().toISOString() })
      .eq('id', student_id);

    try {
      await createNotification(
        franchise_id,
        'new_booking',
        'Nova reserva',
        'Um aluno confirmou uma nova reserva.',
        { student_id, teacher_id, date: startDate.toISOString() }
      );

      await createUserNotification(
        teacher_id,
        'new_booking',
        'Nova reserva confirmada',
        'Voce tem uma nova aula confirmada.',
        { student_id, date: startDate.toISOString() }
      );

      await createUserNotification(
        student_id,
        'new_booking',
        'Reserva confirmada',
        'Sua reserva foi confirmada com sucesso.',
        { teacher_id, date: startDate.toISOString() }
      );
    } catch {}

    return res.status(201).json({
      message: 'Agendamento confirmado com sucesso',
      booking
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados invalidos', errors: err.errors });
    }
    console.error('Erro inesperado no agendamento do aluno:', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

// POST /api/bookings/:id/cancel - cancelamento com reembolso de creditos globais
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, status, date, credits_cost, payment_source, student_id, franchise_id')
      .eq('id', id)
      .single();

    if (getError || !booking) {
      return res.status(404).json({ message: 'Agendamento nao encontrado' });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Agendamento nao pode ser cancelado' });
    }

    let refund: null | { refunded: boolean; credits: number; recipient: 'student' } = null;
    const start = new Date(booking.date);
    const now = new Date();
    const hoursDiff = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    const franqueadoraId = await fetchFranqueadoraIdFromUnit(booking.franchise_id);

    if (
      franqueadoraId &&
      booking.payment_source === 'student_credits' &&
      hoursDiff >= 4 &&
      booking.student_id
    ) {
      const refundQty = booking.credits_cost || 0;
      if (refundQty > 0) {
        const currentBalance = await balanceService.getStudentBalance(booking.student_id, franqueadoraId);

        await balanceService.createStudentTransaction(
          booking.student_id,
          franqueadoraId,
          'REFUND',
          refundQty,
          {
            unitId: booking.franchise_id,
            source: 'SYSTEM',
            metaJson: {
              booking_id: booking.id,
              reason: 'booking_cancelled'
            }
          }
        );

        const restoredBalance = await balanceService.updateStudentBalance(
          booking.student_id,
          franqueadoraId,
          {
            total_consumed: Math.max(0, currentBalance.total_consumed - refundQty)
          }
        );

        const availableAfterRefund = calculateAvailableClasses(
          restoredBalance.total_purchased,
          restoredBalance.total_consumed,
          restoredBalance.locked_qty
        );

        await supabase
          .from('users')
          .update({ credits: Math.max(0, availableAfterRefund), updated_at: new Date().toISOString() })
          .eq('id', booking.student_id);

        refund = { refunded: true, credits: refundQty, recipient: 'student' };
      }
    }

    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (cancelError) {
      console.error('Erro ao cancelar agendamento:', cancelError);
      return res.status(500).json({ message: 'Erro ao cancelar agendamento' });
    }

    try {
      if (booking?.franchise_id) {
        await createNotification(
          booking.franchise_id,
          'booking_cancelled',
          'Reserva cancelada',
          'Uma reserva foi cancelada.',
          { booking_id: id }
        );
      }
      if (booking?.student_id) {
        await createUserNotification(
          booking.student_id,
          'booking_cancelled',
          'Reserva cancelada',
          'Sua reserva foi cancelada.',
          { booking_id: id }
        );
      }
    } catch {}

    return res.json({ message: 'Agendamento cancelado com sucesso', refund });
  } catch (err) {
    console.error('Erro inesperado no cancelamento:', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

export default router;

