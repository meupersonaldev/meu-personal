import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FranquiaUser {
  id: string
  name: string
  email: string
  role: 'FRANCHISE_ADMIN'
  academyId: string
}

export interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  status: 'active' | 'inactive' | 'pending'
  studentsCount: number
  rating: number
  totalClasses: number
  earnings: number
  createdAt: string
}

export interface Student {
  id: string
  name: string
  email: string
  phone: string
  credits: number
  status: 'active' | 'inactive'
  joinDate: string
  lastActivity: string
  planId?: string
}

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  type: 'package' // Pacote de horas
  features: string[]
  status: 'active' | 'inactive'
  hoursIncluded: number
  createdAt: string
}

export interface Class {
  id: string
  teacherId: string
  studentId: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  price: number
}

export interface TimeSlot {
  id: string
  time: string
  dayOfWeek: number // 0 = domingo, 1 = segunda, etc
  isAvailable: boolean
  maxCapacity: number
  createdAt: string
}

export interface Analytics {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  monthlyRevenue: number
  studentsGrowth: number
  teachersGrowth: number
  classesGrowth: number
  revenueGrowth: number
}

interface FranquiaState {
  franquiaUser: FranquiaUser | null
  teachers: Teacher[]
  students: Student[]
  classes: Class[]
  timeSlots: TimeSlot[]
  plans: Plan[]
  analytics: Analytics

  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void

  // Teachers
  addTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => void
  updateTeacher: (id: string, updates: Partial<Teacher>) => void
  deleteTeacher: (id: string) => void

  // Students
  addStudent: (student: Omit<Student, 'id'>) => void
  updateStudent: (id: string, updates: Partial<Student>) => void
  deleteStudent: (id: string) => void

  // Classes
  addClass: (classData: Omit<Class, 'id'>) => void
  updateClass: (id: string, updates: Partial<Class>) => void
  deleteClass: (id: string) => void

  // Time Slots
  addTimeSlot: (timeSlot: Omit<TimeSlot, 'id' | 'createdAt'>) => void
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void
  deleteTimeSlot: (id: string) => void
  toggleTimeSlotAvailability: (id: string) => void

  // Plans
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt'>) => void
  updatePlan: (id: string, updates: Partial<Plan>) => void
  deletePlan: (id: string) => void

  // Analytics
  updateAnalytics: () => void
}

// Mock data realista para academia pequena
const mockFranquiaUser: FranquiaUser = {
  id: 'franquia-001',
  name: 'Academia FitLife - Unidade Centro',
  email: 'admin@fitlife.com',
  role: 'FRANCHISE_ADMIN',
  academyId: 'academy-001'
}

const mockTeachers: Teacher[] = [
  {
    id: 'teacher-001',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '(11) 98765-4321',
    specialty: 'Musculação e Funcional',
    status: 'active',
    studentsCount: 2,
    rating: 4.9,
    totalClasses: 18,
    earnings: 630,
    createdAt: '2024-02-15'
  },
  {
    id: 'teacher-002',
    name: 'Carlos Silva',
    email: 'carlos@email.com',
    phone: '(11) 98765-4322',
    specialty: 'Crossfit e HIIT',
    status: 'active',
    studentsCount: 1,
    rating: 4.7,
    totalClasses: 12,
    earnings: 420,
    createdAt: '2024-03-01'
  }
]

const mockStudents: Student[] = [
  {
    id: 'student-001',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
    credits: 8,
    status: 'active',
    joinDate: '2024-02-20',
    lastActivity: '2024-03-19',
    planId: 'plan-001'
  },
  {
    id: 'student-002',
    name: 'Paula Santos',
    email: 'paula@email.com',
    phone: '(11) 99999-8888',
    credits: 12,
    status: 'active',
    joinDate: '2024-03-05',
    lastActivity: '2024-03-20',
    planId: 'plan-002'
  },
  {
    id: 'student-003',
    name: 'Roberto Lima',
    email: 'roberto@email.com',
    phone: '(11) 99999-7777',
    credits: 3,
    status: 'active',
    joinDate: '2024-03-10',
    lastActivity: '2024-03-18',
    planId: 'plan-001'
  }
]

