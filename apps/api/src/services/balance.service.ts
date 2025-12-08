import { supabase } from '../lib/supabase';

export interface BalanceScope {
  franqueadoraId: string;
  unitId?: string | null;
}

export interface StudentClassBalance {
  id: string;
  student_id: string;
  franqueadora_id: string;
  total_purchased: number;
  total_consumed: number;
  locked_qty: number;
  updated_at: string;
  unit_id?: string | null;
}

export interface StudentClassTransaction {
  id: string;
  student_id: string;
  franqueadora_id: string;
  unit_id?: string | null;
  type: 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE';
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
  qty: number;
  booking_id?: string;
  meta_json: Record<string, any>;
  created_at: string;
  unlock_at?: string | null;
}

export interface ProfHourBalance {
  id: string;
  professor_id: string;
  franqueadora_id: string;
  available_hours: number;
  locked_hours: number;
  updated_at: string;
  unit_id?: string | null;
}

export interface HourTransaction {
  id: string;
  professor_id: string;
  franqueadora_id: string;
  unit_id?: string | null;
  type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE';
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
  hours: number;
  booking_id?: string;
  meta_json: Record<string, any>;
  created_at: string;
  unlock_at?: string | null;
}

interface StudentTransactionOptions {
  unitId?: string | null;
  source?: StudentClassTransaction['source'];
  bookingId?: string;
  metaJson?: Record<string, any>;
  unlockAt?: string;
}

interface ProfessorTransactionOptions {
  unitId?: string | null;
  source?: HourTransaction['source'];
  bookingId?: string;
  metaJson?: Record<string, any>;
  unlockAt?: string;
}

class BalanceService {
  // ---------------------------------------------------------------------------
  // Student helpers
  private async ensureStudentBalance(studentId: string, franqueadoraId: string): Promise<StudentClassBalance> {
    // First try to get existing balance
    const { data, error } = await supabase
      .from('student_class_balance')
      .select('*')
      .eq('student_id', studentId)
      .eq('franqueadora_id', franqueadoraId)
      .single();

    if (!error && data) {
      return data as StudentClassBalance;
    }

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Not found - use upsert to handle race conditions
    // This prevents duplicate key violations when concurrent requests try to create the same record
    return this.createStudentBalanceWithUpsert(studentId, franqueadoraId);
  }

