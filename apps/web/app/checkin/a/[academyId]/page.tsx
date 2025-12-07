'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type CheckinResult = {
  allowed: boolean
  message: string
  booking?: {
    id: string
    start: string
    duration: number
  }
  alreadyCheckedIn?: boolean
}

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const academyId = params.academyId as string

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    validateCheckin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function validateCheckin() {
    try {
      setLoading(true)

      // Verificar autenticação
      const authRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        credentials: 'include'
      })

      if (!authRes.ok) {
        // Redirecionar para login com redirect de volta
        const currentPath = window.location.pathname
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        return
      }

      const { user } = await authRes.json()

      // Verificar se é aluno ou professor
      const isStudent = ['STUDENT', 'ALUNO'].includes(user.role)
      const isTeacher = ['TEACHER', 'PROFESSOR'].includes(user.role)

      if (!isStudent && !isTeacher) {
        setResult({
          allowed: false,
          message: 'Apenas alunos e professores podem fazer check-in.'
        })
        setLoading(false)
        return
      }

      setUserName(user.name || 'Usuário')
      setUserRole(user.role)

      // Validar check-in
      const checkinRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/checkin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academy_id: academyId
        })
      })

      if (!checkinRes.ok) {
        const errorData = await checkinRes.json().catch(() => ({ message: 'Erro ao validar check-in' }))
        setResult({
          allowed: false,
          message: errorData.message || 'Erro ao validar check-in. Tente novamente.'
        })
        return
      }

      const data = await checkinRes.json()
      setResult(data)
    } catch (error) {
      console.error('Erro ao validar check-in:', error)
      setResult({
        allowed: false,
        message: 'Erro ao validar check-in. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            <p className="text-lg font-medium text-gray-700">Validando check-in...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const roleLabel = userRole === 'TEACHER' || userRole === 'PROFESSOR' ? 'Professor' : 'Aluno'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md p-8 ${result.allowed ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}>
        <div className="flex flex-col items-center space-y-6">
          {result.allowed ? (
            <>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-green-700">Acesso Liberado</h1>
                <p className="text-xl text-gray-700">{userName}</p>
                <p className="text-sm text-gray-500">{roleLabel}</p>
                <p className="text-sm text-gray-600 mt-2">{result.message}</p>
              </div>
              {result.booking && (
                <div className="w-full bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Data:</span>
                    <span>{new Date(result.booking.start).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Horário:</span>
                    <span>{new Date(result.booking.start).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="font-semibold">Duração:</span>
                    <span>{result.booking.duration} minutos</span>
                  </div>
                </div>
              )}
              {result.alreadyCheckedIn && (
                <div className="w-full bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-sm text-blue-800 text-center">
                    Você já realizou check-in para este agendamento anteriormente.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-16 w-16 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-red-700">Acesso Negado</h1>
                {userName && (
                  <>
                    <p className="text-xl text-gray-700">{userName}</p>
                    <p className="text-sm text-gray-500">{roleLabel}</p>
                  </>
                )}
                <p className="text-sm text-gray-600 mt-2">{result.message}</p>
              </div>
            </>
          )}

          <div className="w-full flex flex-col space-y-3 pt-4">
            <Button
              onClick={() => validateCheckin()}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Tentar Novamente'
              )}
            </Button>
            <Button
              onClick={() => {
                if (userRole === 'TEACHER' || userRole === 'PROFESSOR') {
                  router.push('/professor/dashboard')
                } else {
                  router.push('/aluno/inicio')
                }
              }}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
