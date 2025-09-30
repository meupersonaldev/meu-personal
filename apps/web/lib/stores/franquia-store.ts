import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

// Types
export interface FranquiaUser {
  id: string
  name: string
  email: string
  role: 'FRANCHISE_ADMIN'
  academyId: string
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
}

export interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  specialties: string[]
  status: 'active' | 'inactive' | 'pending'
  rating?: number
  total_reviews: number
  commission_rate: number
  created_at: string
}

export interface Student {
  id: string
  name: string
  email: string
  phone?: string
  credits: number
  status: 'active' | 'inactive'
  join_date: string
  last_activity: string
  planId?: string
  plan_id?: string
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
  validity_days: number
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
  
  // Teachers
  fetchTeachers: () => Promise<void>
  addTeacher: (teacherData: Omit<Teacher, 'id' | 'created_at'>) => Promise<boolean>
  updateTeacher: (id: string, updates: Partial<Teacher>) => Promise<boolean>
  deleteTeacher: (id: string) => Promise<boolean>
  
  // Students
  fetchStudents: () => Promise<void>
  addStudent: (studentData: Omit<Student, 'id' | 'join_date'>) => Promise<boolean>
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
          
          // Primeiro, buscar o usuário pelo email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

          if (userError || !userData) {
            console.error('User not found:', userError)
            return false
          }

          // Verificar se é admin da franquia OU super admin da franqueadora
          let adminData = null
          let academyId = null

          // Primeiro, tentar buscar na tabela franchise_admins (admin de academia)
          const { data: franchiseAdminData, error: franchiseAdminError } = await supabase
            .from('franchise_admins')
            .select('*')
            .eq('user_id', userData.id)
            .single()

          if (franchiseAdminData) {
            adminData = franchiseAdminData
            academyId = franchiseAdminData.academy_id
          } else {
            // Se não encontrou, tentar buscar na tabela franqueadora_admins (super admin)
            const { data: superAdminData, error: superAdminError } = await supabase
              .from('franqueadora_admins')
              .select('*')
              .eq('user_id', userData.id)
              .single()

            if (superAdminData) {
              adminData = superAdminData
              // Super admin pode acessar qualquer academia, vamos pegar a primeira
              const { data: firstAcademy } = await supabase
                .from('academies')
                .select('*')
                .limit(1)
                .single()
              
              academyId = firstAcademy?.id
            }
          }

          if (!adminData) {
            console.error('Admin not found in any table')
            return false
          }

          // Buscar dados da academia separadamente
          const { data: academyData, error: academyError } = await supabase
            .from('academies')
            .select('*')
            .eq('id', academyId)
            .single()

          if (academyError || !academyData) {
            console.error('Academy not found:', academyError)
            return false
          }

          // Simular verificação de senha (em produção seria Supabase Auth)
          if (password !== '123456') {
            return false
          }

          set({
            franquiaUser: {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: 'FRANCHISE_ADMIN',
              academyId: academyId
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
            fetchStudentPlans,
            fetchApprovalRequests
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
              fetchStudentPlans(),
              fetchApprovalRequests()
            ])
          } catch (error) {
            console.warn('Some initial data failed to load:', error)
            // Não falhar o login por causa disso
          }

