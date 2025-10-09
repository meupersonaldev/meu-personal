export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PAYMENT' | 'BOOKING_CANCEL' | 'BOOKING_CREATE' | 'BOOKING_UPDATE' | 'SENSITIVE_CHANGE';
    actor_id?: string;
    actor_role?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}
export interface CreateAuditLogParams {
    tableName: string;
    recordId: string;
    operation: AuditLog['operation'];
    actorId?: string;
    actorRole?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
declare class AuditService {
    createLog(params: CreateAuditLogParams): Promise<AuditLog>;
    getAuditLogs(filters?: {
        tableName?: string;
        recordId?: string;
        actorId?: string;
        operation?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<AuditLog[]>;
    getUserAuditLogs(userId: string, filters?: {
        operation?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<AuditLog[]>;
    getTableAuditLogs(tableName: string, recordId?: string, filters?: {
        operation?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<AuditLog[]>;
    logAuthEvent(operation: 'LOGIN' | 'LOGOUT', userId: string, userRole: string, ipAddress?: string, userAgent?: string, metadata?: Record<string, any>): Promise<void>;
    logPaymentEvent(paymentId: string, userId: string, userRole: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', oldValues?: Record<string, any>, newValues?: Record<string, any>, metadata?: Record<string, any>): Promise<void>;
    logBookingEvent(bookingId: string, userId: string, userRole: string, operation: 'BOOKING_CREATE' | 'BOOKING_CANCEL' | 'BOOKING_UPDATE', oldValues?: Record<string, any>, newValues?: Record<string, any>, metadata?: Record<string, any>): Promise<void>;
    logPermissionDenied(req: {
        ip?: string;
        method?: string;
        path?: string;
        user?: {
            userId?: string;
            role?: string;
        };
    }, tableName: string, attemptedOperation: string, recordId?: string): Promise<void>;
    logSensitiveUserChange(userId: string, actorId: string, actorRole: string, operation: 'SENSITIVE_CHANGE', fieldName: string, oldValue: any, newValue: any, metadata?: Record<string, any>): Promise<void>;
    getSuspiciousActivityReport(filters?: {
        userId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        totalLogs: number;
        suspiciousPatterns: Array<{
            pattern: string;
            count: number;
            details: any[];
        }>;
    }>;
    cleanupOldLogs(retentionDays?: number): Promise<{
        deleted: number;
    }>;
}
export declare const auditService: AuditService;
export {};
//# sourceMappingURL=audit.service.d.ts.map