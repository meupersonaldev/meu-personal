import { useState, useEffect } from 'react'
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
  const { user } = useAuthStore()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAcademies = async () => {
      if (!user?.id) {
        setAcademies([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

        // Buscar preferências do professor (academy_ids)
        const prefRes = await fetch(`${API_URL}/api/teachers/${user.id}/preferences`)
        if (!prefRes.ok) {
          throw new Error('Erro ao buscar preferências')
        }
        const pref = await prefRes.json()
        const academyIds = pref.academy_ids || []

        // Buscar todas as academias
        const academiesRes = await fetch(`${API_URL}/api/academies`)
        if (!academiesRes.ok) {
          throw new Error('Erro ao buscar academias')
        }
        const academiesData = await academiesRes.json()
        const allAcademies = academiesData.academies || []

        // Filtrar apenas as academias configuradas pelo professor
        const filtered = academyIds.length > 0
          ? allAcademies.filter((a: Academy) => academyIds.includes(a.id))
          : allAcademies

        setAcademies(filtered)
      } catch (err) {
        console.error('Erro ao carregar academias do professor:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setAcademies([])
      } finally {
        setLoading(false)
      }
    }

    fetchAcademies()
  }, [user?.id])

  return { academies, loading, error }
}
