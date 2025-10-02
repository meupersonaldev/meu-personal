'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAvailableSlots,
  checkAllAcademiesHaveSlots,
  bookTimeSlot,
  releaseTimeSlot,
  getAcademySlotStats,
  type AvailableSlot,
  type AcademySlotStatus,
} from '@/lib/slots-api'
import { toast } from 'sonner'

interface UseSlotsOptions {
  academyId?: string
  dayOfWeek?: number
  autoLoad?: boolean
}

export function useSlots(options: UseSlotsOptions = {}) {
  const { academyId, dayOfWeek, autoLoad = true } = options

  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [academiesStatus, setAcademiesStatus] = useState<AcademySlotStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    utilizationRate: 0,
  })

  // Carrega slots disponíveis
  const loadSlots = useCallback(async () => {
    if (!academyId || dayOfWeek === undefined) return

    setLoading(true)
    setError(null)

    try {
      const availableSlots = await getAvailableSlots(academyId, dayOfWeek)
      setSlots(availableSlots)
    } catch (err) {
      const message = 'Erro ao carregar slots disponíveis'
      setError(message)
      console.error(message, err)
    } finally {
      setLoading(false)
    }
  }, [academyId, dayOfWeek])

  // Verifica status de todas as academias
  const checkAcademies = useCallback(async () => {
    if (dayOfWeek === undefined) return

    try {
      const status = await checkAllAcademiesHaveSlots(dayOfWeek)
      setAcademiesStatus(status)
    } catch (err) {
      console.error('Erro ao verificar academias:', err)
    }
  }, [dayOfWeek])

  // Carrega estatísticas
  const loadStats = useCallback(async () => {
    if (!academyId || dayOfWeek === undefined) return

    try {
      const statistics = await getAcademySlotStats(academyId, dayOfWeek)
      setStats(statistics)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }, [academyId, dayOfWeek])

  // Reserva um slot
  const bookSlot = useCallback(
    async (slotId: string, bookingId: string, token: string) => {
      try {
        const success = await bookTimeSlot(slotId, bookingId, token)

        if (success) {
          toast.success('Horário reservado com sucesso!')
          // Recarrega os slots para atualizar disponibilidade
          await loadSlots()
          await loadStats()
          return true
        } else {
          toast.error('Não foi possível reservar este horário')
          return false
        }
      } catch (err) {
        toast.error('Erro ao reservar horário')
        console.error('Erro ao reservar slot:', err)
        return false
      }
    },
    [loadSlots, loadStats]
  )

  // Libera um slot
  const releaseSlot = useCallback(
    async (slotId: string, token: string) => {
      try {
        const success = await releaseTimeSlot(slotId, token)

        if (success) {
          toast.success('Horário liberado com sucesso!')
          await loadSlots()
          await loadStats()
          return true
        } else {
          toast.error('Não foi possível liberar este horário')
          return false
        }
      } catch (err) {
        toast.error('Erro ao liberar horário')
        console.error('Erro ao liberar slot:', err)
        return false
      }
    },
    [loadSlots, loadStats]
  )

  // Verifica se há slots disponíveis
  const hasAvailableSlots = useCallback(() => {
    return slots.length > 0
  }, [slots])

  // Verifica se todas as academias têm slots
  const allAcademiesHaveSlots = useCallback(() => {
    return academiesStatus.every((academy) => academy.has_available_slots)
  }, [academiesStatus])

  // Obtém academias sem slots
  const getAcademiesWithoutSlots = useCallback(() => {
    return academiesStatus.filter((academy) => !academy.has_available_slots)
  }, [academiesStatus])

  // Recarrega tudo
  const refresh = useCallback(async () => {
    await Promise.all([loadSlots(), checkAcademies(), loadStats()])
  }, [loadSlots, checkAcademies, loadStats])

  // Auto-load na montagem
  useEffect(() => {
    if (autoLoad && academyId && dayOfWeek !== undefined) {
      refresh()
    }
  }, [autoLoad, academyId, dayOfWeek, refresh])

  return {
    // Estado
    slots,
    academiesStatus,
    loading,
    error,
    stats,

    // Ações
    loadSlots,
    checkAcademies,
    loadStats,
    bookSlot,
    releaseSlot,
    refresh,

    // Helpers
    hasAvailableSlots,
    allAcademiesHaveSlots,
    getAcademiesWithoutSlots,
  }
}

/**
 * Hook simplificado para verificar disponibilidade geral
 */
export function useSlotsAvailability(dayOfWeek: number) {
  const [academiesStatus, setAcademiesStatus] = useState<AcademySlotStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAvailability = async () => {
      setLoading(true)
      try {
        const status = await checkAllAcademiesHaveSlots(dayOfWeek)
        setAcademiesStatus(status)
      } catch (err) {
        console.error('Erro ao verificar disponibilidade:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAvailability()
  }, [dayOfWeek])

  const allAvailable = academiesStatus.every((a) => a.has_available_slots)
  const someAvailable = academiesStatus.some((a) => a.has_available_slots)
  const noneAvailable = !someAvailable

  return {
    academiesStatus,
    loading,
    allAvailable,
    someAvailable,
    noneAvailable,
  }
}
