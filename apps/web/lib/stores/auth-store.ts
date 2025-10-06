import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  credits: number
  avatar_url?: string
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
    phone?: string
    role: UserRole
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
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
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
                credits: user.credits,
                avatar_url: user.avatarUrl ?? user.avatar_url,
              },
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            set({ isLoading: false, isAuthenticated: false })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        try {
          // Usar a API do backend para login
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
          
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          })

          const data = await response.json()

          if (!response.ok) {
            console.error('Login error:', data.message)
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
                credits: data.user.credits,
                avatar_url: data.user.avatarUrl
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
        } catch (error) {
          console.error('Login error:', error)
          return false
        }
      },

      register: async (userData) => {
        try {
          // Usar a API do backend para registro (não depende do Supabase Auth)
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
          
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
              role: userData.role
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
                credits: data.user.credits,
                avatar_url: data.user.avatarUrl
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
          console.error('Registration error:', error instanceof Error ? error.message : error)
          throw error // Re-throw para capturar no componente
        }
      },

      logout: async (options?: { redirect?: boolean }) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
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
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      updateUser: async (userData) => {
        const currentUser = get().user
        const token = get().token
        if (!currentUser || !token) return

        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
          const resp = await fetch(`${API_URL}/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
          })
          if (!resp.ok) {
            console.error('Update user error:', await resp.text())
            return
          }
          const { user } = await resp.json()
          if (user) {
            set({
              user: {
                ...currentUser,
                ...user,
                avatar_url: user.avatarUrl ?? user.avatar_url,
              }
            })
          }
        } catch (error) {
          console.error('Update user error:', error)
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