          console.log('Login successful, returning true')
          return true
        } catch (error) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      logout: () => {
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

        // Redirecionar para landing page
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      },

      setAcademy: (academy: Academy) => {
        set({ academy })
      },

      // Teachers
      fetchTeachers: async () => {
        try {
          const { academy } = get()
          console.log('Fetching teachers for academy:', academy)
          if (!academy) {
            console.log('No academy set!')
            return
          }

          const { data, error } = await supabase
            .from('academy_teachers')
            .select('*')
            .eq('academy_id', academy.id)

          console.log('Academy teachers data:', data)
          console.log('Academy teachers error:', error)

          if (error) {
            console.error('Query error:', error)
            set({ teachers: [] })
            return
          }

          // Se não há dados, definir array vazio
          if (!data || data.length === 0) {
            console.log('No teachers found for academy')
            set({ teachers: [] })
            return
          }

          // Buscar dados dos usuários separadamente
          const teacherIds = data.map(item => item.teacher_id)
          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .in('id', teacherIds)

          const teachers: Teacher[] = data.map(item => {
            const user = usersData?.find(u => u.id === item.teacher_id)
            return {
              id: user?.id || item.teacher_id,
              name: user?.name || 'Professor',
              email: user?.email || '',
              phone: user?.phone || '',
              specialties: [],
              status: item.status || 'active',
              rating: 0,
              total_reviews: 0,
              commission_rate: item.commission_rate || 0,
              created_at: item.created_at
            }
          })

          set({ teachers })
        } catch (error) {
          console.error('Error fetching teachers:', error)
        }
      },

      addTeacher: async (teacherData) => {
        try {
          const { academy } = get()
          if (!academy) return false

          // 1. Criar usuário
          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert({
              name: teacherData.name,
              email: teacherData.email,
              phone: teacherData.phone,
              role: 'TEACHER',
              credits: 0
            })
            .select()
            .single()

          if (userError) throw userError

          // 2. Criar perfil de professor
          await supabase
            .from('teacher_profiles')
            .insert({
              user_id: userData.id,
              specialties: teacherData.specialties,
              hourly_rate: 80.00,
              is_available: true
            })

          // 3. Vincular à academia
          await supabase
            .from('academy_teachers')
            .insert({
              teacher_id: userData.id,
              academy_id: academy.id,
              status: teacherData.status,
              commission_rate: teacherData.commission_rate
            })

          // Recarregar lista
          await get().fetchTeachers()
          return true
        } catch (error) {
          console.error('Error adding teacher:', error)
          return false
        }
      },

      updateTeacher: async (id, updates) => {
        try {
          // Atualizar dados do usuário
          if (updates.name || updates.email || updates.phone) {
            await supabase
              .from('users')
              .update({
                name: updates.name,
                email: updates.email,
                phone: updates.phone
              })
              .eq('id', id)
          }

          // Atualizar perfil do professor
          if (updates.specialties) {
            await supabase
              .from('teacher_profiles')
              .update({
                specialties: updates.specialties
              })
              .eq('user_id', id)
          }

          // Atualizar vínculo com academia
          if (updates.status || updates.commission_rate) {
            await supabase
              .from('academy_teachers')
              .update({
                status: updates.status,
                commission_rate: updates.commission_rate
              })
              .eq('teacher_id', id)
          }

          // Recarregar lista
          await get().fetchTeachers()
          return true
        } catch (error) {
          console.error('Error updating teacher:', error)
          return false
        }
      },

      deleteTeacher: async (id) => {
        try {
          const { academy } = get()
          if (!academy) return false

          // Remover vínculo com academia (hard delete)
          await supabase
            .from('academy_teachers')
            .delete()
            .eq('teacher_id', id)
            .eq('academy_id', academy.id)

          // Deletar perfil de professor
          await supabase
            .from('teacher_profiles')
            .delete()
            .eq('user_id', id)

          // Deletar usuário
          await supabase
            .from('users')
            .delete()
            .eq('id', id)

          // Recarregar lista
          await get().fetchTeachers()
          return true
        } catch (error) {
          console.error('Error deleting teacher:', error)
          return false
        }
      },

      // Students
      fetchStudents: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          const { data, error } = await supabase
            .from('academy_students')
            .select(`
              *,
              users!academy_students_student_id_fkey(*)
            `)
            .eq('academy_id', academy.id)

          if (error) throw error

          const students: Student[] = data.map(item => ({
            id: item.users.id,
            name: item.users.name,
            email: item.users.email,
            phone: item.users.phone,
            credits: item.users.credits,
            status: item.status,
            join_date: item.join_date,
            last_activity: item.last_activity,
            planId: item.plan_id,
            plan_id: item.plan_id
          }))

          set({ students })
        } catch (error) {
          console.error('Error fetching students:', error)
        }
      },

      addStudent: async (studentData) => {
        try {
          const { academy } = get()
          if (!academy) return false

          // 1. Criar usuário
          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert({
              name: studentData.name,
              email: studentData.email,
              phone: studentData.phone,
              role: 'STUDENT',
              credits: studentData.credits
            })
            .select()
            .single()

          if (userError) throw userError

          // 2. Vincular à academia
          await supabase
            .from('academy_students')
            .insert({
              student_id: userData.id,
              academy_id: academy.id,
              status: studentData.status,
              plan_id: studentData.plan_id
            })

          // Recarregar lista
          await get().fetchStudents()
          return true
        } catch (error) {
          console.error('Error adding student:', error)
          return false
        }
      },

      updateStudent: async (id, updates) => {
        try {
          // Atualizar dados do usuário
          if (updates.name || updates.email || updates.phone || updates.credits !== undefined) {
            await supabase
              .from('users')
              .update({
                name: updates.name,
                email: updates.email,
                phone: updates.phone,
                credits: updates.credits
              })
              .eq('id', id)
          }

          // Atualizar vínculo com academia
          if (updates.status || updates.plan_id) {
            await supabase
              .from('academy_students')
              .update({
                status: updates.status,
                plan_id: updates.plan_id,
                last_activity: new Date().toISOString()
              })
              .eq('student_id', id)
          }

          // Recarregar lista
          await get().fetchStudents()
          return true
        } catch (error) {
          console.error('Error updating student:', error)
          return false
        }
      },

      deleteStudent: async (id) => {
        try {
          const { academy } = get()
          if (!academy) return false

          // Remover vínculo com academia (hard delete)
          await supabase
            .from('academy_students')
            .delete()
            .eq('student_id', id)
            .eq('academy_id', academy.id)

          // Deletar usuário
          await supabase
            .from('users')
            .delete()
            .eq('id', id)

          // Recarregar lista
          await get().fetchStudents()
          return true
        } catch (error) {
          console.error('Error deleting student:', error)
          return false
        }
      },

      // Plans
      fetchPlans: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          const { data, error } = await supabase
            .from('academy_plans')
            .select('*')
            .eq('academy_id', academy.id)
            .order('created_at', { ascending: false })

          if (error) throw error

          const plans: Plan[] = (data || []).map(plan => ({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            credits_included: plan.credits_included,
            hoursIncluded: plan.credits_included, // Map credits to hours for now
            duration_days: plan.duration_days,
            features: plan.features || ['Acesso às aulas', 'Suporte personalizado'],
            status: plan.is_active ? 'active' : 'inactive',
            is_active: plan.is_active,
            created_at: plan.created_at
          }))

          set({ plans })
        } catch (error) {
          console.error('Error fetching plans:', error)
          set({ plans: [] })
        }
      },

      addPlan: async (planData) => {
        try {
          const { academy } = get()
          if (!academy) return false

          await supabase
            .from('academy_plans')
            .insert({
              ...planData,
              academy_id: academy.id
            })

          // Recarregar lista
          await get().fetchPlans()
          return true
        } catch (error) {
          console.error('Error adding plan:', error)
          return false
        }
      },

      updatePlan: async (id, updates) => {
        try {
          await supabase
            .from('academy_plans')
            .update(updates)
            .eq('id', id)

          // Recarregar lista
          await get().fetchPlans()
          return true
        } catch (error) {
          console.error('Error updating plan:', error)
          return false
        }
      },

      deletePlan: async (id) => {
        try {
          await supabase
            .from('academy_plans')
            .update({ is_active: false })
            .eq('id', id)

          // Recarregar lista
          await get().fetchPlans()
          return true
        } catch (error) {
          console.error('Error deleting plan:', error)
          return false
        }
      },

      // Analytics
      fetchAnalytics: async () => {
        try {
          const { academy, teachers, students, classes } = get()
          if (!academy) return

          // Calcular analytics básicos
          const analytics: Analytics = {
            totalTeachers: teachers.length,
            totalStudents: students.length,
            totalRevenue: students.reduce((sum, student) => sum + (student.credits * 10), 0), // Estimativa
            totalClasses: classes.length,
            activeTeachers: teachers.filter(t => t.status === 'active').length,
            activeStudents: students.filter(s => s.status === 'active').length,
            monthlyGrowth: 15.5 // Mock por enquanto
          }

          set({ analytics })
        } catch (error) {
          console.error('Error fetching analytics:', error)
        }
      },

      // Classes (Agendamentos)
      fetchClasses: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          // Buscar todos os bookings e filtrar por professores/alunos da academia
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('date', { ascending: false })

          if (error) throw error

          const classes: Class[] = (data || []).map(booking => {
            // Extrair hora da data completa
            const bookingDate = new Date(booking.date)
            const hours = bookingDate.getHours().toString().padStart(2, '0')
            const minutes = bookingDate.getMinutes().toString().padStart(2, '0')
            const time = `${hours}:${minutes}`
            
            // Converter data para formato YYYY-MM-DD
            const dateOnly = bookingDate.toISOString().split('T')[0]
            
            // Mapear status do backend para frontend
            let status: 'scheduled' | 'completed' | 'cancelled' = 'scheduled'
            if (booking.status === 'COMPLETED') status = 'completed'
            else if (booking.status === 'CANCELLED') status = 'cancelled'
            else if (booking.status === 'CONFIRMED' || booking.status === 'PENDING') status = 'scheduled'

            return {
              id: booking.id,
              teacherId: booking.teacher_id,
              studentId: booking.student_id,
              date: dateOnly,
              time: time,
              status: status,
              price: booking.credits_cost || 0,
              duration: booking.duration || 60,
              created_at: booking.created_at
            }
          })

          set({ classes })
        } catch (error) {
          console.error('Error fetching classes:', error)
          set({ classes: [] })
        }
      },

      updateClass: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', id)

          if (error) throw error

          // Recarregar lista
          await get().fetchClasses()
          return true
        } catch (error) {
          console.error('Error updating class:', error)
          return false
        }
      },

      deleteClass: async (id) => {
        try {
          const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id)

          if (error) throw error

          // Recarregar lista
          await get().fetchClasses()
          return true
        } catch (error) {
          console.error('Error deleting class:', error)
          return false
        }
      },

      // Time Slots
      fetchTimeSlots: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          const { data, error } = await supabase
            .from('academy_time_slots')
            .select('*')
            .eq('academy_id', academy.id)
            .order('day_of_week', { ascending: true })
            .order('time', { ascending: true })

          if (error) throw error

          const timeSlots: TimeSlot[] = (data || []).map(slot => ({
            id: slot.id,
            time: slot.time,
            dayOfWeek: slot.day_of_week,
            isAvailable: slot.is_available,
            maxCapacity: slot.max_capacity || 1,
            created_at: slot.created_at
          }))

          set({ timeSlots })
        } catch (error) {
          console.error('Error fetching time slots:', error)
          set({ timeSlots: [] })
        }
      },

      toggleTimeSlotAvailability: async (id) => {
        try {
          const { timeSlots } = get()
          const slot = timeSlots.find(s => s.id === id)
          if (!slot) return false

          const { error } = await supabase
            .from('academy_time_slots')
            .update({ is_available: !slot.isAvailable })
            .eq('id', id)

          if (error) throw error

          // Recarregar lista
          await get().fetchTimeSlots()
          return true
        } catch (error) {
          console.error('Error toggling time slot availability:', error)
          return false
        }
      },

      // Notifications
      fetchNotifications: async () => {
        try {
          const { franquiaUser } = get()
          if (!franquiaUser) return

          const { data, error } = await supabase
            .from('franchise_notifications')
            .select('*')
            .eq('franchise_admin_id', franquiaUser.id)
            .order('created_at', { ascending: false })
            .limit(100)

          if (error) throw error

          const unreadCount = data?.filter((n: Notification) => !n.is_read).length || 0

          set({
            notifications: data || [],
            unreadNotifications: unreadCount
          })
        } catch (error) {
          console.error('Error fetching notifications:', error)
          set({ notifications: [], unreadNotifications: 0 })
        }
      },

      markNotificationAsRead: async (id) => {
        try {
          const { error } = await supabase
            .from('franchise_notifications')
            .update({ is_read: true })
            .eq('id', id)

          if (error) throw error

          // Recarregar notificações
          await get().fetchNotifications()
          return true
        } catch (error) {
          console.error('Error marking notification as read:', error)
          return false
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          const { franquiaUser } = get()
          if (!franquiaUser) return false

          const { error } = await supabase
            .from('franchise_notifications')
            .update({ is_read: true })
            .eq('franchise_admin_id', franquiaUser.id)
            .eq('is_read', false)

          if (error) throw error

          // Recarregar notificações
          await get().fetchNotifications()
          return true
        } catch (error) {
          console.error('Error marking all notifications as read:', error)
          return false
        }
      },

      // Teacher Plans
      fetchTeacherPlans: async () => {
        try {
          const { data, error } = await supabase
            .from('teacher_plans')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ teacherPlans: data || [] })
        } catch (error) {
          console.error('Error fetching teacher plans:', error)
          set({ teacherPlans: [] })
        }
      },

      createTeacherPlan: async (planData) => {
        try {
          const { error } = await supabase
            .from('teacher_plans')
            .insert([planData])

          if (error) throw error

          // Recarregar lista
          await get().fetchTeacherPlans()
          return true
        } catch (error) {
          console.error('Error creating teacher plan:', error)
          return false
        }
      },

      // Student Plans (usa academy_plans)
      fetchStudentPlans: async () => {
        try {
          const { academy } = get()
          if (!academy) return

          const { data, error } = await supabase
            .from('academy_plans')
            .select('*')
            .eq('academy_id', academy.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ studentPlans: data || [] })
        } catch (error) {
          console.error('Error fetching student plans:', error)
          set({ studentPlans: [] })
        }
      },

      createStudentPlan: async (planData) => {
        try {
          const { academy } = get()
          if (!academy) return false

          const { error } = await supabase
            .from('academy_plans')
            .insert([{ ...planData, academy_id: academy.id }])

          if (error) throw error

          // Recarregar lista
          await get().fetchStudentPlans()
          return true
        } catch (error) {
          console.error('Error creating student plan:', error)
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

          if (error) throw error

          set({ approvalRequests: data || [] })
        } catch (error) {
          console.error('Error fetching approval requests:', error)
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
          console.error('Error approving request:', error)
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
          console.error('Error rejecting request:', error)
          return false
        }
      }
    }),
    {
      name: 'franquia-storage',
      partialize: (state) => ({
        franquiaUser: state.franquiaUser,
        academy: state.academy,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
