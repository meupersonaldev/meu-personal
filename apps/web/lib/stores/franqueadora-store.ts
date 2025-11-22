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
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'FRANCHISE_ADMIN' | 'FRANQUEADORA'
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
  address?: string
  city?: string
  state?: string
  zip_code?: string
  franchise_fee: number
  royalty_percentage: number
  monthly_revenue: number
  // Policy fields (editable only by Franqueadora)
  credits_per_class?: number
  class_duration_minutes?: number
  checkin_tolerance?: number
  contract_start_date?: string
  contract_end_date?: string
  is_active: boolean
  created_at: string
}

export interface CreateAcademyPayload {
  franqueadora_id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  address_number: string
  province: string
  city: string
  state: string
  zip_code?: string | null
  cpf_cnpj: string
  company_type?: string | null
  birth_date?: string | null
  franchise_fee: number
  royalty_percentage: number
  monthly_revenue: number
  contract_start_date?: string | null
  contract_end_date?: string | null
  is_active: boolean
  // Campos opcionais (UI): gestor e observações
  manager_name?: string | null
  manager_email?: string | null
  manager_phone?: string | null
  notes?: string | null
  admin_name: string
  admin_email: string
  admin_password: string
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
  cref?: string
  role: 'TEACHER' | 'STUDENT' | 'ALUNO' | 'PROFESSOR'
  avatar_url?: string
  cref_card_url?: string | null
  approval_status?: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  approved_by?: string
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

export interface StudentCreditPackage {
  id: string
  franqueadora_id: string
  title: string
  classes_qty: number
  price_cents: number
  status: string
  metadata_json: Record<string, any>
  created_at: string
  updated_at: string
}

export interface HourCreditPackage {
  id: string
  franqueadora_id: string
  title: string
  hours_qty: number
  price_cents: number
  status: string
  metadata_json: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateStudentPackageInput {
  title: string
  classesQty: number
  priceCents: number
  status?: 'active' | 'inactive'
  description?: string
  metadata?: Record<string, any>
}

export interface CreateHourPackageInput {
  title: string
  hoursQty: number
  priceCents: number
  status?: 'active' | 'inactive'
  description?: string
  metadata?: Record<string, any>
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
  studentPackages: StudentCreditPackage[]
  hourPackages: HourCreditPackage[]
  users: User[]
  analytics: ConsolidatedAnalytics | null

  // Loading
  isLoading: boolean
  isPackagesLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  fetchFranqueadora: () => Promise<void>
  ensureFranqueadoraId: () => Promise<string | null>

  // Academies/Franchises
  fetchAcademies: () => Promise<void>
  addAcademy: (academy: CreateAcademyPayload) => Promise<boolean>
  updateAcademy: (id: string, updates: Partial<Academy>) => Promise<boolean>
  deleteAcademy: (id: string) => Promise<boolean>
  fetchAcademyStats: (academyId: string) => Promise<AcademyStats | null>

  // Packages
  fetchPackages: () => Promise<void>
  addPackage: (packageData: Omit<FranchisePackage, 'id'>) => Promise<boolean>
  updatePackage: (id: string, updates: Partial<FranchisePackage>) => Promise<boolean>
  deletePackage: (id: string) => Promise<boolean>
  fetchStudentPackages: () => Promise<void>
  fetchHourPackages: () => Promise<void>
  createStudentPackage: (payload: CreateStudentPackageInput) => Promise<boolean>
  updateStudentPackage: (id: string, payload: CreateStudentPackageInput) => Promise<boolean>
  deleteStudentPackage: (id: string) => Promise<boolean>
  createHourPackage: (payload: CreateHourPackageInput) => Promise<boolean>
  updateHourPackage: (id: string, payload: CreateHourPackageInput) => Promise<boolean>
  deleteHourPackage: (id: string) => Promise<boolean>

  // Users
  fetchUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string; assigned?: 'assigned' | 'unassigned'; academy_id?: string }) => Promise<UsersResponse | null>

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
      studentPackages: [],
      hourPackages: [],
      users: [],
      analytics: null,
      isLoading: false,
      isPackagesLoading: false,

      // Helpers
      async ensureFranqueadoraId() {
        let franqueadoraId = get().franqueadora?.id || null
        if (franqueadoraId) return franqueadoraId

        try {
          await get().fetchFranqueadora()
        } catch {}

        franqueadoraId = get().franqueadora?.id || null
        return franqueadoraId
      },

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
          
