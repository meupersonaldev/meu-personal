import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface Academy {
  id: string
  name: string
  city?: string
  state?: string
  address?: string
  is_active: boolean
}

export function useTeacherAcademies() {
  const { user, token } = useAuthStore()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAcademies = useCallback(async () => {
    if (!user?.id) {
      setAcademies([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      // Adicionar timestamp para evitar cache e garantir dados atualizados
      const academiesRes = await fetch(
        `${API_URL}/api/teachers/${user.id}/academies?t=${Date.now()}`,
        { 
          headers: { 
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }, 
          credentials: 'include' 
        }
      )

      if (!academiesRes.ok) {
        throw new Error('Erro ao buscar academias do professor')
      }

      const academiesData = await academiesRes.json()
      console.log('🔍 [useTeacherAcademies] Resposta da API:', academiesData)
      const academiesList = Array.isArray(academiesData.academies) 
        ? academiesData.academies.filter((a: any) => a && a.id && a.is_active !== false)
        : []
      console.log('🔍 [useTeacherAcademies] Academias processadas:', academiesList)
      console.log('🔍 [useTeacherAcademies] Total de academias:', academiesList.length)
      if (academiesList.length === 0) {
        console.warn('⚠️ [useTeacherAcademies] Nenhuma academia encontrada! Verifique os logs do servidor.')
      }
      setAcademies(academiesList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setAcademies([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, token])

  useEffect(() => {
    fetchAcademies()
  }, [fetchAcademies])

  // Listener para recarregar quando preferências forem atualizadas
  useEffect(() => {
    const handlePreferencesUpdated = () => {
      fetchAcademies()
    }

    window.addEventListener('teacher:preferences:updated', handlePreferencesUpdated)
    return () => {
      window.removeEventListener('teacher:preferences:updated', handlePreferencesUpdated)
    }
  }, [fetchAcademies])

  return { academies, loading, error, refetch: fetchAcademies }
}
