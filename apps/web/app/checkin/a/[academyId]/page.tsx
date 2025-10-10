'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
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
}

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const academyId = params.academyId as string

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [teacherName, setTeacherName] = useState('')

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
        router.push(`/professor/login?redirect=/checkin/a/${academyId}`)
        return
      }

      const { user } = await authRes.json()

      if (user.role !== 'TEACHER') {
        setResult({
          allowed: false,
          message: 'Apenas professores podem fazer check-in.'
        })
        setLoading(false)
        return
      }

      setTeacherName(user.name)

      // Validar check-in
      const checkinRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/checkin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academy_id: academyId,
          teacher_id: user.id
        })
      })

      const data = await checkinRes.json()
      setResult(data)
    } catch (error) {
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
                <p className="text-xl text-gray-700">{teacherName}</p>
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>
              {result.booking && (
                <div className="w-full bg-green-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Horário:</span>{' '}
                    {new Date(result.booking.start).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Duração:</span> {result.booking.duration} minutos
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
                {teacherName && <p className="text-xl text-gray-700">{teacherName}</p>}
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>
            </>
          )}

          <div className="w-full flex flex-col space-y-3 pt-4">
            <Button
              onClick={() => validateCheckin()}
              variant="outline"
              className="w-full"
            >
              Tentar Novamente
            </Button>
            <Button
              onClick={() => router.push('/')}
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
