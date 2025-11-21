import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { balanceService } from '../services/balance.service';
import { paymentIntentService } from '../services/payment-intent.service';
import { supabase } from '../lib/supabase';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { extractPagination } from '../middleware/pagination';
import { resolveDefaultFranqueadoraId } from '../services/franqueadora-contacts.service';

const router = Router();

async function fetchFranqueadoraIdFromUnit(unitId?: string | null): Promise<string | null> {
  if (!unitId) {
    return null;
  }

  const { data: academyDirect, error: academyDirectError } = await supabase
    .from('academies')
    .select('franqueadora_id')
    .eq('id', unitId)
    .single();

  if (!academyDirectError && academyDirect?.franqueadora_id) {
    return academyDirect.franqueadora_id;
  }

  const { data: unitData, error: unitError } = await supabase
    .from('units')
    .select('academy_legacy_id')
    .eq('id', unitId)
    .single();

  if (unitError || !unitData) {
    return null;
  }

  if (!unitData.academy_legacy_id) {
    return null;
  }

  const { data: legacyAcademy, error: legacyError } = await supabase
    .from('academies')
    .select('franqueadora_id')
    .eq('id', unitData.academy_legacy_id)
    .single();

  if (!legacyError && legacyAcademy?.franqueadora_id) {
    return legacyAcademy.franqueadora_id;
  }

  return null;
}

async function resolveFranqueadoraId(options: {
  franqueadoraId?: string | null;
  unitId?: string | null;
  contextFranqueadoraId?: string | null;
  allowFallback?: boolean;
}): Promise<string | null> {
  const { franqueadoraId, unitId, contextFranqueadoraId, allowFallback = true } = options;

  if (franqueadoraId) {
    return franqueadoraId;
  }

  if (contextFranqueadoraId) {
    return contextFranqueadoraId;
  }

  const fromUnit = await fetchFranqueadoraIdFromUnit(unitId);
  if (fromUnit) {
    return fromUnit;
  }

  if (!allowFallback) {
    return null;
  }

  return resolveDefaultFranqueadoraId();
}

async function ensureStudentAccessToUnit(studentId: string, unitId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_units')
    .select('id')
    .eq('student_id', studentId)
    .eq('unit_id', unitId)
    .limit(1);

  if (error) {
    console.warn('Falha ao validar acesso do aluno a unidade:', error.message);
    return false;
  }

  return !!(data && data.length > 0);
}

async function ensureTeacherAccessToUnit(teacherId: string, unitId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('teacher_units')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('unit_id', unitId)
    .limit(1);

  if (error) {
    console.warn('Falha ao validar acesso do professor a unidade:', error.message);
    return false;
  }

  return !!(data && data.length > 0);
}

function getContextFranqueadoraId(req: any): string | null {
  return (
    req?.franqueadoraAdmin?.franqueadora_id ||
    req?.user?.franqueadora_id ||
    null
  );
}

// ---------------------------------------------------------------------------
// Catalogo de pacotes - alunos
router.get('/student', requireAuth, requireRole(['STUDENT', 'FRANQUIA', 'FRANQUEADORA']), asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: true
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  if (user.role === 'STUDENT' && unit_id) {
    const hasAccess = await ensureStudentAccessToUnit(user.userId, unit_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
    }
  }

  const { data, error } = await supabase
    .from('student_packages')
    .select('*')
    .eq('franqueadora_id', franqueadoraId)
    .eq('status', 'active')
    .order('price_cents', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ packages: data, franqueadora_id: franqueadoraId });
}));

// Catalogo de pacotes - professores
router.get('/professor', requireAuth, requireRole(['TEACHER', 'FRANQUIA', 'FRANQUEADORA']), asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: true
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  if (user.role === 'TEACHER' && unit_id) {
    const hasAccess = await ensureTeacherAccessToUnit(user.userId, unit_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
    }
  }

  const { data, error } = await supabase
    .from('hour_packages')
    .select('*')
    .eq('franqueadora_id', franqueadoraId)
    .eq('status', 'active')
    .order('price_cents', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ packages: data, franqueadora_id: franqueadoraId });
}));

