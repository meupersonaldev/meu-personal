import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole, requireFranqueadoraAdmin } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'

const router = Router()

// Helpers
const parseIntOr = (v: any, d: number) => {
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : d
}

const nowIso = () => new Date().toISOString()

function validatePolicyPayload(p: any) {
  const errors: string[] = []
  const nn = (k: string, min?: number, max?: number) => {
    const n = Number(p[k])
    if (!Number.isFinite(n)) { errors.push(`${k} inválido`); return }
    if (min != null && n < min) errors.push(`${k} deve ser ≥ ${min}`)
    if (max != null && n > max) errors.push(`${k} deve ser ≤ ${max}`)
  }
  nn('credits_per_class', 1)
  nn('class_duration_minutes', 15)
  nn('checkin_tolerance_minutes', 0, 180)
  nn('student_min_booking_notice_minutes', 0, 10080)
  nn('student_reschedule_min_notice_minutes', 0, 10080)
  nn('late_cancel_threshold_minutes', 0, 1440)
  nn('late_cancel_penalty_credits', 0)
  nn('no_show_penalty_credits', 0)
  nn('teacher_minutes_per_class', 0)
  nn('teacher_rest_minutes_between_classes', 0, 180)
  nn('teacher_max_daily_classes', 0, 48)
  nn('max_future_booking_days', 1, 365)
  nn('max_cancel_per_month', 0, 999)
  return errors
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
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'DRAFT_NOT_FOUND' })
    return res.json({ success: true, data })
  }

  const { data, error } = await q
    .eq('status', 'published')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'PUBLISHED_NOT_FOUND' })
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

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true, data })
}))

// PUT draft (upsert)
router.put('/', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const payload = req.body || {}
  const errors = validatePolicyPayload(payload)
  if (errors.length) return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors })

  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id

  // existe rascunho?
  const { data: draft, error: dErr } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle()

  if (dErr) return res.status(500).json({ error: dErr.message })

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
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, data })
  } else {
    // obter próxima versão sugerida
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
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ success: true, data })
  }
}))

// POST publish
router.post('/publish', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN']), requireFranqueadoraAdmin, asyncErrorHandler(async (req, res) => {
  const franqueadora_id = req.franqueadoraAdmin!.franqueadora_id
  const effective_from = req.body?.effective_from || nowIso()

  // localizar draft
  const { data: draft, error: dErr } = await supabase
    .from('franchisor_policies')
    .select('*')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'draft')
    .limit(1)
    .single()

  if (dErr || !draft) return res.status(404).json({ error: 'DRAFT_NOT_FOUND' })

  // validar novamente
  const errors = validatePolicyPayload(draft)
  if (errors.length) return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors })

  // próxima versão
  const { data: lastPub } = await supabase
    .from('franchisor_policies')
    .select('version')
    .eq('franqueadora_id', franqueadora_id)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (lastPub?.version || 0) + 1

  // inserir publicado
  const publishPayload = {
    ...draft,
    id: undefined,
    status: 'published',
    version: nextVersion,
    effective_from,
    created_at: nowIso(),
    updated_at: nowIso()
  }

  const { data, error } = await supabase
    .from('franchisor_policies')
    .insert(publishPayload)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ success: true, data })
}))

export default router
