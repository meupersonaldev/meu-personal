import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'STUDENT'
  | 'TEACHER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'FRANCHISE_ADMIN'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatar_url?: string
  approval_status?: 'pending' | 'approved' | 'rejected'
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY'
}

interface LoginResult {
  success: boolean
  error?: string
  code?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean | LoginResult>
  register: (userData: {
    name: string
    email: string
    password: string
    passwordConfirmation: string
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

// Helper central para criar/remover cookie considerando cross-site/HTTPS
export function setAuthCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60 // 7 dias
  let sameSite: 'Lax' | 'None' = 'Lax'
  let secure = ''
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const pageOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const apiOrigin = new URL(apiUrl).origin
    const crossSite = pageOrigin && apiOrigin && apiOrigin !== pageOrigin
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    if (crossSite) {
      sameSite = 'None'
      secure = '; Secure'
    } else if (isHttps) {
      secure = '; Secure'
    }
  } catch {}
  document.cookie = `auth-token=${token}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`
}

export function clearAuthCookie() {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  // Remover tanto Lax quanto None possíveis
  document.cookie = `auth-token=; Path=/; Max-Age=0; SameSite=Lax${isHttps ? '; Secure' : ''}`
  document.cookie = `auth-token=; Path=/; Max-Age=0; SameSite=None; Secure`
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
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const token = get().token
          if (!token) {
            set({ isLoading: false, isAuthenticated: false, user: null })
            return
          }
          const resp = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (!resp.ok) {
            set({
              isLoading: false,
              isAuthenticated: false,
              user: null,
              token: null
            })
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
                gender: user.gender
              },
              isAuthenticated: true,
              isLoading: false
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
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          })

          const data = await response.json()

          if (!response.ok) {
            // Retornar objeto com erro para mensagens específicas (ex: usuário inativo)
            return { success: false, error: data.message || 'Erro no login', code: data.code }
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
                approval_status: data.user.approval_status
              },
              token: data.token || null,
              isAuthenticated: true
            })

            // Setar cookie auth-token com SameSite/Secure apropriados (SSE precisa do cookie)
            if (typeof document !== 'undefined' && data.token) {
              setAuthCookie(data.token)
            }
            return true
          }

          return false
        } catch {
          return false
        }
      },

      register: async userData => {
        try {
          // Usar a API do backend para registro (não depende do Supabase Auth)
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              passwordConfirmation: userData.passwordConfirmation,
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
                approval_status: data.user.approval_status
              },
              token: data.token || null,
              isAuthenticated: true
            })

            // Setar cookie auth-token com SameSite/Secure apropriados (SSE precisa do cookie)
            if (typeof document !== 'undefined' && data.token) {
              setAuthCookie(data.token)
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
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          // Opcional: avisar backend
          try {
            await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' })
          } catch {}
          set({ user: null, token: null, isAuthenticated: false })
          const shouldRedirect = options?.redirect ?? true

          // Remover cookie do middleware
          if (typeof document !== 'undefined') {
            clearAuthCookie()
          }

          // Redirecionar para página de login
          if (
            shouldRedirect &&
            typeof window !== 'undefined' &&
            window.location.pathname !== '/login'
          ) {
            window.location.href = '/login'
          }
        } catch {}
      },

      updateUser: async userData => {
        const currentUser = get().user
        const token = get().token
        if (!currentUser || !token) return

        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const resp = await fetch(`${API_URL}/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
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
                gender: user.gender
              }
            })
          }
        } catch (error) {}
      }
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
