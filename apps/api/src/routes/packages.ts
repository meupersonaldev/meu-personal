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

/**
 * Valida o preço do pacote conforme regras do Asaas:
 * - Aceita 0 (grátis) OU >= R$ 5,00 (500 centavos)
 * - Não aceita valores entre 0 e 5 reais
 */
function validatePackagePrice(priceCents: number): { valid: boolean; error?: string } {
  // Aceita 0 (grátis) ou valores >= R$ 5,00
  if (priceCents === 0 || priceCents >= 500) {
    return { valid: true };
  }

  // Rejeita valores entre 0 e 5 reais
  return {
    valid: false,
    error: 'O valor do pacote deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.'
  };
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

function serializePaymentIntent(intent: any) {
  if (!intent) return null;

  const payload = intent.payload_json || {};

  // Priorizar checkout_url do intent, depois buscar no payload
  const checkoutUrl = intent.checkout_url || payload.checkout_url || payload.payment_url || payload.invoice_url || null;
  const invoiceUrl = payload.invoice_url || payload.payment_url || intent.checkout_url || null;
  const bankSlipUrl = payload.bank_slip_url || null;
  const paymentUrl = payload.payment_url || payload.invoice_url || intent.checkout_url || null;

  return {
    id: intent.id,
    type: intent.type,
    status: intent.status,
    checkout_url: checkoutUrl,
    created_at: intent.created_at,
    amount_cents: intent.amount_cents,
    payment_method: payload.payment_method,
    invoice_url: invoiceUrl,
    bank_slip_url: bankSlipUrl,
    payment_url: paymentUrl,
    pix_copy_paste: payload.pix_copy_paste || null,
    pix_qr_code: payload.pix_qr_code || null,
    provider_id: intent.provider_id || null // Incluir provider_id para possível busca futura
  };
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

  // Verificar se é pacote grátis (price_cents <= 1)
  const isFreePackage = packageData.price_cents <= 1;

  if (isFreePackage) {
    // Pacote grátis - creditar diretamente sem passar pelo Asaas
    console.log('🎁 Processando pacote grátis (aluno):', {
      packageId: package_id,
      userId: user.userId,
      classesQty: packageData.classes_qty,
      priceCents: packageData.price_cents
    });

    try {
      // 1. Creditar aulas diretamente
      const balanceResult = await balanceService.purchaseStudentClasses(
        user.userId,
        franqueadoraId,
        packageData.classes_qty,
        {
          unitId: unit_id || null,
          source: 'ALUNO',
          metaJson: {
            package_id: packageData.id,
            package_title: packageData.title,
            is_free: true,
            free_reason: 'Aula inaugural grátis'
          }
        }
      );

      // 2. Criar payment_intent com status PAID para histórico
      const { data: freeIntent, error: intentError } = await supabase
        .from('payment_intents')
        .insert({
          type: 'STUDENT_PACKAGE',
          provider: 'FREE',
          provider_id: `free_${Date.now()}_${user.userId}`,
          amount_cents: packageData.price_cents,
          status: 'PAID', // Já pago (grátis)
          checkout_url: null,
          payload_json: {
            package_id: packageData.id,
            package_title: packageData.title,
            classes_qty: packageData.classes_qty,
            payment_method: 'FREE',
            is_free: true,
            free_reason: 'Aula inaugural grátis'
          },
          actor_user_id: user.userId,
          franqueadora_id: franqueadoraId,
          unit_id: unit_id || null
        })
        .select()
        .single();

      if (intentError) {
        console.error('⚠️ Erro ao criar payment intent grátis (crédito já foi feito):', intentError);
        // Não falhar - o crédito já foi feito
      }

      console.log('✅ Pacote grátis creditado (aluno):', {
        userId: user.userId,
        classesQty: packageData.classes_qty,
        balance: balanceResult.balance,
        transactionId: balanceResult.transaction.id,
        intentId: freeIntent?.id
      });

      return res.status(201).json({
        message: 'Aula grátis creditada com sucesso!',
        payment_intent: freeIntent ? {
          id: freeIntent.id,
          type: freeIntent.type,
          status: freeIntent.status,
          checkout_url: null,
          created_at: freeIntent.created_at
        } : null,
        package: {
          title: packageData.title,
          classes_qty: packageData.classes_qty,
          price_cents: packageData.price_cents,
          franqueadora_id: franqueadoraId
        },
        balance: {
          total_purchased: balanceResult.balance.total_purchased,
          total_consumed: balanceResult.balance.total_consumed,
          locked_qty: balanceResult.balance.locked_qty,
          available: balanceResult.balance.total_purchased - balanceResult.balance.total_consumed - balanceResult.balance.locked_qty
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao processar pacote grátis:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar aula grátis',
        details: error.message 
      });
    }
  }

  // Fluxo normal para pacotes pagos
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
    payment_intent: serializePaymentIntent(paymentIntent),
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

  // Verificar se é pacote grátis (price_cents <= 1)
  const isFreePackage = packageData.price_cents <= 1;

  if (isFreePackage) {
    // Pacote grátis - creditar diretamente sem passar pelo Asaas
    console.log('🎁 Processando pacote grátis (professor):', {
      packageId: package_id,
      userId: user.userId,
      hoursQty: packageData.hours_qty,
      priceCents: packageData.price_cents
    });

    try {
      // 1. Creditar horas diretamente
      const balanceResult = await balanceService.purchaseProfessorHours(
        user.userId,
        franqueadoraId,
        packageData.hours_qty,
        {
          unitId: unit_id || null,
          source: 'PROFESSOR',
          metaJson: {
            package_id: packageData.id,
            package_title: packageData.title,
            is_free: true,
            free_reason: 'Horas grátis promocionais'
          }
        }
      );

      // 2. Criar payment_intent com status PAID para histórico
      const { data: freeIntent, error: intentError } = await supabase
        .from('payment_intents')
        .insert({
          type: 'PROF_HOURS',
          provider: 'FREE',
          provider_id: `free_${Date.now()}_${user.userId}`,
          amount_cents: packageData.price_cents,
          status: 'PAID', // Já pago (grátis)
          checkout_url: null,
          payload_json: {
            package_id: packageData.id,
            package_title: packageData.title,
            hours_qty: packageData.hours_qty,
            payment_method: 'FREE',
            is_free: true,
            free_reason: 'Horas grátis promocionais'
          },
          actor_user_id: user.userId,
          franqueadora_id: franqueadoraId,
          unit_id: unit_id || null
        })
        .select()
        .single();

      if (intentError) {
        console.error('⚠️ Erro ao criar payment intent grátis (crédito já foi feito):', intentError);
        // Não falhar - o crédito já foi feito
      }

      console.log('✅ Pacote grátis creditado (professor):', {
        userId: user.userId,
        hoursQty: packageData.hours_qty,
        balance: balanceResult.balance,
        transactionId: balanceResult.transaction.id,
        intentId: freeIntent?.id
      });

      return res.status(201).json({
        message: 'Horas grátis creditadas com sucesso!',
        payment_intent: freeIntent ? {
          id: freeIntent.id,
          type: freeIntent.type,
          status: freeIntent.status,
          checkout_url: null,
          created_at: freeIntent.created_at
        } : null,
        package: {
          title: packageData.title,
          hours_qty: packageData.hours_qty,
          price_cents: packageData.price_cents,
          franqueadora_id: franqueadoraId
        },
        balance: {
          available_hours: balanceResult.balance.available_hours,
          locked_hours: balanceResult.balance.locked_hours,
          total_available: balanceResult.balance.available_hours - balanceResult.balance.locked_hours
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao processar pacote grátis:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar horas grátis',
        details: error.message 
      });
    }
  }

  // Fluxo normal para pacotes pagos
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
    payment_intent: serializePaymentIntent(paymentIntent),
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

// Buscar payment intent pelo ID (para iframe de pagamento)
router.get('/payment-intent/:id', requireAuth, asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const { data: paymentIntent, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !paymentIntent) {
    return res.status(404).json({ error: 'Payment intent não encontrado' });
  }

  // Verificar se o usuário tem acesso a este payment intent
  if (paymentIntent.actor_user_id !== user.userId) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  res.json({
    payment_intent: serializePaymentIntent(paymentIntent)
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

// Histórico de pagamentos do usuário
router.get('/payment-history', requireAuth, extractPagination, asyncErrorHandler(async (req, res) => {
  const user = req.user;
  const { status } = req.query as { status?: string };
  const { limit, offset } = req.pagination;

  const result = await paymentIntentService.getPaymentIntentsByUser(user.userId, status, limit, offset);

  res.json({
    payment_intents: result.data.map(intent => serializePaymentIntent(intent)),
    total: result.total,
    limit,
    offset
  });
}));

// Deletar payment intents cancelados
router.delete('/payment-history/canceled', requireAuth, asyncErrorHandler(async (req, res) => {
  const user = req.user;

  const { error } = await supabase
    .from('payment_intents')
    .delete()
    .eq('actor_user_id', user.userId)
    .eq('status', 'CANCELED');

  if (error) {
    console.error('Erro ao deletar payment intents cancelados:', error);
    return res.status(500).json({ error: 'Erro ao deletar pagamentos cancelados' });
  }

  res.json({ message: 'Pagamentos cancelados removidos com sucesso' });
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
      .eq('status', 'active') // Filtrar apenas pacotes ativos
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

    // Validar preço: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    const priceValidation = validatePackagePrice(payload.price_cents);
    if (!priceValidation.valid) {
      return res.status(400).json({ error: priceValidation.error });
    }

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

    // Validar preço: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    const priceValidation = validatePackagePrice(payload.price_cents);
    if (!priceValidation.valid) {
      return res.status(400).json({ error: priceValidation.error });
    }

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
      .eq('status', 'active') // Filtrar apenas pacotes ativos
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

    // Validar preço: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    const priceValidation = validatePackagePrice(payload.price_cents);
    if (!priceValidation.valid) {
      return res.status(400).json({ error: priceValidation.error });
    }

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

    // Validar preço: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    const priceValidation = validatePackagePrice(payload.price_cents);
    if (!priceValidation.valid) {
      return res.status(400).json({ error: priceValidation.error });
    }

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

