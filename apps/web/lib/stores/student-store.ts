import { create } from 'zustand'
import { useAuthStore } from './auth-store'
import { useStudentUnitsStore } from './student-units-store'
import { API_BASE_URL } from '../api'

export interface Teacher {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  credits: number
  is_active: boolean
  created_at: string
  teacher_profiles: Array<{
    id: string
    bio: string | null
    specialties: string[]
    hourly_rate: number
    availability: Record<string, unknown>
    is_available: boolean
  }>
  academy_teachers: Array<{
    id: string
    academy_id: string
    status: string
    commission_rate: number
    academies: {
      id: string
      name: string
      city: string | null
      state: string | null
      address: string | null
      phone: string | null
      email: string
    }
  }>
}

export interface Booking {
  id: string
  student_id: string
  teacher_id: string
  date: string
  duration: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  credits_cost: number
  created_at: string
  updated_at: string
  teacher?: {
    name: string
    email: string
  }
}

export type ApiBookingResponse = {
  id: string
  studentId: string
  teacherId: string
  date: string
  duration: number
  status: string
  notes?: string | null
  creditsCost: number
  createdAt: string
  updatedAt: string
  teacherName?: string
}

export interface StudentState {
  // Estado
  teachers: Teacher[]
  bookings: Booking[]
  loading: boolean
  error: string | null

  // Filtros
  cityFilter: string
  stateFilter: string
  specialtyFilter: string

  // Ações
  loadTeachers: (city?: string, state?: string, unitIdOverride?: string) => Promise<void>
  loadBookings: (studentId: string, unitId?: string) => Promise<void>
  createBooking: (bookingData: {
    student_id: string
    teacher_id: string
    date: string
    duration: number
    notes?: string
    credits_cost: number
  }) => Promise<Booking>
  cancelBooking: (bookingId: string) => Promise<void>
  setCityFilter: (city: string) => void
  setStateFilter: (state: string) => void
  setSpecialtyFilter: (specialty: string) => void
  clearFilters: () => void
}

export const useStudentStore = create<StudentState>((set, get) => ({
  // Estado inicial
  teachers: [],
  bookings: [],
  loading: false,
  error: null,

  // Filtros
  cityFilter: '',
  stateFilter: '',
  specialtyFilter: '',

  // Ações
  loadTeachers: async (city?: string, state?: string, unitIdOverride?: string) => {
    set({ loading: true, error: null })

    try {
      // Get active unit to filter teachers (fallback when no override)
      const activeUnit = useStudentUnitsStore.getState().activeUnit

      // Construir URL com query params
      const params = new URLSearchParams()
      if (city) params.append('city', city)
      if (state) params.append('state', state)
      const unitId = unitIdOverride || (activeUnit ? activeUnit.unit_id : '')
      if (unitId) params.append('unit_id', unitId)
      params.append('_ts', Date.now().toString())

      const queryString = params.toString()
      const url = `${API_BASE_URL}/api/teachers${queryString ? `?${queryString}` : ''}`

      const token = useAuthStore.getState().token
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        headers,
        credentials: 'include'
      })

      if (response.status === 304) {
        const { specialtyFilter } = get()
        const cachedTeachers = get().teachers
        let filteredTeachers = cachedTeachers

        if (specialtyFilter) {
          filteredTeachers = cachedTeachers.filter((teacher: Teacher) =>
            teacher.teacher_profiles?.[0]?.specialties?.some((s: string) =>
              s.toLowerCase().includes(specialtyFilter.toLowerCase())
            )
          )
        }

        set({ teachers: filteredTeachers, loading: false })
        return
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => null)
        throw new Error(
          `Erro ao buscar professores: ${response.status} ${response.statusText}` +
          (errorText ? ` - ${errorText}` : '')
        )
      }

      const teachers = await response.json()

      // Filtrar por especialidade se fornecido
      let filteredTeachers = teachers
      const { specialtyFilter } = get()

      if (specialtyFilter) {
        filteredTeachers = teachers.filter((teacher: Teacher) =>
          teacher.teacher_profiles?.[0]?.specialties?.some(
            (s: string) => s.toLowerCase().includes(specialtyFilter.toLowerCase())
          )
        )
      }

      set({ teachers: filteredTeachers, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
    }
  },

  loadBookings: async (studentId: string, unitId?: string) => {
    set({ loading: true, error: null })

    try {
      // Get active unit to filter bookings
      const activeUnit = useStudentUnitsStore.getState().activeUnit

      const token = useAuthStore.getState().token

      // Construir URL com query params incluindo unit_id
      const params = new URLSearchParams()
      params.append('student_id', studentId)
      if (unitId) {
        params.append('unit_id', unitId)
      } else if (activeUnit) {
        params.append('unit_id', activeUnit.unit_id)
      }
      params.append('_ts', Date.now().toString())

      const url = `${API_BASE_URL}/api/bookings?${params.toString()}`
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (resp.status === 304) {
        // Mantém agendamentos atuais já que não houve alteração
        set({ loading: false })
        return
      }

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => null)
        throw new Error(
          `Erro ao carregar agendamentos: ${resp.status} ${resp.statusText}` +
          (errorText ? ` - ${errorText}` : '')
        )
      }
      const json = await resp.json()
      const bookings = (json.bookings || []).map((b: ApiBookingResponse) => ({
        id: b.id,
        student_id: b.studentId,
        teacher_id: b.teacherId,
        date: b.date,
        duration: b.duration,
        status: b.status,
        notes: b.notes ?? null,
        credits_cost: b.creditsCost,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
        teacher: b.teacherName ? { name: b.teacherName, email: '' } : undefined,
      }))
      set({ bookings, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
    }
  },

  createBooking: async (bookingData) => {
    set({ loading: true, error: null })

    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bookingData),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.message || 'Erro ao criar agendamento')
      const b = json.booking || json
      const mapped = {
        id: b.id,
        student_id: b.student_id,
        teacher_id: b.teacher_id,
        date: b.date,
        duration: b.duration,
        status: b.status,
        notes: b.notes ?? null,
        credits_cost: b.credits_cost,
        created_at: b.created_at,
        updated_at: b.updated_at,
      } as Booking
      // Recarregar bookings
      await get().loadBookings(bookingData.student_id)
      set({ loading: false })
      return mapped
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
      throw error
    }
  },

  cancelBooking: async (bookingId: string) => {
    set({ loading: true, error: null })

    try {
      const token = useAuthStore.getState().token
      const resp = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!resp.ok) throw new Error('Erro ao cancelar agendamento')
      // Atualizar lista local
      set(state => ({
        bookings: state.bookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: 'CANCELLED' as const }
            : booking
        ),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
      throw error
    }
  },

  setCityFilter: (city: string) => {
    set({ cityFilter: city })
    const { stateFilter } = get()
    get().loadTeachers(city, stateFilter)
  },

  setStateFilter: (state: string) => {
    set({ stateFilter: state })
    const { cityFilter } = get()
    get().loadTeachers(cityFilter, state)
  },

  setSpecialtyFilter: (specialty: string) => {
    set({ specialtyFilter: specialty })
    const { cityFilter, stateFilter } = get()
    get().loadTeachers(cityFilter, stateFilter)
  },

  clearFilters: () => {
    set({
      cityFilter: '',
      stateFilter: '',
      specialtyFilter: ''
    })
    get().loadTeachers()
  }
}))
