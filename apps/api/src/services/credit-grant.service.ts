import { supabase } from '../lib/supabase';

export interface CreditGrant {
  id: string;
  recipient_id: string;
  recipient_email: string;
  recipient_name: string;
  credit_type: 'STUDENT_CLASS' | 'PROFESSOR_HOUR';
  quantity: number;
  reason: string;
  granted_by_id: string;
  granted_by_email: string;
  franqueadora_id: string;
  franchise_id?: string | null;
  transaction_id: string;
  created_at: string;
}

export interface CreateGrantAuditParams {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  creditType: 'STUDENT_CLASS' | 'PROFESSOR_HOUR';
  quantity: number;
  reason: string;
  grantedById: string;
  grantedByEmail: string;
  franqueadoraId: string;
  franchiseId?: string | null;
  transactionId: string;
}

export interface GrantHistoryFilters {
  startDate?: string;
  endDate?: string;
  recipientEmail?: string;
  creditType?: 'STUDENT_CLASS' | 'PROFESSOR_HOUR';
  grantedBy?: string;
  franchiseId?: string;
  franqueadoraId?: string;
  page?: number;
  limit?: number;
}

export interface GrantHistoryResponse {
  grants: CreditGrant[];
  total: number;
  page: number;
  totalPages: number;
}

class CreditGrantService {
  /**
   * Cria um registro de auditoria para liberação manual de créditos
   * Requirements: 1.5 - Auditoria completa de liberações
   */
  async createGrantAudit(params: CreateGrantAuditParams): Promise<CreditGrant> {
    const { data, error } = await supabase
      .from('credit_grants')
      .insert({
        recipient_id: params.recipientId,
        recipient_email: params.recipientEmail,
        recipient_name: params.recipientName,
        credit_type: params.creditType,
        quantity: params.quantity,
        reason: params.reason,
        granted_by_id: params.grantedById,
        granted_by_email: params.grantedByEmail,
        franqueadora_id: params.franqueadoraId,
        franchise_id: params.franchiseId ?? null,
        transaction_id: params.transactionId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar registro de auditoria de crédito:', error);
      throw new Error(`Erro ao criar registro de auditoria: ${error.message}`);
    }

    return data as CreditGrant;
  }

  /**
   * Busca histórico de liberações com filtros e paginação
   * Requirements: 5.1, 5.2, 5.3, 5.4 - Histórico com filtros
   */
  async getGrantHistory(filters: GrantHistoryFilters = {}): Promise<GrantHistoryResponse> {
    const {
      startDate,
      endDate,
      recipientEmail,
      creditType,
      grantedBy,
      franchiseId,
      franqueadoraId,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;

    // Build query for data
    let query = supabase
      .from('credit_grants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (franqueadoraId) {
      query = query.eq('franqueadora_id', franqueadoraId);
    }

    if (franchiseId) {
      query = query.eq('franchise_id', franchiseId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (recipientEmail) {
      query = query.ilike('recipient_email', `%${recipientEmail}%`);
    }

    if (creditType) {
      query = query.eq('credit_type', creditType);
    }

    if (grantedBy) {
      query = query.ilike('granted_by_email', `%${grantedBy}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Erro ao buscar histórico de liberações:', error);
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      grants: (data || []) as CreditGrant[],
      total,
      page,
      totalPages
    };
  }

  /**
   * Busca uma liberação específica por ID
   */
  async getGrantById(grantId: string): Promise<CreditGrant | null> {
    const { data, error } = await supabase
      .from('credit_grants')
      .select('*')
      .eq('id', grantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar liberação: ${error.message}`);
    }

    return data as CreditGrant;
  }

  /**
   * Busca liberações por destinatário
   */
  async getGrantsByRecipient(
    recipientId: string,
    franqueadoraId?: string
  ): Promise<CreditGrant[]> {
    let query = supabase
      .from('credit_grants')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (franqueadoraId) {
      query = query.eq('franqueadora_id', franqueadoraId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar liberações do destinatário: ${error.message}`);
    }

    return (data || []) as CreditGrant[];
  }

  /**
   * Conta total de liberações por franqueadora
   */
  async countGrantsByFranqueadora(franqueadoraId: string): Promise<number> {
    const { count, error } = await supabase
      .from('credit_grants')
      .select('*', { count: 'exact', head: true })
      .eq('franqueadora_id', franqueadoraId);

    if (error) {
      throw new Error(`Erro ao contar liberações: ${error.message}`);
    }

    return count ?? 0;
  }
}

export const creditGrantService = new CreditGrantService();
