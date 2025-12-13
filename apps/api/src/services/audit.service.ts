import { supabase } from '../lib/supabase';

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

class AuditService {
  /**
   * Cria um registro de audit log
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLog> {
    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .insert({
        entity: params.tableName,
        entity_id: params.recordId,
        action: params.operation,
        actor_user_id: params.actorId || null,
        diff_json: params.oldValues || params.newValues ? { old: params.oldValues, new: params.newValues } : null,
        metadata_json: {
          ...params.metadata,
          actor_role: params.actorRole,
          ip_address: params.ipAddress,
          user_agent: params.userAgent
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar audit log:', error);
      // Não lançar erro para não quebrar a operação principal
      throw new Error(`Erro ao criar audit log: ${error.message}`);
    }

    return auditLog;
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async getAuditLogs(filters?: {
    tableName?: string;
    recordId?: string;
    actorId?: string;
    operation?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        actor:users!audit_logs_actor_user_id_fkey(name, email, role)
      `)
      .order('created_at', { ascending: false });

    if (filters?.tableName) {
      query = query.eq('entity', filters.tableName);
    }

    if (filters?.recordId) {
      query = query.eq('entity_id', filters.recordId);
    }

    if (filters?.actorId) {
      query = query.eq('actor_user_id', filters.actorId);
    }

    if (filters?.operation) {
      query = query.eq('action', filters.operation);
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

  /**
   * Busca logs de auditoria de um usuário específico
   */
  async getUserAuditLogs(userId: string, filters?: {
    operation?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    return this.getAuditLogs({
      actorId: userId,
      ...filters
    });
  }

  /**
   * Busca logs de auditoria de uma tabela específica
   */
  async getTableAuditLogs(tableName: string, recordId?: string, filters?: {
    operation?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    return this.getAuditLogs({
      tableName,
      recordId,
      ...filters
    });
  }

  /**
   * Cria log para operações de login/logout
   */
  async logAuthEvent(
    operation: 'LOGIN' | 'LOGOUT',
    userId: string,
    userRole: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
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
    } catch (error) {
      console.error('❌ Erro ao logar evento de autenticação:', error);
    }
  }

  /**
   * Cria log para operações de pagamento
   */
  async logPaymentEvent(
    paymentId: string,
    userId: string,
    userRole: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
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
    } catch (error) {
      console.error('❌ Erro ao logar evento de pagamento:', error);
    }
  }

  /**
   * Cria log para operações de booking
   */
  async logBookingEvent(
    bookingId: string,
    userId: string,
    userRole: string,
    operation: 'BOOKING_CREATE' | 'BOOKING_CANCEL' | 'BOOKING_UPDATE',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
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
    } catch (error) {
      console.error('❌ Erro ao logar evento de booking:', error);
    }
  }

  /**
   * Registra tentativa de acesso negado a um recurso protegido
   */
  async logPermissionDenied(
    req: { ip?: string; method?: string; path?: string; user?: { userId?: string; role?: string } },
    tableName: string,
    attemptedOperation: string,
    recordId?: string
  ): Promise<void> {
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
    } catch (error) {
      console.error('? Erro ao logar tentativa de acesso negado:', error);
    }
  }

  /**
   * Cria log para alterações sensíveis em usuários
   */
  async logSensitiveUserChange(
    userId: string,
    actorId: string,
    actorRole: string,
    operation: 'SENSITIVE_CHANGE',
    fieldName: string,
    oldValue: any,
    newValue: any,
    metadata?: Record<string, any>
  ): Promise<void> {
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
    } catch (error) {
      console.error('❌ Erro ao logar alteração sensível:', error);
    }
  }

  /**
   * Gera relatório de atividades suspeitas
   */
  async getSuspiciousActivityReport(filters?: {
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
  }> {
    const fromDate = filters?.fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Últimas 24h
    const toDate = filters?.toDate || new Date().toISOString();

    const allLogs = await this.getAuditLogs({
      actorId: filters?.userId,
      fromDate,
      toDate
    });

    const suspiciousPatterns = [];

    // Detectar múltiplogins em locais diferentes
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

    // Detectar alterações sensíveis frequentes
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

    // Detectar cancelamentos de booking suspeitos
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

  /**
   * Limpa logs antigos (para controle de retenção)
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
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

export const auditService = new AuditService();