const mockPlans: Plan[] = [
  {
    id: 'plan-001',
    name: 'Pacote Básico',
    description: 'Ideal para quem está começando',
    price: 50,
    type: 'package',
    features: [
      '1 hora de treino',
      'Acesso a todos os equipamentos',
      'Suporte básico'
    ],
    status: 'active',
    hoursIncluded: 1,
    createdAt: '2024-01-15'
  },
  {
    id: 'plan-002',
    name: 'Pacote Intermediário',
    description: 'Para quem quer treinar com regularidade',
    price: 225,
    type: 'package',
    features: [
      '5 horas de treino',
      'Acesso a todos os equipamentos',
      'Personal trainer incluso',
      'Avaliação física',
      'Desconto de 10%'
    ],
    status: 'active',
    hoursIncluded: 5,
    createdAt: '2024-01-15'
  },
  {
    id: 'plan-003',
    name: 'Pacote Premium',
    description: 'Para treinar com máxima flexibilidade',
    price: 400,
    type: 'package',
    features: [
      '10 horas de treino',
      'Acesso a todos os equipamentos',
      'Personal trainer incluso',
      'Avaliação física completa',
      'Desconto de 20%',
      'Prioridade no agendamento'
    ],
    status: 'active',
    hoursIncluded: 10,
    createdAt: '2024-02-01'
  }
]

const mockClasses: Class[] = [
  {
    id: 'class-001',
    teacherId: 'teacher-001',
    studentId: 'student-001',
    date: '2024-03-21',
    time: '14:00',
    status: 'scheduled',
    price: 50
  },
  {
    id: 'class-002',
    teacherId: 'teacher-002',
    studentId: 'student-002',
    date: '2024-03-20',
    time: '16:00',
    status: 'completed',
    price: 50
  },
  {
    id: 'class-003',
    teacherId: 'teacher-001',
    studentId: 'student-002',
    date: '2024-03-19',
    time: '10:00',
    status: 'completed',
    price: 50
  }
]

