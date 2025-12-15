import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { setAuthCookie, clearAuthCookie } from './auth-store'

// Types
export interface FranquiaUser {
  id: string
  name: string
  email: string
  role: 'FRANCHISE_ADMIN'
  academyId: string
  academyName?: string
  avatar_url?: string
}

export interface AcademySettings {
  requireApproval?: boolean
  allowSameTimeBookings?: boolean
  manualCreditReleaseEnabled?: boolean
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
  is_active: boolean
  settings?: AcademySettings | null
}

export interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  is_active?: boolean
  specialties: string[]
  status: 'active' | 'inactive' | 'pending'
  commission_rate?: number
  created_at: string
  // Dados do perfil de professor (array do Supabase)
  teacher_profiles?: Array<{
    id: string
    bio?: string
    specialization?: string[]
    specialties?: string[]
    hourly_rate: number
    rating_avg?: number
    rating_count?: number
    availability?: object
    is_available?: boolean
  }>
}

export interface Student {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  credits: number
  is_active?: boolean
  status: 'active' | 'inactive'
  join_date: string
  last_activity: string
  planId?: string
  plan_id?: string
  // Dados de assinatura
  student_subscriptions?: {
    id: string
    plan_id: string
    status: string
    credits_remaining?: number
  }[]
}

export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  credits_included: number
  hoursIncluded: number
  duration_days: number
  features: string[]
  status: 'active' | 'inactive'
  is_active: boolean
  created_at: string
}

export interface Class {
  id: string
  teacherId: string
  studentId: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  price: number
  duration: number
  created_at: string
}

export interface TimeSlot {
  id: string
  time: string
  dayOfWeek: number // 0 = domingo, 1 = segunda, etc
  isAvailable: boolean
  maxCapacity: number
  created_at: string
}

export interface Analytics {
  totalTeachers: number
  totalStudents: number
  totalRevenue: number
  totalClasses: number
  activeTeachers: number
  activeStudents: number
  monthlyGrowth: number
}

export interface Notification {
  id: string
  franchise_admin_id: string
  type: 'new_teacher' | 'new_student' | 'payment_received' | 'plan_purchased' | 'teacher_approval_needed' | 'student_approval_needed'
  title: string
  message: string
  data: any
  is_read: boolean
  created_at: string
}

export interface TeacherPlan {
  id: string
  name: string
  description?: string
  price: number
  commission_rate: number
  features: string[]
  is_active: boolean
  asaas_plan_id?: string
  created_at: string
}

export interface StudentPlan {
  id: string
  name: string
  description?: string
  price: number
  credits_included: number
  duration_days: number
  features: string[]
  is_active: boolean
  asaas_plan_id?: string
  created_at: string
}

export interface ApprovalRequest {
  id: string
  type: 'teacher_registration' | 'student_registration'
  user_id: string
  academy_id?: string
  status: 'pending' | 'approved' | 'rejected'
  requested_data: any
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  user?: any
  academy?: any
  reviewer?: any
}

interface FranquiaState {
  // Auth
  franquiaUser: FranquiaUser | null
  academy: Academy | null
  isAuthenticated: boolean
  sessionChecked: boolean

  // Data
  teachers: Teacher[]
  students: Student[]
  plans: Plan[]
  classes: Class[]
  timeSlots: TimeSlot[]
  analytics: Analytics | null

  // New data
  notifications: Notification[]
  teacherPlans: TeacherPlan[]
  studentPlans: StudentPlan[]
  approvalRequests: ApprovalRequest[]
  unreadNotifications: number

  // Loading states
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setAcademy: (academy: Academy) => void
  setFranquiaUser: (user: FranquiaUser) => void
  
  // Teachers
  fetchTeachers: () => Promise<void>
  addTeacher: (teacherData: Omit<Teacher, 'id' | 'created_at'>) => Promise<boolean>
  updateTeacher: (id: string, updates: Partial<Teacher>) => Promise<boolean>
  deleteTeacher: (id: string) => Promise<boolean>
  
  // Students
  fetchStudents: () => Promise<void>
  addStudent: (studentData: Omit<Student, 'id' | 'join_date'>) => Promise<boolean | { success: boolean; emailSent?: boolean; temporaryPassword?: string; error?: string }>
  updateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>
  deleteStudent: (id: string) => Promise<boolean>
  
