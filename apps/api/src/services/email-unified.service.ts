/**
 * Unified Email Service
 * 
 * Supports both SMTP (Gmail) and Resend providers.
 * Automatically logs all emails to the database.
 * Ready for Resend webhooks when configured.
 */

import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { supabase } from '../lib/supabase'

// Types
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'
export type EmailProvider = 'smtp' | 'resend'

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  templateSlug?: string
  recipientId?: string
  franchiseId?: string
  franqueadoraId?: string
  triggeredBy?: string
  metadata?: Record<string, any>
}

export interface EmailLog {
  id: string
  recipient_email: string
  recipient_name?: string
  recipient_id?: string
  subject: string
  template_slug?: string
  provider: EmailProvider
  provider_message_id?: string
  status: EmailStatus
  status_updated_at?: string
  error_message?: string
  webhook_events: any[]
  metadata: Record<string, any>
  created_at: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  franchise_id?: string
  franqueadora_id?: string
  triggered_by?: string
}

// Determine which provider to use
function getProvider(): EmailProvider {
  // Prefer Resend if configured
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  return 'smtp'
}

// Check if SMTP is configured
function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

// Check if Resend is configured
function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}


// Create email log entry
async function createEmailLog(params: SendEmailParams, provider: EmailProvider): Promise<string> {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      recipient_email: params.to,
      recipient_name: params.toName || null,
      recipient_id: params.recipientId || null,
      subject: params.subject,
      template_slug: params.templateSlug || null,
      provider,
      status: 'pending',
      metadata: params.metadata || {},
      franchise_id: params.franchiseId || null,
      franqueadora_id: params.franqueadoraId || null,
      triggered_by: params.triggeredBy || null
    })
    .select('id')
    .single()

  if (error) {
    console.error('[EMAIL-UNIFIED] Error creating email log:', error)
    throw new Error('Erro ao registrar email no log')
  }

  return data.id
}

// Update email log status
async function updateEmailLog(
  logId: string, 
  status: EmailStatus, 
  extra?: { 
    providerMessageId?: string
    errorMessage?: string
    sentAt?: string
    deliveredAt?: string
    openedAt?: string
    clickedAt?: string
  }
): Promise<void> {
  const updateData: any = {
    status,
    status_updated_at: new Date().toISOString()
  }

  if (extra?.providerMessageId) updateData.provider_message_id = extra.providerMessageId
  if (extra?.errorMessage) updateData.error_message = extra.errorMessage
  if (extra?.sentAt) updateData.sent_at = extra.sentAt
  if (extra?.deliveredAt) updateData.delivered_at = extra.deliveredAt
  if (extra?.openedAt) updateData.opened_at = extra.openedAt
  if (extra?.clickedAt) updateData.clicked_at = extra.clickedAt

  const { error } = await supabase
    .from('email_logs')
    .update(updateData)
    .eq('id', logId)

  if (error) {
    console.error('[EMAIL-UNIFIED] Error updating email log:', error)
  }
}