// Horários padrão da academia (segunda a domingo)
const mockTimeSlots: TimeSlot[] = [
  // Segunda-feira (1)
  { id: 'slot-mon-06', time: '06:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-07', time: '07:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-08', time: '08:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-09', time: '09:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-10', time: '10:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-14', time: '14:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-15', time: '15:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-16', time: '16:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-17', time: '17:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-18', time: '18:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-19', time: '19:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-20', time: '20:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-mon-21', time: '21:00', dayOfWeek: 1, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },

  // Terça-feira (2) - alguns horários indisponíveis
  { id: 'slot-tue-06', time: '06:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-07', time: '07:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-08', time: '08:00', dayOfWeek: 2, isAvailable: false, maxCapacity: 4, createdAt: '2024-01-01' }, // Indisponível
  { id: 'slot-tue-09', time: '09:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-10', time: '10:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-14', time: '14:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-15', time: '15:00', dayOfWeek: 2, isAvailable: false, maxCapacity: 4, createdAt: '2024-01-01' }, // Indisponível
  { id: 'slot-tue-16', time: '16:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-17', time: '17:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-18', time: '18:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-19', time: '19:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-20', time: '20:00', dayOfWeek: 2, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-tue-21', time: '21:00', dayOfWeek: 2, isAvailable: false, maxCapacity: 4, createdAt: '2024-01-01' }, // Indisponível

  // Quarta-feira (3)
  { id: 'slot-wed-06', time: '06:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-07', time: '07:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-08', time: '08:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-09', time: '09:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-10', time: '10:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-14', time: '14:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-15', time: '15:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-16', time: '16:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-17', time: '17:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-18', time: '18:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-19', time: '19:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-20', time: '20:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-wed-21', time: '21:00', dayOfWeek: 3, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },

  // Quinta-feira (4)
  { id: 'slot-thu-06', time: '06:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-07', time: '07:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-08', time: '08:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-09', time: '09:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-10', time: '10:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-14', time: '14:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-15', time: '15:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-16', time: '16:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-17', time: '17:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-18', time: '18:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-19', time: '19:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-20', time: '20:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-thu-21', time: '21:00', dayOfWeek: 4, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },

  // Sexta-feira (5) - horários reduzidos
  { id: 'slot-fri-06', time: '06:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-07', time: '07:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-08', time: '08:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-09', time: '09:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-10', time: '10:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-14', time: '14:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-15', time: '15:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-16', time: '16:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-17', time: '17:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-18', time: '18:00', dayOfWeek: 5, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-fri-19', time: '19:00', dayOfWeek: 5, isAvailable: false, maxCapacity: 4, createdAt: '2024-01-01' }, // Indisponível
  { id: 'slot-fri-20', time: '20:00', dayOfWeek: 5, isAvailable: false, maxCapacity: 4, createdAt: '2024-01-01' }, // Indisponível

  // Sábado (6) - só manhã
  { id: 'slot-sat-08', time: '08:00', dayOfWeek: 6, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-sat-09', time: '09:00', dayOfWeek: 6, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-sat-10', time: '10:00', dayOfWeek: 6, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },
  { id: 'slot-sat-11', time: '11:00', dayOfWeek: 6, isAvailable: true, maxCapacity: 4, createdAt: '2024-01-01' },

  // Domingo (0) - fechado
]

const initialAnalytics: Analytics = {
  totalStudents: 3,
  totalTeachers: 2,
  totalClasses: 3,
  monthlyRevenue: 1500,
  studentsGrowth: 50, // Crescimento alto para academia pequena
  teachersGrowth: 0,
  classesGrowth: 100, // Crescimento de aulas
  revenueGrowth: 200 // Crescimento de receita
}

export const useFranquiaStore = create<FranquiaState>()(
  persist(
    (set, get) => ({
      franquiaUser: null,
      teachers: mockTeachers,
      students: mockStudents,
      classes: mockClasses,
      timeSlots: mockTimeSlots,
      plans: mockPlans,
      analytics: initialAnalytics,

      login: async (email: string, password: string) => {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Verificar credenciais (demo)
        if (email === 'admin@fitlife.com' && password === 'franquia123') {
          set({ franquiaUser: mockFranquiaUser })
          return true
        }

        return false
      },

      logout: () => {
        set({ franquiaUser: null })
      },

      // Teachers Management
      addTeacher: (teacherData) => {
        const newTeacher: Teacher = {
          ...teacherData,
          id: `teacher-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0]
        }

        set((state) => ({
          teachers: [...state.teachers, newTeacher]
        }))

        get().updateAnalytics()
      },

      updateTeacher: (id, updates) => {
        set((state) => ({
          teachers: state.teachers.map(teacher =>
            teacher.id === id ? { ...teacher, ...updates } : teacher
          )
        }))

        get().updateAnalytics()
      },

      deleteTeacher: (id) => {
        set((state) => ({
          teachers: state.teachers.filter(teacher => teacher.id !== id)
        }))

        get().updateAnalytics()
      },

      // Students Management
      addStudent: (studentData) => {
        const newStudent: Student = {
          ...studentData,
          id: `student-${Date.now()}`
        }

        set((state) => ({
          students: [...state.students, newStudent]
        }))

        get().updateAnalytics()
      },

      updateStudent: (id, updates) => {
        set((state) => ({
          students: state.students.map(student =>
            student.id === id ? { ...student, ...updates } : student
          )
        }))

        get().updateAnalytics()
      },

      deleteStudent: (id) => {
        set((state) => ({
          students: state.students.filter(student => student.id !== id)
        }))

        get().updateAnalytics()
      },

      // Classes Management
      addClass: (classData) => {
        const newClass: Class = {
          ...classData,
          id: `class-${Date.now()}`
        }

        set((state) => ({
          classes: [...state.classes, newClass]
        }))

        get().updateAnalytics()
      },

      updateClass: (id, updates) => {
        set((state) => ({
          classes: state.classes.map(classItem =>
            classItem.id === id ? { ...classItem, ...updates } : classItem
          )
        }))

        get().updateAnalytics()
      },

      deleteClass: (id) => {
        set((state) => ({
          classes: state.classes.filter(classItem => classItem.id !== id)
        }))

        get().updateAnalytics()
      },

      // Time Slots Management
      addTimeSlot: (timeSlotData) => {
        const newTimeSlot: TimeSlot = {
          ...timeSlotData,
          id: `slot-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0]
        }

        set((state) => ({
          timeSlots: [...state.timeSlots, newTimeSlot]
        }))
      },

      updateTimeSlot: (id, updates) => {
        set((state) => ({
          timeSlots: state.timeSlots.map(slot =>
            slot.id === id ? { ...slot, ...updates } : slot
          )
        }))
      },

      deleteTimeSlot: (id) => {
        set((state) => ({
          timeSlots: state.timeSlots.filter(slot => slot.id !== id)
        }))
      },

      toggleTimeSlotAvailability: (id) => {
        set((state) => ({
          timeSlots: state.timeSlots.map(slot =>
            slot.id === id ? { ...slot, isAvailable: !slot.isAvailable } : slot
          )
        }))
      },

      // Plans Management
      addPlan: (planData) => {
        const newPlan: Plan = {
          ...planData,
          id: `plan-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0]
        }

        set((state) => ({
          plans: [...state.plans, newPlan]
        }))
      },

      updatePlan: (id, updates) => {
        set((state) => ({
          plans: state.plans.map(plan =>
            plan.id === id ? { ...plan, ...updates } : plan
          )
        }))
      },

      deletePlan: (id) => {
        set((state) => ({
          plans: state.plans.filter(plan => plan.id !== id)
        }))
      },

      // Analytics
      updateAnalytics: () => {
        const state = get()

        const completedClasses = state.classes.filter(c => c.status === 'completed')
        const totalRevenue = completedClasses.reduce((sum, c) => sum + c.price, 0)

        // Calcular estatísticas dos professores
        const teacherStats = state.teachers.map(teacher => {
          const teacherClasses = completedClasses.filter(c => c.teacherId === teacher.id)
          const teacherStudents = new Set(teacherClasses.map(c => c.studentId)).size
          const teacherEarnings = teacherClasses.reduce((sum, c) => sum + (c.price * 0.7), 0) // 70% para o professor

          return {
            ...teacher,
            studentsCount: teacherStudents,
            totalClasses: teacherClasses.length,
            earnings: teacherEarnings
          }
        })

        // Atualizar professores com estatísticas calculadas
        set({ teachers: teacherStats })

        // Atualizar último acesso dos alunos baseado nas aulas
        const updatedStudents = state.students.map(student => {
          const studentClasses = completedClasses.filter(c => c.studentId === student.id)
          if (studentClasses.length > 0) {
            const lastClass = studentClasses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            return {
              ...student,
              lastActivity: lastClass.date
            }
          }
          return student
        })

        set({ students: updatedStudents })

        const newAnalytics: Analytics = {
          totalStudents: state.students.filter(s => s.status === 'active').length,
          totalTeachers: state.teachers.filter(t => t.status === 'active').length,
          totalClasses: completedClasses.length,
          monthlyRevenue: totalRevenue,
          studentsGrowth: Math.floor(Math.random() * 30) + 10, // 10-40% crescimento para academia pequena
          teachersGrowth: state.teachers.filter(t => t.status === 'pending').length > 0 ? 50 : 0,
          classesGrowth: completedClasses.length > 0 ? Math.floor(Math.random() * 20) + 15 : 0,
          revenueGrowth: totalRevenue > 0 ? Math.floor(Math.random() * 25) + 20 : 0
        }

        set({ analytics: newAnalytics })
      }
    }),
    {
      name: 'franquia-storage',
      partialize: (state) => ({
        franquiaUser: state.franquiaUser,
        teachers: state.teachers,
        students: state.students,
        classes: state.classes,
        timeSlots: state.timeSlots,
        plans: state.plans,
        analytics: state.analytics
      })
    }
  )
)