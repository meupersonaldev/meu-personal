"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceService = void 0;
const supabase_1 = require("../config/supabase");
class BalanceService {
    async getStudentBalance(studentId, unitId) {
        const { data, error } = await supabase_1.supabase
            .from('student_class_balance')
            .select('*')
            .eq('student_id', studentId)
            .eq('unit_id', unitId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return await this.createStudentBalance(studentId, unitId);
            }
            throw error;
        }
        return data;
    }
    async createStudentBalance(studentId, unitId) {
        const { data, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        return data;
    }
    async updateStudentBalance(studentId, unitId, updates) {
        const { data, error } = await supabase_1.supabase
            .from('student_class_balance')
            .update(updates)
            .eq('student_id', studentId)
            .eq('unit_id', unitId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async createStudentTransaction(studentId, unitId, type, qty, source = 'SYSTEM', bookingId, metaJson = {}, unlockAt) {
        const { data, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        return data;
    }
    async purchaseStudentClasses(studentId, unitId, qty, source = 'ALUNO', metaJson = {}) {
        const balance = await this.getStudentBalance(studentId, unitId);
        const transaction = await this.createStudentTransaction(studentId, unitId, 'PURCHASE', qty, source, undefined, metaJson);
        const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
            total_purchased: balance.total_purchased + qty
        });
        return { balance: updatedBalance, transaction };
    }
    async lockStudentClasses(studentId, unitId, qty, bookingId, unlockAt, source = 'ALUNO') {
        const balance = await this.getStudentBalance(studentId, unitId);
        const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;
        if (availableClasses < qty) {
            throw new Error(`Saldo insuficiente. Disponível: ${availableClasses}, Necessário: ${qty}`);
        }
        const transaction = await this.createStudentTransaction(studentId, unitId, 'LOCK', qty, source, bookingId, { booking_id: bookingId }, unlockAt);
        const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
            locked_qty: balance.locked_qty + qty
        });
        return { balance: updatedBalance, transaction };
    }
    async unlockStudentClasses(studentId, unitId, qty, bookingId, source = 'SYSTEM') {
        const balance = await this.getStudentBalance(studentId, unitId);
        if (balance.locked_qty < qty) {
            throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_qty}, Necessário: ${qty}`);
        }
        const transaction = await this.createStudentTransaction(studentId, unitId, 'UNLOCK', qty, source, bookingId, { booking_id: bookingId });
        const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
            locked_qty: balance.locked_qty - qty
        });
        return { balance: updatedBalance, transaction };
    }
    async consumeStudentClasses(studentId, unitId, qty, bookingId, source = 'PROFESSOR') {
        const balance = await this.getStudentBalance(studentId, unitId);
        if (balance.locked_qty < qty) {
            throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_qty}, Necessário: ${qty}`);
        }
        const transaction = await this.createStudentTransaction(studentId, unitId, 'CONSUME', qty, source, bookingId, { booking_id: bookingId });
        const updatedBalance = await this.updateStudentBalance(studentId, unitId, {
            total_consumed: balance.total_consumed + qty,
            locked_qty: balance.locked_qty - qty
        });
        return { balance: updatedBalance, transaction };
    }
    async getProfessorBalance(professorId, unitId) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .select('*')
            .eq('professor_id', professorId)
            .eq('unit_id', unitId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return await this.createProfessorBalance(professorId, unitId);
            }
            throw error;
        }
        return data;
    }
    async createProfessorBalance(professorId, unitId) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .insert({
            professor_id: professorId,
            unit_id: unitId,
            available_hours: 0,
            locked_hours: 0
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateProfessorBalance(professorId, unitId, updates) {
        const { data, error } = await supabase_1.supabase
            .from('prof_hour_balance')
            .update(updates)
            .eq('professor_id', professorId)
            .eq('unit_id', unitId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async createHourTransaction(professorId, unitId, type, hours, source = 'SYSTEM', bookingId, metaJson = {}, unlockAt) {
        const { data, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        return data;
    }
    async purchaseProfessorHours(professorId, unitId, hours, source = 'PROFESSOR', metaJson = {}) {
        const balance = await this.getProfessorBalance(professorId, unitId);
        const transaction = await this.createHourTransaction(professorId, unitId, 'PURCHASE', hours, source, undefined, metaJson);
        const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
            available_hours: balance.available_hours + hours
        });
        return { balance: updatedBalance, transaction };
    }
    async lockProfessorHours(professorId, unitId, hours, bookingId, unlockAt, source = 'PROFESSOR') {
        const balance = await this.getProfessorBalance(professorId, unitId);
        const availableHours = balance.available_hours - balance.locked_hours;
        if (availableHours < hours) {
            throw new Error(`Saldo de horas insuficiente. Disponível: ${availableHours}, Necessário: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, unitId, 'BONUS_LOCK', hours, source, bookingId, { booking_id: bookingId }, unlockAt);
        const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
            locked_hours: balance.locked_hours + hours
        });
        return { balance: updatedBalance, transaction };
    }
    async consumeProfessorHours(professorId, unitId, hours, bookingId, source = 'SYSTEM') {
        const balance = await this.getProfessorBalance(professorId, unitId);
        if (balance.locked_hours < hours) {
            throw new Error(`Saldo bloqueado insuficiente para consumo. Bloqueado: ${balance.locked_hours}, Necessário: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, unitId, 'CONSUME', hours, source, bookingId, { booking_id: bookingId });
        const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
            locked_hours: balance.locked_hours - hours
        });
        return { balance: updatedBalance, transaction };
    }
    async unlockProfessorHours(professorId, unitId, hours, bookingId, source = 'SYSTEM') {
        const balance = await this.getProfessorBalance(professorId, unitId);
        if (balance.locked_hours < hours) {
            throw new Error(`Saldo bloqueado insuficiente. Bloqueado: ${balance.locked_hours}, Necessario: ${hours}`);
        }
        const transaction = await this.createHourTransaction(professorId, unitId, 'BONUS_UNLOCK', hours, source, bookingId, { booking_id: bookingId });
        const updatedBalance = await this.updateProfessorBalance(professorId, unitId, {
            locked_hours: balance.locked_hours - hours
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
        return data;
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
        return data;
    }
}
exports.balanceService = new BalanceService();
//# sourceMappingURL=balance.service.js.map