'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuthStore()
  const { franqueadora, academies, fetchAcademies } = useFranqueadoraStore()
  const { connectFranqueadora, connectUser, fetchInitial, disconnectAll } = useNotificationsStore()

  useEffect(() => {
    // Limpar conexões ao trocar de contexto
    return () => disconnectAll()
  }, [])

  useEffect(() => {
    const userId = authUser?.id
    if (userId) {
      // Notificações pessoais do usuário logado
      fetchInitial({ userId })
      connectUser(userId)
    }
  }, [authUser?.id, connectUser, fetchInitial])

  useEffect(() => {
    // Assinar um único canal da franqueadora para receber eventos de todas as academias
    if (!franqueadora) return
    // Garantir academias carregadas para seed inicial de histórico
    if (!academies || academies.length === 0) {
      fetchAcademies()
      return
    }
    // Seed inicial agregado por franqueadora
    fetchInitial({ franqueadoraId: franqueadora.id })
    // Conexão SSE única da franqueadora
    connectFranqueadora(franqueadora.id)
  }, [franqueadora?.id, academies?.length, connectFranqueadora, fetchInitial, fetchAcademies])

  return <>{children}</>
}