// ---------------------------------------------------------------------------
// Checkout de pacotes - aluno
router.post('/student/checkout', requireAuth, requireRole(['STUDENT', 'ALUNO']), asyncErrorHandler(async (req, res) => {
  const schema = z.object({
    package_id: z.string().uuid(),
    unit_id: z.string().uuid().optional(),
    payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
  });

  const { package_id, unit_id, payment_method } = schema.parse(req.body);
  const user = req.user;

  const { data: packageData, error: packageError } = await supabase
    .from('student_packages')
    .select('*')
    .eq('id', package_id)
    .eq('status', 'active')
    .single();

  if (packageError || !packageData) {
    return res.status(404).json({ error: 'Pacote nao encontrado' });
  }

  if (user.role === 'STUDENT' && unit_id) {
    const hasAccess = await ensureStudentAccessToUnit(user.userId, unit_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
    }
  }

  const franqueadoraId = packageData.franqueadora_id;
  if (!franqueadoraId) {
    return res.status(409).json({ error: 'Pacote sem franqueadora associada' });
  }

  const paymentIntent = await paymentIntentService.createPaymentIntent({
    type: 'STUDENT_PACKAGE',
    actorUserId: user.userId,
    franqueadoraId,
    unitId: unit_id,
    amountCents: packageData.price_cents,
    metadata: {
      package_id: packageData.id,
      package_title: packageData.title,
      classes_qty: packageData.classes_qty,
      payment_method
    }
  });

  // Log estruturado de criação do intent
  console.log('checkout_student_intent_created', {
    correlationId: req.audit?.correlationId,
    intentId: paymentIntent.id,
    userId: user.userId,
    packageId: package_id,
    franqueadoraId,
    unitId: unit_id || null,
    amountCents: packageData.price_cents,
    createdAt: paymentIntent.created_at
  });

  res.status(201).json({
    message: 'Pagamento criado com sucesso',
    payment_intent: {
      id: paymentIntent.id,
      type: paymentIntent.type,
      status: paymentIntent.status,
      checkout_url: paymentIntent.checkout_url,
      created_at: paymentIntent.created_at
    },
    package: {
      title: packageData.title,
      classes_qty: packageData.classes_qty,
      price_cents: packageData.price_cents,
      franqueadora_id: franqueadoraId
    }
  });
}));

// Checkout de pacotes - professor
router.post('/professor/checkout', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const schema = z.object({
    package_id: z.string().uuid(),
    unit_id: z.string().uuid().optional(),
    payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
  });

  const { package_id, unit_id, payment_method } = schema.parse(req.body);
  const user = req.user;

  const { data: packageData, error: packageError } = await supabase
    .from('hour_packages')
    .select('*')
    .eq('id', package_id)
    .eq('status', 'active')
    .single();

  if (packageError || !packageData) {
    return res.status(404).json({ error: 'Pacote nao encontrado' });
  }

  if (user.role === 'TEACHER' && unit_id) {
    const hasAccess = await ensureTeacherAccessToUnit(user.userId, unit_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso nao autorizado a esta unidade' });
    }
  }

  const franqueadoraId = packageData.franqueadora_id;
  if (!franqueadoraId) {
    return res.status(409).json({ error: 'Pacote sem franqueadora associada' });
  }

  const paymentIntent = await paymentIntentService.createPaymentIntent({
    type: 'PROF_HOURS',
    actorUserId: user.userId,
    franqueadoraId,
    unitId: unit_id,
    amountCents: packageData.price_cents,
    metadata: {
      package_id: packageData.id,
      package_title: packageData.title,
      hours_qty: packageData.hours_qty,
      payment_method
    }
  });

  // Log estruturado de criação do intent
  console.log('checkout_professor_intent_created', {
    correlationId: req.audit?.correlationId,
    intentId: paymentIntent.id,
    userId: user.userId,
    packageId: package_id,
    franqueadoraId,
    unitId: unit_id || null,
    amountCents: packageData.price_cents,
    createdAt: paymentIntent.created_at
  });

  res.status(201).json({
    message: 'Pagamento criado com sucesso',
    payment_intent: {
      id: paymentIntent.id,
      type: paymentIntent.type,
      status: paymentIntent.status,
      checkout_url: paymentIntent.checkout_url,
      created_at: paymentIntent.created_at
    },
    package: {
      title: packageData.title,
      hours_qty: packageData.hours_qty,
      price_cents: packageData.price_cents,
      franqueadora_id: franqueadoraId
    }
  });
}));

// ---------------------------------------------------------------------------
// Saldos agregados
router.get('/student/balance', requireAuth, requireRole(['STUDENT', 'ALUNO']), asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: true
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  const balance = await balanceService.getStudentBalance(user.userId, franqueadoraId);
  const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;

  res.json({
    balance: {
      ...balance,
      franqueadora_id: franqueadoraId,
      available_classes: Math.max(0, availableClasses)
    }
  });
}));

router.get('/professor/balance', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: true
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  const balance = await balanceService.getProfessorBalance(user.userId, franqueadoraId);
  const availableHours = balance.available_hours - balance.locked_hours;

  res.json({
    balance: {
      ...balance,
      franqueadora_id: franqueadoraId,
      available_hours: Math.max(0, availableHours)
    }
  });
}));

