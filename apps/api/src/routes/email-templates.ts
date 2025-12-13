/**
 * Email Templates API Routes
 * 
 * Provides CRUD operations for email template management.
 * Only accessible by franqueadora admins (SUPER_ADMIN role).
 * 
 * Routes:
 * - GET /api/email-templates - List all templates
 * - GET /api/email-templates/:slug - Get single template
 * - PUT /api/email-templates/:slug - Update template
 * - POST /api/email-templates/:slug/reset - Reset to default
 * - GET /api/email-templates/:slug/preview - Get rendered preview
 */

import { Router } from 'express'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'
import { emailTemplateService } from '../services/email-template.service'

const router = Router()

/**
 * GET /api/email-templates
 * List all email templates (custom + defaults merged)
 * Requirements: 1.1, 1.2
 */
router.get('/',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const templates = await emailTemplateService.getAllTemplates()
    
    return res.json({
      success: true,
      data: templates
    })
  })
)

/**
 * GET /api/email-templates/:slug
 * Get single template by slug with variables list
 * Requirements: 4.1, 4.2
 */
router.get('/:slug',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { slug } = req.params

    // Validate slug
    if (!emailTemplateService.isValidSlug(slug)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SLUG',
        message: 'Slug inválido'
      })
    }

    const template = await emailTemplateService.getTemplate(slug)
    
    return res.json({
      success: true,
      data: template
    })
  })
)

/**
 * PUT /api/email-templates/:slug
 * Update template content
 * Requirements: 2.1, 2.3, 2.4
 */
router.put('/:slug',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { slug } = req.params
    const { title, content, buttonText, buttonUrl } = req.body

    // Validate slug
    if (!emailTemplateService.isValidSlug(slug)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SLUG',
        message: 'Slug inválido'
      })
    }

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Título é obrigatório'
      })
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Conteúdo é obrigatório'
      })
    }

    const updatedTemplate = await emailTemplateService.updateTemplate(
      slug,
      { title, content, buttonText, buttonUrl },
      req.user?.userId
    )
    
    return res.json({
      success: true,
      data: updatedTemplate
    })
  })
)

/**
 * POST /api/email-templates/:slug/reset
 * Reset template to default values
 * Requirements: 5.2
 */
router.post('/:slug/reset',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { slug } = req.params

    // Validate slug
    if (!emailTemplateService.isValidSlug(slug)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SLUG',
        message: 'Slug inválido'
      })
    }

    const template = await emailTemplateService.resetTemplate(slug)
    
    return res.json({
      success: true,
      data: template
    })
  })
)

/**
 * GET /api/email-templates/:slug/preview
 * Get rendered preview with example values
 * Requirements: 3.1, 3.2, 3.3
 */
router.get('/:slug/preview',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  requireFranqueadoraAdmin,
  asyncErrorHandler(async (req, res) => {
    const { slug } = req.params
    const { title, content, buttonText, buttonUrl } = req.query

    // Validate slug
    if (!emailTemplateService.isValidSlug(slug)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SLUG',
        message: 'Slug inválido'
      })
    }

    // Build custom content from query params if provided
    const customContent = (title || content || buttonText || buttonUrl) ? {
      title: title as string | undefined,
      content: content as string | undefined,
      buttonText: buttonText as string | undefined,
      buttonUrl: buttonUrl as string | undefined
    } : undefined

    const preview = await emailTemplateService.getPreview(slug, customContent)
    
    return res.json({
      success: true,
      data: {
        html: preview
      }
    })
  })
)

export default router
