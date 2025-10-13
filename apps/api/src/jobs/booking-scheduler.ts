import { supabase } from '../lib/supabase';
import { balanceService } from '../services/balance.service';

/**
 * Scheduler T-4h para processamento automático de locks
 *
 * Regras:
 * - Roda a cada 15 minutos
 * - Processa LOCKs de alunos que expiraram (T-4h) -> CONSUME
 * - Processa BONUS_LOCKs de professores que expiraram -> BONUS_UNLOCK (dar horas bônus)
 * - Remove locks não utilizados de agendamentos cancelados
 */
export class BookingScheduler {
  private readonly FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  /**
   * Processa todos os locks expirados
   */
  async processExpiredLocks(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();
    const errors: string[] = [];
    let processed = 0;
    const maxRetries = 2;

    console.log(`🔄 Iniciando processamento de locks expirados - ${now.toISOString()}`);

    const executeWithRetry = async (operation: () => Promise<void>, operationName: string) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await operation();
          processed++;
          console.log(`✅ ${operationName} executado com sucesso`);
          return; // Sucesso, sair do loop
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Erro na tentativa ${attempt} de ${operationName}:`, errorMessage);

          if (attempt === maxRetries) {
            errors.push(`Falha em ${operationName} após ${maxRetries} tentativas: ${errorMessage}`);
          } else {
            console.log(`🔄 Aguardando 5 segundos antes da tentativa ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    };

    // Executar operações com retry
    await executeWithRetry(
      () => this.processStudentLocks(now),
      'processamento de LOCKs de alunos'
    );

    await executeWithRetry(
      () => this.processProfessorBonusLocks(now),
      'processamento de BONUS_LOCKs de professores'
    );

    await executeWithRetry(
      () => this.cleanupCanceledBookingLocks(now),
      'limpeza de locks de bookings cancelados'
    );

    console.log(`✅ Processamento finalizado - ${processed} etapas concluídas, ${errors.length} erros`);

