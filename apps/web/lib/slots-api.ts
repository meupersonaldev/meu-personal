/**
 * API para gerenciamento de slots de agendamento nas academias
 * Sistema de bloqueio automático quando slots atingem capacidade máxima
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export interface TimeSlot {
  id: string
  academy_id: string
  day_of_week: number // 0=Domingo, 1=Segunda, ..., 6=Sábado
  time: string // Formato HH:MM:SS
  is_available: boolean
  max_capacity: number
  current_bookings: number
  blocked_reason?: string
  created_at: string
  updated_at: string
}

export interface AvailableSlot {
  slot_id: string
  slot_time: string
  max_capacity: number
  available_capacity: number
}

export interface AcademySlotStatus {
  academy_id: string
  academy_name: string
  has_available_slots: boolean
  total_slots: number
  available_slots: number
}

/**
 * Verifica se um slot específico está disponível
 */
export async function checkSlotAvailability(
  academyId: string,
  dayOfWeek: number,
  time: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/slots/check-availability`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academy_id: academyId,
          day_of_week: dayOfWeek,
          time,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Erro ao verificar disponibilidade do slot')
    }

    const data = await response.json()
    return data.available
  } catch (error) {
    return false
  }
}

/**
 * Reserva um slot para um agendamento
 * Bloqueia automaticamente se atingir capacidade máxima
 */
export async function bookTimeSlot(
  slotId: string,
  bookingId: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slots/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slot_id: slotId,
        booking_id: bookingId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao reservar slot')
    }

    const data = await response.json()
    return data.success
  } catch (error) {
    throw error
  }
}

/**
 * Libera um slot quando um agendamento é cancelado
 */
export async function releaseTimeSlot(
  slotId: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slots/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slot_id: slotId,
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao liberar slot')
    }

    const data = await response.json()
    return data.success
  } catch (error) {
    return false
  }
}

/**
 * Obtém todos os slots disponíveis de uma academia em um dia específico
 */
export async function getAvailableSlots(
  academyId: string,
  dayOfWeek: number
): Promise<AvailableSlot[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/slots/available?academy_id=${academyId}&day_of_week=${dayOfWeek}`
    )

    if (!response.ok) {
      throw new Error('Erro ao buscar slots disponíveis')
    }

    const data = await response.json()
    return data.slots || []
  } catch (error) {
    return []
  }
}

/**
 * Verifica se TODAS as academias têm slots disponíveis em um dia
 * Útil para validação antes de permitir agendamentos
 */
export async function checkAllAcademiesHaveSlots(
  dayOfWeek: number
): Promise<AcademySlotStatus[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/slots/check-all-academies?day_of_week=${dayOfWeek}`
    )

    if (!response.ok) {
      throw new Error('Erro ao verificar academias')
    }

    const data = await response.json()
    return data.academies || []
  } catch (error) {
    return []
  }
}

/**
 * Verifica se pelo menos uma academia tem slots disponíveis
 */
export async function hasAnyAcademyWithSlots(
  dayOfWeek: number
): Promise<boolean> {
  const academies = await checkAllAcademiesHaveSlots(dayOfWeek)
  return academies.some((academy) => academy.has_available_slots)
}

/**
 * Obtém estatísticas de slots de uma academia
 */
export async function getAcademySlotStats(
  academyId: string,
  dayOfWeek: number
): Promise<{
  total: number
  available: number
  booked: number
  utilizationRate: number
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/slots/stats?academy_id=${academyId}&day_of_week=${dayOfWeek}`
    )

    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas')
    }

    const data = await response.json()
    return data.stats
  } catch (error) {
    return {
      total: 0,
      available: 0,
      booked: 0,
      utilizationRate: 0,
    }
  }
}

/**
 * Lista todos os slots de uma academia (disponíveis e ocupados)
 */
export async function getAllAcademySlots(
  academyId: string,
  dayOfWeek: number,
  token: string
): Promise<TimeSlot[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/slots/all?academy_id=${academyId}&day_of_week=${dayOfWeek}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Erro ao buscar slots')
    }

    const data = await response.json()
    return data.slots || []
  } catch (error) {
    return []
  }
}

/**
 * Cria novos slots para uma academia
 */
export async function createAcademySlots(
  academyId: string,
  slots: Array<{
    day_of_week: number
    time: string
    max_capacity: number
  }>,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slots/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        academy_id: academyId,
        slots,
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao criar slots')
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Atualiza configurações de um slot
 */
export async function updateSlot(
  slotId: string,
  updates: {
    is_available?: boolean
    max_capacity?: number
    blocked_reason?: string
  },
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slots/${slotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Erro ao atualizar slot')
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Bloqueia um slot manualmente (ex: manutenção, evento especial)
 */
export async function blockSlot(
  slotId: string,
  reason: string,
  token: string
): Promise<boolean> {
  return updateSlot(
    slotId,
    {
      is_available: false,
      blocked_reason: reason,
    },
    token
  )
}

/**
 * Desbloqueia um slot
 */
export async function unblockSlot(
  slotId: string,
  token: string
): Promise<boolean> {
  return updateSlot(
    slotId,
    {
      is_available: true,
      blocked_reason: null,
    },
    token
  )
}

/**
 * Helper: Converte dia da semana para nome em português
 */
export function getDayName(dayOfWeek: number): string {
  const days = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ]
  return days[dayOfWeek] || 'Dia inválido'
}

/**
 * Helper: Formata horário para exibição
 */
export function formatTime(time: string): string {
  return time.substring(0, 5) // HH:MM
}

/**
 * Helper: Obtém o dia da semana de uma data
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

export default {
  checkSlotAvailability,
  bookTimeSlot,
  releaseTimeSlot,
  getAvailableSlots,
  checkAllAcademiesHaveSlots,
  hasAnyAcademyWithSlots,
  getAcademySlotStats,
  getAllAcademySlots,
  createAcademySlots,
  updateSlot,
  blockSlot,
  unblockSlot,
  getDayName,
  formatTime,
  getDayOfWeek,
}
