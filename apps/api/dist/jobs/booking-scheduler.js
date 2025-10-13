"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingScheduler = exports.BookingScheduler = void 0;
const supabase_1 = require("../lib/supabase");
class BookingScheduler {
    constructor() {
        this.FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    }
    async processExpiredLocks() {
        const now = new Date();
        const errors = [];
        let processed = 0;
        const maxRetries = 2;
        console.log(`🔄 Iniciando processamento de locks expirados - ${now.toISOString()}`);
        const executeWithRetry = async (operation, operationName) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await operation();
                    processed++;
                    console.log(`✅ ${operationName} executado com sucesso`);
                    return;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`❌ Erro na tentativa ${attempt} de ${operationName}:`, errorMessage);
                    if (attempt === maxRetries) {
                        errors.push(`Falha em ${operationName} após ${maxRetries} tentativas: ${errorMessage}`);
                    }
                    else {
                        console.log(`🔄 Aguardando 5 segundos antes da tentativa ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
        };
        await executeWithRetry(() => this.processStudentLocks(now), 'processamento de LOCKs de alunos');
        await executeWithRetry(() => this.processProfessorBonusLocks(now), 'processamento de BONUS_LOCKs de professores');
        await executeWithRetry(() => this.cleanupCanceledBookingLocks(now), 'limpeza de locks de bookings cancelados');
        console.log(`✅ Processamento finalizado - ${processed} etapas concluídas, ${errors.length} erros`);
        return { processed, errors };
    }
    async processStudentLocks(now) {
        console.log('📋 Processando LOCKs de alunos...');
        try {
            const { data: testData, error: testError } = await supabase_1.supabase
                .from('student_class_tx')
                .select('id')
                .limit(1);
            if (testError) {
                console.error('❌ Erro de conexão com Supabase:', testError);
                throw new Error(`Erro de conexão com Supabase: ${testError.message}`);
            }
            const { data: expiredLocks, error: fetchError } = await supabase_1.supabase
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
                    const { error: consumeError } = await supabase_1.supabase
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
                    const { error: balanceError } = await supabase_1.supabase
                        .from('student_class_balance')
                        .update({
                        total_consumed: supabase_1.supabase.sql `total_consumed + 1`,
                        locked_qty: supabase_1.supabase.sql `GREATEST(locked_qty - 1, 0)`,
                        updated_at: now.toISOString()
                    })
                        .eq('student_id', lock.student_id)
                        .eq('unit_id', lock.unit_id);
                    if (balanceError) {
                        throw new Error(`Erro ao atualizar saldo do aluno: ${balanceError.message}`);
                    }
                    console.log(`✅ LOCK de aluno processado: ${lock.student_id} - ${lock.unit_id}`);
                    await this.createLockExpiredNotification(lock.student_id, lock.unit_id);
                }
                catch (error) {
                    console.error(`❌ Erro ao processar LOCK ${lock.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('❌ Erro crítico no processamento de LOCKs de alunos:', error);
            throw error;
        }
    }
    async processProfessorBonusLocks(now) {
        console.log('🏆 Processando BONUS_LOCKs de professores...');
        try {
            const { data: expiredBonusLocks, error: fetchError } = await supabase_1.supabase
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
                    const { error: unlockError } = await supabase_1.supabase
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
                    const { error: balanceError } = await supabase_1.supabase
                        .from('prof_hour_balance')
                        .update({
                        available_hours: supabase_1.supabase.sql `available_hours + 1`,
                        locked_hours: supabase_1.supabase.sql `GREATEST(locked_hours - 1, 0)`,
                        updated_at: now.toISOString()
                    })
                        .eq('professor_id', bonusLock.professor_id)
                        .eq('unit_id', bonusLock.unit_id);
                    if (balanceError) {
                        throw new Error(`Erro ao dar hora bônus ao professor: ${balanceError.message}`);
                    }
                    console.log(`✅ BONUS_LOCK processado: ${bonusLock.professor_id} - ${bonusLock.unit_id}`);
                    await this.createBonusEarnedNotification(bonusLock.professor_id, bonusLock.unit_id);
                }
                catch (error) {
                    console.error(`❌ Erro ao processar BONUS_LOCK ${bonusLock.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('❌ Erro crítico no processamento de BONUS_LOCKs de professores:', error);
            throw error;
        }
    }
    async cleanupCanceledBookingLocks(now) {
        console.log('🧹 Limpando locks de bookings cancelados...');
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { data: canceledBookings, error: fetchError } = await supabase_1.supabase
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
                const { error: studentLockError } = await supabase_1.supabase
                    .from('student_class_tx')
                    .update({
                    booking_id: null,
                    meta_json: supabase_1.supabase.sql `jsonb_set(meta_json, '{cleanup_reason}', '"booking_cancelled"')`
                })
                    .eq('booking_id', booking.id)
                    .eq('type', 'LOCK');
                if (studentLockError) {
                    console.error(`❌ Erro ao limpar LOCK de aluno do booking ${booking.id}:`, studentLockError);
                }
                const { error: professorLockError } = await supabase_1.supabase
                    .from('hour_tx')
                    .update({
                    booking_id: null,
                    meta_json: supabase_1.supabase.sql `jsonb_set(meta_json, '{cleanup_reason}', '"booking_cancelled"')`
                })
                    .eq('booking_id', booking.id)
                    .eq('type', 'BONUS_LOCK');
                if (professorLockError) {
                    console.error(`❌ Erro ao limpar BONUS_LOCK do booking ${booking.id}:`, professorLockError);
                }
            }
            catch (error) {
                console.error(`❌ Erro ao limpar locks do booking ${booking.id}:`, error);
            }
        }
    }
    async createLockExpiredNotification(studentId, unitId) {
        try {
            const { data: unit } = await supabase_1.supabase
                .from('units')
                .select('name')
                .eq('id', unitId)
                .single();
            await supabase_1.supabase
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
        }
        catch (error) {
            console.error('❌ Erro ao criar notificação de LOCK expirado:', error);
        }
    }
    async createBonusEarnedNotification(professorId, unitId) {
        try {
            const { data: unit } = await supabase_1.supabase
                .from('units')
                .select('name')
                .eq('id', unitId)
                .single();
            await supabase_1.supabase
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
        }
        catch (error) {
            console.error('❌ Erro ao criar notificação de hora bônus:', error);
        }
    }
    startScheduler(intervalMinutes = 15) {
        console.log(`🚀 Iniciando scheduler de bookings - rodando a cada ${intervalMinutes} minutos`);
        this.processExpiredLocks().catch(error => {
            console.error('❌ Erro na execução inicial do scheduler:', error);
        });
        setInterval(async () => {
            try {
                const result = await this.processExpiredLocks();
                if (result.errors.length > 0) {
                    console.error(`❌ Scheduler executado com ${result.errors.length} erros:`, result.errors);
                }
                else {
                    console.log(`✅ Scheduler executado com sucesso - ${result.processed} etapas processadas`);
                }
            }
            catch (error) {
                console.error('❌ Erro na execução do scheduler:', error);
            }
        }, intervalMinutes * 60 * 1000);
    }
}
exports.BookingScheduler = BookingScheduler;
exports.bookingScheduler = new BookingScheduler();
//# sourceMappingURL=booking-scheduler.js.map