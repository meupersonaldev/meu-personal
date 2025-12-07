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
  link?: string
  actor_id?: string
  role_scope?: string
  read: boolean
  created_at: string
}

interface NotificationsState {
  notifications: AppNotification[]
  unreadCount: number
  nextCursor: string | null
  loading: boolean
  connections: Record<string, EventSource>

  connectAcademy: (academyId: string) => void
  connectFranqueadora: (franqueadoraId: string) => void
  connectUser: (userId: string) => void
  disconnectAll: () => void

  add: (n: AppNotification) => void
  markRead: (id: string) => Promise<void>
  markAllRead: (academyId?: string, franqueadoraId?: string) => Promise<void>

  hydrate: (params: { franqueadoraId?: string; academyId?: string; userId?: string; since?: string }) => Promise<void>
  loadMore: (params: { franqueadoraId?: string; academyId?: string; userId?: string }) => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      nextCursor: null,
      loading: false,
      connections: {},

      connectAcademy: (academyId: string) => {
        if (!academyId) return
        const key = `academy:${academyId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        const getToken = () => {
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) return

        const url = `${API_URL}/api/notifications/stream?academy_id=${encodeURIComponent(academyId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any)

        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch { }
        })

        es.onerror = () => {
          try { es.close() } catch { }
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectAcademy(academyId), 5000)
        }

        set({ connections: { ...connections, [key]: es } })
      },

      connectFranqueadora: (franqueadoraId: string) => {
        if (!franqueadoraId) return
        const key = `franqueadora:${franqueadoraId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        const getToken = () => {
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) return

        const url = `${API_URL}/api/notifications/stream?franqueadora_id=${encodeURIComponent(franqueadoraId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any)

        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch { }
        })

        es.onerror = () => {
          try { es.close() } catch { }
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectFranqueadora(franqueadoraId), 5000)
        }

        set({ connections: { ...connections, [key]: es } })
      },

      connectUser: (userId: string) => {
        if (!userId) return
        const key = `user:${userId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        const getToken = () => {
          const cookies = document.cookie.split(';').map(c => c.trim())
          const authCookie = cookies.find(c => c.startsWith('auth-token='))
          if (authCookie) return authCookie.split('=')[1]
          const { token } = useAuthStore.getState()
          return token
        }

        const token = getToken()
        if (!token) return

        const url = `${API_URL}/api/notifications/stream?user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
        const es = new EventSource(url, { withCredentials: false } as any)

        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch { }
        })

        es.onerror = () => {
          try { es.close() } catch { }
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectUser(userId), 5000)
        }

        set({ connections: { ...connections, [key]: es } })
      },

      disconnectAll: () => {
        const { connections } = get()
        Object.values(connections).forEach(es => { try { es.close() } catch { } })
        set({ connections: {} })
      },

      add: (n) => {
        const list = [n, ...get().notifications]
        // Remove duplicatas se houver (por segurança)
        const unique = Array.from(new Map(list.map(item => [item.id, item])).values())
        set({ notifications: unique, unreadCount: unique.filter(x => !x.read).length })
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

      markAllRead: async (academyId?: string, franqueadoraId?: string) => {
        try {
          // Simplificação: marca localmente tudo como lido
          // Idealmente chamaria rota markAllRead na API
          const list = get().notifications.map((n) => ({ ...n, read: true }))
          set({ notifications: list, unreadCount: 0 })
        } catch (e) {
          console.error('Failed to mark all notifications as read:', e)
        }
      },

      hydrate: async (params) => {
        set({ loading: true })
        try {
          const res = await api.notifications.getAll({
            user_id: params.userId,
            academy_id: params.academyId,
            franqueadora_id: params.franqueadoraId,
            since: params.since,
            limit: 20
          })

          const items = (res.items || res.notifications || []) as AppNotification[]
          set({
            notifications: items,
            unreadCount: res.unreadCount,
            nextCursor: res.nextCursor,
            loading: false
          })
        } catch (e) {
          console.error('Failed to hydrate notifications:', e)
          set({ loading: false })
        }
      },

      loadMore: async (params) => {
        const { nextCursor, loading, notifications } = get()
        if (!nextCursor || loading) return

        set({ loading: true })
        try {
          const res = await api.notifications.getAll({
            user_id: params.userId,
            academy_id: params.academyId,
            franqueadora_id: params.franqueadoraId,
            cursor: nextCursor,
            limit: 20
          })

          const newItems = (res.items || res.notifications || []) as AppNotification[]
          set({
            notifications: [...notifications, ...newItems],
            nextCursor: res.nextCursor,
            loading: false
          })
        } catch (e) {
          console.error('Failed to load more notifications:', e)
          set({ loading: false })
        }
      }
    }),
    {
      name: 'notifications-storage',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount })
    }
  )
)

