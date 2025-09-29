import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Helpers para cookie de autenticação usado pelo middleware
function setAuthCookie() {
  if (typeof document !== 'undefined') {
    // Cookie simples apenas para o middleware identificar que há sessão
    document.cookie = `auth-token=mock-token; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax` // 7 dias
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax'
  }
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  credits: number
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: Omit<User, 'id' | 'credits'> & { password: string }) => Promise<boolean>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

// Dados mockados de usuários
const mockUsers: (User & { password: string })[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    password: '123456',
    phone: '(11) 99999-9999',
    role: 'STUDENT',
    credits: 15,
    avatar: '/images/avatars/joao.jpg'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@email.com',
    password: '123456',
    phone: '(11) 88888-8888',
    role: 'TEACHER',
    credits: 0,
    avatar: '/images/avatars/maria.jpg'
  },
  {
    id: '3',
    name: 'Carlos Personal',
    email: 'carlos@email.com',
    password: '123456',
    phone: '(11) 77777-7777',
    role: 'TEACHER',
    credits: 0,
    avatar: '/images/avatars/carlos.jpg'
  },
  {
    id: '4',
    name: 'Ana Aluna',
    email: 'ana@email.com',
    password: '123456',
    phone: '(11) 66666-6666',
    role: 'STUDENT',
    credits: 8,
    avatar: '/images/avatars/ana.jpg'
  }
]

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const user = mockUsers.find(u => u.email === email && u.password === password)
        
        if (user) {
          const { password: _, ...userWithoutPassword } = user
          set({ user: userWithoutPassword, isAuthenticated: true })
          // Sinaliza para o middleware que o usuário está autenticado
          setAuthCookie()
          return true
        }
        
        return false
      },

      register: async (userData) => {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verificar se email já existe
        const existingUser = mockUsers.find(u => u.email === userData.email)
        if (existingUser) {
          return false
        }
        
        // Criar novo usuário
        const newUser: User = {
          id: Date.now().toString(),
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          credits: userData.role === 'STUDENT' ? 5 : 0, // Créditos de boas-vindas
          avatar: userData.avatar
        }
        
        // Adicionar aos dados mockados
        mockUsers.push({ ...newUser, password: userData.password })
        
        set({ user: newUser, isAuthenticated: true })
        // Sinaliza para o middleware que o usuário está autenticado
        setAuthCookie()
        return true
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
        // Remove o cookie para o middleware bloquear rotas protegidas
        clearAuthCookie()
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)
