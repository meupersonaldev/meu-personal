/**
 * Email Logs API Routes
 * 
 * Provides endpoints for viewing email history and receiving webhooks.
 * 
 * Routes:
 * - GET /api/email-logs - List email logs with filters
 * - GET /api/email-logs/stats - Get email statistics
 * - GET /api/email-logs/:id - Get single email log
 * - POST /api/email-logs/webhook/resend - Resend webhook endpoint
 */

import { Router } from 'express'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'
import { emailUnifiedService, EmailStatus } from '../services/email-unified.service'

const router = Router()

/**
 * GET /api/email-logs
 * List email logs with filtering and pagination
 */
router.get('/',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const {
      page = '1',
      limit = '20',
      status,
      templateSlug,
      recipientEmail,
      startDate,
      endDate
    } = req.query

    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id

    const result = await emailUnifiedService.getEmailLogs({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      status: status as EmailStatus | undefined,
      templateSlug: templateSlug as string | undefined,
      recipientEmail: recipientEmail as string | undefined,
      franqueadoraId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    })

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10))
      }
    })
  })
)

/**
 * GET /api/email-logs/stats
 * Get email statistics
 */
router.get('/stats',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { startDate, endDate } = req.query
    const franqueadoraId = req.franqueadoraAdmin?.franqueadora_id

    const stats = await emailUnifiedService.getEmailStats({
      franqueadoraId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    })

    const providerInfo = emailUnifiedService.getActiveProvider()

    return res.json({
      success: true,
      data: {
        ...stats,
        provider: providerInfo.provider,
        providerConfigured: providerInfo.configured
      }
    })
  })
)

/**
 * GET /api/email-logs/:id
 * Get single email log by ID
 */
router.get('/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params

    const log = await emailUnifiedService.getEmailLogById(id)

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Log de email não encontrado'
      })
    }

    return res.json({
      success: true,
      data: log
    })
  })
)

/**
 * POST /api/email-logs/webhook/resend
 * Resend webhook endpoint for delivery status updates
 * 
 * This endpoint should be configured in Resend dashboard:
 * https://resend.com/webhooks
 */
router.post('/webhook/resend',
  asyncErrorHandler(async (req, res) => {
    // Verify webhook signature (optional but recommended)
    const signature = req.headers['svix-signature']
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      // TODO: Implement signature verification
      // For now, we'll process all webhooks
      console.log('[EMAIL-LOGS] Webhook signature present, verification not implemented yet')
    }

    const event = req.body

    console.log('[EMAIL-LOGS] Received Resend webhook:', event.type)

    try {
      await emailUnifiedService.processResendWebhook(event)
      return res.json({ received: true })
    } catch (error: any) {
      console.error('[EMAIL-LOGS] Webhook processing error:', error.message)
      // Still return 200 to prevent Resend from retrying
      return res.json({ received: true, error: error.message })
    }
  })
)

export default router
