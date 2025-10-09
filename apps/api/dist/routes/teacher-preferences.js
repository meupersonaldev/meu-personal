"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../config/supabase");
const franqueadora_contacts_service_1 = require("../services/franqueadora-contacts.service");
const router = (0, express_1.Router)();
router.get('/:teacherId/preferences', async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('teacher_preferences')
            .select('*')
            .eq('teacher_id', teacherId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        res.json(data || { academy_ids: [], bio: '' });
    }
    catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: error.message });
    }
});
router.put('/:teacherId/preferences', async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { academy_ids, bio } = req.body;
        console.log('Atualizando preferências do professor:', teacherId);
        console.log('Academias selecionadas:', academy_ids);
        const { data: oldPreferences } = await supabase_1.supabase
            .from('teacher_preferences')
            .select('academy_ids')
            .eq('teacher_id', teacherId)
            .single();
        const oldAcademyIds = oldPreferences?.academy_ids || [];
        const newAcademyIds = academy_ids || [];
        const { data: existing } = await supabase_1.supabase
            .from('teacher_preferences')
            .select('id')
            .eq('teacher_id', teacherId)
            .single();
        if (existing) {
            const { data, error } = await supabase_1.supabase
                .from('teacher_preferences')
                .update({
                academy_ids,
                bio,
                updated_at: new Date().toISOString()
            })
                .eq('teacher_id', teacherId)
                .select()
                .single();
            if (error)
                throw error;
        }
        else {
            const { data, error } = await supabase_1.supabase
                .from('teacher_preferences')
                .insert({
                teacher_id: teacherId,
                academy_ids,
                bio
            })
                .select()
                .single();
            if (error)
                throw error;
        }
        const academiesToAdd = newAcademyIds.filter((id) => !oldAcademyIds.includes(id));
        for (const academyId of academiesToAdd) {
            console.log(`Criando vínculo: professor ${teacherId} → academia ${academyId}`);
            const { data: existingLink } = await supabase_1.supabase
                .from('academy_teachers')
                .select('id, status')
                .eq('teacher_id', teacherId)
                .eq('academy_id', academyId)
                .single();
            if (existingLink) {
                if (existingLink.status !== 'active') {
                    await supabase_1.supabase
                        .from('academy_teachers')
                        .update({
                        status: 'active',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', existingLink.id);
                    console.log(`✅ Vínculo academy_teachers reativado: ${existingLink.id}`);
                }
            }
            else {
                const { data: newLink, error: linkError } = await supabase_1.supabase
                    .from('academy_teachers')
                    .insert({
                    teacher_id: teacherId,
                    academy_id: academyId,
                    status: 'active',
                    commission_rate: 70.00
                })
                    .select()
                    .single();
                if (linkError) {
                    console.error('Erro ao criar vínculo academy_teachers:', linkError);
                }
                else {
                    console.log(`✅ Novo vínculo academy_teachers criado: ${newLink.id}`);
                }
            }
            const { data: unit } = await supabase_1.supabase
                .from('units')
                .select('id')
                .eq('academy_legacy_id', academyId)
                .eq('is_active', true)
                .single();
            if (unit) {
                const { data: existingProfessorUnit } = await supabase_1.supabase
                    .from('professor_units')
                    .select('id, active')
                    .eq('professor_id', teacherId)
                    .eq('unit_id', unit.id)
                    .single();
                if (existingProfessorUnit) {
                    if (!existingProfessorUnit.active) {
                        await supabase_1.supabase
                            .from('professor_units')
                            .update({
                            active: true,
                            last_association_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                            .eq('id', existingProfessorUnit.id);
                        console.log(`✅ Vínculo professor_units reativado: ${existingProfessorUnit.id}`);
                    }
                }
                else {
                    const { data: newProfessorUnit, error: professorUnitError } = await supabase_1.supabase
                        .from('professor_units')
                        .insert({
                        professor_id: teacherId,
                        unit_id: unit.id,
                        active: true,
                        commission_rate: 70.00,
                        first_association_at: new Date().toISOString(),
                        last_association_at: new Date().toISOString()
                    })
                        .select()
                        .single();
                    if (professorUnitError) {
                        console.error('Erro ao criar vínculo professor_units:', professorUnitError);
                    }
                    else {
                        console.log(`✅ Novo vínculo professor_units criado: ${newProfessorUnit.id}`);
                    }
                }
            }
            else {
                console.warn(`⚠️ Unit não encontrada para academy_id: ${academyId}`);
            }
        }
        const academiesToRemove = oldAcademyIds.filter((id) => !newAcademyIds.includes(id));
        for (const academyId of academiesToRemove) {
            console.log(`Desativando vínculo: professor ${teacherId} → academia ${academyId}`);
            await supabase_1.supabase
                .from('academy_teachers')
                .update({
                status: 'inactive',
                updated_at: new Date().toISOString()
            })
                .eq('teacher_id', teacherId)
                .eq('academy_id', academyId);
            const { data: unit } = await supabase_1.supabase
                .from('units')
                .select('id')
                .eq('academy_legacy_id', academyId)
                .eq('is_active', true)
                .single();
            if (unit) {
                await supabase_1.supabase
                    .from('professor_units')
                    .update({
                    active: false,
                    updated_at: new Date().toISOString()
                })
                    .eq('professor_id', teacherId)
                    .eq('unit_id', unit.id);
                console.log(`✅ Vínculo professor_units desativado: professor ${teacherId} → unit ${unit.id}`);
            }
        }
        try {
            await (0, franqueadora_contacts_service_1.syncContactAcademies)(teacherId, newAcademyIds);
        }
        catch (syncError) {
            console.warn('Erro ao sincronizar contato da franqueadora para professor:', syncError);
        }
        res.json({
            message: 'Preferências atualizadas com sucesso',
            vinculosAdicionados: academiesToAdd.length,
            vinculosRemovidos: academiesToRemove.length
        });
    }
    catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:teacherId/hours', async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('users')
            .select('credits')
            .eq('id', teacherId)
            .single();
        if (error)
            throw error;
        res.json({ available_hours: data.credits || 0 });
    }
    catch (error) {
        console.error('Error fetching hours:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=teacher-preferences.js.map