          // Validar se o usuário é SUPER_ADMIN
          if (data.user.role !== 'SUPER_ADMIN') {
            set({ isLoading: false })
            toast.error('Acesso negado. Apenas SUPER_ADMIN pode acessar a franqueadora.')
            return false
          }
          if (typeof document !== 'undefined') {
            const maxAge = 7 * 24 * 60 * 60
            // Definir SameSite/Secure dinamicamente para evitar perder o cookie em HTTP local
            let sameSite = 'Lax'
            let secure = ''
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
              const pageOrigin = typeof window !== 'undefined' ? window.location.origin : ''
              const apiOrigin = new URL(apiUrl).origin
              const crossSite = pageOrigin && apiOrigin && apiOrigin !== pageOrigin
              const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
              if (crossSite) {
                // Para requests cross-site (diferente origin), precisamos SameSite=None e Secure
                sameSite = 'None'
                secure = '; Secure'
              } else if (isHttps) {
                // Mesmo site em HTTPS pode (opcionalmente) usar Secure
                secure = '; Secure'
              }
            } catch {}
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
          const { fetchFranqueadora, fetchAcademies, fetchPackages, fetchAnalytics } = get()
          await Promise.all([
            fetchFranqueadora(),
            fetchAcademies(),
            fetchPackages(),
            fetchAnalytics()
          ])

