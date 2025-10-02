'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Loader2, QrCode, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Academy {
  id: string
  name: string
  city?: string
  state?: string
}

export default function ProfessorCheckinGateway() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!user?.id) return
      setLoading(true)
      setError(null)
      try {
        // Tenta obter academias vinculadas ao professor
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/teachers/${user.id}/academies`, {
          credentials: 'include'
        })

        if (res.ok) {
          const data = await res.json()
          const list: Academy[] = data.academies || []

          // Se só houver uma, redireciona diretamente
          if (list.length === 1) {
            toast.success(`Redirecionando para ${list[0].name}`)
            router.replace(`/checkin/a/${list[0].id}`)
            return
          }

          // Se o usuário possuir academyId no payload, usa como fallback
          type MaybeUser = { academyId?: string }
          const fallbackAcademyId = (user as unknown as MaybeUser)?.academyId
          if (list.length === 0 && fallbackAcademyId) {
            toast.info('Usando sua academia padrão para check-in')
            router.replace(`/checkin/a/${fallbackAcademyId}`)
            return
          }

          setAcademies(list)
        } else {
          // Fallback: se existir academyId no usuário, usa
          type MaybeUser = { academyId?: string }
          const fallbackAcademyId = (user as unknown as MaybeUser)?.academyId
          if (fallbackAcademyId) {
            toast.info('Usando sua academia padrão para check-in')
            router.replace(`/checkin/a/${fallbackAcademyId}`)
            return
          }
          setAcademies([])
        }
      } catch {
        setError('Não foi possível carregar suas academias.')
        toast.error('Falha ao carregar suas academias')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, user, user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-meu-primary animate-spin mx-auto" />
          <p className="text-gray-700">Carregando academias para check-in...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Erro ao carregar academias</h2>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (academies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-gray-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Nenhuma academia vinculada</h1>
          <p className="text-gray-600 text-sm">
            Não encontramos academias associadas ao seu perfil. Entre em contato com a unidade.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <QrCode className="h-10 w-10 text-meu-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Fazer Check-in</h1>
          <p className="text-gray-600">Selecione a academia para validar sua entrada</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {academies.map((a) => (
            <Button
              key={a.id}
              onClick={() => router.push(`/checkin/a/${a.id}`)}
              variant="outline"
              className="justify-start h-auto p-4 text-left border-gray-300 hover:border-meu-primary"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-meu-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-meu-primary" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{a.name}</div>
                  {(a.city || a.state) && (
                    <div className="text-sm text-gray-600">{a.city} {a.state ? `- ${a.state}` : ''}</div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}
