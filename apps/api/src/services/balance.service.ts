import { supabase } from '../config/supabase';

export interface StudentClassBalance {
  id: string;
  student_id: string;
  unit_id: string;
  total_purchased: number;
  total_consumed: number;
  locked_qty: number;
  updated_at: string;
}

export interface StudentClassTransaction {
  id: string;
  student_id: string;
  unit_id: string;
  type: 'PURCHASE' | 'CONSUME' | 'LOCK' | 'UNLOCK' | 'REFUND' | 'REVOKE';
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
  qty: number;
  booking_id?: string;
  meta_json: Record<string, any>;
  created_at: string;
  unlock_at?: string;
}

export interface ProfHourBalance {
  id: string;
  professor_id: string;
  unit_id: string;
  available_hours: number;
  locked_hours: number;
  updated_at: string;
}

export interface HourTransaction {
  id: string;
  professor_id: string;
  unit_id: string;
  type: 'PURCHASE' | 'CONSUME' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REFUND' | 'REVOKE';
  source: 'ALUNO' | 'PROFESSOR' | 'SYSTEM';
  hours: number;
  booking_id?: string;
  meta_json: Record<string, any>;
  created_at: string;
  unlock_at?: string;
}

class BalanceService {
  // Student Class Balance Operations
  async getStudentBalance(studentId: string, unitId: string): Promise<StudentClassBalance | null> {
    const { data, error } = await supabase
      .from('student_class_balance')
      .select('*')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No balance found, create one
        return await this.createStudentBalance(studentId, unitId);
      }
      throw error;
    }

    return data;
  }

  async createStudentBalance(studentId: string, unitId: string): Promise<StudentClassBalance> {
    const { data, error } = await supabase
      .from('student_class_balance')
      .insert({
        student_id: studentId,
        unit_id: unitId,
        total_purchased: 0,
        total_consumed: 0,
        locked_qty: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStudentBalance(
    studentId: string,
    unitId: string,
    updates: Partial<Pick<StudentClassBalance, 'total_purchased' | 'total_consumed' | 'locked_qty'>>
  ): Promise<StudentClassBalance> {
    const { data, error } = await supabase
      .from('student_class_balance')
      .update(updates)
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createStudentTransaction(
    studentId: string,
    unitId: string,
    type: StudentClassTransaction['type'],
    qty: number,
    source: StudentClassTransaction['source'] = 'SYSTEM',
    bookingId?: string,
    metaJson: Record<string, any> = {},
    unlockAt?: string
  ): Promise<StudentClassTransaction> {
    const { data, error } = await supabase
      .from('student_class_tx')
      .insert({
        student_id: studentId,
        unit_id: unitId,
        type,
        source,
        qty,
        booking_id: bookingId,
        meta_json: metaJson,
        unlock_at: unlockAt
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async purchaseStudentClasses(
    studentId: string,
    unitId: string,
    qty: number,
    source: StudentClassTransaction['source'] = 'ALUNO',
    metaJson: Record<string, any> = {}
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    // Get current balance
    const balance = await this.getStudentBalance(studentId, unitId);
    
    // Create transaction
    const transaction = await this.createStudentTransaction(
      studentId,
      unitId,
      'PURCHASE',
      qty,
      source,
      undefined,
      metaJson
    );

    // Update balance
    const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
      total_purchased: balance.total_purchased + qty
    });

    return { balance: updatedBalance, transaction };
  }

  async lockStudentClasses(
    studentId: string,
    unitId: string,
    qty: number,
    bookingId: string,
    unlockAt: string,
    source: StudentClassTransaction['source'] = 'ALUNO'
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    // Get current balance
    const balance = await this.getStudentBalance(studentId, unitId);
    
    // Check if enough available classes
    const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;
    if (availableClasses < qty) {
      throw new Error(`Saldo insuficiente. Disponível: ${availableClasses}, Necessário: ${qty}`);
    }

    // Create transaction
    const transaction = await this.createStudentTransaction(
      studentId,
      unitId,
      'LOCK',
      qty,
      source,
      bookingId,
      { booking_id: bookingId },
      unlockAt
    );

    // Update balance
    const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
      locked_qty: balance.locked_qty + qty
    });

    return { balance: updatedBalance, transaction };
  }

  async unlockStudentClasses(
    studentId: string,
    unitId: string,
    qty: number,
    bookingId: string,
    source: StudentClassTransaction['source'] = 'SYSTEM'
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    // Get current balance
    const balance = await this.getStudentBalance(studentId, unitId);
    
    // Check if enough locked classes
    if (balance.locked_qty < qty) {
      throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_qty}, Necessário: ${qty}`);
    }

    // Create transaction
    const transaction = await this.createStudentTransaction(
      studentId,
      unitId,
      'UNLOCK',
      qty,
      source,
      bookingId,
      { booking_id: bookingId }
    );

    // Update balance
    const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
      locked_qty: balance.locked_qty - qty
    });

    return { balance: updatedBalance, transaction };
  }

  async consumeStudentClasses(
    studentId: string,
    unitId: string,
    qty: number,
    bookingId: string,
    source: StudentClassTransaction['source'] = 'PROFESSOR'
  ): Promise<{ balance: StudentClassBalance; transaction: StudentClassTransaction }> {
    // Get current balance
    const balance = await this.getStudentBalance(studentId, unitId);
    
    // Check if enough locked classes to consume
    if (balance.locked_qty < qty) {
      throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_qty}, Necessário: ${qty}`);
    }

    // Create transaction
    const transaction = await this.createStudentTransaction(
      studentId,
      unitId,
      'CONSUME',
      qty,
      source,
      bookingId,
      { booking_id: bookingId }
    );

    // Update balance
    const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
      total_consumed: balance.total_consumed + qty,
      locked_qty: balance.locked_qty - qty
    });

    return { balance: updatedBalance, transaction };
  }

  // Professor Hour Balance Operations
  async getProfessorBalance(professorId: string, unitId: string): Promise<ProfHourBalance | null> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .select('*')
      .eq('professor_id', professorId)
      .eq('unit_id', unitId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No balance found, create one
        return await this.createProfessorBalance(professorId, unitId);
      }
      throw error;
    }

    return data;
  }

  async createProfessorBalance(professorId: string, unitId: string): Promise<ProfHourBalance> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .insert({
        professor_id: professorId,
        unit_id: unitId,
        available_hours: 0,
        locked_hours: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfessorBalance(
    professorId: string,
    unitId: string,
    updates: Partial<Pick<ProfHourBalance, 'available_hours' | 'locked_hours'>>
  ): Promise<ProfHourBalance> {
    const { data, error } = await supabase
      .from('prof_hour_balance')
      .update(updates)
      .eq('professor_id', professorId)
      .eq('unit_id', unitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createHourTransaction(
    professorId: string,
    unitId: string,
    type: HourTransaction['type'],
    hours: number,
    source: HourTransaction['source'] = 'SYSTEM',
    bookingId?: string,
    metaJson: Record<string, any> = {},
    unlockAt?: string
  ): Promise<HourTransaction> {
    const { data, error } = await supabase
      .from('hour_tx')
      .insert({
        professor_id: professorId,
        unit_id: unitId,
        type,
        source,
        hours,
        booking_id: bookingId,
        meta_json: metaJson,
        unlock_at: unlockAt
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async purchaseProfessorHours(
    professorId: string,
    unitId: string,
    hours: number,
    source: HourTransaction['source'] = 'PROFESSOR',
    metaJson: Record<string, any> = {}
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    // Get current balance
    const balance = await this.getProfessorBalance(professorId, unitId);
    
    // Create transaction
    const transaction = await this.createHourTransaction(
      professorId,
      unitId,
      'PURCHASE',
      hours,
      source,
      undefined,
      metaJson
    );

    // Update balance
    const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
      available_hours: balance.available_hours + hours
    });

    return { balance: updatedBalance, transaction };
  }

  async lockProfessorHours(
    professorId: string,
    unitId: string,
    hours: number,
    bookingId: string,
    unlockAt: string,
    source: HourTransaction['source'] = 'PROFESSOR'
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    // Get current balance
    const balance = await this.getProfessorBalance(professorId, unitId);
    
    // Check if enough available hours
    const availableHours = balance.available_hours - balance.locked_hours;
    if (availableHours < hours) {
      throw new Error(`Saldo de horas insuficiente. Disponível: ${availableHours}, Necessário: ${hours}`);
    }

    // Create transaction
    const transaction = await this.createHourTransaction(
      professorId,
      unitId,
      'BONUS_LOCK',
      hours,
      source,
      bookingId,
      { booking_id: bookingId },
      unlockAt
    );

    // Update balance
    const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
      locked_hours: balance.locked_hours + hours
    });

    return { balance: updatedBalance, transaction };
  }

  async consumeProfessorHours(
    professorId: string,
    unitId: string,
    hours: number,
    bookingId: string,
    source: HourTransaction['source'] = 'SYSTEM'
  ): Promise<{ balance: ProfHourBalance; transaction: HourTransaction }> {
    // Get current balance
    const balance = await this.getProfessorBalance(professorId, unitId);
    
    // Check if enough locked hours to consume
    if (balance.locked_hours < hours) {
      throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_hours}, Necessário: ${hours}`);
    }

    // Create transaction
    const transaction = await this.createHourTransaction(
      professorId,
      unitId,
      'CONSUME',
      hours,
      source,
      bookingId,
      { booking_id: bookingId }
    );

    // Update balance
    const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
      locked_hours: balance.locked_hours - hours
    });

    return { balance: updatedBalance, transaction };
  }

  // Get transactions due for unlock (for scheduler)
  async getTransactionsToUnlock(): Promise<StudentClassTransaction[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('student_class_tx')
      .select('*')
      .eq('type', 'LOCK')
      .lte('unlock_at', now)
      .is('booking_id', null);

    if (error) throw error;
    return data;
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
    return data;
  }
}

export const balanceService = new BalanceService();