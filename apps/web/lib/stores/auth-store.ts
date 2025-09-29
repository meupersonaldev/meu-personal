import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
// import type { User as SupabaseUser } from '@supabase/supabase-js' // Removido - não usado

export type UserRole = 'STUDENT' | 'TEACHER'

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
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) {
            console.error('Login error:', error)
            return false
          }

          if (data.user) {
            // Buscar dados completos do usuário
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
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
                isAuthenticated: true
              })
              return true
            }
          }

          return false
        } catch (error) {
          console.error('Login error:', error)
          return false
        }
      },

      register: async (userData) => {
        try {
          // 1. Criar usuário no Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password
          })

          if (authError) {
            console.error('Auth signup error:', authError)
            return false
          }

          if (authData.user) {
            // 2. Criar perfil na tabela users
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                role: userData.role,
                credits: userData.role === 'STUDENT' ? 5 : 0 // Créditos de boas-vindas
              })
              .select()
              .single()

            if (profileError) {
              console.error('Profile creation error:', profileError)
              return false
            }

            // 3. Se for professor, criar perfil de professor
            if (userData.role === 'TEACHER') {
              await supabase
                .from('teacher_profiles')
                .insert({
                  user_id: authData.user.id,
                  hourly_rate: 80.00,
                  is_available: true
                })
            }

            // 4. Atualizar estado
            if (userProfile) {
              set({
                user: {
                  id: userProfile.id,
                  name: userProfile.name,
                  email: userProfile.email,
                  phone: userProfile.phone,
                  role: userProfile.role,
                  credits: userProfile.credits,
                  avatar_url: userProfile.avatar_url
                },
                isAuthenticated: true
              })
              return true
            }
          }

          return false
        } catch (error) {
          console.error('Registration error:', error)
          return false
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
