import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'
import { emailUnifiedService } from '../services/email-unified.service'
import { replaceVariables } from '../services/email-template.service'
import { getHtmlEmailTemplate } from '../services/email-templates'
import { ERROR_MESSAGES } from '../lib/error-messages'

const router = Router()

// Helper para enviar email usando template do banco
async function sendEmail(params: {
  to: string
  templateSlug: string
  data: Record<string, any>
  franqueadoraId?: string
}): Promise<void> {
  try {
    // Buscar template do banco
    const { data: template } = await supabase
      .from('email_templates')
      .select('title, content, button_text, button_url')
      .eq('slug', params.templateSlug)
      .single()

    if (!template) {
      console.warn(`[POLICY-EMAIL] Template ${params.templateSlug} não encontrado`)
      return
    }

    // Substituir variáveis
    const title = replaceVariables(template.title, params.data)
    const content = replaceVariables(template.content, params.data)
    const buttonUrl = template.button_url ? replaceVariables(template.button_url, params.data) : undefined

    // Gerar HTML completo
    const html = getHtmlEmailTemplate(title, content, buttonUrl, template.button_text)

    // Enviar email
    await emailUnifiedService.sendEmail({
      to: params.to,
      subject: title,
      html,
      templateSlug: params.templateSlug,
      franqueadoraId: params.franqueadoraId
    })
  } catch (err) {
    console.error(`[POLICY-EMAIL] Erro ao enviar email:`, err)
  }
}

// Helpers
const parseIntOr = (v: any, d: number) => {
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : d
}

const nowIso = () => new Date().toISOString()

// Campos de política com labels e limites para validação
const POLICY_FIELDS: Record<string, { min?: number; max?: number; label: string }> = {
  credits_per_class: { min: 1, label: 'Créditos por aula' },
  class_duration_minutes: { min: 15, label: 'Duração da aula (min)' },
  checkin_tolerance_minutes: { min: 0, max: 180, label: 'Tolerância check-in (min)' },
  student_min_booking_notice_minutes: { min: 0, max: 10080, label: 'Antecedência p/ agendar (min)' },
  student_reschedule_min_notice_minutes: { min: 0, max: 10080, label: 'Antecedência p/ reagendar (min)' },
  late_cancel_threshold_minutes: { min: 0, max: 1440, label: 'Janela late cancel (min)' },
  late_cancel_penalty_credits: { min: 0, label: 'Penalidade late cancel' },
  no_show_penalty_credits: { min: 0, label: 'Penalidade no-show' },
  teacher_minutes_per_class: { min: 0, label: 'Minutos por aula (prof)' },
  teacher_rest_minutes_between_classes: { min: 0, max: 180, label: 'Descanso entre aulas (min)' },
  teacher_max_daily_classes: { min: 0, max: 48, label: 'Máx aulas/dia' },
  max_future_booking_days: { min: 1, max: 365, label: 'Dias p/ agendar' },
  max_cancel_per_month: { min: 0, max: 999, label: 'Limite cancelamentos/mês' }
}

function validatePolicyPayload(p: any) {
  const errors: string[] = []
  for (const [k, config] of Object.entries(POLICY_FIELDS)) {
    const n = Number(p[k])
    if (!Number.isFinite(n)) { errors.push(`${k} inválido`); continue }
    if (config.min != null && n < config.min) errors.push(`${config.label} deve ser ≥ ${config.min}`)
    if (config.max != null && n > config.max) errors.push(`${config.label} deve ser ≤ ${config.max}`)
  }
  return errors
}

// Valida se um valor de override está dentro dos limites
function validateOverrideValue(field: string, value: number): { valid: boolean; error?: string } {
  const config = POLICY_FIELDS[field]
  if (!config) return { valid: false, error: `Campo desconhecido: ${field}` }
  if (config.min != null && value < config.min) {
    return { valid: false, error: `${config.label} deve ser ≥ ${config.min}` }
  }
  if (config.max != null && value > config.max) {
    return { valid: false, error: `${config.label} deve ser ≤ ${config.max}` }
  }
  return { valid: true }
}

