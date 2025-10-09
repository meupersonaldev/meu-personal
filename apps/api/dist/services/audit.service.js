"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const supabase_1 = require("../config/supabase");
class AuditService {
    async createLog(params) {
        const { data: auditLog, error } = await supabase_1.supabase
            .from('audit_logs')
            .insert({
            table_name: params.tableName,
            record_id: params.recordId,
            operation: params.operation,
            actor_id: params.actorId,
            actor_role: params.actorRole,
            old_values: params.oldValues,
            new_values: params.newValues,
            metadata: params.metadata,
            ip_address: params.ipAddress,
            user_agent: params.userAgent
        })
            .select()
            .single();
        if (error) {
            console.error('❌ Erro ao criar audit log:', error);
            throw new Error(`Erro ao criar audit log: ${error.message}`);
        }
        return auditLog;
    }
    async getAuditLogs(filters) {
        let query = supabase_1.supabase
            .from('audit_logs')
            .select(`
        *,
        actor:users!audit_logs_actor_id_fkey(name, email, role)
      `)
            .order('created_at', { ascending: false });
        if (filters?.tableName) {
            query = query.eq('table_name', filters.tableName);
        }
        if (filters?.recordId) {
            query = query.eq('record_id', filters.recordId);
        }
        if (filters?.actorId) {
            query = query.eq('actor_id', filters.actorId);
        }
        if (filters?.operation) {
            query = query.eq('operation', filters.operation);
        }
        if (filters?.fromDate) {
            query = query.gte('created_at', filters.fromDate);
        }
        if (filters?.toDate) {
            query = query.lte('created_at', filters.toDate);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        if (filters?.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Erro ao buscar audit logs: ${error.message}`);
        }
        return data || [];
    }
    async getUserAuditLogs(userId, filters) {
        return this.getAuditLogs({
            actorId: userId,
            ...filters
        });
    }
    async getTableAuditLogs(tableName, recordId, filters) {
        return this.getAuditLogs({
            tableName,
            recordId,
            ...filters
        });
    }
    async logAuthEvent(operation, userId, userRole, ipAddress, userAgent, metadata) {
        try {
            await this.createLog({
                tableName: 'users',
                recordId: userId,
                operation,
                actorId: userId,
                actorRole: userRole,
                metadata,
                ipAddress,
                userAgent
            });
        }
        catch (error) {
            console.error('❌ Erro ao logar evento de autenticação:', error);
        }
    }
    async logPaymentEvent(paymentId, userId, userRole, operation, oldValues, newValues, metadata) {
        try {
            await this.createLog({
                tableName: 'payment_intents',
                recordId: paymentId,
                operation,
                actorId: userId,
                actorRole: userRole,
                oldValues,
                newValues,
                metadata
            });
        }
        catch (error) {
            console.error('❌ Erro ao logar evento de pagamento:', error);
        }
    }
    async logBookingEvent(bookingId, userId, userRole, operation, oldValues, newValues, metadata) {
        try {
            await this.createLog({
                tableName: 'bookings',
                recordId: bookingId,
                operation,
                actorId: userId,
                actorRole: userRole,
                oldValues,
                newValues,
                metadata
            });
        }
        catch (error) {
            console.error('❌ Erro ao logar evento de booking:', error);
        }
    }
    async logPermissionDenied(req, tableName, attemptedOperation, recordId) {
        try {
            await this.createLog({
                tableName,
                recordId: recordId ?? 'unknown',
                operation: 'SENSITIVE_CHANGE',
                actorId: req.user?.userId,
                actorRole: req.user?.role,
                metadata: {
                    attemptedOperation,
                    method: req.method,
                    path: req.path
                },
                ipAddress: req.ip
            });
        }
        catch (error) {
            console.error('? Erro ao logar tentativa de acesso negado:', error);
        }
    }
    async logSensitiveUserChange(userId, actorId, actorRole, operation, fieldName, oldValue, newValue, metadata) {
        try {
            await this.createLog({
                tableName: 'users',
                recordId: userId,
                operation,
                actorId,
                actorRole,
                oldValues: { [fieldName]: oldValue },
                newValues: { [fieldName]: newValue },
                metadata: {
                    ...metadata,
                    sensitive_field: fieldName
                }
            });
        }
        catch (error) {
            console.error('❌ Erro ao logar alteração sensível:', error);
        }
    }
    async getSuspiciousActivityReport(filters) {
        const fromDate = filters?.fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const toDate = filters?.toDate || new Date().toISOString();
        const allLogs = await this.getAuditLogs({
            actorId: filters?.userId,
            fromDate,
            toDate
        });
        const suspiciousPatterns = [];
        const loginLogs = allLogs.filter(log => log.operation === 'LOGIN');
        const uniqueIPs = [...new Set(loginLogs.map(log => log.ip_address).filter(Boolean))];
        if (uniqueIPs.length > 1) {
            suspiciousPatterns.push({
                pattern: 'Múltiplos IPs de login',
                count: uniqueIPs.length,
                details: loginLogs.map(log => ({
                    timestamp: log.created_at,
                    ip: log.ip_address,
                    userAgent: log.user_agent
                }))
            });
        }
        const sensitiveChanges = allLogs.filter(log => log.operation === 'SENSITIVE_CHANGE');
        if (sensitiveChanges.length > 5) {
            suspiciousPatterns.push({
                pattern: 'Múltiplas alterações sensíveis',
                count: sensitiveChanges.length,
                details: sensitiveChanges.map(log => ({
                    timestamp: log.created_at,
                    field: log.metadata?.sensitive_field,
                    oldValue: log.old_values,
                    newValue: log.new_values
                }))
            });
        }
        const bookingCancels = allLogs.filter(log => log.operation === 'BOOKING_CANCEL');
        if (bookingCancels.length > 3) {
            suspiciousPatterns.push({
                pattern: 'Múltiplos cancelamentos de booking',
                count: bookingCancels.length,
                details: bookingCancels.map(log => ({
                    timestamp: log.created_at,
                    bookingId: log.record_id,
                    metadata: log.metadata
                }))
            });
        }
        return {
            totalLogs: allLogs.length,
            suspiciousPatterns
        };
    }
    async cleanupOldLogs(retentionDays = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const { data, error } = await supabase_1.supabase
            .from('audit_logs')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
            .select('id');
        if (error) {
            throw new Error(`Erro ao limpar logs antigos: ${error.message}`);
        }
        console.log(`🧹 Limpados ${data?.length || 0} logs de auditoria antigos`);
        return {
            deleted: data?.length || 0
        };
    }
}
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map