// Send via SMTP (Gmail)
async function sendViaSMTP(params: SendEmailParams, logId: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT!, 10),
    secure: parseInt(process.env.SMTP_PORT!, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  try {
    const info = await transporter.sendMail({
      from: `"Meu Personal" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
    })

    console.log('[EMAIL-UNIFIED] SMTP email sent:', info.messageId)
    
    await updateEmailLog(logId, 'sent', {
      providerMessageId: info.messageId,
      sentAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[EMAIL-UNIFIED] SMTP error:', error.message)
    await updateEmailLog(logId, 'failed', {
      errorMessage: error.message
    })
    throw error
  }
}

// Send via Resend
async function sendViaResend(params: SendEmailParams, logId: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  // Get from email from env or use default
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@meupersonalfranquia.com.br'
  const fromName = process.env.RESEND_FROM_NAME || 'Meu Personal'

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
    })

    if (error) {
      throw new Error(error.message)
    }

    console.log('[EMAIL-UNIFIED] Resend email sent:', data?.id)
    
    await updateEmailLog(logId, 'sent', {
      providerMessageId: data?.id,
      sentAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[EMAIL-UNIFIED] Resend error:', error.message)
    await updateEmailLog(logId, 'failed', {
      errorMessage: error.message
    })
    throw error
  }
}


// Main export
export const emailUnifiedService = {
  /**
   * Send an email using the configured provider (SMTP or Resend)
   * Automatically logs the email to the database
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; logId: string; provider: EmailProvider }> {
    const provider = getProvider()
    
    console.log(`[EMAIL-UNIFIED] Sending email via ${provider} to ${params.to}`)
    console.log(`[EMAIL-UNIFIED] Subject: ${params.subject}`)
    if (params.templateSlug) {
      console.log(`[EMAIL-UNIFIED] Template: ${params.templateSlug}`)
    }

    // Check if provider is configured
    if (provider === 'smtp' && !isSmtpConfigured()) {
      console.warn('[EMAIL-UNIFIED] SMTP not configured. Email will be logged but not sent.')
      
      // In development, log the email content
      if (process.env.NODE_ENV !== 'production') {
        console.log('--- EMAIL SIMULADO ---')
        console.log(`Para: ${params.to}`)
        console.log(`Assunto: ${params.subject}`)
        console.log('----------------------')
      }
      
      // Still create log entry with failed status
      const logId = await createEmailLog(params, provider)
      await updateEmailLog(logId, 'failed', {
        errorMessage: 'SMTP não configurado'
      })
      
      return { success: false, logId, provider }
    }

    if (provider === 'resend' && !isResendConfigured()) {
      console.warn('[EMAIL-UNIFIED] Resend not configured, falling back to SMTP')
      
      if (!isSmtpConfigured()) {
        const logId = await createEmailLog(params, 'smtp')
        await updateEmailLog(logId, 'failed', {
          errorMessage: 'Nenhum provedor de email configurado'
        })
        return { success: false, logId, provider: 'smtp' }
      }
      
      // Fallback to SMTP
      const logId = await createEmailLog(params, 'smtp')
      await sendViaSMTP(params, logId)
      return { success: true, logId, provider: 'smtp' }
    }

    // Create log entry
    const logId = await createEmailLog(params, provider)

    try {
      // Send via appropriate provider
      if (provider === 'resend') {
        await sendViaResend(params, logId)
      } else {
        await sendViaSMTP(params, logId)
      }

      return { success: true, logId, provider }
    } catch (error: any) {
      // Log is already updated with error in the send functions
      return { success: false, logId, provider }
    }
  },

  /**
   * Process Resend webhook event
   * Updates email log with delivery status
   */
  async processResendWebhook(event: any): Promise<void> {
    const messageId = event.data?.email_id
    if (!messageId) {
      console.warn('[EMAIL-UNIFIED] Webhook event missing email_id')
      return
    }

    // Find the email log by provider_message_id
    const { data: log, error } = await supabase
      .from('email_logs')
      .select('id, webhook_events')
      .eq('provider_message_id', messageId)
      .single()

    if (error || !log) {
      console.warn('[EMAIL-UNIFIED] Email log not found for message:', messageId)
      return
    }

    // Append webhook event to history
    const webhookEvents = [...(log.webhook_events || []), {
      type: event.type,
      timestamp: event.created_at || new Date().toISOString(),
      data: event.data
    }]

    // Map Resend event types to our status
    const statusMap: Record<string, EmailStatus> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'sent' // Keep as sent, just delayed
    }

    const newStatus = statusMap[event.type]
    if (!newStatus) {
      console.log('[EMAIL-UNIFIED] Unknown webhook event type:', event.type)
      return
    }

    // Build update data
    const updateData: any = {
      status: newStatus,
      status_updated_at: new Date().toISOString(),
      webhook_events: webhookEvents
    }

    // Set specific timestamps
    if (event.type === 'email.delivered') {
      updateData.delivered_at = event.created_at || new Date().toISOString()
    } else if (event.type === 'email.opened') {
      updateData.opened_at = event.created_at || new Date().toISOString()
    } else if (event.type === 'email.clicked') {
      updateData.clicked_at = event.created_at || new Date().toISOString()
    }

    await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', log.id)

    console.log(`[EMAIL-UNIFIED] Webhook processed: ${event.type} for ${messageId}`)
  },

  /**
   * Get email logs with filtering and pagination
   */
  async getEmailLogs(options: {
    page?: number
    limit?: number
    status?: EmailStatus
    templateSlug?: string
    recipientEmail?: string
    franchiseId?: string
    franqueadoraId?: string
    startDate?: string
    endDate?: string
  }): Promise<{ logs: EmailLog[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      templateSlug,
      recipientEmail,
      franchiseId,
      franqueadoraId,
      startDate,
      endDate
    } = options

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (templateSlug) query = query.eq('template_slug', templateSlug)
    if (recipientEmail) query = query.ilike('recipient_email', `%${recipientEmail}%`)
    if (franchiseId) query = query.eq('franchise_id', franchiseId)
    if (franqueadoraId) query = query.eq('franqueadora_id', franqueadoraId)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[EMAIL-UNIFIED] Error fetching email logs:', error)
      throw new Error('Erro ao buscar histórico de emails')
    }

    return {
      logs: data || [],
      total: count || 0
    }
  },

  /**
   * Get email log by ID
   */
  async getEmailLogById(id: string): Promise<EmailLog | null> {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return null
    }

    return data
  },

  /**
   * Get email statistics
   */
  async getEmailStats(options: {
    franchiseId?: string
    franqueadoraId?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    total: number
    sent: number
    delivered: number
    opened: number
    failed: number
    bounced: number
  }> {
    let query = supabase
      .from('email_logs')
      .select('status', { count: 'exact' })

    if (options.franchiseId) query = query.eq('franchise_id', options.franchiseId)
    if (options.franqueadoraId) query = query.eq('franqueadora_id', options.franqueadoraId)
    if (options.startDate) query = query.gte('created_at', options.startDate)
    if (options.endDate) query = query.lte('created_at', options.endDate)

    const { data, error } = await query

    if (error) {
      console.error('[EMAIL-UNIFIED] Error fetching email stats:', error)
      return { total: 0, sent: 0, delivered: 0, opened: 0, failed: 0, bounced: 0 }
    }

    const stats = {
      total: data?.length || 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
      bounced: 0
    }

    data?.forEach((log: any) => {
      if (log.status === 'sent') stats.sent++
      else if (log.status === 'delivered') stats.delivered++
      else if (log.status === 'opened' || log.status === 'clicked') stats.opened++
      else if (log.status === 'failed') stats.failed++
      else if (log.status === 'bounced' || log.status === 'complained') stats.bounced++
    })

    return stats
  },

  /**
   * Check which provider is currently active
   */
  getActiveProvider(): { provider: EmailProvider; configured: boolean } {
    const provider = getProvider()
    const configured = provider === 'resend' ? isResendConfigured() : isSmtpConfigured()
    return { provider, configured }
  },

  /**
   * Delete a single email log by ID
   */
  async deleteEmailLog(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('email_logs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[EMAIL-UNIFIED] Error deleting email log:', error)
      return false
    }

    return true
  },

  /**
   * Delete multiple email logs by IDs
   */
  async deleteEmailLogs(ids: string[]): Promise<{ deleted: number; failed: number }> {
    const { error, count } = await supabase
      .from('email_logs')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('[EMAIL-UNIFIED] Error deleting email logs:', error)
      return { deleted: 0, failed: ids.length }
    }

    return { deleted: count || ids.length, failed: 0 }
  },

  /**
   * Delete all email logs (with optional filters)
   */
  async deleteAllEmailLogs(options?: {
    status?: EmailStatus
    olderThan?: string // ISO date string
  }): Promise<number> {
    let query = supabase.from('email_logs').delete()

    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.olderThan) {
      query = query.lt('created_at', options.olderThan)
    }

    // Se não houver filtros, exigir pelo menos um para evitar delete acidental de tudo
    if (!options?.status && !options?.olderThan) {
      throw new Error('Pelo menos um filtro é necessário para deletar logs em massa')
    }

    const { error, count } = await query

    if (error) {
      console.error('[EMAIL-UNIFIED] Error deleting all email logs:', error)
      throw new Error('Erro ao deletar logs de email')
    }

    return count || 0
  }
}