// GET vigente ou por status
router.get('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const status = (req.query.status as string) || 'published'
  let q = supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', req.franqueadoraAdmin!.franqueadora_id)

  if (status === 'draft') {
    const { data, error } = await q.eq('status', 'draft').limit(1).single()
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })
    if (!data) return res.status(404).json({ error: ERROR_MESSAGES.DRAFT_NOT_FOUND })
    return res.json({ success: true, data })
  }

  const { data, error } = await q
    .eq('status', 'published')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })
  if (!data) return res.status(404).json({ error: ERROR_MESSAGES.PUBLISHED_NOT_FOUND })
  return res.json({ success: true, data })
}))

// GET history
router.get('/history', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const limit = parseIntOr(req.query.limit, 10)
  const { data, error } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', req.franqueadoraAdmin!.franqueadora_id)
    .eq('status', 'published')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })
  return res.json({ success: true, data })
}))

// GET /validate-conflicts - Verifica conflitos de overrides com a política
router.get('/validate-conflicts', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id
  const useDraft = req.query.use_draft === 'true'

  // Buscar política (draft ou publicada)
  let policy: any = null
  if (useDraft) {
    const { data } = await supabase
      .from('franchisor_policies')
      .select('*')
      .eq('franqueadora_id', franqueadora_id)
      .eq('status', 'draft')
      .limit(1)
      .maybeSingle()
    policy = data
  }
  
  if (!policy) {
    const { data } = await supabase
      .from('franchisor_policies')
      .select('*')
      .eq('franqueadora_id', franqueadora_id)
      .eq('status', 'published')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    policy = data
  }

  if (!policy) {
    return res.json({ success: true, conflicts: [], academiesChecked: 0, academiesWithOverrides: 0 })
  }

  // Buscar academias da franqueadora
  const { data: academies } = await supabase
    .from('academies')
    .select('id, name')
    .eq('franqueadora_id', franqueadora_id)
    .eq('is_active', true)

  if (!academies || academies.length === 0) {
    return res.json({ success: true, conflicts: [], academiesChecked: 0, academiesWithOverrides: 0 })
  }

  // Buscar overrides de todas as academias
  const { data: overrides } = await supabase
    .from('academy_policy_overrides')
    .select('academy_id, overrides')
    .in('academy_id', academies.map(a => a.id))

  const conflicts: Array<{
    academyId: string
    academyName: string
    field: string
    fieldLabel: string
    currentValue: number
    policyMin?: number
    policyMax?: number
    error: string
  }> = []

  for (const override of (overrides || [])) {
    const academy = academies.find(a => a.id === override.academy_id)
    if (!academy || !override.overrides) continue

    for (const [field, value] of Object.entries(override.overrides as Record<string, number>)) {
      const validation = validateOverrideValue(field, value)
      if (!validation.valid) {
        const config = POLICY_FIELDS[field]
        conflicts.push({
          academyId: academy.id,
          academyName: academy.name,
          field,
          fieldLabel: config?.label || field,
          currentValue: value,
          policyMin: config?.min,
          policyMax: config?.max,
          error: validation.error || 'Valor inválido'
        })
      }
    }
  }

  return res.json({
    success: true,
    conflicts,
    academiesChecked: academies.length,
    academiesWithOverrides: overrides?.length || 0
  })
}))

