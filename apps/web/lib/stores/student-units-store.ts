import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './auth-store'
import { API_BASE_URL } from '../api'

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

interface StudentUnitsState {
  units: StudentUnit[]
  activeUnit: StudentUnit | null
  availableUnits: Unit[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchUnits: () => Promise<void>
  fetchAvailableUnits: () => Promise<void>
  fetchActiveUnit: () => Promise<void>
  activateUnit: (unitId: string) => Promise<void>
  joinUnit: (unitId: string) => Promise<void>
  setActiveUnit: (unit: StudentUnit | null) => void
  clearError: () => void
  reset: () => void
}

export const useStudentUnitsStore = create<StudentUnitsState>()(
  persist(
    (set, get) => ({
      units: [],
      activeUnit: null,
      availableUnits: [],
      isLoading: false,
      error: null,

      fetchUnits: async () => {
        const token = useAuthStore.getState().token
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          set({ isLoading: true, error: null })

          const timestamp = Date.now().toString()
          const url = `${API_BASE_URL}/api/student-units?_ts=${timestamp}`
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.status === 304) {
            const cachedUnits = get().units
            const activeUnit = cachedUnits.find(u => u.is_active) || null

            set({
              units: cachedUnits,
              activeUnit,
              isLoading: false
            })
            return
          }

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao buscar unidades')
          }

          const units: StudentUnit[] = await response.json()
          const activeUnit = units.find(u => u.is_active) || null

          set({
            units,
            activeUnit,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erro ao buscar unidades',
            isLoading: false
          })
        }
      },

      fetchAvailableUnits: async () => {
        const token = useAuthStore.getState().token
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          set({ isLoading: true, error: null })

          const timestamp = Date.now().toString()
          const url = `${API_BASE_URL}/api/student-units/available?_ts=${timestamp}`
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.status === 304) {
            set({ isLoading: false })
            return
          }

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao buscar unidades disponíveis')
          }

          const availableUnits: Unit[] = await response.json()

          set({
            availableUnits,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erro ao buscar unidades disponíveis',
            isLoading: false
          })
        }
      },

      fetchActiveUnit: async () => {
        const token = useAuthStore.getState().token
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          set({ isLoading: true, error: null })

          const timestamp = Date.now().toString()
          const url = `${API_BASE_URL}/api/student-units/active?_ts=${timestamp}`
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.status === 304) {
            set({ isLoading: false })
            return
          }

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao buscar unidade ativa')
          }

          const { activeUnit }: { activeUnit: StudentUnit | null } = await response.json()

          set({
            activeUnit,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erro ao buscar unidade ativa',
            isLoading: false
          })
        }
      },

      activateUnit: async (unitId: string) => {
        try {
          set({ isLoading: true, error: null })

          const token = useAuthStore.getState().token
          if (!token) {
            set({ error: 'Usuário não autenticado', isLoading: false })
            return
          }

          const response = await fetch(`${API_BASE_URL}/api/student-units/${unitId}/activate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao ativar unidade')
          }

          const data = await response.json()

          set({
            units: data.units,
            activeUnit: data.activeUnit,
            isLoading: false
          })

          // Trigger custom event for UI updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('unit:changed', {
              detail: { activeUnit: data.activeUnit }
            }))
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erro ao ativar unidade',
            isLoading: false
          })
        }
      },

      joinUnit: async (unitId: string) => {
        try {
          set({ isLoading: true, error: null })

          const token = useAuthStore.getState().token
          if (!token) {
            set({ error: 'Usuário não autenticado', isLoading: false })
            return
          }

          const response = await fetch(`${API_BASE_URL}/api/student-units/join`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ unitId })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao se associar à unidade')
          }

          // Refresh units list after joining
          await get().fetchUnits()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Erro ao se associar à unidade',
            isLoading: false
          })
        }
      },

      setActiveUnit: (unit: StudentUnit | null) => {
        set({ activeUnit: unit })
      },

      clearError: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          units: [],
          activeUnit: null,
          availableUnits: [],
          isLoading: false,
          error: null
        })
      }
    }),
    {
      name: 'student-units-storage',
      partialize: (state) => ({
        units: state.units,
        activeUnit: state.activeUnit
      })
    }
  )
)
