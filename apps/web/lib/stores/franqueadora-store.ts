import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

// Types
export interface FranqueadoraUser {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST'
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

export interface ConsolidatedAnalytics {
  totalFranchises: number
  activeFranchises: number
  totalRevenue: number
  totalRoyalties: number
  averageRevenuePerFranchise: number
  totalLeads: number
  conversionRate: number
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
  averageRating: number
  totalReviews: number
  creditsBalance: number
  plansActive: number
}

interface FranqueadoraState {
  // Auth
  user: FranqueadoraUser | null
  franqueadora: Franqueadora | null
  isAuthenticated: boolean
  
  // Data
  academies: Academy[]
  packages: FranchisePackage[]
  leads: FranchiseLead[]
  analytics: ConsolidatedAnalytics | null
  
  // Loading
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  
  // Academies/Franchises
  fetchAcademies: () => Promise<void>
  addAcademy: (academy: Omit<Academy, 'id'>) => Promise<boolean>
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
      academies: [],
      packages: [],
      leads: [],
      analytics: null,
      isLoading: false,

      // Auth
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          // 1) Buscar usuário por email (evita filtro por relacionamento que pode falhar)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

          if (userError || !userData) {
            console.error('User not found:', userError)
            set({ isLoading: false })
            return false
          }

          // 2) Verificar se é admin da franqueadora via franqueadora_admins por user_id
          const { data: adminData, error: adminError } = await supabase
            .from('franqueadora_admins')
            .select('*')
            .eq('user_id', userData.id)
            .single()

          if (adminError || !adminData) {
            console.error('Admin not found:', adminError)
            set({ isLoading: false })
            return false
          }

          // 3) Obter dados da franqueadora
          const { data: franqueadoraData, error: franqueadoraError } = await supabase
            .from('franqueadora')
            .select('*')
            .eq('id', adminData.franqueadora_id)
            .single()

          if (franqueadoraError || !franqueadoraData) {
            console.warn('Franqueadora not found for admin, proceeding without franqueadora:', franqueadoraError)
          }

          // Simular verificação de senha
          if (password !== '123456') {
            set({ isLoading: false })
            return false
          }

          set({
            user: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: adminData.role
            },
            franqueadora: franqueadoraData || null,
            isAuthenticated: true,
            isLoading: false
          })

          // Carregar dados iniciais
          const { fetchAcademies, fetchPackages, fetchLeads, fetchAnalytics } = get()
          await Promise.all([
            fetchAcademies(),
            fetchPackages(),
            fetchLeads(),
            fetchAnalytics()
          ])