  // Plans
  fetchPlans: () => Promise<void>
  addPlan: (planData: Omit<Plan, 'id' | 'created_at'>) => Promise<boolean>
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<boolean>
  deletePlan: (id: string) => Promise<boolean>
  
  // Analytics
  fetchAnalytics: () => Promise<void>

  // Classes (Agendamentos)
  fetchClasses: () => Promise<void>
  updateClass: (id: string, updates: Partial<Class>) => Promise<boolean>
  deleteClass: (id: string) => Promise<boolean>

  // Time Slots
  fetchTimeSlots: () => Promise<void>
  toggleTimeSlotAvailability: (id: string) => Promise<boolean>

  // Notifications
  fetchNotifications: () => Promise<void>
  markNotificationAsRead: (id: string) => Promise<boolean>
  markAllNotificationsAsRead: () => Promise<boolean>

  // Teacher Plans
  fetchTeacherPlans: () => Promise<void>
  createTeacherPlan: (plan: Omit<TeacherPlan, 'id' | 'created_at'>) => Promise<boolean>

  // Student Plans
  fetchStudentPlans: () => Promise<void>
  createStudentPlan: (plan: Omit<StudentPlan, 'id' | 'created_at'>) => Promise<boolean>

  // Approval Requests
  fetchApprovalRequests: () => Promise<void>
  approveRequest: (id: string, reviewerId: string) => Promise<boolean>
  rejectRequest: (id: string, reviewerId: string, reason: string) => Promise<boolean>
}