// PUT draft (upsert)
router.put('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const payload = req.body || {}
  const errors = validatePolicyPayload(payload)
  if (errors.length) return res.status(400).json({ error: ERROR_MESSAGES.VALIDATION_ERROR, details: errors })

  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id

  // existe rascunho?
  const { data: draft, error: dErr } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle()

  if (dErr) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })

  const base = {
    franqueadora_id,
    status: 'draft',
    ...payload,
    updated_at: nowIso()
  }

  if (draft) {
    const { data, error } = await supabase
      .from('franchisor_policies')
      .update(base)
      .eq('id', draft.id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })
    return res.json({ success: true, data })
  } else {
    const { data: lastPub } = await supabase
      .from('franchisor_policies')
      .select('version')
      .eq('franqueadora_id', franqueadora_id)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = (lastPub?.version || 0) + 1
    const { data, error } = await supabase
      .from('franchisor_policies')
      .insert({ ...base, version: nextVersion, created_at: nowIso() })
      .select()
      .single()
    if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })
    return res.status(201).json({ success: true, data })
  }
}))

// POST publish
router.post('/publish', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id
  const effective_from = req.body?.effective_from || nowIso()
  const notify_franchises = req.body?.notify_franchises !== false // default true

  // localizar draft
  const { data: draft, error: dErr } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'draft')
    .limit(1)
    .single()

  if (dErr || !draft) return res.status(404).json({ error: ERROR_MESSAGES.DRAFT_NOT_FOUND })

  const errors = validatePolicyPayload(draft)
  if (errors.length) return res.status(400).json({ error: ERROR_MESSAGES.VALIDATION_ERROR, details: errors })

  // Buscar política anterior para comparação
  const { data: previousPolicy } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (previousPolicy?.version || 0) + 1

  const publishPayload = {
    ...draft,
    id: undefined,
    status: 'published',
    version: nextVersion,
    effective_from,
    published_by: req.user?.id,
    created_at: nowIso(),
    updated_at: nowIso()
  }

  const { data, error } = await supabase
    .from('franchisor_policies')
    .insert(publishPayload)
    .select()
    .single()

  if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })

  // Notificar franquias se solicitado
  let notificationsSent = 0
  if (notify_franchises) {
    try {
      // Buscar franqueadora
      const { data: franqueadora } = await supabase
        .from('franqueadoras')
        .select('name')
        .eq('id', franqueadora_id)
        .single()

      // Buscar academias ativas com email
      const { data: academies } = await supabase
        .from('academies')
        .select('id, name, email')
        .eq('franqueadora_id', franqueadora_id)
        .eq('is_active', true)
        .not('email', 'is', null)

      // Calcular campos alterados
      const changedFields: Array<{ field: string; label: string; oldValue: number; newValue: number }> = []
      if (previousPolicy) {
        for (const [field, config] of Object.entries(POLICY_FIELDS)) {
          const oldVal = (previousPolicy as any)[field]
          const newVal = (data as any)[field]
          if (oldVal !== newVal) {
            changedFields.push({
              field,
              label: config.label,
              oldValue: oldVal,
              newValue: newVal
            })
          }
        }
      }

      // Enviar emails em batch
      for (const academy of (academies || [])) {
        if (!academy.email) continue
        try {
          await sendEmail({
            to: academy.email,
            templateSlug: 'policy-published',
            data: {
              academyName: academy.name,
              franqueadoraName: franqueadora?.name || 'Franqueadora',
              version: nextVersion,
              effectiveFrom: new Date(effective_from).toLocaleDateString('pt-BR'),
              changedFields,
              hasChanges: changedFields.length > 0,
              dashboardUrl: `${process.env.FRONTEND_URL || 'https://app.meupersonal.com'}/franquia/dashboard`
            },
            franqueadoraId: franqueadora_id
          })
          notificationsSent++
        } catch (emailErr) {
          console.error(`Erro ao enviar email para ${academy.email}:`, emailErr)
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar franquias:', notifyErr)
    }
  }

  return res.status(201).json({ 
    success: true, 
    data,
    notificationsSent,
    notificationsRequested: notify_franchises
  })
}))

