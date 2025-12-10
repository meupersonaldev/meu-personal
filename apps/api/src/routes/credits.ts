import express from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { supabase } from '../lib/supabase';
import { balanceService } from '../services/balance.service';
import { creditGrantService } from '../services/credit-grant.service';

const router = express.Router();

// ============================================================================
// Schemas de validação
// ============================================================================

const creditGrantSchema = z.object({
  userEmail: z.string().email('Email inválido'),
  creditType: z.enum(['STUDENT_CLASS', 'PROFESSOR_HOUR']),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo muito longo'),
  confirmHighQuantity: z.boolean().optional()
});

const searchUserSchema = z.object({
  email: z.string().email('Email inválido')
});

const historyFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  recipientEmail: z.string().optional(),
  creditType: z.enum(['STUDENT_CLASS', 'PROFESSOR_HOUR']).optional(),
  grantedBy: z.string().optional(),
  franchiseId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

// ============================================================================
// Middleware de verificação de funcionalidade habilitada
// ============================================================================

/**
 * Verifica se a funcionalidade de liberação manual de créditos está habilitada
 * para a franquia do admin. Admins de franqueadora sempre têm acesso.
 * Requirements: 2.4
 */
async function checkCreditReleaseEnabled(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Autenticação necessária' });
    }

    const canonicalRole = user.canonicalRole;

    // Admins de franqueadora sempre têm acesso
    if (canonicalRole === 'FRANCHISOR' || canonicalRole === 'SUPER_ADMIN' || canonicalRole === 'ADMIN') {
      return next();
    }

    // Para admin de franquia, verificar se a funcionalidade está habilitada
    if (canonicalRole === 'FRANCHISE_ADMIN') {
      // Buscar a franquia do admin
      const { data: franchiseAdmin, error: adminError } = await supabase
        .from('franchise_admins')
        .select('franchise_id')
        .eq('user_id', user.userId)
        .single();

      if (adminError || !franchiseAdmin) {
        return res.status(403).json({
          error: 'FRANCHISE_NOT_FOUND',
          message: 'Franquia não encontrada para este admin'
        });
      }

      // Verificar settings da franquia
      const { data: academy, error: academyError } = await supabase
        .from('academies')
        .select('settings')
        .eq('id', franchiseAdmin.franchise_id)
        .single();

      if (academyError || !academy) {
        return res.status(403).json({
          error: 'ACADEMY_NOT_FOUND',
          message: 'Academia não encontrada'
        });
      }

      const settings = academy.settings as Record<string, any> || {};
      if (!settings.manualCreditReleaseEnabled) {
        return res.status(403).json({
          error: 'FEATURE_DISABLED',
          message: 'Funcionalidade de liberação manual de créditos não está habilitada para esta franquia'
        });
      }

      // Adicionar franchise_id ao request para uso posterior
      (req as any).franchiseId = franchiseAdmin.franchise_id;
    }

    return next();
  } catch (error) {
    console.error('Erro ao verificar funcionalidade habilitada:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno' });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verifica se um usuário está associado a uma franquia específica
 * Requirements: 3.2, 3.4
 */
async function isUserAssociatedWithFranchise(
  userId: string,
  franchiseId: string
): Promise<boolean> {
  // Verificar em academy_students
  const { data: studentAssoc } = await supabase
    .from('academy_students')
    .select('id')
    .eq('student_id', userId)
    .eq('academy_id', franchiseId)
    .single();

  if (studentAssoc) return true;

  // Verificar em academy_teachers
  const { data: teacherAssoc } = await supabase
    .from('academy_teachers')
    .select('id')
    .eq('teacher_id', userId)
    .eq('academy_id', franchiseId)
    .single();

  return !!teacherAssoc;
}

/**
 * Obtém as franquias associadas a um usuário
 */
async function getUserFranchises(userId: string): Promise<Array<{ id: string; name: string }>> {
  const franchises: Array<{ id: string; name: string }> = [];

  // Buscar franquias como aluno
  const { data: studentFranchises } = await supabase
    .from('academy_students')
    .select('academy:academies(id, name)')
    .eq('student_id', userId);

  if (studentFranchises) {
    for (const sf of studentFranchises) {
      const academy = sf.academy as any;
      if (academy && !franchises.find(f => f.id === academy.id)) {
        franchises.push({ id: academy.id, name: academy.name });
      }
    }
  }

  // Buscar franquias como professor
  const { data: teacherFranchises } = await supabase
    .from('academy_teachers')
    .select('academy:academies(id, name)')
    .eq('teacher_id', userId);

  if (teacherFranchises) {
    for (const tf of teacherFranchises) {
      const academy = tf.academy as any;
      if (academy && !franchises.find(f => f.id === academy.id)) {
        franchises.push({ id: academy.id, name: academy.name });
      }
    }
  }

  return franchises;
}

