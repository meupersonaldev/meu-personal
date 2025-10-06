import { supabase } from '../config/supabase'

let cachedDefaultFranqueadoraId: string | null | undefined

function normalizeRole(role: string) {
  return role.toUpperCase()
}

function sanitizeUuidArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string')
  }
  return []
}

async function fetchDefaultFranqueadoraId(): Promise<string | null> {
  if (cachedDefaultFranqueadoraId !== undefined) {
    return cachedDefaultFranqueadoraId
  }

  const envId = process.env.DEFAULT_FRANQUEADORA_ID?.trim()
  if (envId) {
    cachedDefaultFranqueadoraId = envId
    return envId
  }

  const { data, error } = await supabase
    .from('franqueadora')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    console.warn('Failed to resolve default franqueadora id:', error.message)
    cachedDefaultFranqueadoraId = null
    return null
  }

  const fallbackId = data?.[0]?.id ?? null
  cachedDefaultFranqueadoraId = fallbackId ?? null
  return fallbackId
}

export async function resolveDefaultFranqueadoraId() {
  return fetchDefaultFranqueadoraId()
}

export async function ensureFranqueadoraContact(params: {
  userId: string
  role: string
  origin?: string
}) {
  const { userId, role, origin = 'SELF_REGISTRATION' } = params

  const targetRole = normalizeRole(role)
  if (!['STUDENT', 'TEACHER'].includes(targetRole)) {
    // Apenas armazenamos alunos e professores neste momento
    return
  }

  const { data: existing, error: fetchError } = await supabase
    .from('franqueadora_contacts')
    .select('id, franqueadora_id')
    .eq('user_id', userId)
    .limit(1)

  if (fetchError) {
    throw new Error(`Erro ao verificar contato da franqueadora: ${fetchError.message}`)
  }

  const now = new Date().toISOString()
  const franqueadoraId = await fetchDefaultFranqueadoraId()

  if (existing && existing.length > 0) {
    const updatePayload: Record<string, any> = {
      role: targetRole,
      origin,
      updated_at: now,
    }

    if (!existing[0].franqueadora_id && franqueadoraId) {
      updatePayload.franqueadora_id = franqueadoraId
    }

    const { error: updateError } = await supabase
      .from('franqueadora_contacts')
      .update(updatePayload)
      .eq('id', existing[0].id)

    if (updateError) {
      throw new Error(`Erro ao atualizar contato da franqueadora: ${updateError.message}`)
    }

    return
  }

  const insertPayload: Record<string, any> = {
    user_id: userId,
    role: targetRole,
    origin,
    status: 'UNASSIGNED',
    assigned_academy_ids: [],
    created_at: now,
    updated_at: now,
  }

  if (franqueadoraId) {
    insertPayload.franqueadora_id = franqueadoraId
  }

  const { error: insertError } = await supabase
    .from('franqueadora_contacts')
    .insert(insertPayload)

  if (insertError) {
    throw new Error(`Erro ao criar contato da franqueadora: ${insertError.message}`)
  }
}

export async function addAcademyToContact(userId: string, academyId: string) {
  if (!userId || !academyId) return

  const { data, error } = await supabase
    .from('franqueadora_contacts')
    .select('assigned_academy_ids')
    .eq('user_id', userId)
    .limit(1)

  if (error) {
    console.warn('Erro ao buscar contato para vincular academia:', error.message)
    return
  }

  if (!data || data.length === 0) {
    return
  }

  const assigned = new Set(sanitizeUuidArray(data[0].assigned_academy_ids))
  const normalizedAcademyId = academyId

  if (!assigned.has(normalizedAcademyId)) {
    assigned.add(normalizedAcademyId)

    const payload = {
      assigned_academy_ids: Array.from(assigned),
      status: 'ASSIGNED',
      last_assignment_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('franqueadora_contacts')
      .update(payload)
      .eq('user_id', userId)

    if (updateError) {
      console.warn('Erro ao atualizar academias do contato:', updateError.message)
    }
  }
}

export async function syncContactAcademies(userId: string, academyIds: string[]) {
  const sanitizedIds = Array.from(new Set((academyIds || []).filter(Boolean)))

  const { data, error } = await supabase
    .from('franqueadora_contacts')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (error) {
    console.warn('Erro ao buscar contato para sincronizar academias:', error.message)
    return
  }

  if (!data || data.length === 0) {
    return
  }

  const payload: Record<string, any> = {
    assigned_academy_ids: sanitizedIds,
    updated_at: new Date().toISOString(),
  }

  if (sanitizedIds.length > 0) {
    payload.status = 'ASSIGNED'
    payload.last_assignment_at = new Date().toISOString()
  } else {
    payload.status = 'UNASSIGNED'
    payload.last_assignment_at = null
  }

  const { error: updateError } = await supabase
    .from('franqueadora_contacts')
    .update(payload)
    .eq('user_id', userId)

  if (updateError) {
    console.warn('Erro ao sincronizar academias do contato:', updateError.message)
  }
}