          return true
        } catch (error) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          franqueadora: null,
          isAuthenticated: false,
          academies: [],
          packages: [],
          leads: [],
          analytics: null
        })
        
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      },

      // Academies
      fetchAcademies: async () => {
        try {
          const { franqueadora } = get()
          if (!franqueadora) return

          const { data, error } = await supabase
            .from('academies')
            .select('*')
            .eq('franqueadora_id', franqueadora.id)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ academies: data || [] })
        } catch (error) {
          console.error('Error fetching academies:', error)
        }
      },

      addAcademy: async (academyData: any) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

          // Enviar tudo para a API do backend criar
          const response = await fetch(`${API_URL}/api/franchises/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            const error = await response.json()
            throw new Error(error.message || 'Erro ao criar franquia')
          }

          const { academy, admin } = await response.json()

          // A API já cria o franchise_admin, só atualizar lista local
          set(state => ({
            academies: [...state.academies, academy]
          }))

          return true
        } catch (error) {
          console.error('Error adding academy:', error)
          return false
        }
      },

      updateAcademy: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('academies')
            .update(updates)
            .eq('id', id)

          if (error) throw error

          await get().fetchAcademies()
          return true
        } catch (error) {
          console.error('Error updating academy:', error)
          return false
        }
      },

      deleteAcademy: async (id) => {
        try {
          const { error } = await supabase
            .from('academies')
            .delete()
            .eq('id', id)

          if (error) throw error

          // Atualizar lista local removendo o item
          set(state => ({
            academies: state.academies.filter(academy => academy.id !== id)
          }))

          return true
        } catch (error) {
          console.error('Error deleting academy:', error)
          return false
        }
      },

      fetchAcademyStats: async (academyId) => {
        try {
          // Primeiro, buscar IDs dos professores da academia
          const { data: teacherIds } = await supabase
            .from('academy_teachers')
            .select('teacher_id')
            .eq('academy_id', academyId)

          const teacherIdList = teacherIds?.map(t => t.teacher_id) || []

          // Buscar estatísticas reais do Supabase
          const [studentsResult, teachersResult, bookingsResult, reviewsResult, plansResult] = await Promise.all([
            // Total e alunos ativos
            supabase
              .from('academy_students')
              .select('status')
              .eq('academy_id', academyId),
            
            // Total e professores ativos
            supabase
              .from('academy_teachers')
              .select('status')
              .eq('academy_id', academyId),
            
            // Agendamentos (apenas se houver professores)
            teacherIdList.length > 0 
              ? supabase
                  .from('bookings')
                  .select('status')
                  .in('teacher_id', teacherIdList)
              : Promise.resolve({ data: [] }),
            
            // Reviews e ratings (apenas se houver professores)
            teacherIdList.length > 0
              ? supabase
                  .from('reviews')
                  .select('rating')
                  .in('teacher_id', teacherIdList)
              : Promise.resolve({ data: [] }),
            
            // Planos ativos
            supabase
              .from('academy_plans')
              .select('*')
              .eq('academy_id', academyId)
              .eq('is_active', true)
          ])

          // Processar dados dos alunos
          const students = studentsResult.data || []
          const totalStudents = students.length
          const activeStudents = students.filter(s => s.status === 'active').length

          // Processar dados dos professores
          const teachers = teachersResult.data || []
          const totalTeachers = teachers.length
          const activeTeachers = teachers.filter(t => t.status === 'active').length

          // Processar dados dos agendamentos
          const bookings = bookingsResult.data || []
          const totalBookings = bookings.length
          const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length
          const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length

          // Processar reviews
          const reviews = reviewsResult.data || []
          const totalReviews = reviews.length
          const averageRating = totalReviews > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
            : 0

          // Planos ativos
          const plansActive = plansResult.data?.length || 0

          // Buscar receita mensal da academy
          const { data: academyData } = await supabase
            .from('academies')
            .select('monthly_revenue')
            .eq('id', academyId)
            .single()

          const monthlyRevenue = academyData?.monthly_revenue || 0

          // Calcular créditos em circulação (simulado por enquanto)
          const creditsBalance = Math.floor(totalStudents * 10) // Estimativa

          const stats: AcademyStats = {
            totalStudents,
            activeStudents,
            totalTeachers,
            activeTeachers,
            totalBookings,
            completedBookings,
            cancelledBookings,
            monthlyRevenue,
            averageRating,
            totalReviews,
            creditsBalance,
            plansActive
          }

          return stats
        } catch (error) {
          console.error('Error fetching academy stats:', error)
          return null
        }
      },

      // Packages
      fetchPackages: async () => {
        try {
          const { franqueadora } = get()
          if (!franqueadora) return

          const { data, error } = await supabase
            .from('franchise_packages')
            .select('*')
            .eq('franqueadora_id', franqueadora.id)
            .order('investment_amount', { ascending: true })

          if (error) throw error

          set({ packages: data || [] })
        } catch (error) {
          console.error('Error fetching packages:', error)
        }
      },

      addPackage: async (packageData) => {
        try {
          const { franqueadora } = get()
          if (!franqueadora) return false

          const { error } = await supabase
            .from('franchise_packages')
            .insert({
              ...packageData,
              franqueadora_id: franqueadora.id
            })

          if (error) throw error

          await get().fetchPackages()
          return true
        } catch (error) {
          console.error('Error adding package:', error)
          return false
        }
      },

      updatePackage: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('franchise_packages')
            .update(updates)
            .eq('id', id)

          if (error) throw error

          await get().fetchPackages()
          return true
        } catch (error) {
          console.error('Error updating package:', error)
          return false
        }
      },

      deletePackage: async (id) => {
        try {
          const { error } = await supabase
            .from('franchise_packages')
            .update({ is_active: false })
            .eq('id', id)

          if (error) throw error

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
          const { franqueadora } = get()
          if (!franqueadora) return

          const { data, error } = await supabase
            .from('franchise_leads')
            .select('*')
            .eq('franqueadora_id', franqueadora.id)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ leads: data || [] })
        } catch (error) {
          console.error('Error fetching leads:', error)
        }
      },

      updateLead: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('franchise_leads')
            .update(updates)
            .eq('id', id)

          if (error) throw error

          await get().fetchLeads()
          return true
        } catch (error) {
          console.error('Error updating lead:', error)
          return false
        }
      },

      // Analytics
      fetchAnalytics: async () => {
        try {
          const { franqueadora } = get()
          if (!franqueadora) {
            console.log('fetchAnalytics: No franqueadora found')
            return
          }
          
          console.log('fetchAnalytics: Fetching for franqueadora:', franqueadora.id)

          // Buscar dados diretamente do Supabase para garantir dados atualizados
          const [academiesResult, leadsResult] = await Promise.all([
            supabase
              .from('academies')
              .select('*')
              .eq('franqueadora_id', franqueadora.id),
            
            supabase
              .from('franchise_leads')
              .select('*')
              .eq('franqueadora_id', franqueadora.id)
          ])

          const academies = academiesResult.data || []
          const leads = leadsResult.data || []
          
          console.log('fetchAnalytics: Found academies:', academies.length)
          console.log('fetchAnalytics: Found leads:', leads.length)
          
          // Calcular analytics consolidados
          const totalRevenue = academies.reduce((sum, academy) => sum + academy.monthly_revenue, 0)
          const totalRoyalties = academies.reduce((sum, academy) => 
            sum + (academy.monthly_revenue * academy.royalty_percentage / 100), 0)
          
          const qualifiedLeads = leads.filter(lead => 
            ['QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON'].includes(lead.status))
          const closedWonLeads = leads.filter(lead => lead.status === 'CLOSED_WON')
          
          const analytics: ConsolidatedAnalytics = {
            totalFranchises: academies.length,
            activeFranchises: academies.filter(a => a.is_active).length,
            totalRevenue,
            totalRoyalties,
            averageRevenuePerFranchise: academies.length > 0 ? totalRevenue / academies.length : 0,
            totalLeads: leads.length,
            conversionRate: qualifiedLeads.length > 0 ? (closedWonLeads.length / qualifiedLeads.length) * 100 : 0,
            monthlyGrowth: 12.5 // Mock por enquanto
          }

          console.log('fetchAnalytics: Final analytics:', analytics)
          set({ analytics })
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
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