          // Inicializar notificações da franqueadora
          const franqueadoraId = get().franqueadora?.id
          if (franqueadoraId) {
            useNotificationsStore.getState().connectFranqueadora(franqueadoraId)
          }
          return true
        } catch {
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
            franchise_fee: safeNumber(academy.franchise_fee),
            credits_per_class: safeNumber(academy.credits_per_class, 1),
            class_duration_minutes: safeNumber(academy.class_duration_minutes, 60),
            checkin_tolerance: safeNumber(academy.checkin_tolerance, 30)
          }))

          set({ academies: safeAcademies })
        } catch {}
      },

      addAcademy: async (academyData: CreateAcademyPayload) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          
          // Sanitizar CPF/CNPJ (remover formatação) antes de enviar
          const cpfCnpjSanitized = academyData.cpf_cnpj 
            ? academyData.cpf_cnpj.replace(/\D/g, '') 
            : null
          
          const academyPayload = {
            franqueadora_id: academyData.franqueadora_id,
            name: academyData.name,
            email: academyData.email,
            phone: academyData.phone ?? null,
            address: academyData.address ?? null,
            address_number: academyData.address_number,
            province: academyData.province,
            city: academyData.city,
            state: academyData.state,
            zip_code: academyData.zip_code ?? null,
            cpf_cnpj: cpfCnpjSanitized,
            company_type: academyData.company_type ?? null,
            birth_date: academyData.birth_date ?? null,
            franchise_fee: academyData.franchise_fee,
            royalty_percentage: academyData.royalty_percentage,
            monthly_revenue: academyData.monthly_revenue,
            contract_start_date: academyData.contract_start_date ?? null,
            contract_end_date: academyData.contract_end_date ?? null,
            is_active: academyData.is_active,
          }
          const response = await fetch(`${API_URL}/api/franchises/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              academy: academyPayload,
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
        } catch {
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
        } catch {
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
        } catch {
          return false
        }
      },

      fetchAcademyStats: async (academyId) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()
          const statsUrl = franqueadoraId
            ? `${API_URL}/api/franqueadora/academies/${academyId}/stats?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franqueadora/academies/${academyId}/stats`
          const resp = await fetch(statsUrl, {
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
        } catch {
          return null
        }
      },

      // Packages
      fetchPackages: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()
          const url = franqueadoraId
            ? `${API_URL}/api/franqueadora/packages?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franqueadora/packages`
          const resp = await fetch(url, {
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
          set({ packages: Array.isArray(json.data) ? json.data : [] })
        } catch {}
      },

      addPackage: async (packageData) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()
          const url = franqueadoraId
            ? `${API_URL}/api/franqueadora/packages?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franqueadora/packages`
          const resp = await fetch(url, {
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
        } catch {
          return false
        }
      },

      updatePackage: async (id, updates) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()
          const url = franqueadoraId
            ? `${API_URL}/api/franqueadora/packages/${id}?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franqueadora/packages/${id}`
          const resp = await fetch(url, {
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
        } catch {
          return false
        }
      },

      deletePackage: async (id) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()
          const url = franqueadoraId
            ? `${API_URL}/api/franqueadora/packages/${id}?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
            : `${API_URL}/api/franqueadora/packages/${id}`
          const resp = await fetch(url, {
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
        } catch {
          return false
        }
      },

      fetchStudentPackages: async () => {
        try {
          if (!get().isAuthenticated) return
          set({ isPackagesLoading: true })
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            set({ studentPackages: [] })
            return
          }

          const resp = await fetch(`${API_URL}/api/packages/student/manage?franqueadora_id=${encodeURIComponent(franqueadoraId)}`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          })

          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try {
                const { toast } = await import('sonner')
                toast.error('Sem permissao para listar pacotes de aluno.')
              } catch {}
            }
            return
          }

          const json = await resp.json()
          set({ studentPackages: json.packages || [] })
        } catch {} finally {
          set({ isPackagesLoading: false })
        }
      },

      fetchHourPackages: async () => {
        try {
          if (!get().isAuthenticated) return
          set({ isPackagesLoading: true })
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            set({ hourPackages: [] })
            return
          }

          const resp = await fetch(`${API_URL}/api/packages/professor/manage?franqueadora_id=${encodeURIComponent(franqueadoraId)}`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          })

          if (!resp.ok) {
            if ((resp.status === 401 || resp.status === 403) && get().isAuthenticated) {
              try {
                const { toast } = await import('sonner')
                toast.error('Sem permissao para listar pacotes de professor.')
              } catch {}
            }
            return
          }

          const json = await resp.json()
          set({ hourPackages: json.packages || [] })
        } catch {} finally {
          set({ isPackagesLoading: false })
        }
      },

      createStudentPackage: async (payload) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            const { toast } = await import('sonner')
            toast.error('Contexto da franqueadora não disponível.')
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/student/manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              franqueadora_id: franqueadoraId,
              title: payload.title,
              classes_qty: payload.classesQty,
              price_cents: payload.priceCents,
              status: payload.status ?? 'active',
              description: payload.description,
              metadata: payload.metadata
            })
          })

          if (!resp.ok) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao criar pacote de aluno.')
            } catch {}
            return false
          }

          await get().fetchStudentPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de aluno criado com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao criar pacote de aluno.')
          } catch {}
          return false
        }
      },

      createHourPackage: async (payload) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            const { toast } = await import('sonner')
            toast.error('Contexto da franqueadora não disponível.')
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/professor/manage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              franqueadora_id: franqueadoraId,
              title: payload.title,
              hours_qty: payload.hoursQty,
              price_cents: payload.priceCents,
              status: payload.status ?? 'active',
              description: payload.description,
              metadata: payload.metadata
            })
          })

          if (!resp.ok) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao criar pacote de professor.')
            } catch {}
            return false
          }

          await get().fetchHourPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de professor criado com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao criar pacote de professor.')
          } catch {}
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
            } catch {
            }
            franqueadoraId = get().franqueadora?.id
          }

          if (franqueadoraId) queryParams.append('franqueadora_id', franqueadoraId)
          if (params.page) queryParams.append('page', params.page.toString())
          if (params.limit) queryParams.append('limit', params.limit.toString())
          if (params.search) queryParams.append('search', params.search)
          if (params.role) queryParams.append('role', params.role)
          if (params.role && params.role.toLowerCase() === 'teacher') {
            if (params.assigned === 'assigned') queryParams.append('assigned', 'true')
            if (params.assigned === 'unassigned') queryParams.append('assigned', 'false')
            if (params.academy_id) queryParams.append('academy_id', params.academy_id)
          }
          if ((params as any).status === 'active') queryParams.append('user_active', 'true')
          if ((params as any).status === 'inactive') queryParams.append('user_active', 'false')

          if (!franqueadoraId) throw new Error('Franqueadora context not available for user listing')

          const response = await fetch(`${API_URL}/api/franqueadora/contacts?${queryParams}`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })

          if (!response.ok) {
            if ((response.status === 401 || response.status === 403) && get().isAuthenticated) {
              try {
                const { toast } = await import('sonner')
                toast.error('Sem permissão para visualizar contatos.')
              } catch {}
              return null
            }
            throw new Error('Failed to fetch contacts')
          }

          const payload = await response.json()

          const contacts: any[] = Array.isArray(payload.data) ? payload.data : []
          // Mapear contacts -> User para reuso da UI
          const mappedUsers: User[] = contacts.map((c) => ({
            id: c.user?.id || c.id,
            name: c.user?.name || '',
            email: c.user?.email || '',
            phone: c.user?.phone || '',
            cpf: c.user?.cpf || '',
            cref: c.user?.cref || '',
            role: c.user?.role || 'STUDENT',
            avatar_url: c.user?.avatar_url,
            cref_card_url: c.user?.cref_card_url || null,
            approval_status: c.user?.approval_status || 'pending',
            approved_at: c.user?.approved_at,
            approved_by: c.user?.approved_by,
            created_at: c.user?.created_at || new Date().toISOString(),
            updated_at: c.user?.updated_at || new Date().toISOString(),
            last_login_at: c.user?.last_login_at,
            active: c.user?.is_active ?? true,
            email_verified: c.user?.email_verified ?? false,
            phone_verified: c.user?.phone_verified ?? false,
            franchisor_id: c.user?.franchisor_id,
            franchise_id: c.user?.franchise_id,
            teacher_profiles: c.user?.teacher_profiles || [],
            student_profiles: c.user?.student_profiles || [],
            operational_links: c.user?.operational_links || undefined,
            booking_stats: c.user?.booking_stats || undefined,
            balance_info: c.user?.balance_info || undefined,
            hours_info: c.user?.hours_info || undefined,
          }))

          const result: UsersResponse = {
            data: mappedUsers,
            pagination: payload.pagination || { page: (params as any).page || 1, limit: (params as any).limit || 20, total: mappedUsers.length, totalPages: 1 }
          }

          if (params.page === 1) {
            set({ users: result.data })
          } else {
            set(state => ({ users: [...state.users, ...result.data] }))
          }

          return result
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro ao carregar contatos.')
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
        } catch {}
      },

      // Novas funções de CRUD para pacotes de aluno
      updateStudentPackage: async (id, payload) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            try {
              const { toast } = await import('sonner')
              toast.error('Contexto da franqueadora não disponível.')
            } catch {}
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/student/manage/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              franqueadora_id: franqueadoraId,
              title: payload.title,
              classes_qty: payload.classesQty,
              price_cents: payload.priceCents,
              status: payload.status,
              description: payload.description,
              metadata: payload.metadata
            })
          })

          if (!resp.ok) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao atualizar pacote de aluno.')
            } catch {}
            return false
          }

          await get().fetchStudentPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de aluno atualizado com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao atualizar pacote de aluno.')
          } catch {}
          return false
        }
      },

      deleteStudentPackage: async (id) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            try {
              const { toast } = await import('sonner')
              toast.error('Contexto da franqueadora não disponível.')
            } catch {}
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/student/manage/${id}?franqueadora_id=${encodeURIComponent(franqueadoraId)}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include'
          })

          if (!resp.ok && resp.status !== 204) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao excluir pacote de aluno.')
            } catch {}
            return false
          }

          // Atualização otimista: remover o pacote da lista imediatamente
          set((state) => ({
            studentPackages: state.studentPackages.filter((pkg) => pkg.id !== id)
          }))

          // Recarregar para garantir sincronização com o backend
          await get().fetchStudentPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de aluno excluído com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao excluir pacote de aluno.')
          } catch {}
          return false
        }
      },

      // Novas funções de CRUD para pacotes de professor
      updateHourPackage: async (id, payload) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            try {
              const { toast } = await import('sonner')
              toast.error('Contexto da franqueadora não disponível.')
            } catch {}
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/professor/manage/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
              franqueadora_id: franqueadoraId,
              title: payload.title,
              hours_qty: payload.hoursQty,
              price_cents: payload.priceCents,
              status: payload.status,
              description: payload.description,
              metadata: payload.metadata
            })
          })

          if (!resp.ok) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao atualizar pacote de professor.')
            } catch {}
            return false
          }

          await get().fetchHourPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de professor atualizado com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao atualizar pacote de professor.')
          } catch {}
          return false
        }
      },

      deleteHourPackage: async (id) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          const franqueadoraId = await get().ensureFranqueadoraId()

          if (!franqueadoraId) {
            try {
              const { toast } = await import('sonner')
              toast.error('Contexto da franqueadora não disponível.')
            } catch {}
            return false
          }

          const resp = await fetch(`${API_URL}/api/packages/professor/manage/${id}?franqueadora_id=${encodeURIComponent(franqueadoraId)}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include'
          })

          if (!resp.ok && resp.status !== 204) {
            const errorBody = await resp.json().catch(() => ({}))
            try {
              const { toast } = await import('sonner')
              toast.error(errorBody?.error || 'Erro ao excluir pacote de professor.')
            } catch {}
            return false
          }

          // Atualização otimista: remover o pacote da lista imediatamente
          set((state) => ({
            hourPackages: state.hourPackages.filter((pkg) => pkg.id !== id)
          }))

          // Recarregar para garantir sincronização com o backend
          await get().fetchHourPackages()
          try {
            const { toast } = await import('sonner')
            toast.success('Pacote de professor excluído com sucesso.')
          } catch {}
          return true
        } catch {
          try {
            const { toast } = await import('sonner')
            toast.error('Erro inesperado ao excluir pacote de professor.')
          } catch {}
          return false
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