// ---------------------------------------------------------------------------
// Histórico de transações
router.get('/student/transactions', requireAuth, requireRole(['STUDENT', 'ALUNO']), extractPagination, asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const { limit, offset } = req.pagination;
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: false
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  let query = supabase
    .from('student_class_tx')
    .select('*', { count: 'exact' })
    .eq('student_id', user.userId)
    .eq('franqueadora_id', franqueadoraId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unit_id) {
    query = query.eq('unit_id', unit_id);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.set('X-Total-Count', count?.toString() || '0');
  res.json({ transactions: data, franqueadora_id: franqueadoraId });
}));

router.get('/professor/transactions', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), extractPagination, asyncErrorHandler(async (req, res) => {
  const { franqueadora_id, unit_id } = req.query as { franqueadora_id?: string; unit_id?: string };
  const { limit, offset } = req.pagination;
  const user = req.user;

  const franqueadoraId = await resolveFranqueadoraId({
    franqueadoraId: franqueadora_id,
    unitId: unit_id,
    contextFranqueadoraId: getContextFranqueadoraId(req),
    allowFallback: false
  });

  if (!franqueadoraId) {
    return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
  }

  let query = supabase
    .from('hour_tx')
    .select('*', { count: 'exact' })
    .eq('professor_id', user.userId)
    .eq('franqueadora_id', franqueadoraId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unit_id) {
    query = query.eq('unit_id', unit_id);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.set('X-Total-Count', count?.toString() || '0');
  res.json({ transactions: data, franqueadora_id: franqueadoraId });
}));

// ---------------------------------------------------------------------------
// Gestao de pacotes pela franqueadora
const packageStatusSchema = z.enum(['active', 'inactive']);

const manageStudentPackageSchema = z.object({
  title: z.string().min(3).max(120),
  classes_qty: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
  status: packageStatusSchema.optional(),
  description: z.string().max(280).optional(),
  metadata: z.record(z.any()).optional()
});

const manageHourPackageSchema = z.object({
  title: z.string().min(3).max(120),
  hours_qty: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
  status: packageStatusSchema.optional(),
  description: z.string().max(280).optional(),
  metadata: z.record(z.any()).optional()
});

router.get(
  '/student/manage',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { franqueadora_id } = req.query as { franqueadora_id?: string };

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: franqueadora_id,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId) {
      return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }

    const { data, error } = await supabase
      .from('student_packages')
      .select('*')
      .eq('franqueadora_id', franqueadoraId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ packages: data || [], franqueadora_id: franqueadoraId });
  })
);

router.post(
  '/student/manage',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const payload = manageStudentPackageSchema.parse(req.body ?? {});

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: (req.body && req.body.franqueadora_id) || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId) {
      return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }

    const metadataJson = {
      ...(payload.metadata || {}),
      ...(payload.description ? { description: payload.description } : {})
    };

    const { data, error } = await supabase
      .from('student_packages')
      .insert({
        franqueadora_id: franqueadoraId,
        unit_id: null,
        title: payload.title.trim(),
        classes_qty: payload.classes_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? 'active',
        metadata_json: metadataJson
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar pacote de aluno:', error);
      return res.status(500).json({ error: 'Erro ao criar pacote' });
    }

    res.status(201).json({ package: data, franqueadora_id: franqueadoraId });
  })
);

// PUT - Atualizar pacote de aluno
router.put(
  '/student/manage/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const payload = manageStudentPackageSchema.parse(req.body ?? {});

    // Verificar se o pacote existe e pertence à franqueadora
    const { data: existingPackage, error: fetchError } = await supabase
      .from('student_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPackage) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: (req.body && req.body.franqueadora_id) || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }

    const metadataJson = {
      ...(existingPackage.metadata_json || {}),
      ...(payload.metadata || {}),
      ...(payload.description ? { description: payload.description } : {})
    };

    const { data, error } = await supabase
      .from('student_packages')
      .update({
        title: payload.title.trim(),
        classes_qty: payload.classes_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? existingPackage.status,
        metadata_json: metadataJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar pacote de aluno:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pacote' });
    }

    res.json({ package: data, franqueadora_id: franqueadoraId });
  })
);

