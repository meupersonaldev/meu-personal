import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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
    rating: number | null
    total_reviews: number
    availability: any
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
  loadTeachers: (city?: string, state?: string) => Promise<void>
  loadBookings: (studentId: string) => Promise<void>
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
  loadTeachers: async (city?: string, state?: string) => {
    set({ loading: true, error: null })

    try {
      // Construir URL com query params
      const params = new URLSearchParams()
      if (city) params.append('city', city)
      if (state) params.append('state', state)

      const queryString = params.toString()
      const url = `http://localhost:3001/api/teachers${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Erro ao buscar professores')
      }

      const teachers = await response.json()

      // Filtrar por especialidade se fornecido
      let filteredTeachers = teachers
      const { specialtyFilter } = get()

      if (specialtyFilter) {
        filteredTeachers = teachers.filter((teacher: Teacher) =>
          teacher.teacher_profiles?.[0]?.specialties?.some(
            s => s.toLowerCase().includes(specialtyFilter.toLowerCase())
          )
        )
      }

      set({ teachers: filteredTeachers, loading: false })
    } catch (error) {
      console.error('Erro ao carregar professores:', error)
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
    }
  },

  loadBookings: async (studentId: string) => {
    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          teacher:users!bookings_teacher_id_fkey (
            name,
            email
          )
        `)
        .eq('student_id', studentId)
        .order('date', { ascending: false })

      if (error) throw error

      set({ bookings: data || [], loading: false })
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
      set({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      })
    }
  },

  createBooking: async (bookingData) => {
    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...bookingData,
          status: 'PENDING'
        })
        .select()
        .single()

      if (error) throw error

      // Recarregar bookings
      await get().loadBookings(bookingData.student_id)

      set({ loading: false })
      return data
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
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
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CANCELLED' })
        .eq('id', bookingId)

      if (error) throw error

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
      console.error('Erro ao cancelar agendamento:', error)
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