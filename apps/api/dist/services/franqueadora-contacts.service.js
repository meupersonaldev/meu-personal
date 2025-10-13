"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDefaultFranqueadoraId = resolveDefaultFranqueadoraId;
exports.ensureFranqueadoraContact = ensureFranqueadoraContact;
exports.addAcademyToContact = addAcademyToContact;
exports.syncContactAcademies = syncContactAcademies;
const supabase_1 = require("../lib/supabase");
function isMissingContactsTable(error) {
    if (!error)
        return false;
    if (typeof error === 'string') {
        return error.includes('franqueadora_contacts');
    }
    if (error instanceof Error) {
        return error.message.includes('franqueadora_contacts');
    }
    const message = error?.message;
    return typeof message === 'string' && message.includes('franqueadora_contacts');
}
let cachedDefaultFranqueadoraId;
function normalizeRole(role) {
    return role.toUpperCase();
}
function sanitizeUuidArray(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string');
    }
    return [];
}
async function fetchDefaultFranqueadoraId() {
    if (cachedDefaultFranqueadoraId !== undefined) {
        return cachedDefaultFranqueadoraId;
    }
    const envId = process.env.DEFAULT_FRANQUEADORA_ID?.trim();
    if (envId) {
        cachedDefaultFranqueadoraId = envId;
        return envId;
    }
    const { data, error } = await supabase_1.supabase
        .from('franqueadora')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);
    if (error) {
        console.warn('Failed to resolve default franqueadora id:', error.message);
        cachedDefaultFranqueadoraId = null;
        return null;
    }
    const fallbackId = data?.[0]?.id ?? null;
    cachedDefaultFranqueadoraId = fallbackId ?? null;
    return fallbackId;
}
async function resolveDefaultFranqueadoraId() {
    return fetchDefaultFranqueadoraId();
}
async function ensureFranqueadoraContact(params) {
    const { userId, role, origin = 'SELF_REGISTRATION' } = params;
    const targetRole = normalizeRole(role);
    if (!['STUDENT', 'TEACHER'].includes(targetRole)) {
        return;
    }
    let existing = null;
    try {
        const response = await supabase_1.supabase
            .from('franqueadora_contacts')
            .select('id, franqueadora_id')
            .eq('user_id', userId)
            .limit(1);
        if (response.error) {
            if (isMissingContactsTable(response.error)) {
                console.warn('Tabela franqueadora_contacts ausente. Ignorando sincronização de contatos.');
                return;
            }
            throw new Error(`Erro ao verificar contato da franqueadora: ${response.error.message}`);
        }
        existing = response.data;
    }
    catch (error) {
        if (isMissingContactsTable(error)) {
            console.warn('Tabela franqueadora_contacts ausente. Ignorando sincronização de contatos.');
            return;
        }
        throw error;
    }
    const now = new Date().toISOString();
    const franqueadoraId = await fetchDefaultFranqueadoraId();
    if (existing && existing.length > 0) {
        const updatePayload = {
            role: targetRole,
            origin,
            updated_at: now,
        };
        if (!existing[0].franqueadora_id && franqueadoraId) {
            updatePayload.franqueadora_id = franqueadoraId;
        }
        try {
            const { error: updateError } = await supabase_1.supabase
                .from('franqueadora_contacts')
                .update(updatePayload)
                .eq('id', existing[0].id);
            if (updateError) {
                if (isMissingContactsTable(updateError)) {
                    console.warn('Tabela franqueadora_contacts ausente. Ignorando atualização de contato.');
                    return;
                }
                throw new Error(`Erro ao atualizar contato da franqueadora: ${updateError.message}`);
            }
        }
        catch (error) {
            if (isMissingContactsTable(error)) {
                console.warn('Tabela franqueadora_contacts ausente. Ignorando atualização de contato.');
                return;
            }
            throw error;
        }
        return;
    }
    const insertPayload = {
        user_id: userId,
        role: targetRole,
        origin,
        status: 'UNASSIGNED',
        assigned_academy_ids: [],
        created_at: now,
        updated_at: now,
    };
    if (franqueadoraId) {
        insertPayload.franqueadora_id = franqueadoraId;
    }
    try {
        const { error: insertError } = await supabase_1.supabase
            .from('franqueadora_contacts')
            .insert(insertPayload);
        if (insertError) {
            if (isMissingContactsTable(insertError)) {
                console.warn('Tabela franqueadora_contacts ausente. Ignorando criação de contato.');
                return;
            }
            throw new Error(`Erro ao criar contato da franqueadora: ${insertError.message}`);
        }
    }
    catch (error) {
        if (isMissingContactsTable(error)) {
            console.warn('Tabela franqueadora_contacts ausente. Ignorando criação de contato.');
            return;
        }
        throw error;
    }
}
async function addAcademyToContact(userId, academyId) {
    if (!userId || !academyId)
        return;
    const { data, error } = await supabase_1.supabase
        .from('franqueadora_contacts')
        .select('assigned_academy_ids')
        .eq('user_id', userId)
        .limit(1);
    if (error) {
        console.warn('Erro ao buscar contato para vincular academia:', error.message);
        return;
    }
    if (!data || data.length === 0) {
        return;
    }
    const assigned = new Set(sanitizeUuidArray(data[0].assigned_academy_ids));
    const normalizedAcademyId = academyId;
    if (!assigned.has(normalizedAcademyId)) {
        assigned.add(normalizedAcademyId);
        const payload = {
            assigned_academy_ids: Array.from(assigned),
            status: 'ASSIGNED',
            last_assignment_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const { error: updateError } = await supabase_1.supabase
            .from('franqueadora_contacts')
            .update(payload)
            .eq('user_id', userId);
        if (updateError) {
            console.warn('Erro ao atualizar academias do contato:', updateError.message);
        }
    }
}
async function syncContactAcademies(userId, academyIds) {
    const sanitizedIds = Array.from(new Set((academyIds || []).filter(Boolean)));
    const { data, error } = await supabase_1.supabase
        .from('franqueadora_contacts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
    if (error) {
        console.warn('Erro ao buscar contato para sincronizar academias:', error.message);
        return;
    }
    if (!data || data.length === 0) {
        return;
    }
    const payload = {
        assigned_academy_ids: sanitizedIds,
        updated_at: new Date().toISOString(),
    };
    if (sanitizedIds.length > 0) {
        payload.status = 'ASSIGNED';
        payload.last_assignment_at = new Date().toISOString();
    }
    else {
        payload.status = 'UNASSIGNED';
        payload.last_assignment_at = null;
    }
    const { error: updateError } = await supabase_1.supabase
        .from('franqueadora_contacts')
        .update(payload)
        .eq('user_id', userId);
    if (updateError) {
        console.warn('Erro ao sincronizar academias do contato:', updateError.message);
    }
}
//# sourceMappingURL=franqueadora-contacts.service.js.map