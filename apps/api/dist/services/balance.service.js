"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceService = void 0;
const supabase_1 = require("../lib/supabase");
class BalanceService {
    async ensureStudentBalance(studentId, franqueadoraId) {
        const { data, error } = await supabase_1.supabase
            .from('student_class_balance')
            .select('*')
            .eq('student_id', studentId)
            .eq('franqueadora_id', franqueadoraId)
            .single();
        if (!error && data) {
            return data;
        }
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return this.createStudentBalance(studentId, franqueadoraId);
    }
    async getStudentBalance(studentId, franqueadoraId) {
        return this.ensureStudentBalance(studentId, franqueadoraId);
    }
    async createStudentBalance(studentId, franqueadoraId) {
        const { data, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        return data;
    }
    async updateStudentBalance(studentId, franqueadoraId, updates) {
        const { data, error } = await supabase_1.supabase
            .from('student_class_balance')
            .update(updates)
            .eq('student_id', studentId)
            .eq('franqueadora_id', franqueadoraId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async createStudentTransaction(studentId, franqueadoraId, type, qty, options = {}) {
        const { unitId = null, source = 'SYSTEM', bookingId, metaJson = {}, unlockAt } = options;
        const { data, error } = await supabase_1.supabase
            .from('student_class_tx')
            .insert({
            student_id: studentId,
            franqueadora_id: franqueadoraId,
            unit_id: unitId,
            type,
            source,
            qty,
            booking_id: bookingId,
            meta_json: metaJson,
            unlock_at: unlockAt ?? null
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async purchaseStudentClasses(studentId, franqueadoraId, qty, options = {}) {
        const balance = await this.ensureStudentBalance(studentId, franqueadoraId);
        const transaction = await this.createStudentTransaction(studentId, franqueadoraId, 'PURCHASE', qty, {
            ...options,
            source: options.source ?? 'ALUNO'
        });
        const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
            total_purchased: balance.total_purchased + qty
        });
        return { balance: updatedBalance, transaction };
    }
    async lockStudentClasses(studentId, franqueadoraId, qty, bookingId, unlockAt, options = {}) {
        const balance = await this.ensureStudentBalance(studentId, franqueadoraId);
        const available = balance.total_purchased - balance.total_consumed - balance.locked_qty;
        if (available < qty) {
            throw new Error(`Saldo insuficiente. Disponivel: ${available}, Necessario: ${qty}`);
        }
        const transaction = await this.createStudentTransaction(studentId, franqueadoraId, 'LOCK', qty, {
            ...options,
            source: options.source ?? 'ALUNO',
            bookingId,
            unlockAt,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
            locked_qty: balance.locked_qty + qty
        });
        return { balance: updatedBalance, transaction };
    }
    async unlockStudentClasses(studentId, franqueadoraId, qty, bookingId, options = {}) {
        const balance = await this.ensureStudentBalance(studentId, franqueadoraId);
        if (balance.locked_qty < qty) {
            throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_qty}, Necessario: ${qty}`);
        }
        const transaction = await this.createStudentTransaction(studentId, franqueadoraId, 'UNLOCK', qty, {
            ...options,
            bookingId,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
            locked_qty: balance.locked_qty - qty
        });
        return { balance: updatedBalance, transaction };
    }
    async consumeStudentClasses(studentId, franqueadoraId, qty, bookingId, options = {}) {
        const balance = await this.ensureStudentBalance(studentId, franqueadoraId);
        const lockedToConsume = Math.min(balance.locked_qty, qty);
        const transaction = await this.createStudentTransaction(studentId, franqueadoraId, 'CONSUME', qty, {
            ...options,
            source: options.source ?? 'PROFESSOR',
            bookingId,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateStudentBalance(studentId, franqueadoraId, {
            total_consumed: balance.total_consumed + qty,
            locked_qty: balance.locked_qty - lockedToConsume
        });
        return { balance: updatedBalance, transaction };
    }
    async ensureProfessorBalance(professorId, franqueadoraId) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .select('*')
            .eq('professor_id', professorId)
            .eq('franqueadora_id', franqueadoraId)
            .single();
        if (!error && data) {
            return data;
        }
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return this.createProfessorBalance(professorId, franqueadoraId);
    }
    async getProfessorBalance(professorId, franqueadoraId) {
        return this.ensureProfessorBalance(professorId, franqueadoraId);
    }
    async createProfessorBalance(professorId, franqueadoraId) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .insert({
            professor_id: professorId,
            franqueadora_id: franqueadoraId,
            available_hours: 0,
            locked_hours: 0
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateProfessorBalance(professorId, franqueadoraId, updates) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .update(updates)
            .eq('professor_id', professorId)
            .eq('franqueadora_id', franqueadoraId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async createHourTransaction(professorId, franqueadoraId, type, hours, options = {}) {
        const { unitId = null, source = 'SYSTEM', bookingId, metaJson = {}, unlockAt } = options;
        const { data, error } = await supabase_1.supabase
            .from('hour_tx')
            .insert({
            professor_id: professorId,
            franqueadora_id: franqueadoraId,
            unit_id: unitId,
            type,
            source,
            hours,
            booking_id: bookingId,
            meta_json: metaJson,
            unlock_at: unlockAt ?? null
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async purchaseProfessorHours(professorId, franqueadoraId, hours, options = {}) {
        const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
        const transaction = await this.createHourTransaction(professorId, franqueadoraId, 'PURCHASE', hours, {
            ...options,
            source: options.source ?? 'PROFESSOR'
        });
        const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
            available_hours: balance.available_hours + hours
        });
        return { balance: updatedBalance, transaction };
    }
    async lockProfessorHours(professorId, franqueadoraId, hours, bookingId, unlockAt, options = {}) {
        const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
        const available = balance.available_hours - balance.locked_hours;
        if (available < hours) {
            throw new Error(`Saldo de horas insuficiente. Disponivel: ${available}, Necessario: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, franqueadoraId, 'BONUS_LOCK', hours, {
            ...options,
            source: options.source ?? 'PROFESSOR',
            bookingId,
            unlockAt,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
            locked_hours: balance.locked_hours + hours
        });
        return { balance: updatedBalance, transaction };
    }
    async consumeProfessorHours(professorId, franqueadoraId, hours, bookingId, options = {}) {
        const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
        if (balance.locked_hours < hours) {
            throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_hours}, Necessario: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, franqueadoraId, 'CONSUME', hours, {
            ...options,
            source: options.source ?? 'SYSTEM',
            bookingId,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
            locked_hours: balance.locked_hours - hours
        });
        return { balance: updatedBalance, transaction };
    }
    async unlockProfessorHours(professorId, franqueadoraId, hours, bookingId, options = {}) {
        const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
        if (balance.locked_hours < hours) {
            throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_hours}, Necessario: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, franqueadoraId, 'BONUS_UNLOCK', hours, {
            ...options,
            bookingId,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
            locked_hours: balance.locked_hours - hours
        });
        return { balance: updatedBalance, transaction };
    }
    async revokeProfessorHours(professorId, franqueadoraId, hours, bookingId, options = {}) {
        const balance = await this.ensureProfessorBalance(professorId, franqueadoraId);
        const transaction = await this.createHourTransaction(professorId, franqueadoraId, 'REVOKE', hours, {
            ...options,
            source: options.source ?? 'SYSTEM',
            bookingId,
            metaJson: {
                ...options.metaJson,
                booking_id: bookingId
            }
        });
        const updatedBalance = await this.updateProfessorBalance(professorId, franqueadoraId, {
            available_hours: Math.max(0, balance.available_hours - hours)
        });
        return { balance: updatedBalance, transaction };
    }
    async getTransactionsToUnlock() {
        const now = new Date().toISOString();
        const { data, error } = await supabase_1.supabase
            .from('student_class_tx')
            .select('*')
            .eq('type', 'LOCK')
            .lte('unlock_at', now)
            .is('booking_id', null);
        if (error)
            throw error;
        return (data || []);
    }
    async getHourTransactionsToUnlock() {
        const now = new Date().toISOString();
        const { data, error } = await supabase_1.supabase
            .from('hour_tx')
            .select('*')
            .eq('type', 'BONUS_LOCK')
            .lte('unlock_at', now)
            .is('booking_id', null);
        if (error)
            throw error;
        return (data || []);
    }
}
exports.balanceService = new BalanceService();
//# sourceMappingURL=balance.service.js.map