/**
 * Obtém o escopo de franquias para o admin atual
 */
async function getAdminFranchiseScope(
  user: Express.Request['user'],
  franqueadoraId?: string
): Promise<{ franchiseIds: string[] | null; franqueadoraId: string | null }> {
  if (!user) return { franchiseIds: null, franqueadoraId: null };

  const canonicalRole = user.canonicalRole;

  // Admin de franqueadora pode ver todas as franquias da franqueadora
  if (canonicalRole === 'FRANCHISOR' || canonicalRole === 'SUPER_ADMIN' || canonicalRole === 'ADMIN') {
    return { franchiseIds: null, franqueadoraId: franqueadoraId || null };
  }

  // Admin de franquia só pode ver sua franquia
  if (canonicalRole === 'FRANCHISE_ADMIN') {
    const { data: franchiseAdmin } = await supabase
      .from('franchise_admins')
      .select('franchise_id')
      .eq('user_id', user.userId)
      .single();

    if (franchiseAdmin) {
      return { franchiseIds: [franchiseAdmin.franchise_id], franqueadoraId };
    }
  }

  return { franchiseIds: [], franqueadoraId: null };
}

// ============================================================================
// Rotas
// ============================================================================

/**
 * POST /api/admin/credits/grant
 * Libera créditos manualmente para um usuário
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.3, 3.4, 6.1, 6.2
 */
router.post(
  '/grant',
  requireAuth,
  requireRole(['FRANQUEADORA', 'FRANQUIA', 'ADMIN', 'SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  checkCreditReleaseEnabled,
  asyncErrorHandler(async (req, res) => {
    // Validar entrada
    const parseResult = creditGrantSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: parseResult.error.errors
      });
    }

    const { userEmail, creditType, quantity, reason, confirmHighQuantity } = parseResult.data;
    const adminUser = req.user!;
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id;
    const adminFranchiseId = (req as any).franchiseId;

    if (!franqueadoraId) {
      return res.status(400).json({
        error: 'FRANQUEADORA_REQUIRED',
        message: 'Franqueadora não identificada'
      });
    }

    // Validar quantidade (Requirements: 6.1)
    if (quantity <= 0) {
      return res.status(400).json({
        error: 'INVALID_QUANTITY',
        message: 'Quantidade deve ser maior que zero'
      });
    }

    // Validar alta quantidade sem confirmação (Requirements: 6.2)
    if (quantity > 100 && !confirmHighQuantity) {
      return res.status(400).json({
        error: 'HIGH_QUANTITY_NOT_CONFIRMED',
        message: 'Liberação de mais de 100 créditos requer confirmação explícita'
      });
    }

    // Buscar usuário pelo email (Requirements: 1.4)
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', userEmail)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado com este email'
      });
    }

    // Verificar escopo de franquia para admin de franquia (Requirements: 3.4)
    if (adminFranchiseId) {
      const isAssociated = await isUserAssociatedWithFranchise(targetUser.id, adminFranchiseId);
      if (!isAssociated) {
        return res.status(403).json({
          error: 'UNAUTHORIZED_FRANCHISE',
          message: 'Usuário não pertence à sua franquia'
        });
      }
    }

    // Validar tipo de crédito vs papel do usuário
    const userRole = targetUser.role?.toUpperCase();
    if (creditType === 'STUDENT_CLASS' && userRole !== 'STUDENT' && userRole !== 'ALUNO') {
      return res.status(400).json({
        error: 'INVALID_CREDIT_TYPE',
        message: 'Tipo STUDENT_CLASS só pode ser liberado para alunos'
      });
    }
    if (creditType === 'PROFESSOR_HOUR' && userRole !== 'TEACHER' && userRole !== 'PROFESSOR') {
      return res.status(400).json({
        error: 'INVALID_CREDIT_TYPE',
        message: 'Tipo PROFESSOR_HOUR só pode ser liberado para professores'
      });
    }

    try {
      let balance: any;
      let transaction: any;

      // Liberar créditos baseado no tipo (Requirements: 4.1, 4.2, 4.3)
      if (creditType === 'STUDENT_CLASS') {
        const result = await balanceService.grantStudentClasses(
          targetUser.id,
          franqueadoraId,
          quantity,
          adminUser.userId,
          reason
        );
        balance = result.balance;
        transaction = result.transaction;
      } else {
        const result = await balanceService.grantProfessorHours(
          targetUser.id,
          franqueadoraId,
          quantity,
          adminUser.userId,
          reason
        );
        balance = result.balance;
        transaction = result.transaction;
      }

      // Criar registro de auditoria (Requirements: 1.3, 1.5)
      const grantAudit = await creditGrantService.createGrantAudit({
        recipientId: targetUser.id,
        recipientEmail: targetUser.email,
        recipientName: targetUser.name || targetUser.email,
        creditType,
        quantity,
        reason,
        grantedById: adminUser.userId,
        grantedByEmail: adminUser.email,
        franqueadoraId,
        franchiseId: adminFranchiseId || null,
        transactionId: transaction.id
      });

      return res.status(201).json({
        success: true,
        grantId: grantAudit.id,
        balance,
        transaction
      });
    } catch (error: any) {
      console.error('Erro ao liberar créditos:', error);

      if (error.message?.includes('Saldo')) {
        return res.status(400).json({
          error: 'BALANCE_UPDATE_FAILED',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'TRANSACTION_FAILED',
        message: 'Erro ao processar liberação de créditos'
      });
    }
  })
);

