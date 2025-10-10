import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        const url = `${API_URL}/api/notifications/stream?academy_id=${encodeURIComponent(academyId)}`
        const es = new EventSource(url, { withCredentials: true } as any)
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.addEventListener('error', () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectAcademy(academyId), 3000)
        })
        set({ connections: { ...connections, [key]: es } })
      },

      connectFranqueadora: (franqueadoraId: string) => {
        if (!franqueadoraId) return
        const key = `franqueadora:${franqueadoraId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const url = `${API_URL}/api/notifications/stream?franqueadora_id=${encodeURIComponent(franqueadoraId)}`
        const es = new EventSource(url, { withCredentials: true } as any)
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.addEventListener('error', () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectFranqueadora(franqueadoraId), 3000)
        })
        set({ connections: { ...connections, [key]: es } })
      },

      connectUser: (userId: string) => {
        if (!userId) return
        const key = `user:${userId}`
        const { connections } = get()
        if (connections[key]) return
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const url = `${API_URL}/api/notifications/stream?user_id=${encodeURIComponent(userId)}`
        const es = new EventSource(url, { withCredentials: true } as any)
        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data)
            if (parsed?.notification) get().add(parsed.notification as AppNotification)
          } catch {}
        })
        es.addEventListener('error', () => {
          try { es.close() } catch {}
          const map = { ...get().connections }
          delete map[key]
          set({ connections: map })
          setTimeout(() => get().connectUser(userId), 3000)
        })
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
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
          const list = get().notifications.map(n => n.id === id ? { ...n, read: true } : n)
          set({ notifications: list, unreadCount: list.filter(x => !x.read).length })
        } catch (e) {
        }
      },

      markAllRead: async (academyId: string) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          await fetch(`${API_URL}/api/notifications/mark-all-read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ academy_id: academyId })
          })
          const list = get().notifications.map(n => ({ ...n, read: true }))
          set({ notifications: list, unreadCount: 0 })
        } catch (e) {
        }
      },

      markAllReadFranqueadora: async (franqueadoraId: string) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          await fetch(`${API_URL}/api/notifications/mark-all-read?franqueadora_id=${encodeURIComponent(franqueadoraId)}`, {
            method: 'PATCH',
            credentials: 'include'
          })
          const list = get().notifications.map(n => ({ ...n, read: true }))
          set({ notifications: list, unreadCount: 0 })
        } catch (e) {
        }
      },

      fetchInitial: async ({ franqueadoraId, academyId, userId, since }) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const qs = new URLSearchParams()
          if (franqueadoraId) qs.set('franqueadora_id', franqueadoraId)
          if (academyId) qs.set('academy_id', academyId)
          if (userId) qs.set('user_id', userId)
          if (since) qs.set('since', since)
          const resp = await fetch(`${API_URL}/api/notifications?${qs.toString()}`, { credentials: 'include' })
          const json = await resp.json()
          const list = (json.notifications || []) as AppNotification[]
          set({ notifications: list, unreadCount: json.unreadCount || list.filter(n => !n.read).length })
        } catch (e) {
        }
      }
    }),
    {
      name: 'notifications-storage',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount })
    }
  )
)