  private async createStudentBalanceWithUpsert(studentId: string, franqueadoraId: string): Promise<StudentClassBalance> {
    // Validate franqueadora exists first
    const { data: franqueadora, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .select('id')
      .eq('id', franqueadoraId)
      .eq('is_active', true)
      .single();

    let validFranqueadoraId = franqueadoraId;

    if (franqueadoraError || !franqueadora) {
      // Fallback to principal franqueadora
      const { data: principalFranqueadora } = await supabase
        .from('franqueadora')
        .select('id')
        .eq('email', 'meupersonalfranquia@gmail.com')
        .eq('is_active', true)
        .single();

      if (!principalFranqueadora?.id) {
        throw new Error(`Franqueadora inválida: ${franqueadoraId}. Não foi possível encontrar a franqueadora principal.`);
      }

      validFranqueadoraId = principalFranqueadora.id;
      console.warn(`[BalanceService] Franqueadora ${franqueadoraId} não encontrada. Usando franqueadora principal: ${validFranqueadoraId}`);
    }

    // Validate student exists before attempting upsert to prevent FK violation
    const { data: studentExists, error: studentError } = await supabase
      .from('users')
      .select('id')
      .eq('id', studentId)
      .single();

    if (studentError || !studentExists) {
      console.error(`[BalanceService] Student ${studentId} not found in users table`);
      throw new Error(`Usuário não encontrado: ${studentId}. O usuário pode ter sido removido.`);
    }

    // Use upsert with onConflict to handle race conditions
    // This will insert if not exists, or do nothing if already exists
    const { error: upsertError } = await supabase
      .from('student_class_balance')
      .upsert(
        {
          student_id: studentId,
          franqueadora_id: validFranqueadoraId,
          total_purchased: 0,
          total_consumed: 0,
          locked_qty: 0
        },
        {
          onConflict: 'student_id,franqueadora_id',
          ignoreDuplicates: true
        }
      );

    if (upsertError) {
      // If upsert fails for a reason other than conflict, throw
      console.error('[BalanceService] Upsert error:', upsertError);
      throw upsertError;
    }

    // Now fetch the record (either just created or already existed)
    const { data: balance, error: fetchError } = await supabase
      .from('student_class_balance')
      .select('*')
      .eq('student_id', studentId)
      .eq('franqueadora_id', validFranqueadoraId)
      .single();

    if (fetchError || !balance) {
      throw new Error(`Failed to retrieve student balance after upsert: ${fetchError?.message || 'Unknown error'}`);
    }

    return balance as StudentClassBalance;
  }

  async getStudentBalance(studentId: string, franqueadoraId: string): Promise<StudentClassBalance> {
    return this.ensureStudentBalance(studentId, franqueadoraId);
  }

  async createStudentBalance(studentId: string, franqueadoraId: string): Promise<StudentClassBalance> {
    // Validar que a franqueadora existe antes de inserir
    const { data: franqueadora, error: franqueadoraError } = await supabase
      .from('franqueadora')
      .select('id')
      .eq('id', franqueadoraId)
      .eq('is_active', true)
      .single();

    if (franqueadoraError || !franqueadora) {
      // Se a franqueadora não existe, buscar a principal
      const { data: principalFranqueadora } = await supabase
        .from('franqueadora')
        .select('id')
        .eq('email', 'meupersonalfranquia@gmail.com')
        .eq('is_active', true)
        .single();

      if (!principalFranqueadora?.id) {
        throw new Error(`Franqueadora inválida: ${franqueadoraId}. Não foi possível encontrar a franqueadora principal.`);
      }

      // Usar a franqueadora principal como fallback
      const validFranqueadoraId = principalFranqueadora.id;
      console.warn(`[BalanceService] Franqueadora ${franqueadoraId} não encontrada. Usando franqueadora principal: ${validFranqueadoraId}`);

      const { data, error } = await supabase
        .from('student_class_balance')
        .insert({
          student_id: studentId,
          franqueadora_id: validFranqueadoraId,
          total_purchased: 0,
          total_consumed: 0,
          locked_qty: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data as StudentClassBalance;
    }

    const { data, error } = await supabase
      .from('student_class_balance')
      .insert({
        student_id: studentId,
        franqueadora_id: franqueadoraId,
        total_purchased: 0,
        total_consumed: 0,
        locked_qty: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as StudentClassBalance;
  }

  async updateStudentBalance(
    studentId: string,
    franqueadoraId: string,
    updates: Partial<Pick<StudentClassBalance, 'total_purchased' | 'total_consumed' | 'locked_qty'>>
  ): Promise<StudentClassBalance> {
    const { data, error } = await supabase
      .from('student_class_balance')
      .update(updates)
      .eq('student_id', studentId)
      .eq('franqueadora_id', franqueadoraId)
      .select()
      .single();

    if (error) throw error;
    return data as StudentClassBalance;
  }

  async createStudentTransaction(
    studentId: string,
    franqueadoraId: string,
    type: StudentClassTransaction['type'],
    qty: number,
    options: StudentTransactionOptions = {}
  ): Promise<StudentClassTransaction> {
    const {
      unitId = null,
      source = 'SYSTEM',
      bookingId,
      metaJson = {},
      unlockAt
    } = options;

    // NÃO usar unit_id - sempre null para evitar erros de foreign key
    const { data, error } = await supabase
      .from('student_class_tx')
      .insert({
        student_id: studentId,
        franqueadora_id: franqueadoraId,
        unit_id: null, // NÃO usar unit_id
        type,
        source,
        qty,
        booking_id: bookingId,
        meta_json: metaJson,
        unlock_at: unlockAt ?? null
      })
      .select()
      .single();

    if (error) throw error;
    return data as StudentClassTransaction;
  }

  async purchaseStudentClasses(
    studentId: string,
    franqueadoraId: string,
    qty: number,
    options: StudentTransactionOptions = {}
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    const balance = await this.ensureStudentBalance(studentId, franqueadoraId);

    const transaction = await this.createStudentTransaction(
      studentId,
      franqueadoraId,
      'PURCHASE',
      qty,
      {
        ...options,
        source: options.source ?? 'ALUNO'
      }
    );

    const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
      total_purchased: balance.total_purchased + qty
    });

    return { balance: updatedBalance, transaction };
  }

  async lockStudentClasses(
    studentId: string,
    franqueadoraId: string,
    qty: number,
    bookingId: string,
    unlockAt: string,
    options: StudentTransactionOptions = {}
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    const balance = await this.ensureStudentBalance(studentId, franqueadoraId);
    const available = balance.total_purchased - balance.total_consumed - balance.locked_qty;

    if (available < qty) {
      throw new Error(`Saldo insuficiente. Disponivel: ${available}, Necessario: ${qty}`);
    }

    const transaction = await this.createStudentTransaction(
      studentId,
      franqueadoraId,
      'LOCK',
      qty,
      {
        ...options,
        source: options.source ?? 'ALUNO',
        bookingId,
        unlockAt,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
      locked_qty: balance.locked_qty + qty
    });

    return { balance: updatedBalance, transaction };
  }

  async unlockStudentClasses(
    studentId: string,
    franqueadoraId: string,
    qty: number,
    bookingId: string,
    options: StudentTransactionOptions = {}
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    const balance = await this.ensureStudentBalance(studentId, franqueadoraId);

    if (balance.locked_qty < qty) {
      throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_qty}, Necessario: ${qty}`);
    }

    const transaction = await this.createStudentTransaction(
      studentId,
      franqueadoraId,
      'UNLOCK',
      qty,
      {
        ...options,
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
      locked_qty: balance.locked_qty - qty
    });

    return { balance: updatedBalance, transaction };
  }

  async consumeStudentClasses(
    studentId: string,
    franqueadoraId: string,
    qty: number,
    bookingId: string,
    options: StudentTransactionOptions = {}
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    const balance = await this.ensureStudentBalance(studentId, franqueadoraId);

    const lockedToConsume = Math.min(balance.locked_qty, qty);
    const transaction = await this.createStudentTransaction(
      studentId,
      franqueadoraId,
      'CONSUME',
      qty,
      {
        ...options,
        source: options.source ?? 'PROFESSOR',
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
      total_consumed: balance.total_consumed + qty,
      locked_qty: balance.locked_qty - lockedToConsume
    });

    return { balance: updatedBalance, transaction };
  }

  // ---------------------------------------------------------------------------
  // Professor helpers
  private async ensureProfessorBalance(professorId: string, franqueadoraId: string): Promise<ProfHourBalance> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .select('*')
      .eq('professor_id', professorId)
      .eq('franqueadora_id', franqueadoraId)
      .single();

    if (!error && data) {
      return data as ProfHourBalance;
    }

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return this.createProfessorBalance(professorId, franqueadoraId);
  }

  async getProfessorBalance(professorId: string, franqueadoraId: string): Promise<ProfHourBalance> {
    return this.ensureProfessorBalance(professorId, franqueadoraId);
  }

  async createProfessorBalance(professorId: string, franqueadoraId: string): Promise<ProfHourBalance> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .insert({
        professor_id: professorId,
        franqueadora_id: franqueadoraId,
        available_hours: 0,
        locked_hours: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProfHourBalance;
  }

  async updateProfessorBalance(
    professorId: string,
    franqueadoraId: string,
    updates: Partial<Pick<ProfHourBalance, 'available_hours' | 'locked_hours'>>
  ): Promise<ProfHourBalance> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .update(updates)
      .eq('professor_id', professorId)
      .eq('franqueadora_id', franqueadoraId)
      .select()
      .single();

    if (error) throw error;
    return data as ProfHourBalance;
  }

  async createHourTransaction(
    professorId: string,
    franqueadoraId: string,
    type: HourTransaction['type'],
    hours: number,
    options: ProfessorTransactionOptions = {}
  ): Promise<HourTransaction> {
    const {
      unitId = null,
      source = 'SYSTEM',
      bookingId,
      metaJson = {},
      unlockAt
    } = options;

    // NÃO usar unit_id - sempre null para evitar erros de foreign key
    const { data, error } = await supabase
      .from('hour_tx')
      .insert({
        professor_id: professorId,
        franqueadora_id: franqueadoraId,
        unit_id: null, // NÃO usar unit_id
        type,
        source,
        hours,
        booking_id: bookingId,
        meta_json: metaJson,
        unlock_at: unlockAt ?? null
      })
      .select()
      .single();

    if (error) throw error;
    return data as HourTransaction;
  }

  async purchaseProfessorHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'PURCHASE',
      hours,
      {
        ...options,
        source: options.source ?? 'PROFESSOR'
      }
    );

    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      available_hours: balance.available_hours + hours
    });

    return { balance: updatedBalance, transaction };
  }

  async lockProfessorHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    unlockAt: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
    const available = balance.available_hours - balance.locked_hours;

    if (available < hours) {
      throw new Error(`Saldo de horas insuficiente. Disponivel: ${available}, Necessario: ${hours}`);
    }

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'BONUS_LOCK',
      hours,
      {
        ...options,
        source: options.source ?? 'PROFESSOR',
        bookingId,
        unlockAt,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: balance.locked_hours + hours
    });

    return { balance: updatedBalance, transaction };
  }

  /**
   * Trava horas BÔNUS para o professor (recompensa por agendamento de aluno)
   * Diferente de lockProfessorHours, este método NÃO requer saldo disponível
   * As horas são "novas" e ficam travadas até a aula ser concluída
   */
  async lockProfessorBonusHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    unlockAt: string | null,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'BONUS_LOCK',
      hours,
      {
        ...options,
        source: options.source ?? 'SYSTEM',
        bookingId,
        unlockAt: unlockAt ?? undefined,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    // Incrementar locked_hours (horas visíveis mas não utilizáveis)
    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: balance.locked_hours + hours
    });

    return { balance: updatedBalance, transaction };
  }

  /**
   * Libera horas BÔNUS travadas do professor (após aula concluída)
   * Converte locked_hours em available_hours
   */
  async unlockProfessorBonusHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    // Verificar se tem horas travadas suficientes
    const hoursToUnlock = Math.min(hours, balance.locked_hours);

    if (hoursToUnlock <= 0) {
      console.warn(`[unlockProfessorBonusHours] Nenhuma hora travada para professor ${professorId}`);
      // Retornar sem fazer nada se não tem horas travadas
      return {
        balance,
        transaction: {
          id: '',
          professor_id: professorId,
          franqueadora_id: franqueadoraId,
          type: 'BONUS_UNLOCK',
          source: 'SYSTEM',
          hours: 0,
          booking_id: bookingId,
          meta_json: { skipped: true, reason: 'no_locked_hours' },
          created_at: new Date().toISOString()
        } as HourTransaction
      };
    }

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'BONUS_UNLOCK',
      hoursToUnlock,
      {
        ...options,
        source: options.source ?? 'SYSTEM',
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    // Mover de locked_hours para available_hours
    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: balance.locked_hours - hoursToUnlock,
      available_hours: balance.available_hours + hoursToUnlock
    });

    return { balance: updatedBalance, transaction };
  }

  /**
   * Revoga horas BÔNUS travadas do professor (quando aluno cancela)
   * Remove as horas de locked_hours sem adicionar a available_hours
   */
  async revokeBonusLock(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    // Verificar se tem horas travadas suficientes
    const hoursToRevoke = Math.min(hours, balance.locked_hours);

    if (hoursToRevoke <= 0) {
      console.warn(`[revokeBonusLock] Nenhuma hora travada para revogar do professor ${professorId}`);
      return {
        balance,
        transaction: {
          id: '',
          professor_id: professorId,
          franqueadora_id: franqueadoraId,
          type: 'REVOKE',
          source: 'SYSTEM',
          hours: 0,
          booking_id: bookingId,
          meta_json: { skipped: true, reason: 'no_locked_hours' },
          created_at: new Date().toISOString()
        } as HourTransaction
      };
    }

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'REVOKE',
      hoursToRevoke,
      {
        ...options,
        source: options.source ?? 'SYSTEM',
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId,
          revoked_from: 'bonus_lock'
        }
      }
    );

    // Remover de locked_hours (não vai para available_hours)
    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: Math.max(0, balance.locked_hours - hoursToRevoke)
    });

    return { balance: updatedBalance, transaction };
  }

  async consumeProfessorHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    if (balance.locked_hours < hours) {
      throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_hours}, Necessario: ${hours}`);
    }

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'CONSUME',
      hours,
      {
        ...options,
        source: options.source ?? 'SYSTEM',
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: balance.locked_hours - hours
    });

    return { balance: updatedBalance, transaction };
  }