// POST rollback - Reverter para versão anterior
router.post('/rollback', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id
  const { target_version, comment, notify_franchises } = req.body || {}

  if (!target_version || typeof target_version !== 'number') {
    return res.status(400).json({ error: 'Versão alvo é obrigatória' })
  }

  // Buscar versão alvo
  const { data: targetPolicy, error: tErr } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'published')
    .eq('version', target_version)
    .single()

  if (tErr || !targetPolicy) {
    return res.status(404).json({ error: ERROR_MESSAGES.VERSION_NOT_FOUND })
  }

  // Buscar versão atual
  const { data: currentPolicy } = await supabase
    .from('franchisor_policies')
    .select('version')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!currentPolicy) {
    return res.status(404).json({ error: ERROR_MESSAGES.PUBLISHED_NOT_FOUND })
  }

  if (currentPolicy.version === target_version) {
    return res.status(400).json({ error: ERROR_MESSAGES.ROLLBACK_SAME_VERSION })
  }

  const nextVersion = currentPolicy.version + 1

  // Criar nova versão com valores da versão alvo
  const rollbackPayload = {
    franqueadora_id,
    status: 'published',
    version: nextVersion,
    effective_from: nowIso(),
    credits_per_class: targetPolicy.credits_per_class,
    class_duration_minutes: targetPolicy.class_duration_minutes,
    checkin_tolerance_minutes: targetPolicy.checkin_tolerance_minutes,
    student_min_booking_notice_minutes: targetPolicy.student_min_booking_notice_minutes,
    student_reschedule_min_notice_minutes: targetPolicy.student_reschedule_min_notice_minutes,
    late_cancel_threshold_minutes: targetPolicy.late_cancel_threshold_minutes,
    late_cancel_penalty_credits: targetPolicy.late_cancel_penalty_credits,
    no_show_penalty_credits: targetPolicy.no_show_penalty_credits,
    teacher_minutes_per_class: targetPolicy.teacher_minutes_per_class,
    teacher_rest_minutes_between_classes: targetPolicy.teacher_rest_minutes_between_classes,
    teacher_max_daily_classes: targetPolicy.teacher_max_daily_classes,
    max_future_booking_days: targetPolicy.max_future_booking_days,
    max_cancel_per_month: targetPolicy.max_cancel_per_month,
    comment: targetPolicy.comment,
    is_rollback: true,
    rollback_from_version: currentPolicy.version,
    rollback_to_version: target_version,
    rollback_comment: comment || null,
    published_by: req.user?.id,
    created_at: nowIso(),
    updated_at: nowIso()
  }

  const { data, error } = await supabase
    .from('franchisor_policies')
    .insert(rollbackPayload)
    .select()
    .single()

  if (error) return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR })

  // Notificar franquias se solicitado
  let notificationsSent = 0
  if (notify_franchises) {
    try {
      const { data: franqueadora } = await supabase
        .from('franqueadoras')
        .select('name')
        .eq('id', franqueadora_id)
        .single()

      const { data: academies } = await supabase
        .from('academies')
        .select('id, name, email')
        .eq('franqueadora_id', franqueadora_id)
        .eq('is_active', true)
        .not('email', 'is', null)

      for (const academy of (academies || [])) {
        if (!academy.email) continue
        try {
          await sendEmail({
            to: academy.email,
            templateSlug: 'policy-rollback',
            data: {
              academyName: academy.name,
              franqueadoraName: franqueadora?.name || 'Franqueadora',
              newVersion: nextVersion,
              rolledBackTo: target_version,
              comment: comment || 'Sem comentário',
              dashboardUrl: `${process.env.FRONTEND_URL || 'https://app.meupersonal.com'}/franquia/dashboard`
            },
            franqueadoraId: franqueadora_id
          })
          notificationsSent++
        } catch (emailErr) {
          console.error(`Erro ao enviar email para ${academy.email}:`, emailErr)
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar franquias:', notifyErr)
    }
  }

  return res.status(201).json({
    success: true,
    data,
    rolledBackFrom: currentPolicy.version,
    rolledBackTo: target_version,
    notificationsSent
  })
}))

export default router
