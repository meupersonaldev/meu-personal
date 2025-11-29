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
    console.log('🔍 [useTeacherAcademies] fetchAcademies chamado', { userId: user?.id, hasToken: !!token })
    
    if (!user?.id) {
      console.log('🔍 [useTeacherAcademies] Sem user.id, retornando vazio')
      setAcademies([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const url = `${API_URL}/api/teachers/${user.id}/academies?t=${Date.now()}`
      
      console.log('🔍 [useTeacherAcademies] Fazendo requisição para:', url)

      if (!token) {
        console.warn('🔍 [useTeacherAcademies] Sem token, não é possível fazer requisição autenticada')
        setError('Token de autenticação não encontrado')
        setAcademies([])
        setLoading(false)
        return
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }

      // Adicionar timestamp para evitar cache e garantir dados atualizados
      const academiesRes = await fetch(url, { 
        method: 'GET',
        headers,
        credentials: 'include',
        mode: 'cors'
      }).catch((fetchError) => {
        console.error('🔍 [useTeacherAcademies] Erro na requisição fetch:', fetchError)
        throw new Error(`Erro de conexão: ${fetchError.message}. Verifique se a API está rodando em ${API_URL}`)
      })

      console.log('🔍 [useTeacherAcademies] Resposta recebida:', {
        ok: academiesRes.ok,
        status: academiesRes.status,
        statusText: academiesRes.statusText
      })

      if (!academiesRes.ok) {
        const errorText = await academiesRes.text()
        console.error('🔍 [useTeacherAcademies] Erro na resposta:', errorText)
        throw new Error(`Erro ao buscar academias: ${academiesRes.status} ${academiesRes.statusText}`)
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
        console.warn('⚠️ [useTeacherAcademies] Dados brutos recebidos:', academiesData)
      }
      setAcademies(academiesList)
    } catch (err) {
      console.error('🔍 [useTeacherAcademies] Erro capturado:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setAcademies([])
    } finally {
      setLoading(false)
      console.log('🔍 [useTeacherAcademies] Loading finalizado')
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
