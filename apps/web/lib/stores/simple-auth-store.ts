import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

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
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
}

// Senhas mockadas para MVP (em produção seria hash)
const mockPasswords: Record<string, string> = {
  'joao@email.com': '123456',
  'maria@email.com': '123456',
  'carlos@email.com': '123456',
  'ana@email.com': '123456'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          // Verificar senha mockada
          if (mockPasswords[email] !== password) {
            return false
          }

          // Buscar dados do usuário na tabela
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single()

          if (error || !userData) {
            console.error('User not found:', error)
            return false
          }

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
        } catch (error) {
          console.error('Login error:', error)
          return false
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
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
      name: 'simple-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
