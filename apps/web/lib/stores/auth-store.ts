import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatar_url?: string
  approval_status?: 'pending' | 'approved' | 'rejected'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: {
    name: string
    email: string
    password: string
    phone: string
    cpf: string
    gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY'
    role: UserRole
    teacher?: { cref?: string; specialties?: string[] }
  }) => Promise<boolean>
  logout: (options?: { redirect?: boolean }) => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          if (!token) {
            set({ isLoading: false, isAuthenticated: false, user: null })
            return
          }
          const resp = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!resp.ok) {
            set({ isLoading: false, isAuthenticated: false, user: null, token: null })
            return
          }
          const { user } = await resp.json()
          if (user) {
            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar_url: user.avatarUrl ?? user.avatar_url,
                approval_status: user.approval_status,
              },
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            set({ isLoading: false, isAuthenticated: false })
          }
        } catch {
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        try {
          // Usar a API do backend para login
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          })

          const data = await response.json()

          if (!response.ok) {
            return false
          }

          // Atualizar estado com os dados do usuário
          if (data.user) {
            set({
              user: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                avatar_url: data.user.avatarUrl,
                approval_status: data.user.approval_status,
              },
              token: data.token || null,
              isAuthenticated: true
            })

            // Setar cookie para o middleware do Next.js
            if (typeof document !== 'undefined' && data.token) {
              const maxAge = 7 * 24 * 60 * 60 // 7 dias
              const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
              document.cookie = `auth-token=${data.token}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
            }
            return true
          }

          return false
        } catch {
          return false
        }
      },

      register: async (userData) => {
        try {
          // Usar a API do backend para registro (não depende do Supabase Auth)
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              phone: userData.phone,
              cpf: userData.cpf,
              gender: userData.gender,
              role: userData.role,
              // dados profissionais (apenas para TEACHER)
              cref: userData.teacher?.cref,
              specialties: userData.teacher?.specialties
            })
          })

          const data = await response.json()

          if (!response.ok) {
            // Retornar objeto com erro para mostrar mensagem específica
            throw new Error(data.message || 'Erro ao criar conta')
          }

          // Atualizar estado com os dados do usuário
          if (data.user) {
            set({
              user: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                avatar_url: data.user.avatarUrl,
                approval_status: data.user.approval_status,
              },
              token: data.token || null,
              isAuthenticated: true
            })

            // Setar cookie para o middleware (se backend retornar token)
            if (typeof document !== 'undefined' && data.token) {
              const maxAge = 7 * 24 * 60 * 60
              const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
              document.cookie = `auth-token=${data.token}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
            }
            return true
          }

          return false
        } catch (error) {
          throw error // Re-throw para capturar no componente
        }
      },

      logout: async (options?: { redirect?: boolean }) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          // Opcional: avisar backend
          try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' }) } catch {}
          set({ user: null, token: null, isAuthenticated: false })
          const shouldRedirect = options?.redirect ?? true

          // Remover cookie do middleware
          if (typeof document !== 'undefined') {
            const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
            document.cookie = `auth-token=; Path=/; Max-Age=0; SameSite=Lax${secure}`
          }

          // Redirecionar para landing page
          if (shouldRedirect && typeof window !== 'undefined') {
            window.location.href = '/'
          }
        } catch {
        }
      },

      updateUser: async (userData) => {
        const currentUser = get().user
        const token = get().token
        if (!currentUser || !token) return

        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const resp = await fetch(`${API_URL}/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
          })
          if (!resp.ok) {
            return
          }
          const { user } = await resp.json()
          if (user) {
            set({
              user: {
                ...currentUser,
                ...user,
                avatar_url: user.avatarUrl ?? user.avatar_url,
                approval_status: user.approval_status,
              }
            })
          }
        } catch (error) {
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)