export const useFranquiaStore = create<FranquiaState>()(
  persist(
    (set, get) => ({
      // Initial state
      franquiaUser: null,
      academy: null,
      isAuthenticated: false,
      sessionChecked: true,
      teachers: [],
      students: [],
      plans: [],
      classes: [],
      timeSlots: [],
      analytics: null,
      notifications: [],
      teacherPlans: [],
      studentPlans: [],
      approvalRequests: [],
      unreadNotifications: 0,
      isLoading: false,

      // Auth
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          const API_URL = ''
          console.log('[FRANQUIA-STORE] Usando URL relativa (rewrite Next.js)')
          console.log('[FRANQUIA-STORE] Tentando login com email:', email)

          // 1. Fazer login via API (usando rewrite do Next.js)
          const response = await fetch(`/api/auth/login`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          })

          console.log('[FRANQUIA-STORE] Response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.log('[FRANQUIA-STORE] Response error:', errorText)
            set({ isLoading: false })
            return false
          }

          const { token, user } = await response.json()
          console.log('[FRANQUIA-STORE] Login OK, user role:', user.role)

          // Verificar se é FRANCHISE_ADMIN
          if (user.role !== 'FRANCHISE_ADMIN') {
            console.log('[FRANQUIA-STORE] Usuário não é FRANCHISE_ADMIN')
            set({ isLoading: false })
            return false
          }

          // Salvar token e cookie para o middleware
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', token)
            }
            if (typeof document !== 'undefined') {
              setAuthCookie(token)
            }
          } catch {}

          // 2. Buscar dados do admin na tabela franchise_admins
          const { data: franchiseAdminData, error: adminError } = await supabase
            .from('franchise_admins')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (adminError || !franchiseAdminData) {
            set({ isLoading: false })
            return false
          }

          const academyId = franchiseAdminData.academy_id

          // 3. Buscar dados da academia
          const { data: academyData, error: academyError } = await supabase
            .from('academies')
            .select('*')
            .eq('id', academyId)
            .single()

          if (academyError || !academyData) {
            set({ isLoading: false })
            return false
          }

          // 4. Definir estado do usuário
          set({
            franquiaUser: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: 'FRANCHISE_ADMIN',
              academyId: academyId,
              academyName: academyData.name,
              avatar_url: user.avatar_url
            },
            academy: academyData,
            isAuthenticated: true,
            isLoading: false
          })

          // Carregar dados iniciais (não bloquear login se falhar)
          const {
            fetchTeachers,
            fetchStudents,
            fetchPlans,
            fetchAnalytics,
            fetchClasses,
            fetchTimeSlots,
            fetchNotifications,
            fetchTeacherPlans,
            fetchStudentPlans
          } = get()
          try {
            await Promise.all([
              fetchTeachers(),
              fetchStudents(),
              fetchPlans(),
              fetchAnalytics(),
              fetchClasses(),
              fetchTimeSlots(),
              fetchNotifications(),
              fetchTeacherPlans(),
              fetchStudentPlans()
              // Não buscar approval_requests - apenas para agendamentos
            ])
          } catch {
            // Não falhar o login por causa disso
          }

          return true
        } catch {
          set({ isLoading: false })
          return false
        }
      },

      logout: async () => {
        // Fazer logout do Supabase Auth
        await supabase.auth.signOut()

        set({
          franquiaUser: null,
          academy: null,
          isAuthenticated: false,
          teachers: [],
          students: [],
          plans: [],
          classes: [],
          timeSlots: [],
          analytics: null,
          notifications: [],
          teacherPlans: [],
          studentPlans: [],
          approvalRequests: [],
          unreadNotifications: 0
        })

        // Limpar token persistido e cookie
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            clearAuthCookie()
          }
        } catch {}

        // Redirecionar para landing page
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      },

      setAcademy: (academy: Academy) => {
        set({ academy })
      },

      setFranquiaUser: (user: FranquiaUser) => {
        set({ franquiaUser: user })
      },

      // Teachers
      fetchTeachers: async () => {
        try {
          const { academy, franquiaUser } = get()
          const academyId = academy?.id || franquiaUser?.academyId
          if (!academyId) {
            set({ teachers: [] })
            return
          }
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          
          const resp = await fetch(`/api/teachers/by-academy?academy_id=${academyId}` , {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) {
            set({ teachers: [] })
            return
          }
          const payload = await resp.json()
          const teachers = Array.isArray(payload?.teachers) 
            ? payload.teachers 
            : Array.isArray(payload) 
            ? payload 
            : []
          set({ teachers })
        } catch {
          set({ teachers: [] })
        }
      },

      addTeacher: async (teacherData) => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          // Criar professor via API
          const resp = await fetch(`/api/teachers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              name: teacherData.name,
              email: teacherData.email,
              phone: teacherData.phone,
              academy_id: academy.id,
              specialties: teacherData.specialties,
              hourly_rate: 80,
              commission_rate: 0.7
            })
          })

          if (!resp.ok) return false

          const created = await resp.json()

          // Se status desejado for diferente de 'active', atualizar vínculo
          if (teacherData.status && teacherData.status !== 'active' && created?.id) {
            await fetch(`/api/teachers/${created.id}/academy-link`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ academy_id: academy.id, status: teacherData.status })
            })
          }

          await get().fetchTeachers()
          return true
        } catch {
          return false
        }
      },

      updateTeacher: async (id, updates) => {
        try {
          const { academy } = get()
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          // Atualizar perfil/dados básicos
          const body: any = {}
          if (updates.name !== undefined) body.name = updates.name
          if (updates.email !== undefined) body.email = updates.email
          if (updates.phone !== undefined) body.phone = updates.phone
          if (updates.specialties !== undefined) body.specialties = updates.specialties

          if (Object.keys(body).length > 0) {
            const resp = await fetch(`/api/teachers/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify(body)
            })
            if (!resp.ok) return false
          }

          // Atualizar vínculo com academia (status/comissão)
          if (academy && (updates as any).status !== undefined) {
            const resp2 = await fetch(`/api/teachers/${id}/academy-link`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ academy_id: academy.id, status: (updates as any).status })
            })
            if (!resp2.ok) return false
          }

          await get().fetchTeachers()
          return true
        } catch {
          return false
        }
      },

      deleteTeacher: async (id) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/teachers/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return false
          await get().fetchTeachers()
          return true
        } catch (error) {
          return false
        }
      },

      // Students
      fetchStudents: async () => {
        try {
          const { academy, franquiaUser } = get()
          const academyId = academy?.id || franquiaUser?.academyId
          if (!academyId) {
            set({ students: [] })
            return
          }
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          
          const resp = await fetch(`/api/students?academy_id=${academyId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) {
            set({ students: [] })
            return
          }
          const rows = await resp.json()
          const students: Student[] = (rows || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            credits: u.credits,
            status: u.academy_students?.status || 'active',
            join_date: u.academy_students?.join_date || u.created_at,
            last_activity: u.academy_students?.last_activity || u.updated_at,
            planId: u.academy_students?.plan_id,
            plan_id: u.academy_students?.plan_id
          }))
          set({ students })
        } catch {
          set({ students: [] })
        }
      },

      addStudent: async (studentData) => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const resp = await fetch(`/api/students`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              name: studentData.name,
              email: studentData.email,
              phone: studentData.phone,
              cpf: (studentData as any).cpf,
              academy_id: academy.id,
              plan_id: studentData.plan_id,
              credits: studentData.credits
            })
          })
          
          const data = await resp.json().catch(() => ({}))
          
          if (!resp.ok) {
            // Retornar objeto com erro para o frontend tratar
            return { success: false, error: data.error || 'Erro ao criar aluno' }
          }
          
          await get().fetchStudents()
          
          // Retornar dados do email para feedback
          return { 
            success: true, 
            emailSent: data.emailSent,
            temporaryPassword: data.temporaryPassword
          }
        } catch (error) {
          return { success: false, error: 'Erro ao criar aluno' }
        }
      },

      updateStudent: async (id, updates) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const body: any = {}
          if (updates.name !== undefined) body.name = updates.name
          if (updates.email !== undefined) body.email = updates.email
          if (updates.phone !== undefined) body.phone = updates.phone
          if ((updates as any).avatar_url !== undefined) body.avatar_url = (updates as any).avatar_url
          if ((updates as any).is_active !== undefined) body.is_active = (updates as any).is_active
          if (updates.plan_id !== undefined) body.plan_id = updates.plan_id
          if ((updates as any).academy_id !== undefined) body.academy_id = (updates as any).academy_id
          if (updates.status !== undefined) body.status = updates.status
          if (updates.credits !== undefined) body.credits = updates.credits

          const resp = await fetch(`/api/students/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
          })
          if (!resp.ok) return false
          await get().fetchStudents()
          return true
        } catch (error) {
          return false
        }
      },

      deleteStudent: async (id) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/students/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return false
          await get().fetchStudents()
          return true
        } catch (error) {
          return false
        }
      },

      // Plans
      fetchPlans: async () => {
        try {
          const { academy } = get()
          if (!academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/plans/student?academy_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) { set({ plans: [] }); return }
          const payload = await resp.json()
          const data = Array.isArray(payload?.plans) ? payload.plans : []
          const plans: Plan[] = data.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            credits_included: plan.credits_included,
            hoursIncluded: plan.credits_included,
            duration_days: plan.duration_days,
            features: plan.features || ['Acesso às aulas', 'Suporte personalizado'],
            status: plan.is_active ? 'active' : 'inactive',
            is_active: plan.is_active,
            created_at: plan.created_at
          }))
          set({ plans })
        } catch (error) {
          set({ plans: [] })
        }
      },

      addPlan: async (planData) => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const resp = await fetch(`/api/plans/students`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              academy_id: academy.id,
              name: planData.name,
              description: planData.description,
              price: planData.price,
              credits_included: planData.credits_included,
              duration_days: planData.duration_days,
              features: planData.features
            })
          })
          if (!resp.ok) return false
          await get().fetchPlans()
          return true
        } catch (error) {
          return false
        }
      },

      updatePlan: async (id, updates) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const body: any = {}
          if (updates.name !== undefined) body.name = updates.name
          if (updates.description !== undefined) body.description = updates.description
          if (updates.price !== undefined) body.price = updates.price
          if (updates.credits_included !== undefined) body.credits_included = updates.credits_included
          if (updates.duration_days !== undefined) body.duration_days = updates.duration_days
          if (updates.features !== undefined) body.features = updates.features
          if (updates.status !== undefined) body.is_active = updates.status === 'active'
          if ((updates as any).is_active !== undefined) body.is_active = (updates as any).is_active

          const resp = await fetch(`/api/plans/students/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
          })
          if (!resp.ok) return false
          await get().fetchPlans()
          return true
        } catch (error) {
          return false
        }
      },

      deletePlan: async (id) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/plans/students/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return false
          await get().fetchPlans()
          return true
        } catch (error) {
          return false
        }
      },

      // Analytics
      fetchAnalytics: async () => {
        try {
          const { academy, franquiaUser, teachers, students, classes } = get()
          const academyId = academy?.id || franquiaUser?.academyId
          if (!academyId) {
            return
          }

          // Calcular crescimento mensal real baseado em join_date
          let monthlyGrowth = 0
          const now = new Date()
          const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

          // Alunos que entraram no mês atual
          const currentMonthStudents = students.filter(s => {
            const joinDate = new Date(s.join_date)
            return joinDate >= currentMonth
          }).length

          // Alunos que entraram no mês anterior
          const lastMonthStudents = students.filter(s => {
            const joinDate = new Date(s.join_date)
            return joinDate >= lastMonth && joinDate < currentMonth
          }).length

          // Calcular crescimento percentual
          if (lastMonthStudents > 0) {
            monthlyGrowth = ((currentMonthStudents - lastMonthStudents) / lastMonthStudents) * 100
          } else if (currentMonthStudents > 0) {
            monthlyGrowth = 100 // 100% se não havia alunos no mês anterior
          }

          // Buscar bookings válidos (apenas com aluno) para calcular aulas do mês
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          
          let totalClassesThisMonth = 0
          try {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
            const resp = await fetch(`/api/bookings?franchise_id=${academyId}&from=${startOfMonth}&to=${endOfMonth}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (resp.ok) {
              const data = await resp.json()
              const bookings = Array.isArray(data?.bookings) ? data.bookings : []
              
              // Filtrar apenas agendamentos válidos (com aluno e professor)
              const validBookings = bookings.filter((b: any) => {
                const hasStudent = b.student_id && b.student?.id
                const hasTeacher = b.teacher_id && b.teacher?.id
                // Excluir cancelados
                const isNotCancelled = b.status_canonical !== 'CANCELED' && b.status !== 'CANCELLED'
                return hasStudent && hasTeacher && isNotCancelled
              })
              totalClassesThisMonth = validBookings.length
            }
          } catch {
            // manter analytics mesmo se bookings falhar
          }

          // Calcular analytics básicos
          const analytics: Analytics = {
            totalTeachers: teachers.length,
            totalStudents: students.length,
            totalRevenue: students.reduce((sum, student) => sum + (student.credits * 10), 0), // Estimativa
            totalClasses: totalClassesThisMonth || classes.length,
            activeTeachers: teachers.filter(t => t.status === 'active').length,
            activeStudents: students.filter(s => s.status === 'active').length,
            monthlyGrowth: Number(monthlyGrowth.toFixed(1))
          }

          set({ analytics })
        } catch {
          set({ analytics: null })
        }
      },

      // Classes (Agendamentos)
      fetchClasses: async () => {
        try {
          const { academy } = get()
          if (!academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const resp = await fetch(`/api/bookings?unit_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) { set({ classes: [] }); return }
          const payload = await resp.json()
          const rows = Array.isArray(payload?.bookings) ? payload.bookings : []
          const classes: Class[] = rows.map((b: any) => {
            const dt = new Date(b.date)
            const hh = dt.getHours().toString().padStart(2, '0')
            const mm = dt.getMinutes().toString().padStart(2, '0')
            let status: 'scheduled' | 'completed' | 'cancelled' = 'scheduled'
            if (b.status === 'COMPLETED') status = 'completed'
            else if (b.status === 'CANCELED' || b.status === 'CANCELLED') status = 'cancelled'
            return {
              id: b.id,
              teacherId: b.teacherId,
              studentId: b.studentId,
              date: dt.toISOString().split('T')[0],
              time: `${hh}:${mm}`,
              status,
              price: b.creditsCost || 0,
              duration: b.duration || 60,
              created_at: b.date
            }
          })
          set({ classes })
        } catch {
          set({ classes: [] })
        }
      },

      updateClass: async (id, updates) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          // Apenas atualização de status é suportada via API
          if (!updates.status) return false
          const statusMap: Record<string, string> = {
            completed: 'DONE',
            cancelled: 'CANCELED',
            scheduled: 'RESERVED'
          }
          const mapped = statusMap[updates.status]
          if (!mapped) return false

          const resp = await fetch(`/api/bookings/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ status: mapped })
          })
          if (!resp.ok) return false

          await get().fetchClasses()
          return true
        } catch (error) {
          return false
        }
      },

      deleteClass: async (id) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/bookings/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return false
          await get().fetchClasses()
          return true
        } catch (error) {
          return false
        }
      },

      // Time Slots
      fetchTimeSlots: async () => {
        try {
          const { academy } = get()
          if (!academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/time-slots?academy_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) { set({ timeSlots: [] }); return }
          const payload = await resp.json()
          const data = Array.isArray(payload?.slots) ? payload.slots : []
          const timeSlots: TimeSlot[] = data.map((slot: any) => ({
            id: slot.id,
            time: slot.time,
            dayOfWeek: slot.day_of_week,
            isAvailable: slot.is_available,
            maxCapacity: slot.max_capacity || 1,
            created_at: slot.created_at
          }))
          set({ timeSlots })
        } catch {
          set({ timeSlots: [] })
        }
      },

      toggleTimeSlotAvailability: async (id) => {
        try {
          const { timeSlots } = get()
          const slot = timeSlots.find(s => s.id === id)
          if (!slot) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/time-slots/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ is_available: !slot.isAvailable })
          })
          if (!resp.ok) return false
          await get().fetchTimeSlots()
          return true
        } catch (error) {
          return false
        }
      },

      // Notifications
      fetchNotifications: async () => {
        try {
          const { franquiaUser, academy } = get()
          if (!franquiaUser || !academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/notifications?academy_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return
          const payload = await resp.json()
          set({
            notifications: payload.notifications || [],
            unreadNotifications: payload.unreadCount || 0
          })
        } catch (error) {
        }
      },

      markNotificationAsRead: async (id) => {
        try {
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) return false
          await get().fetchNotifications()
          return true
        } catch (error) {
          return false
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/notifications/mark-all-read`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ academy_id: academy.id })
          })
          if (!resp.ok) return false
          await get().fetchNotifications()
          return true
        } catch (error) {
          return false
        }
      },

      // Teacher Plans
      fetchTeacherPlans: async () => {
        try {
          const { academy } = get()
          if (!academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/plans/teacher?academy_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) { set({ teacherPlans: [] }); return }
          const payload = await resp.json()
          set({ teacherPlans: payload.plans || [] })
        } catch (error) {
          set({ teacherPlans: [] })
        }
      },

      createTeacherPlan: async (planData) => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const resp = await fetch(`/api/plans/teachers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              academy_id: academy.id,
              name: planData.name,
              description: planData.description,
              price: planData.price,
              commission_rate: planData.commission_rate,
              features: planData.features
            })
          })
          if (!resp.ok) return false
          await get().fetchTeacherPlans()
          return true
        } catch (error) {
          return false
        }
      },

      // Student Plans (usa academy_plans)
      fetchStudentPlans: async () => {
        try {
          const { academy } = get()
          if (!academy) return
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}
          const resp = await fetch(`/api/plans/student?academy_id=${academy.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!resp.ok) { set({ studentPlans: [] }); return }
          const payload = await resp.json()
          set({ studentPlans: payload.plans || [] })
        } catch {
          set({ students: [] })
        }
      },

      createStudentPlan: async (planData) => {
        try {
          const { academy } = get()
          if (!academy) return false
          // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
          let token: string | null = null
          try { token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null } catch {}

          const resp = await fetch(`/api/plans/students`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ ...planData, academy_id: academy.id })
          })
          if (!resp.ok) return false
          await get().fetchStudentPlans()
          return true
        } catch (error) {
          return false
        }
      },

      // Approval Requests
      fetchApprovalRequests: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          const { data, error } = await supabase
            .from('approval_requests')
            .select(`
              *,
              user:users(*),
              academy:academies(*)
            `)
            .eq('academy_id', academy.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

          if (error) {
            // Silenciar erro - não é crítico para o login
            set({ approvalRequests: [] })
            return
          }

          set({ approvalRequests: data || [] })
        } catch (error) {
          // Silenciar erro - não é crítico para o login
          set({ approvalRequests: [] })
        }
      },

      approveRequest: async (id, reviewerId) => {
        try {
          const { error } = await supabase
            .from('approval_requests')
            .update({
              status: 'approved',
              reviewed_by: reviewerId,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', id)

          if (error) throw error

          // Recarregar lista
          await get().fetchApprovalRequests()
          await get().fetchNotifications()
          return true
        } catch (error) {
          return false
        }
      },

      rejectRequest: async (id, reviewerId, reason) => {
        try {
          const { error } = await supabase
            .from('approval_requests')
            .update({
              status: 'rejected',
              reviewed_by: reviewerId,
              reviewed_at: new Date().toISOString(),
              rejection_reason: reason
            })
            .eq('id', id)

          if (error) throw error

          // Recarregar lista
          await get().fetchApprovalRequests()
          return true
        } catch (error) {
          return false
        }
      }
    }),
    {
      name: 'franquia-storage',
      partialize: (state) => ({
        franquiaUser: state.franquiaUser,
        academy: state.academy,
        isAuthenticated: state.isAuthenticated,
        sessionChecked: state.sessionChecked
      })
    }
  )
)