/**
 * GET /api/admin/credits/search-user
 * Busca usuário por email para verificar antes de liberar
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 3.1, 3.2
 */
router.get(
  '/search-user',
  requireAuth,
  requireRole(['FRANQUEADORA', 'FRANQUIA', 'ADMIN', 'SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  checkCreditReleaseEnabled,
  asyncErrorHandler(async (req, res) => {
    const parseResult = searchUserSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email inválido',
        details: parseResult.error.errors
      });
    }

    const { email } = parseResult.data;
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id;
    const adminFranchiseId = (req as any).franchiseId;

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single();

    // Se não encontrou, retornar resultado vazio (Requirements: 7.5)
    if (userError || !user) {
      return res.json({
        user: null,
        studentBalance: null,
        professorBalance: null,
        franchises: []
      });
    }

    // Verificar escopo de franquia para admin de franquia (Requirements: 3.2)
    if (adminFranchiseId) {
      const isAssociated = await isUserAssociatedWithFranchise(user.id, adminFranchiseId);
      if (!isAssociated) {
        // Retornar vazio se usuário não pertence à franquia do admin
        return res.json({
          user: null,
          studentBalance: null,
          professorBalance: null,
          franchises: []
        });
      }
    }

    // Buscar saldos baseado no papel do usuário
    let studentBalance = null;
    let professorBalance = null;
    const userRole = user.role?.toUpperCase();

    if (franqueadoraId) {
      // Buscar saldo de aluno (Requirements: 7.2)
      if (userRole === 'STUDENT' || userRole === 'ALUNO') {
        try {
          studentBalance = await balanceService.getStudentBalance(user.id, franqueadoraId);
        } catch (e) {
          // Saldo não existe ainda
        }
      }

      // Buscar saldo de professor (Requirements: 7.3)
      if (userRole === 'TEACHER' || userRole === 'PROFESSOR') {
        try {
          professorBalance = await balanceService.getProfessorBalance(user.id, franqueadoraId);
        } catch (e) {
          // Saldo não existe ainda
        }
      }
    }

    // Buscar franquias associadas
    const franchises = await getUserFranchises(user.id);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      studentBalance,
      professorBalance,
      franchises
    });
  })
);

/**
 * GET /api/admin/credits/history
 * Retorna histórico de liberações com filtros
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
router.get(
  '/history',
  requireAuth,
  requireRole(['FRANQUEADORA', 'FRANQUIA', 'ADMIN', 'SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  checkCreditReleaseEnabled,
  asyncErrorHandler(async (req, res) => {
    const parseResult = historyFiltersSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Filtros inválidos',
        details: parseResult.error.errors
      });
    }

    const filters = parseResult.data;
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id;
    const adminFranchiseId = (req as any).franchiseId;

    // Aplicar escopo de franquia (Requirements: 5.5)
    const historyFilters: any = {
      ...filters,
      franqueadoraId
    };

    // Admin de franquia só vê liberações da sua franquia
    if (adminFranchiseId) {
      historyFilters.franchiseId = adminFranchiseId;
    }

    const result = await creditGrantService.getGrantHistory(historyFilters);

    return res.json(result);
  })
);

export default router;
