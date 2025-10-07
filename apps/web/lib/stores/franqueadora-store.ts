import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { useNotificationsStore } from './notifications-store'

// Utilitário para tratamento seguro de valores numéricos
const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value)
  return isNaN(num) || !isFinite(num) ? defaultValue : num
}

// Types
export interface FranqueadoraUser {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'FRANCHISE_ADMIN'
}

export interface Franqueadora {
  id: string
  name: string
  cnpj?: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  is_active: boolean
}

export interface Academy {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  state?: string
  franchise_fee: number
  royalty_percentage: number
  monthly_revenue: number
  contract_start_date?: string
  contract_end_date?: string
  is_active: boolean
  created_at: string
}

export interface FranchisePackage {
  id: string
  name: string
  description?: string
  investment_amount: number
  franchise_fee: number
  royalty_percentage: number
  territory_size: string
  max_population?: number
  included_features: string[]
  is_active: boolean
}

export interface FranchiseLead {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  investment_capacity?: string
  message?: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'CLOSED_WON' | 'CLOSED_LOST'
  assigned_to?: string
  notes?: string
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  cpf?: string
  role: 'TEACHER' | 'STUDENT' | 'ALUNO' | 'PROFESSOR'
  avatar_url?: string
  created_at: string
  updated_at: string
  last_login_at?: string
  active: boolean
  email_verified: boolean
  phone_verified: boolean
  franchisor_id?: string
  franchise_id?: string
  teacher_profiles?: Array<{
    id: string
    specialization?: string
    bio?: string
    graduation?: string
    cref?: string
    total_sessions?: number
    hourly_rate?: number
    available_online?: boolean
    available_in_person?: boolean
  }>
  student_profiles?: Array<{
    id: string
    goal?: string
    fitness_level?: string
    preferences?: string
    emergency_contact?: string
    emergency_phone?: string
    health_conditions?: string
  }>
  operational_links?: {
    professor_units: Array<{
      unit_id: string
      units: {
        name: string
        city: string
        state: string
      }
    }>
    student_units: Array<{
      unit_id: string
      units: {
        name: string
        city: string
        state: string
      }
      total_bookings: number
      first_booking_date: string
      last_booking_date: string
    }>
  }
  booking_stats?: {
    total: number
    completed: number
    pending: number
    cancelled: number
  }
  balance_info?: Array<{
    unit_id: string
    total_purchased: number
    total_consumed: number
    locked_qty: number
    units: {
      name: string
      city: string
      state: string
    }
  }>
  hours_info?: Array<{
    unit_id: string
    total_hours: number
    available_hours: number
    locked_hours: number
    units: {
      name: string
      city: string
      state: string
    }
  }>
}

export interface UsersResponse {
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ConsolidatedAnalytics {
  totalFranchises: number
  activeFranchises: number
  totalRevenue: number
  totalRoyalties: number
  averageRevenuePerFranchise: number
  monthlyGrowth: number
}

export interface AcademyStats {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  activeTeachers: number
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  monthlyRevenue: number
  creditsBalance: number
  plansActive: number
}

interface FranqueadoraState {
  // Auth
  user: FranqueadoraUser | null
  franqueadora: Franqueadora | null
  isAuthenticated: boolean
  token?: string | null

  // Data
  academies: Academy[]
  packages: FranchisePackage[]
  leads: FranchiseLead[]
  users: User[]
  analytics: ConsolidatedAnalytics | null

  // Loading
  isLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  fetchFranqueadora: () => Promise<void>

  // Academies/Franchises
  fetchAcademies: () => Promise<void>
  addAcademy: (academy: Omit<Academy, 'id'> & { admin_name?: string; admin_email?: string; admin_password?: string }) => Promise<boolean>
  updateAcademy: (id: string, updates: Partial<Academy>) => Promise<boolean>
  deleteAcademy: (id: string) => Promise<boolean>
  fetchAcademyStats: (academyId: string) => Promise<AcademyStats | null>

  // Packages
  fetchPackages: () => Promise<void>
  addPackage: (packageData: Omit<FranchisePackage, 'id'>) => Promise<boolean>
  updatePackage: (id: string, updates: Partial<FranchisePackage>) => Promise<boolean>
  deletePackage: (id: string) => Promise<boolean>

  // Leads
  fetchLeads: () => Promise<void>
  updateLead: (id: string, updates: Partial<FranchiseLead>) => Promise<boolean>

  // Users
  fetchUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => Promise<UsersResponse | null>

  // Analytics
  fetchAnalytics: () => Promise<void>
}

export const useFranqueadoraStore = create<FranqueadoraState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      franqueadora: null,
      isAuthenticated: false,
      token: null,
      academies: [],
      packages: [],
      leads: [],
      users: [],
      analytics: null,
      isLoading: false,