// DELETE - Excluir pacote de aluno
router.delete(
  '/student/manage/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { franqueadora_id } = req.query as { franqueadora_id?: string };

    // Verificar se o pacote existe e pertence à franqueadora
    const { data: existingPackage, error: fetchError } = await supabase
      .from('student_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPackage) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: franqueadora_id || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }

    // Verificar se há alunos que compraram este pacote
    const { data: activeStudents, error: checkError } = await supabase
      .from('student_class_balance')
      .select('student_id')
      .eq('franqueadora_id', franqueadoraId)
      .gt('total_purchased', 0);

    if (checkError) {
      console.error('Erro ao verificar uso do pacote:', checkError);
      return res.status(500).json({ error: 'Erro ao verificar pacote' });
    }

    if (activeStudents && activeStudents.length > 0) {
      // Em vez de excluir, apenas inativa o pacote
      const { data, error } = await supabase
        .from('student_packages')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao inativar pacote de aluno:', error);
        return res.status(500).json({ error: 'Erro ao inativar pacote' });
      }

      return res.json({
        package: data,
        message: 'Pacote inativado (há alunos com este pacote)',
        franqueadora_id: franqueadoraId
      });
    }

    // Se não há alunos usando, pode excluir
    const { data, error } = await supabase
      .from('student_packages')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao excluir pacote de aluno:', error);
      return res.status(500).json({ error: 'Erro ao excluir pacote' });
    }

    res.json({ package: data, message: 'Pacote excluído com sucesso', franqueadora_id: franqueadoraId });
  })
);

router.get(
  '/professor/manage',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { franqueadora_id } = req.query as { franqueadora_id?: string };

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: franqueadora_id,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId) {
      return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }

    const { data, error } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('franqueadora_id', franqueadoraId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ packages: data || [], franqueadora_id: franqueadoraId });
  })
);

router.post(
  '/professor/manage',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const payload = manageHourPackageSchema.parse(req.body ?? {});

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: (req.body && req.body.franqueadora_id) || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId) {
      return res.status(400).json({ error: 'franqueadora_id eh obrigatorio' });
    }

    const metadataJson = {
      ...(payload.metadata || {}),
      ...(payload.description ? { description: payload.description } : {})
    };

    const { data, error } = await supabase
      .from('hour_packages')
      .insert({
        franqueadora_id: franqueadoraId,
        unit_id: null,
        title: payload.title.trim(),
        hours_qty: payload.hours_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? 'active',
        metadata_json: metadataJson
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar pacote de professor:', error);
      return res.status(500).json({ error: 'Erro ao criar pacote' });
    }

    res.status(201).json({ package: data, franqueadora_id: franqueadoraId });
  })
);

// PUT - Atualizar pacote de professor
router.put(
  '/professor/manage/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const payload = manageHourPackageSchema.parse(req.body ?? {});

    // Verificar se o pacote existe e pertence à franqueadora
    const { data: existingPackage, error: fetchError } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPackage) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: (req.body && req.body.franqueadora_id) || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }

    const metadataJson = {
      ...(existingPackage.metadata_json || {}),
      ...(payload.metadata || {}),
      ...(payload.description ? { description: payload.description } : {})
    };

    const { data, error } = await supabase
      .from('hour_packages')
      .update({
        title: payload.title.trim(),
        hours_qty: payload.hours_qty,
        price_cents: payload.price_cents,
        status: payload.status ?? existingPackage.status,
        metadata_json: metadataJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar pacote de professor:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pacote' });
    }

    res.json({ package: data, franqueadora_id: franqueadoraId });
  })
);

// DELETE - Excluir pacote de professor
router.delete(
  '/professor/manage/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { franqueadora_id } = req.query as { franqueadora_id?: string };

    // Verificar se o pacote existe e pertence à franqueadora
    const { data: existingPackage, error: fetchError } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPackage) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    const franqueadoraId = await resolveFranqueadoraId({
      franqueadoraId: franqueadora_id || null,
      contextFranqueadoraId: getContextFranqueadoraId(req),
      allowFallback: false
    });

    if (!franqueadoraId || existingPackage.franqueadora_id !== franqueadoraId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este pacote' });
    }

    // Verificar se há professores com horas compradas
    const { data: activeProfessors, error: checkError } = await supabase
      .from('prof_hour_balance')
      .select('professor_id')
      .eq('franqueadora_id', franqueadoraId)
      .gt('available_hours', 0);

    if (checkError) {
      console.error('Erro ao verificar uso do pacote:', checkError);
      return res.status(500).json({ error: 'Erro ao verificar pacote' });
    }

    if (activeProfessors && activeProfessors.length > 0) {
      // Em vez de excluir, apenas inativa o pacote
      const { data, error } = await supabase
        .from('hour_packages')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao inativar pacote de professor:', error);
        return res.status(500).json({ error: 'Erro ao inativar pacote' });
      }

      return res.json({
        package: data,
        message: 'Pacote inativado (há professores com horas ativas)',
        franqueadora_id: franqueadoraId
      });
    }

    // Se não há professores usando, pode excluir
    const { data, error } = await supabase
      .from('hour_packages')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao excluir pacote de professor:', error);
      return res.status(500).json({ error: 'Erro ao excluir pacote' });
    }

    res.json({ package: data, message: 'Pacote excluído com sucesso', franqueadora_id: franqueadoraId });
  })
);

export default router;

