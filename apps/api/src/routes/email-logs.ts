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
 * DELETE /api/email-logs/:id
 * Delete a single email log
 */
router.delete('/:id',
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

    const deleted = await emailUnifiedService.deleteEmailLog(id)

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'DELETE_FAILED',
        message: 'Erro ao deletar log de email'
      })
    }

    return res.json({
      success: true,
      message: 'Log deletado com sucesso'
    })
  })
)

/**
 * DELETE /api/email-logs/bulk
 * Delete multiple email logs by IDs
 */
router.delete('/bulk',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IDS',
        message: 'Lista de IDs inválida'
      })
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'TOO_MANY_IDS',
        message: 'Máximo de 100 logs por vez'
      })
    }

    const result = await emailUnifiedService.deleteEmailLogs(ids)

    return res.json({
      success: true,
      deleted: result.deleted,
      failed: result.failed,
      message: `${result.deleted} log(s) deletado(s)`
    })
  })
)

/**
 * POST /api/email-logs/webhook/resend
 * Resend webhook endpoint for delivery status updates
 * 
 * Configure in Resend dashboard: https://resend.com/webhooks
 * Webhook URL: https://your-api-domain.com/api/email-logs/webhook/resend
 * 
 * Events to subscribe:
 * - email.sent
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 * - email.delivery_delayed
 * 
 * Environment variables needed:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_WEBHOOK_SECRET: (optional) Webhook signing secret for verification
 * - RESEND_FROM_EMAIL: Verified sender email (e.g., noreply@yourdomain.com)
 * - RESEND_FROM_NAME: Sender name (e.g., "Meu Personal")
 */
router.post('/webhook/resend',
  asyncErrorHandler(async (req, res) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const svixId = req.headers['svix-id'] as string
      const svixTimestamp = req.headers['svix-timestamp'] as string
      const svixSignature = req.headers['svix-signature'] as string
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[EMAIL-LOGS] Missing Svix headers for webhook verification')
        // Continue processing but log warning
      } else {
        // Verify timestamp is recent (within 5 minutes)
        const timestamp = parseInt(svixTimestamp, 10)
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - timestamp) > 300) {
          console.warn('[EMAIL-LOGS] Webhook timestamp too old, possible replay attack')
          return res.status(400).json({ error: 'Timestamp too old' })
        }
        
        // TODO: Full signature verification with crypto
        // For production, implement HMAC-SHA256 verification
        console.log('[EMAIL-LOGS] Webhook headers present, timestamp valid')
      }
    }

    const event = req.body

    if (!event || !event.type) {
      console.warn('[EMAIL-LOGS] Invalid webhook payload')
      return res.status(400).json({ error: 'Invalid payload' })
    }

    console.log('[EMAIL-LOGS] Received Resend webhook:', event.type, event.data?.email_id || '')

    try {
      await emailUnifiedService.processResendWebhook(event)
      return res.json({ received: true })
    } catch (error: any) {
      console.error('[EMAIL-LOGS] Webhook processing error:', error.message)
      // Return 200 to prevent Resend from retrying failed webhooks
      return res.json({ received: true, error: error.message })
    }
  })
)

/**
 * GET /api/email-logs/provider/status
 * Check email provider configuration status
 */
router.get('/provider/status',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  asyncErrorHandler(async (req, res) => {
    const providerInfo = emailUnifiedService.getActiveProvider()
    
    const resendConfigured = !!process.env.RESEND_API_KEY
    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    )
    
    return res.json({
      success: true,
      data: {
        activeProvider: providerInfo.provider,
        configured: providerInfo.configured,
        providers: {
          resend: {
            configured: resendConfigured,
            features: ['delivery_tracking', 'open_tracking', 'click_tracking', 'bounce_detection', 'spam_complaints'],
            webhookUrl: resendConfigured ? `${process.env.API_URL || 'https://api.meupersonalfranquia.com.br'}/api/email-logs/webhook/resend` : null
          },
          smtp: {
            configured: smtpConfigured,
            features: ['basic_sending'],
            note: 'SMTP não suporta rastreamento de abertura/clique'
          }
        }
      }
    })
  })
)

export default router
