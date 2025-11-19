import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './auth-store'
import api from '../api'

export type AppNotification = {
  id: string
  academy_id?: string
  user_id?: string
  type: string
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
}

interface NotificationsState {
  notifications: AppNotification[]
  unreadCount: number
  connections: Record<string, EventSource>
  connectAcademy: (academyId: string) => void
  connectFranqueadora: (franqueadoraId: string) => void
  connectUser: (userId: string) => void
  disconnectAll: () => void
  add: (n: AppNotification) => void
  markRead: (id: string) => Promise<void>
  markAllRead: (academyId: string) => Promise<void>
  markAllReadFranqueadora: (franqueadoraId: string) => Promise<void>
  fetchInitial: (params: { franqueadoraId?: string; academyId?: string; userId?: string; since?: string }) => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      connections: {},

      connectAcademy: (academyId: string) => {
        if (!academyId) return
        const key = `academy:${academyId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Get token from auth store or cookie
        const getToken = () => {
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) {
          console.warn('No auth token available for SSE stream')
          return
        }

        const url = `${API_URL}/api/notifications/stream?academy_id=${encodeURIComponent(academyId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any)
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.onerror = () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectAcademy(academyId), 3000)
        }
        set({ connections: { ...connections, [key]: es } })
      },

      connectFranqueadora: (franqueadoraId: string) => {
        if (!franqueadoraId) return
        const key = `franqueadora:${franqueadoraId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Get token from auth store or cookie
        const getToken = () => {
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) {
          console.warn('No auth token available for SSE stream')
          return
        }

        const url = `${API_URL}/api/notifications/stream?franqueadora_id=${encodeURIComponent(franqueadoraId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any)
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.onerror = () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectFranqueadora(franqueadoraId), 3000)
        }
        set({ connections: { ...connections, [key]: es } })
      },

      connectUser: (userId: string) => {
        if (!userId) return
        const key = `user:${userId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Get token from auth store or cookie
        const getToken = () => {
          // Try cookie first
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]

          // Fallback to auth store
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) {
          console.warn('No auth token available for SSE stream')
          return
        }

        const url = `${API_URL}/api/notifications/stream?user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any) // Disable credentials since we're sending token in query
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.onerror = () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectUser(userId), 3000)
        }
        set({ connections: { ...connections, [key]: es } })
      },

      disconnectAll: () => {
        const { connections } = get()
        Object.values(connections).forEach(es => { try { es.close() } catch {} })
        set({ connections: {} })
      },

      add: (n) => {
        const list = [n, ...get().notifications]
        set({ notifications: list, unreadCount: list.filter(x => !x.read).length })
      },

      markRead: async (id: string) => {
        try {
          await api.notifications.markAsRead(id)
          const list = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
          set({ notifications: list, unreadCount: list.filter((x) => !x.read).length })
        } catch (e) {
          console.error('Failed to mark notification as read:', e)
        }
      },

      markAllRead: async (academyId: string) => {
        try {
          // Esta função não existe na API, precisa ser criada ou ajustada
          // Por enquanto, vamos manter a lógica local de marcar como lido
          const list = get().notifications.map((n) => ({ ...n, read: true }))
          set({ notifications: list, unreadCount: 0 })
        } catch (e) {
          console.error('Failed to mark all notifications as read:', e)
        }
      },

      markAllReadFranqueadora: async (franqueadoraId: string) => {
        try {
          // Esta função não existe na API, precisa ser criada ou ajustada
          // Por enquanto, vamos manter a lógica local de marcar como lido
          const list = get().notifications.map((n) => ({ ...n, read: true }))
          set({ notifications: list, unreadCount: 0 })
        } catch (e) {
          console.error('Failed to mark all franqueadora notifications as read:', e)
        }
      },

      fetchInitial: async ({ franqueadoraId, academyId, userId, since }) => {
        try {
          const params: any = {}
          if (franqueadoraId) params.franqueadora_id = franqueadoraId
          if (academyId) params.academy_id = academyId
          if (userId) params.user_id = userId
          if (since) params.since = since

          const json = await api.notifications.getAll(params)
          const list = (json.notifications || []) as AppNotification[]
          set({ notifications: list, unreadCount: json.unreadCount || list.filter((n) => !n.read).length })
        } catch (e) {
          console.error('Failed to fetch initial notifications:', e)
        }
      }
    }),
    {
      name: 'notifications-storage',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount })
    }
  )
)