      // Auth
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const resp = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          })
          const data = await resp.json()
          if (!resp.ok || !data?.token || !data?.user) {
            set({ isLoading: false })
            return false
          }
          if (typeof document !== 'undefined') {
            const maxAge = 7 * 24 * 60 * 60
            const isProd = process.env.NODE_ENV === 'production'
            const sameSite = isProd ? 'None' : 'Lax'
            const secure = (isProd || (typeof window !== 'undefined' && window.location.protocol === 'https:')) ? '; Secure' : ''
            document.cookie = `auth-token=${data.token}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`
          }
          set({
            token: data.token,
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role
            },
            isAuthenticated: true,
            isLoading: false
          })
          const { fetchFranqueadora, fetchAcademies, fetchPackages, fetchLeads, fetchAnalytics } = get()
          await Promise.all([
            fetchFranqueadora(),
            fetchAcademies(),
            fetchPackages(),
            fetchLeads(),
            fetchAnalytics()
          ])

          // Inicializar notificações da franqueadora
          const franqueadoraId = get().franqueadora?.id
          if (franqueadoraId) {
            useNotificationsStore.getState().connectFranqueadora(franqueadoraId)
          }
          return true
        } catch (error) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      // Buscar contexto da franqueadora do admin logado via API
      fetchFranqueadora: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/me`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              toast.error('Sessão expirada. Faça login novamente.')
            }
            return
          }
          const json = await resp.json()
          if (json?.franqueadora) {
            set({ franqueadora: json.franqueadora })

            // Inicializar notificações da franqueadora
            useNotificationsStore.getState().connectFranqueadora(json.franqueadora.id)
          }
        } catch {}
      },

      logout: () => {
        // Desconectar notificações
        useNotificationsStore.getState().disconnectAll()

        set({
          user: null,
          franqueadora: null,
          isAuthenticated: false,
          token: null,
          academies: [],
          packages: [],
          leads: [],
          analytics: null
        })
        if (typeof document !== 'undefined') {
          const isProd = process.env.NODE_ENV === 'production'
          const sameSite = isProd ? 'None' : 'Lax'
          const secure = (isProd || (typeof window !== 'undefined' && window.location.protocol === 'https:')) ? '; Secure' : ''
          document.cookie = `auth-token=; Path=/; Max-Age=0; SameSite=${sameSite}${secure}`
          window.location.href = '/'
        }
      },

      // Academies
      fetchAcademies: async () => {
        try {
          // Evitar chamadas não autenticadas (gera 401 no login)
          if (!get().isAuthenticated) {
            return
          }
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          // Preferir contexto explícito da franqueadora quando disponível
          let franqueadoraId = get().franqueadora?.id
          const token = get().token
          if (!franqueadoraId) {
            try {
              const me = await fetch(`${API_URL}/api/franqueadora/me`, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              })
              if (me.ok) {
                const data = await me.json()
                franqueadoraId = data?.franqueadora?.id || franqueadoraId
                if (data?.franqueadora) set({ franqueadora: data.franqueadora })
              }
            } catch {}
          }
          const url = franqueadoraId
            ? `${API_URL}/api/franchises?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franchises`
          const resp = await fetch(url, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) return
            throw new Error(`Failed to fetch franchises (${resp.status})`)
          }
          const json = await resp.json()

          // Tratar valores numéricos das academias para evitar NaN
          const safeAcademies = (json.franchises || []).map((academy: any) => ({
            ...academy,
            monthly_revenue: safeNumber(academy.monthly_revenue),
            royalty_percentage: safeNumber(academy.royalty_percentage),
            franchise_fee: safeNumber(academy.franchise_fee)
          }))

          set({ academies: safeAcademies })
        } catch (error) {
          console.error('Error fetching academies:', error)
        }
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addAcademy: async (academyData: any) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const response = await fetch(`${API_URL}/api/franchises/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              academy: academyData,
              admin: {
                name: academyData.admin_name,
                email: academyData.admin_email,
                password: academyData.admin_password
              }
            })
          })
          if (!response.ok) {
            if ((response.status === 401 || response.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para criar franquia. Faça login novamente.') } catch {}
              return false
            }
            const error = await response.json()
            throw new Error(error.message || 'Erro ao criar franquia')
          }
          const { academy } = await response.json()
          set(state => ({ academies: [...state.academies, academy] }))
          return true
        } catch (error) {
          console.error('Error adding academy:', error)
          return false
        }
      },

      updateAcademy: async (id, updates) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franchises/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify(updates)
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para atualizar franquia.') } catch {}
              return false
            }
            throw new Error('Failed to update academy')
          }
          await get().fetchAcademies()
          return true
        } catch (error) {
          console.error('Error updating academy:', error)
          return false
        }
      },

      deleteAcademy: async (id) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franchises/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include'
          })
          if (!resp.ok && resp.status !== 204) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para deletar franquia.') } catch {}
              return false
            }
            throw new Error('Failed to delete academy')
          }
          set(state => ({ academies: state.academies.filter(academy => academy.id !== id) }))
          return true
        } catch (error) {
          console.error('Error deleting academy:', error)
          return false
        }
      },

      fetchAcademyStats: async (academyId) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/academies/${academyId}/stats`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para ver estatísticas da franquia.') } catch {}
              return null
            }
            throw new Error('Failed to fetch academy stats')
          }
          const response = await resp.json()
          return response.data as AcademyStats
        } catch (error) {
          console.error('Error fetching academy stats:', error)
          return null
        }
      },

      // Packages
      fetchPackages: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/packages`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para listar pacotes.') } catch {}
              return
            }
            throw new Error('Failed to fetch packages')
          }
          const json = await resp.json()
          set({ packages: json.packages || [] })
        } catch (error) {
          console.error('Error fetching packages:', error)
        }
      },

      addPackage: async (packageData) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/packages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify(packageData)
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para criar pacote.') } catch {}
              return false
            }
            throw new Error('Failed to add package')
          }
          await get().fetchPackages()
          return true
        } catch (error) {
          console.error('Error adding package:', error)
          return false
        }
      },

      updatePackage: async (id, updates) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/packages/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify(updates)
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para atualizar pacote.') } catch {}
              return false
            }
            throw new Error('Failed to update package')
          }
          await get().fetchPackages()
          return true
        } catch (error) {
          console.error('Error updating package:', error)
          return false
        }
      },

      deletePackage: async (id) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/packages/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include'
          })
          if (!resp.ok && resp.status !== 204) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para deletar pacote.') } catch {}
              return false
            }
            throw new Error('Failed to delete package')
          }
          await get().fetchPackages()
          return true
        } catch (error) {
          console.error('Error deleting package:', error)
          return false
        }
      },

      // Leads
      fetchLeads: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/leads`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para listar leads.') } catch {}
              return
            }
            throw new Error('Failed to fetch leads')
          }
          const json = await resp.json()
          set({ leads: json.leads || [] })
        } catch (error) {
          console.error('Error fetching leads:', error)
        }
      },

      updateLead: async (id, updates) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/franqueadora/leads/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify(updates)
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para atualizar lead.') } catch {}
              return false
            }
            throw new Error('Failed to update lead')
          }
          await get().fetchLeads()
          return true
        } catch (error) {
          console.error('Error updating lead:', error)
          return false
        }
      },

      // Users
      fetchUsers: async (params = {}) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token

          const queryParams = new URLSearchParams()
          let franqueadoraId = get().franqueadora?.id

          if (!franqueadoraId) {
            try {
              await get().fetchFranqueadora()
            } catch (fetchError) {
              console.error('Failed to ensure franqueadora context before fetching users:', fetchError)
            }
            franqueadoraId = get().franqueadora?.id
          }

          if (franqueadoraId) {
            queryParams.append('franqueadora_id', franqueadoraId)
          }

          if (params.page) queryParams.append('page', params.page.toString())
          if (params.limit) queryParams.append('limit', params.limit.toString())
          if (params.search) queryParams.append('search', params.search)
          if (params.role) queryParams.append('role', params.role)
          if (params.status) queryParams.append('status', params.status)

          if (!franqueadoraId) {
            throw new Error('Franqueadora context not available for user listing')
          }

          const response = await fetch(`${API_URL}/api/franqueadora/users?${queryParams}`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })

          if (!response.ok) {
            if ((response.status === 401 || response.status === 403) && get().isAuthenticated) {
              try {
                const { toast } = await import('sonner')
                toast.error('Sem permissão para visualizar usuários.')
              } catch {}
              return null
            }
            throw new Error('Failed to fetch users')
          }

          const data: UsersResponse = await response.json()

          if (params.page === 1) {
            // Primeira página, substitui todos os usuários
            set({ users: data.data })
          } else {
            // Páginas seguintes, adiciona aos usuários existentes
            set(state => ({
              users: [...state.users, ...data.data]
            }))
          }

          return data
        } catch (error) {
          console.error('Error fetching users:', error)
          try {
            const { toast } = await import('sonner')
            toast.error('Erro ao carregar usuários.')
          } catch {}
          return null
        }
      },

      // Analytics
      fetchAnalytics: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const resp = await fetch(`${API_URL}/api/financial/summary-franqueadora`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try { const { toast } = await import('sonner'); toast.error('Sem permissão para visualizar analytics.') } catch {}
              return
            }
            throw new Error('Failed to fetch analytics')
          }
          const analytics = await resp.json()

          // Tratar valores numéricos para evitar NaN
          const safeAnalytics = {
            ...analytics,
            totalRevenue: safeNumber(analytics.totalRevenue),
            totalRoyalties: safeNumber(analytics.totalRoyalties),
            averageRevenuePerFranchise: safeNumber(analytics.averageRevenuePerFranchise),
            totalFranchises: safeNumber(analytics.totalFranchises),
            activeFranchises: safeNumber(analytics.activeFranchises),
            monthlyGrowth: safeNumber(analytics.monthlyGrowth)
          }

          set({ analytics: safeAnalytics })
        } catch (error) {
          console.error('Error fetching analytics:', error)
        }
      }
    }),
    {
      name: 'franqueadora-storage',
      partialize: (state) => ({
        user: state.user,
        franqueadora: state.franqueadora,
        isAuthenticated: state.isAuthenticated,
        token: state.token || null
      })
    }
  )
)
