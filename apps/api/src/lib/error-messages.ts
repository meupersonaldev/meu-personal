/**
 * Mensagens de erro padronizadas em português
 * Todas as mensagens de erro retornadas ao usuário devem estar em pt-BR
 */

export const ERROR_MESSAGES = {
  // Autenticação e Autorização
  FORBIDDEN: 'Acesso negado',
  UNAUTHORIZED: 'Não autorizado',
  INVALID_TOKEN: 'Token inválido',
  TOKEN_EXPIRED: 'Token expirado',
  
  // Recursos não encontrados
  NOT_FOUND: 'Recurso não encontrado',
  USER_NOT_FOUND: 'Usuário não encontrado',
  TEACHER_NOT_FOUND: 'Professor não encontrado',
  STUDENT_NOT_FOUND: 'Aluno não encontrado',
  ACADEMY_NOT_FOUND: 'Unidade não encontrada',
  FRANCHISE_NOT_FOUND: 'Franquia não encontrada',
  BOOKING_NOT_FOUND: 'Agendamento não encontrado',
  DRAFT_NOT_FOUND: 'Rascunho não encontrado',
  PUBLISHED_NOT_FOUND: 'Política publicada não encontrada',
  TEMPLATE_NOT_FOUND: 'Template não encontrado',
  LEAD_NOT_FOUND: 'Lead não encontrado',
  
  // Validação
  VALIDATION_ERROR: 'Erro de validação',
  INVALID_DATA: 'Dados inválidos',
  MISSING_REQUIRED_FIELD: 'Campo obrigatório não informado',
  INVALID_EMAIL: 'Email inválido',
  INVALID_CPF: 'CPF inválido',
  INVALID_PHONE: 'Telefone inválido',
  INVALID_CREF: 'CREF inválido',
  MISSING_CREF: 'CREF é obrigatório para professores',
  FIELD_NOT_ALLOWED: 'Campo não permitido',
  
  // Conflitos e duplicados
  EMAIL_ALREADY_EXISTS: 'Este email já está cadastrado',
  CPF_ALREADY_EXISTS: 'Este CPF já está cadastrado',
  CREF_ALREADY_EXISTS: 'Este CREF já está cadastrado',
  ALREADY_EXISTS: 'Registro já existe',
  CONFLICT: 'Conflito de dados',
  
  // Agendamentos
  BOOKING_CONFLICT: 'Conflito de horário',
  SLOT_NOT_AVAILABLE: 'Horário não disponível',
  INVALID_DATE: 'Data inválida',
  PAST_DATE: 'Não é possível agendar para datas passadas',
  INSUFFICIENT_CREDITS: 'Créditos insuficientes',
  BOOKING_ALREADY_CANCELLED: 'Agendamento já cancelado',
  BOOKING_ALREADY_COMPLETED: 'Agendamento já concluído',
  
  // Professores
  TEACHER_NOT_APPROVED: 'Professor ainda não aprovado',
  TEACHER_ALREADY_APPROVED: 'Professor já aprovado',
  TEACHER_REJECTED: 'Professor rejeitado',
  
  // Pagamentos
  PAYMENT_FAILED: 'Falha no pagamento',
  PAYMENT_NOT_FOUND: 'Pagamento não encontrado',
  INVALID_PAYMENT_METHOD: 'Método de pagamento inválido',
  
  // Operações
  OPERATION_FAILED: 'Operação falhou',
  INTERNAL_ERROR: 'Erro interno do servidor',
  DATABASE_ERROR: 'Erro no banco de dados',
  
  // Políticas
  INVALID_POLICY_VALUE: 'Valor de política inválido',
  ROLLBACK_SAME_VERSION: 'Não é possível fazer rollback para a versão atual',
  VERSION_NOT_FOUND: 'Versão não encontrada',
  
  // Email
  EMAIL_SEND_FAILED: 'Falha ao enviar email',
  EMAIL_NOT_CONFIGURED: 'Email não configurado',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

/**
 * Retorna a mensagem de erro em português para um código
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code as ErrorCode] || code
}

/**
 * Cria um objeto de erro padronizado
 */
export function createError(code: ErrorCode, details?: string | string[]) {
  return {
    error: ERROR_MESSAGES[code],
    code,
    ...(details ? { details: Array.isArray(details) ? details : [details] } : {})
  }
}