    return { processed, errors };
  }

  /**
   * Processa LOCKs de alunos expirados, convertendo em CONSUME
   * Regra: Aluno perde o crédito se não cancelou >4h antes
   */
  private async processStudentLocks(now: Date): Promise<void> {
    console.log('📋 Processando LOCKs de alunos...');

    try {
      // Verificar conexão com Supabase primeiro
      const { data: testData, error: testError } = await supabase
        .from('student_class_tx')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('❌ Erro de conexão com Supabase:', testError);
        throw new Error(`Erro de conexão com Supabase: ${testError.message}`);
      }

      // Buscar todos os LOCKs que já expiraram (unlock_at <= now)
      const { data: expiredLocks, error: fetchError } = await supabase
        .from('student_class_tx')
        .select(`
          *,
          booking:bookings(id, status_canonical, start_at, end_at)
        `)
        .eq('type', 'LOCK')
        .lte('unlock_at', now.toISOString())
        .is('booking_id', null);

      if (fetchError) {
        throw new Error(`Erro ao buscar LOCKs expirados: ${fetchError.message}`);
      }

    if (!expiredLocks || expiredLocks.length === 0) {
        console.log('✅ Nenhum LOCK de aluno expirado encontrado');
        return;
      }

      console.log(`📊 Encontrados ${expiredLocks.length} LOCKs de alunos expirados`);

      for (const lock of expiredLocks) {
        try {
          // 1. Converter LOCK em CONSUME
          const { error: consumeError } = await supabase
            .from('student_class_tx')
            .update({
              type: 'CONSUME',
              source: 'SYSTEM',
              meta_json: {
                ...lock.meta_json,
                processed_by: 'scheduler',
                processed_at: now.toISOString(),
                reason: 'LOCK expirado T-4h - crédito consumido'
              }
            })
            .eq('id', lock.id);

          if (consumeError) {
            throw new Error(`Erro ao converter LOCK em CONSUME: ${consumeError.message}`);
          }

          // 2. Atualizar saldo do aluno (remover locked_qty e incrementar total_consumed)
          const { error: balanceError } = await supabase
            .from('student_class_balance')
            .update({
              total_consumed: supabase.sql`total_consumed + 1`,
              locked_qty: supabase.sql`GREATEST(locked_qty - 1, 0)`,
              updated_at: now.toISOString()
            })
            .eq('student_id', lock.student_id)
            .eq('unit_id', lock.unit_id);

          if (balanceError) {
            throw new Error(`Erro ao atualizar saldo do aluno: ${balanceError.message}`);
          }

          console.log(`✅ LOCK de aluno processado: ${lock.student_id} - ${lock.unit_id}`);

          // Criar notificação para o aluno
          await this.createLockExpiredNotification(lock.student_id, lock.unit_id);

        } catch (error) {
          console.error(`❌ Erro ao processar LOCK ${lock.id}:`, error);
          // Continuar processando outros locks
        }
      }
    } catch (error) {
      console.error('❌ Erro crítico no processamento de LOCKs de alunos:', error);
      throw error; // Propagar erro para o método principal
    }
  }

  /**
   * Processa BONUS_LOCKs de professores expirados, convertendo em BONUS_UNLOCK
   * Regra: Professor ganha hora bônus se o aluno não cancelou >4h antes
   */
  private async processProfessorBonusLocks(now: Date): Promise<void> {
    console.log('🏆 Processando BONUS_LOCKs de professores...');

    try {
      // Buscar todos os BONUS_LOCKs que já expiraram
      const { data: expiredBonusLocks, error: fetchError } = await supabase
        .from('hour_tx')
        .select(`
          *,
          booking:bookings(id, status_canonical, start_at, end_at)
        `)
        .eq('type', 'BONUS_LOCK')
        .lte('unlock_at', now.toISOString())
        .is('booking_id', null);

      if (fetchError) {
        throw new Error(`Erro ao buscar BONUS_LOCKs expirados: ${fetchError.message}`);
      }

    if (!expiredBonusLocks || expiredBonusLocks.length === 0) {
        console.log('✅ Nenhum BONUS_LOCK de professor expirado encontrado');
        return;
      }

      console.log(`📊 Encontrados ${expiredBonusLocks.length} BONUS_LOCKs de professores expirados`);

      for (const bonusLock of expiredBonusLocks) {
        try {
          // 1. Converter BONUS_LOCK em BONUS_UNLOCK
          const { error: unlockError } = await supabase
            .from('hour_tx')
            .update({
              type: 'BONUS_UNLOCK',
              source: 'SYSTEM',
              meta_json: {
                ...bonusLock.meta_json,
                processed_by: 'scheduler',
                processed_at: now.toISOString(),
                reason: 'BONUS_LOCK expirado T-4h - hora bônus creditada'
              }
            })
            .eq('id', bonusLock.id);

          if (unlockError) {
            throw new Error(`Erro ao converter BONUS_LOCK em BONUS_UNLOCK: ${unlockError.message}`);
          }

          // 2. Dar hora bônus para o professor
          const { error: balanceError } = await supabase
            .from('prof_hour_balance')
            .update({
              available_hours: supabase.sql`available_hours + 1`,
              locked_hours: supabase.sql`GREATEST(locked_hours - 1, 0)`,
              updated_at: now.toISOString()
            })
            .eq('professor_id', bonusLock.professor_id)
            .eq('unit_id', bonusLock.unit_id);

          if (balanceError) {
            throw new Error(`Erro ao dar hora bônus ao professor: ${balanceError.message}`);
          }

          console.log(`✅ BONUS_LOCK processado: ${bonusLock.professor_id} - ${bonusLock.unit_id}`);

          // Criar notificação para o professor
          await this.createBonusEarnedNotification(bonusLock.professor_id, bonusLock.unit_id);

        } catch (error) {
          console.error(`❌ Erro ao processar BONUS_LOCK ${bonusLock.id}:`, error);
          // Continuar processando outros locks
        }
      }
    } catch (error) {
      console.error('❌ Erro crítico no processamento de BONUS_LOCKs de professores:', error);
      throw error; // Propagar erro para o método principal
    }
  }

  /**
   * Limpa locks de bookings que foram cancelados
   */
  private async cleanupCanceledBookingLocks(now: Date): Promise<void> {
    console.log('🧹 Limpando locks de bookings cancelados...');

    // Buscar todos os bookings cancelados nos últimos 7 dias
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: canceledBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id, unit_id')
      .eq('status_canonical', 'CANCELED')
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      throw new Error(`Erro ao buscar bookings cancelados: ${fetchError.message}`);
    }

    if (!canceledBookings || canceledBookings.length === 0) {
      console.log('✅ Nenhum booking cancelado recente encontrado');
      return;
    }

    console.log(`📊 Verificando locks de ${canceledBookings.length} bookings cancelados`);

    for (const booking of canceledBookings) {
      try {
        // Remover LOCKs de aluno associados ao booking cancelado
        const { error: studentLockError } = await supabase
          .from('student_class_tx')
          .update({
            booking_id: null,
            meta_json: supabase.sql`jsonb_set(meta_json, '{cleanup_reason}', '"booking_cancelled"')`
          })
          .eq('booking_id', booking.id)
          .eq('type', 'LOCK');

        if (studentLockError) {
          console.error(`❌ Erro ao limpar LOCK de aluno do booking ${booking.id}:`, studentLockError);
        }

        // Remover BONUS_LOCKs de professor associados ao booking cancelado
        const { error: professorLockError } = await supabase
          .from('hour_tx')
          .update({
            booking_id: null,
            meta_json: supabase.sql`jsonb_set(meta_json, '{cleanup_reason}', '"booking_cancelled"')`
          })
          .eq('booking_id', booking.id)
          .eq('type', 'BONUS_LOCK');

        if (professorLockError) {
          console.error(`❌ Erro ao limpar BONUS_LOCK do booking ${booking.id}:`, professorLockError);
        }

      } catch (error) {
        console.error(`❌ Erro ao limpar locks do booking ${booking.id}:`, error);
      }
    }
  }

  /**
   * Cria notificação para aluno sobre LOCK expirado
   */
  private async createLockExpiredNotification(studentId: string, unitId: string): Promise<void> {
    try {
      const { data: unit } = await supabase
        .from('units')
        .select('name')
        .eq('id', unitId)
        .single();

      await supabase
        .from('user_notifications')
        .insert({
          user_id: studentId,
          type: 'lock_expired',
          title: 'Crédito consumido',
          message: `Seu crédito foi consumido automaticamente devido ao não cancelamento com 4h de antecedência na unidade ${unit?.name || 'selecionada'}.`,
          meta_json: {
            unit_id: unitId,
            processed_by: 'scheduler'
          },
          is_read: false,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Erro ao criar notificação de LOCK expirado:', error);
    }
  }

  /**
   * Cria notificação para professor sobre hora bônus recebida
   */
  private async createBonusEarnedNotification(professorId: string, unitId: string): Promise<void> {
    try {
      const { data: unit } = await supabase
        .from('units')
        .select('name')
        .eq('id', unitId)
        .single();

      await supabase
        .from('user_notifications')
        .insert({
          user_id: professorId,
          type: 'bonus_earned',
          title: 'Hora bônus recebida',
          message: `Você recebeu 1 hora bônus automaticamente na unidade ${unit?.name || 'selecionada'}.`,
          meta_json: {
            unit_id: unitId,
            processed_by: 'scheduler'
          },
          is_read: false,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Erro ao criar notificação de hora bônus:', error);
    }
  }

  /**
   * Inicia o scheduler para rodar periodicamente
   */
  startScheduler(intervalMinutes: number = 15): void {
    console.log(`🚀 Iniciando scheduler de bookings - rodando a cada ${intervalMinutes} minutos`);

    // Executar imediatamente na primeira vez
    this.processExpiredLocks().catch(error => {
      console.error('❌ Erro na execução inicial do scheduler:', error);
    });

    // Configurar execução periódica
    setInterval(async () => {
      try {
        const result = await this.processExpiredLocks();

        if (result.errors.length > 0) {
          console.error(`❌ Scheduler executado com ${result.errors.length} erros:`, result.errors);
        } else {
          console.log(`✅ Scheduler executado com sucesso - ${result.processed} etapas processadas`);
        }
      } catch (error) {
        console.error('❌ Erro na execução do scheduler:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export const bookingScheduler = new BookingScheduler();

