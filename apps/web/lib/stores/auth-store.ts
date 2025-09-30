import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
// import type { User as SupabaseUser } from '@supabase/supabase-js' // Removido - não usado

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
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Buscar dados completos do usuário
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (userData) {
              set({
                user: {
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  phone: userData.phone,
                  role: userData.role,
                  credits: userData.credits,
                  avatar_url: userData.avatar_url
                },
                isAuthenticated: true,
                isLoading: false
              })
            }
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
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
              isAuthenticated: true
            })
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
              isAuthenticated: true
            })

            // Fazer login no Supabase Auth para manter sessão (opcional)
            // Por enquanto vamos pular isso já que o Auth está desabilitado
            
            return true
          }

          return false
        } catch (error) {
          console.error('Registration error:', error instanceof Error ? error.message : error)
          throw error // Re-throw para capturar no componente
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, isAuthenticated: false })
          
          // Redirecionar para landing page
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      updateUser: async (userData) => {
        const currentUser = get().user
        if (!currentUser) return

        try {
          const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', currentUser.id)
            .select()
            .single()

          if (error) {
            console.error('Update user error:', error)
            return
          }

          if (data) {
            set({
              user: {
                ...currentUser,
                ...data
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
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Listener para mudanças de auth
supabase.auth.onAuthStateChange((event, session) => {
  const { initialize } = useAuthStore.getState()
  
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  } else if (event === 'SIGNED_IN' && session) {
    initialize()
  }
})
