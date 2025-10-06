import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { balanceService } from '../services/balance.service';
import { paymentIntentService } from '../services/payment-intent.service';
import { supabase } from '../config/supabase';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { extractPagination } from '../middleware/pagination';

const router = Router();

// GET /api/packages/student - Catálogo de pacotes de aluno
router.get('/student', requireAuth, requireRole(['STUDENT', 'FRANQUIA', 'FRANQUEADORA']), asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  // Verificar se o usuário tem acesso à unidade
  if (user.role === 'STUDENT') {
    // Aluno só pode ver pacotes da sua unidade através de academy_students -> units
    const { data: userAcademies } = await supabase
      .from('academy_students')
      .select('academy_id')
      .eq('student_id', user.userId)
      .eq('academy_id', unit_id);

    if (!userAcademies || userAcademies.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
    }
  }

  const { data, error } = await supabase
    .from('student_packages')
    .select('*')
    .eq('unit_id', unit_id)
    .eq('status', 'active')
    .order('price_cents', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ packages: data });
}));

// GET /api/packages/professor - Catálogo de pacotes de horas para professores
router.get('/professor', requireAuth, requireRole(['TEACHER', 'FRANQUIA', 'FRANQUEADORA']), asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  // Verificar se o usuário tem acesso à unidade
  if (user.role === 'TEACHER') {
    const { data: userUnits } = await supabase
      .from('teacher_units')
      .select('unit_id')
      .eq('teacher_id', user.userId)
      .eq('unit_id', unit_id);
    
    if (!userUnits || userUnits.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' });
    }
  }

  const { data, error } = await supabase
    .from('hour_packages')
    .select('*')
    .eq('unit_id', unit_id)
    .eq('status', 'active')
    .order('price_cents', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ packages: data });
}));

// POST /api/packages/student/checkout - Checkout de pacote de aluno
router.post('/student/checkout', requireAuth, requireRole(['STUDENT', 'ALUNO']), asyncErrorHandler(async (req, res) => {
  try {
    const schema = z.object({
      package_id: z.string().uuid(),
      unit_id: z.string().uuid(),
      payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
    });

    const { package_id, unit_id, payment_method } = schema.parse(req.body);
    const user = req.user;

    // Verificar se o pacote existe e está ativo
    const { data: packageData, error: packageError } = await supabase
      .from('student_packages')
      .select('*')
      .eq('id', package_id)
      .eq('unit_id', unit_id)
      .eq('status', 'active')
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    // Criar PaymentIntent com integração Asaas
    const paymentIntent = await paymentIntentService.createPaymentIntent({
      type: 'STUDENT_PACKAGE',
      actorUserId: user!.userId,
      unitId: unit_id,
      amountCents: packageData.price_cents,
      metadata: {
        package_id: packageData.id,
        package_title: packageData.title,
        classes_qty: packageData.classes_qty,
        payment_method
      }
    });

    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      payment_intent: {
        id: paymentIntent.id,
        type: paymentIntent.type,
        amount_cents: paymentIntent.amount_cents,
        status: paymentIntent.status,
        checkout_url: paymentIntent.checkout_url,
        created_at: paymentIntent.created_at
      },
      package: {
        title: packageData.title,
        classes_qty: packageData.classes_qty,
        price_cents: packageData.price_cents
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    console.error('Erro ao criar checkout de aluno:', error);
    res.status(500).json({ error: error.message });
  }
}));

// POST /api/packages/professor/checkout - Checkout de pacote de horas para professor
router.post('/professor/checkout', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  try {
    const schema = z.object({
      package_id: z.string().uuid(),
      unit_id: z.string().uuid(),
      payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).default('PIX')
    });

    const { package_id, unit_id, payment_method } = schema.parse(req.body);
    const user = req.user;

    // Verificar se o pacote existe e está ativo
    const { data: packageData, error: packageError } = await supabase
      .from('hour_packages')
      .select('*')
      .eq('id', package_id)
      .eq('unit_id', unit_id)
      .eq('status', 'active')
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    // Criar PaymentIntent com integração Asaas
    const paymentIntent = await paymentIntentService.createPaymentIntent({
      type: 'PROF_HOURS',
      actorUserId: user!.userId,
      unitId: unit_id,
      amountCents: packageData.price_cents,
      metadata: {
        package_id: packageData.id,
        package_title: packageData.title,
        hours_qty: packageData.hours_qty,
        payment_method
      }
    });

    res.status(201).json({
      message: 'Pagamento criado com sucesso',
      payment_intent: {
        id: paymentIntent.id,
        type: paymentIntent.type,
        amount_cents: paymentIntent.amount_cents,
        status: paymentIntent.status,
        checkout_url: paymentIntent.checkout_url,
        created_at: paymentIntent.created_at
      },
      package: {
        title: packageData.title,
        hours_qty: packageData.hours_qty,
        price_cents: packageData.price_cents
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors
      });
    }

    console.error('Erro ao criar checkout de professor:', error);
    res.status(500).json({ error: error.message });
  }
}));

// GET /api/packages/student/balance - Saldo de aulas do aluno
router.get('/student/balance', requireAuth, requireRole(['STUDENT', 'ALUNO']), asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  try {
    const balance = await balanceService.getStudentBalance(user.userId, unit_id as string);
    
    // Calcular aulas disponíveis
    const availableClasses = balance.total_purchased - balance.total_consumed - balance.locked_qty;
    
    res.json({
      balance: {
        ...balance,
        available_classes: Math.max(0, availableClasses)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

// GET /api/packages/professor/balance - Saldo de horas do professor
router.get('/professor/balance', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  try {
    const balance = await balanceService.getProfessorBalance(user.userId, unit_id as string);
    
    // Calcular horas disponíveis
    const availableHours = balance.available_hours - balance.locked_hours;
    
    res.json({
      balance: {
        ...balance,
        available_hours: Math.max(0, availableHours)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

// GET /api/packages/student/transactions - Histórico de transações do aluno
router.get('/student/transactions', requireAuth, requireRole(['STUDENT', 'ALUNO']), extractPagination, asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const { limit, offset } = req.pagination;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  const { data, error, count } = await supabase
    .from('student_class_tx')
    .select('*', { count: 'exact' })
    .eq('student_id', user.userId)
    .eq('unit_id', unit_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.set('X-Total-Count', count?.toString() || '0');
  res.json({ transactions: data });
}));

// GET /api/packages/professor/transactions - Histórico de transações do professor
router.get('/professor/transactions', requireAuth, requireRole(['TEACHER', 'PROFESSOR']), extractPagination, asyncErrorHandler(async (req, res) => {
  const { unit_id } = req.query;
  const { limit, offset } = req.pagination;
  const user = req.user;

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' });
  }

  const { data, error, count } = await supabase
    .from('hour_tx')
    .select('*', { count: 'exact' })
    .eq('professor_id', user.userId)
    .eq('unit_id', unit_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.set('X-Total-Count', count?.toString() || '0');
  res.json({ transactions: data });
}));

export default router;