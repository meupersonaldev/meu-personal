import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

// Cliente Supabase unificado importado de ../../lib/supabase

export interface Unit {
  id: string
  name: string
  slug: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  is_active: boolean
  capacity_per_slot: number
  opening_hours_json: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface StudentUnit {
  id: string
  student_id: string
  unit_id: string
  unit: Unit
  is_active: boolean
  first_booking_date?: string
  last_booking_date?: string
  total_bookings: number
  created_at: string
  updated_at: string
}

// Get student's units with active status
export async function getStudentUnits(req: Request, res: Response) {
  try {
    const { userId } = req.user

    const { data: studentUnits, error } = await supabase
      .from('student_units')
      .select(`
        *,
        unit:units(*)
      `)
      .eq('student_id', userId)
      .order('is_active', { ascending: false })
      .order('last_booking_date', { ascending: false })

    if (error) {
      console.error('Error fetching student units:', error)
      return res.status(500).json({ error: 'Erro ao buscar unidades do aluno' })
    }

    // Transform the data to match our interfaces
    const transformedUnits: StudentUnit[] = studentUnits?.map(su => ({
      ...su,
      unit: su.unit as Unit
    })) || []

    res.json(transformedUnits)
  } catch (error) {
    console.error('Error in getStudentUnits:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Get available units for student to join
export async function getAvailableUnits(req: Request, res: Response) {
  try {
    const { userId } = req.user

    // Get units that student is not already associated with
    const { data: studentUnitIds } = await supabase
      .from('student_units')
      .select('unit_id')
      .eq('student_id', userId)

    const existingUnitIds = studentUnitIds?.map(su => su.unit_id) || []

    const { data: availableUnits, error } = await supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching available units:', error)
      return res.status(500).json({ error: 'Erro ao buscar unidades disponíveis' })
    }

    // Filter out units student is already associated with
    const filteredUnits = availableUnits?.filter(
      unit => !existingUnitIds.includes(unit.id)
    ) || []

    res.json(filteredUnits)
  } catch (error) {
    console.error('Error in getAvailableUnits:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Activate a unit for student
export async function activateStudentUnit(req: Request, res: Response) {
  try {
    const { userId } = req.user
    const { unitId } = req.params

    // Validate unit exists and is active
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('*')
      .eq('id', unitId)
      .eq('is_active', true)
      .single()

    if (unitError || !unit) {
      return res.status(404).json({ error: 'Unidade não encontrada ou inativa' })
    }

    // Check if student has association with this unit
    const { data: existingAssociation, error: associationError } = await supabase
      .from('student_units')
      .select('*')
      .eq('student_id', userId)
      .eq('unit_id', unitId)
      .single()

    if (associationError && associationError.code !== 'PGRST116') {
      console.error('Error checking student unit association:', associationError)
      return res.status(500).json({ error: 'Erro ao verificar associação com unidade' })
    }

    // If no association exists, create one
    if (!existingAssociation) {
      const { error: insertError } = await supabase
        .from('student_units')
        .insert({
          student_id: userId,
          unit_id: unitId,
          is_active: true
        })

      if (insertError) {
        console.error('Error creating student unit association:', insertError)
        return res.status(500).json({ error: 'Erro ao criar associação com unidade' })
      }
    } else {
      // If association exists, just activate it
      const { error: updateError } = await supabase
        .from('student_units')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', userId)
        .eq('unit_id', unitId)

      if (updateError) {
        console.error('Error activating student unit:', updateError)
        return res.status(500).json({ error: 'Erro ao ativar unidade' })
      }
    }

    // Get updated student units
    const { data: updatedUnits, error: fetchError } = await supabase
      .from('student_units')
      .select(`
        *,
        unit:units(*)
      `)
      .eq('student_id', userId)
      .order('is_active', { ascending: false })

    if (fetchError) {
      console.error('Error fetching updated units:', fetchError)
      return res.status(500).json({ error: 'Erro ao buscar unidades atualizadas' })
    }

    const transformedUnits: StudentUnit[] = updatedUnits?.map(su => ({
      ...su,
      unit: su.unit as Unit
    })) || []

    res.json({
      message: 'Unidade ativada com sucesso',
      units: transformedUnits,
      activeUnit: transformedUnits.find(u => u.is_active)
    })
  } catch (error) {
    console.error('Error in activateStudentUnit:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Get student's active unit
export async function getStudentActiveUnit(req: Request, res: Response) {
  try {
    const { userId } = req.user

    const { data: activeUnit, error } = await supabase
      .from('student_units')
      .select(`
        *,
        unit:units(*)
      `)
      .eq('student_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No active unit found
        return res.json({ activeUnit: null })
      }
      console.error('Error fetching active unit:', error)
      return res.status(500).json({ error: 'Erro ao buscar unidade ativa' })
    }

    const transformedUnit: StudentUnit = {
      ...activeUnit,
      unit: activeUnit.unit as Unit
    }

    res.json({ activeUnit: transformedUnit })
  } catch (error) {
    console.error('Error in getStudentActiveUnit:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Join a new unit
export async function joinUnit(req: Request, res: Response) {
  try {
    const { userId } = req.user
    const { unitId } = req.body

    // Validate unit exists and is active
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('*')
      .eq('id', unitId)
      .eq('is_active', true)
      .single()

    if (unitError || !unit) {
      return res.status(404).json({ error: 'Unidade não encontrada ou inativa' })
    }

    // Check if already associated
    const { data: existingAssociation } = await supabase
      .from('student_units')
      .select('*')
      .eq('student_id', userId)
      .eq('unit_id', unitId)
      .single()

    if (existingAssociation) {
      return res.status(400).json({ error: 'Já está associado a esta unidade' })
    }

    // Create association (will be set as active if it's the first one)
    const { data: newAssociation, error: insertError } = await supabase
      .from('student_units')
      .insert({
        student_id: userId,
        unit_id: unitId,
        is_active: false // Will be set to active by trigger if it's the first unit
      })
      .select(`
        *,
        unit:units(*)
      `)
      .single()

    if (insertError) {
      console.error('Error joining unit:', insertError)
      return res.status(500).json({ error: 'Erro ao se associar à unidade' })
    }

    const transformedUnit: StudentUnit = {
      ...newAssociation,
      unit: newAssociation.unit as Unit
    }

    res.json({
      message: 'Associado à unidade com sucesso',
      unit: transformedUnit
    })
  } catch (error) {
    console.error('Error in joinUnit:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
