import express from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { invoiceService } from '../services/invoice.service';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { supabase } from '../lib/supabase';

const router = express.Router();

/**
 * GET /api/invoices/sales-without-invoice
 * Listar vendas pagas que ainda não têm nota fiscal
 */
router.get(
  '/sales-without-invoice',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']),
  asyncErrorHandler(async (req, res) => {
    const {
      franqueadora_id,
      unit_id,
      start_date,
      end_date,
      limit = '50',
      offset = '0',
    } = req.query;

    const result = await invoiceService.getSalesWithoutInvoice({
      franqueadoraId: franqueadora_id as string | undefined,
      unitId: unit_id as string | undefined,
      startDate: start_date as string | undefined,
      endDate: end_date as string | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      sales: result.sales,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  })
);

/**
 * GET /api/invoices
 * Listar todas as notas fiscais com filtros
 */
router.get(
  '/',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']),
  asyncErrorHandler(async (req, res) => {
    const {
      payment_intent_id,
      status,
      start_date,
      end_date,
      limit = '50',
      offset = '0',
    } = req.query;

    const result = await invoiceService.listInvoices({
      paymentIntentId: payment_intent_id as string | undefined,
      status: status as string | undefined,
      startDate: start_date as string | undefined,
      endDate: end_date as string | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      invoices: result.invoices,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  })
);

/**
 * GET /api/invoices/:id
 * Buscar detalhes de uma nota fiscal específica
 */
router.get(
  '/:id',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        payment_intent:payment_intents (
          *,
          user:users!payment_intents_actor_user_id_fkey (
            id,
            name,
            email,
            cpf,
            phone
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }

    res.json({ invoice });
  })
);

/**
 * POST /api/invoices
 * Criar invoice para um payment intent (não emite ainda)
 */
const createInvoiceSchema = z.object({
  payment_intent_id: z.string().uuid(),
  type: z.enum(['NFE', 'NFC_E']).optional(),
  service_code: z.string().optional(),
});

router.post(
  '/',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']),
  asyncErrorHandler(async (req, res) => {
    const data = createInvoiceSchema.parse(req.body);

    const invoice = await invoiceService.getOrCreateInvoice({
      paymentIntentId: data.payment_intent_id,
      type: data.type,
      serviceCode: data.service_code,
    });

    res.status(201).json({ invoice });
  })
);

/**
 * POST /api/invoices/:id/issue
 * Emitir nota fiscal
 */
router.post(
  '/:id/issue',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    const invoice = await invoiceService.issueInvoice(id);

    res.json({
      message: 'Nota fiscal emitida com sucesso',
      invoice,
    });
  })
);

/**
 * POST /api/invoices/:id/cancel
 * Cancelar nota fiscal
 */
router.post(
  '/:id/cancel',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    const invoice = await invoiceService.cancelInvoice(id);

    res.json({
      message: 'Nota fiscal cancelada com sucesso',
      invoice,
    });
  })
);

/**
 * POST /api/invoices/batch-issue
 * Emitir notas fiscais em lote
 */
const batchIssueSchema = z.object({
  payment_intent_ids: z.array(z.string().uuid()).min(1).max(100),
  type: z.enum(['NFE', 'NFC_E']).optional(),
  service_code: z.string().optional(),
});

router.post(
  '/batch-issue',
  requireAuth,
  requireRole(['FRANQUEADORA', 'SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const data = batchIssueSchema.parse(req.body);

    const results = [];
    const errors = [];

    for (const paymentIntentId of data.payment_intent_ids) {
      try {
        // Criar invoice se não existir
        const invoice = await invoiceService.getOrCreateInvoice({
          paymentIntentId,
          type: data.type,
          serviceCode: data.service_code,
        });

        // Emitir nota fiscal
        const issuedInvoice = await invoiceService.issueInvoice(invoice.id);

        results.push({
          payment_intent_id: paymentIntentId,
          invoice_id: issuedInvoice.id,
          status: 'success',
          nfe_key: issuedInvoice.nfe_key,
        });
      } catch (error: any) {
        errors.push({
          payment_intent_id: paymentIntentId,
          status: 'error',
          error: error.message || 'Erro desconhecido',
        });
      }
    }

    res.json({
      message: `Processamento concluído: ${results.length} sucesso, ${errors.length} erros`,
      results,
      errors,
    });
  })
);

export default router;

