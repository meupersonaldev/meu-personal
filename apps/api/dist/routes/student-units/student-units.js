"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentUnits = getStudentUnits;
exports.getAvailableUnits = getAvailableUnits;
exports.activateStudentUnit = activateStudentUnit;
exports.getStudentActiveUnit = getStudentActiveUnit;
exports.joinUnit = joinUnit;
const supabase_1 = require("../../lib/supabase");
async function getStudentUnits(req, res) {
    try {
        const { userId } = req.user;
        const { data: studentUnits, error } = await supabase_1.supabase
            .from('student_units')
            .select(`
        *,
        unit:units(*)
      `)
            .eq('student_id', userId)
            .order('is_active', { ascending: false })
            .order('last_booking_date', { ascending: false });
        if (error) {
            console.error('Error fetching student units:', error);
            return res.status(500).json({ error: 'Erro ao buscar unidades do aluno' });
        }
        const transformedUnits = studentUnits?.map(su => ({
            ...su,
            unit: su.unit
        })) || [];
        res.json(transformedUnits);
    }
    catch (error) {
        console.error('Error in getStudentUnits:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
async function getAvailableUnits(req, res) {
    try {
        const { userId } = req.user;
        const { data: studentUnitIds } = await supabase_1.supabase
            .from('student_units')
            .select('unit_id')
            .eq('student_id', userId);
        const existingUnitIds = studentUnitIds?.map(su => su.unit_id) || [];
        const { data: availableUnits, error } = await supabase_1.supabase
            .from('units')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) {
            console.error('Error fetching available units:', error);
            return res.status(500).json({ error: 'Erro ao buscar unidades disponíveis' });
        }
        const filteredUnits = availableUnits?.filter(unit => !existingUnitIds.includes(unit.id)) || [];
        res.json(filteredUnits);
    }
    catch (error) {
        console.error('Error in getAvailableUnits:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
async function activateStudentUnit(req, res) {
    try {
        const { userId } = req.user;
        const { unitId } = req.params;
        const { data: unit, error: unitError } = await supabase_1.supabase
            .from('units')
            .select('*')
            .eq('id', unitId)
            .eq('is_active', true)
            .single();
        if (unitError || !unit) {
            return res.status(404).json({ error: 'Unidade não encontrada ou inativa' });
        }
        const { data: existingAssociation, error: associationError } = await supabase_1.supabase
            .from('student_units')
            .select('*')
            .eq('student_id', userId)
            .eq('unit_id', unitId)
            .single();
        if (associationError && associationError.code !== 'PGRST116') {
            console.error('Error checking student unit association:', associationError);
            return res.status(500).json({ error: 'Erro ao verificar associação com unidade' });
        }
        if (!existingAssociation) {
            const { error: insertError } = await supabase_1.supabase
                .from('student_units')
                .insert({
                student_id: userId,
                unit_id: unitId,
                is_active: true
            });
            if (insertError) {
                console.error('Error creating student unit association:', insertError);
                return res.status(500).json({ error: 'Erro ao criar associação com unidade' });
            }
        }
        else {
            const { error: updateError } = await supabase_1.supabase
                .from('student_units')
                .update({
                is_active: true,
                updated_at: new Date().toISOString()
            })
                .eq('student_id', userId)
                .eq('unit_id', unitId);
            if (updateError) {
                console.error('Error activating student unit:', updateError);
                return res.status(500).json({ error: 'Erro ao ativar unidade' });
            }
        }
        const { data: updatedUnits, error: fetchError } = await supabase_1.supabase
            .from('student_units')
            .select(`
        *,
        unit:units(*)
      `)
            .eq('student_id', userId)
            .order('is_active', { ascending: false });
        if (fetchError) {
            console.error('Error fetching updated units:', fetchError);
            return res.status(500).json({ error: 'Erro ao buscar unidades atualizadas' });
        }
        const transformedUnits = updatedUnits?.map(su => ({
            ...su,
            unit: su.unit
        })) || [];
        res.json({
            message: 'Unidade ativada com sucesso',
            units: transformedUnits,
            activeUnit: transformedUnits.find(u => u.is_active)
        });
    }
    catch (error) {
        console.error('Error in activateStudentUnit:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
async function getStudentActiveUnit(req, res) {
    try {
        const { userId } = req.user;
        const { data: activeUnit, error } = await supabase_1.supabase
            .from('student_units')
            .select(`
        *,
        unit:units(*)
      `)
            .eq('student_id', userId)
            .eq('is_active', true)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({ activeUnit: null });
            }
            console.error('Error fetching active unit:', error);
            return res.status(500).json({ error: 'Erro ao buscar unidade ativa' });
        }
        const transformedUnit = {
            ...activeUnit,
            unit: activeUnit.unit
        };
        res.json({ activeUnit: transformedUnit });
    }
    catch (error) {
        console.error('Error in getStudentActiveUnit:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
async function joinUnit(req, res) {
    try {
        const { userId } = req.user;
        const { unitId } = req.body;
        const { data: unit, error: unitError } = await supabase_1.supabase
            .from('units')
            .select('*')
            .eq('id', unitId)
            .eq('is_active', true)
            .single();
        if (unitError || !unit) {
            return res.status(404).json({ error: 'Unidade não encontrada ou inativa' });
        }
        const { data: existingAssociation } = await supabase_1.supabase
            .from('student_units')
            .select('*')
            .eq('student_id', userId)
            .eq('unit_id', unitId)
            .single();
        if (existingAssociation) {
            return res.status(400).json({ error: 'Já está associado a esta unidade' });
        }
        const { data: newAssociation, error: insertError } = await supabase_1.supabase
            .from('student_units')
            .insert({
            student_id: userId,
            unit_id: unitId,
            is_active: false
        })
            .select(`
        *,
        unit:units(*)
      `)
            .single();
        if (insertError) {
            console.error('Error joining unit:', insertError);
            return res.status(500).json({ error: 'Erro ao se associar à unidade' });
        }
        const transformedUnit = {
            ...newAssociation,
            unit: newAssociation.unit
        };
        res.json({
            message: 'Associado à unidade com sucesso',
            unit: transformedUnit
        });
    }
    catch (error) {
        console.error('Error in joinUnit:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
//# sourceMappingURL=student-units.js.map