  async unlockProfessorHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    if (balance.locked_hours < hours) {
      throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_hours}, Necessario: ${hours}`);
    }

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'BONUS_UNLOCK',
      hours,
      {
        ...options,
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      locked_hours: balance.locked_hours - hours
    });

    return { balance: updatedBalance, transaction };
  }

  async revokeProfessorHours(
    professorId: string,
    franqueadoraId: string,
    hours: number,
    bookingId: string,
    options: ProfessorTransactionOptions = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);

    const transaction = await this.createHourTransaction(
      professorId,
      franqueadoraId,
      'REVOKE',
      hours,
      {
        ...options,
        source: options.source ?? 'SYSTEM',
        bookingId,
        metaJson: {
          ...options.metaJson,
          booking_id: bookingId
        }
      }
    );

    const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
      available_hours: Math.max(0, balance.available_hours - hours)
    });

    return { balance: updatedBalance, transaction };
  }

  // ---------------------------------------------------------------------------
  // Scheduler helpers
  async getTransactionsToUnlock(): Promise<StudentClassTransaction[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('student_class_tx')
      .select('*')
      .eq('type', 'LOCK')
      .lte('unlock_at', now)
      .is('booking_id', null);

    if (error) throw error;
    return (data || []) as StudentClassTransaction[];
  }

  async getHourTransactionsToUnlock(): Promise<HourTransaction[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('hour_tx')
      .select('*')
      .eq('type', 'BONUS_LOCK')
      .lte('unlock_at', now)
      .is('booking_id', null);

    if (error) throw error;
    return (data || []) as HourTransaction[];
  }
}

export const balanceService = new BalanceService();

