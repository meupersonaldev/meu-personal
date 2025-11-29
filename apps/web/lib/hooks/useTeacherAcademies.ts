import { useState, useEffect, useCallback, useRef } from 'react'
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
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchAcademies = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (!user?.id || !token) {
      setAcademies([])
      setLoading(false)
      return
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      setLoading(true)
      setError(null)
      // Usar URL relativa para aproveitar o rewrite do Next.js e evitar CORS
      const url = `/api/teachers/${user.id}/academies?t=${Date.now()}`

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      let academiesRes: Response
      try {
        academiesRes = await fetch(url, { 
          method: 'GET',
          headers,
          signal
        })
      } catch (fetchError: any) {
        // Ignorar erro de abort
        if (fetchError.name === 'AbortError') {
          return
        }
        setError('Erro de conexão. Verifique se a API está rodando.')
        setAcademies([])
        setLoading(false)
        return
      }

      if (!academiesRes.ok) {
        throw new Error(`Erro ao buscar academias: ${academiesRes.status}`)
      }

      const academiesData = await academiesRes.json()
      const academiesList = Array.isArray(academiesData.academies) 
        ? academiesData.academies.filter((a: Academy) => a && a.id && a.is_active !== false)
        : []
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
    
    // Cleanup: abortar requisição quando componente desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
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
