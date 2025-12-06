'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Repeat,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'

interface Booking {
  id: string
  start_at?: string
  date?: string
  end_at?: string
  status: string
  status_canonical?: string
  is_reserved: boolean
  series_id: string | null
  teacher_id: string
  teacherName?: string
  teacher_name?: string
  avatar_url?: string
  academy_id?: string
  franchiseName?: string
  franchise_name?: string
  unit_id?: string
  cancellableUntil?: string
}

interface BookingSeries {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_type: string
  start_date: string
  end_date: string
  status: string
  teacher: {
    id: string
    name: string
  }
  academy: {
    id: string
    name: string
  }
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const RECURRENCE_LABELS: Record<string, string> = {
  '15_DAYS': '15 dias',
  'MONTH': '1 mês',
  'QUARTER': '3 meses',
  'SEMESTER': '6 meses',
  'YEAR': '1 ano'
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Data não disponível'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Data inválida'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Hora não disponível'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Hora inválida'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AulasPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [series, setSeries] = useState<BookingSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancelType, setCancelType] = useState<'single' | 'future' | 'all'>('single')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    if (!token || !user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Buscar bookings futuros do aluno
      const bookingsResp = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user.id}&future=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (bookingsResp.ok) {
        const data = await bookingsResp.json()
        setBookings(Array.isArray(data) ? data : data.bookings || [])
      }

      // Buscar séries do aluno
      const seriesResp = await fetch(`${API_BASE_URL}/api/booking-series/student/my-series`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (seriesResp.ok) {
        const data = await seriesResp.json()
        setSeries(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError('Erro ao carregar aulas')
      console.error('Erro ao buscar aulas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, user?.id])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBookings()
    }
  }, [isAuthenticated, token, fetchBookings])

  const handleCancelClick = (booking: Booking) => {
    setCancellingBooking(booking)
    setCancelType('single')
    setCancelError(null)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async () => {
    if (!cancellingBooking || !token) return

    setIsCancelling(true)
    setCancelError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      let url: string
      const method = 'DELETE'

      if (cancellingBooking.series_id) {
        // Cancelar via endpoint de série
        url = `${API_BASE_URL}/api/booking-series/${cancellingBooking.series_id}/bookings/${cancellingBooking.id}?cancelType=${cancelType}`
      } else {
        // Cancelar booking avulso
        url = `${API_BASE_URL}/api/bookings/${cancellingBooking.id}`
      }

      const resp = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      })

      const json = await resp.json()

      if (!resp.ok) {
        throw new Error(json.error || 'Erro ao cancelar')
      }

      setShowCancelModal(false)
      setCancellingBooking(null)

      // Recarregar dados
      await fetchBookings()
    } catch (err: any) {
      setCancelError(err?.message || 'Erro ao cancelar aula')
    } finally {
      setIsCancelling(false)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    const status = booking.status_canonical || booking.status
    if (status === 'CANCELED' || status === 'CANCELLED') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
    }

    if (booking.is_reserved) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Reservada
        </Badge>
      )
    }

    if (booking.series_id) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Repeat className="h-3 w-3 mr-1" />
          Série
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Confirmada
      </Badge>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Minhas Aulas
        </h1>
        <p className="text-sm text-gray-600">
          Aulas agendadas e séries recorrentes
        </p>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-green-700">
                  {bookings.filter(b => !b.is_reserved && (b.status_canonical || b.status) !== 'CANCELED' && (b.status_canonical || b.status) !== 'CANCELLED').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reservadas</p>
                <p className="text-2xl font-bold text-amber-700">
                  {bookings.filter(b => b.is_reserved && (b.status_canonical || b.status) !== 'CANCELED' && (b.status_canonical || b.status) !== 'CANCELLED').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Séries Ativas</p>
                <p className="text-2xl font-bold text-blue-700">
                  {series.filter(s => s.status === 'ACTIVE').length}
                </p>
              </div>
              <Repeat className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso sobre reservas */}
      {bookings.some(b => b.is_reserved) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Aulas reservadas
          </strong>
          <p className="mt-1">
            Aulas reservadas precisam de crédito até 7 dias antes. Sem crédito, serão canceladas automaticamente.
          </p>
        </div>
      )}

      {/* Lista de Aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-meu-primary" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 py-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : bookings.filter(b => (b.status_canonical || b.status) !== 'CANCELED' && (b.status_canonical || b.status) !== 'CANCELLED').length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma aula agendada</p>
              <p className="text-sm mt-1">Agende sua primeira aula!</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/aluno/professores')}
              >
                Agendar Aula
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings
                .filter(b => b.status_canonical !== 'CANCELED')
                .sort((a, b) => {
                  const aTime = (a.start_at || a.date || '').toString()
                  const bTime = (b.start_at || b.date || '').toString()
                  if (!aTime || !bTime) return 0
                  return new Date(aTime).getTime() - new Date(bTime).getTime()
                })
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-meu-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={booking.avatar_url} />
                        <AvatarFallback className="bg-meu-primary/10 text-meu-primary">
                          {(booking.teacherName || booking.teacher_name || 'Professor')?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{(booking.teacherName || booking.teacher_name || 'Professor') || 'Professor'}</p>
                          {getStatusBadge(booking)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(booking.start_at || booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(booking.start_at || booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {(booking.franchiseName || booking.franchise_name || 'Academia') || 'Academia'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleCancelClick(booking)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Séries Ativas */}
      {series.filter(s => s.status === 'ACTIVE').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-meu-primary" />
              Séries Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {series
                .filter(s => s.status === 'ACTIVE')
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-blue-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.teacher?.name || 'Professor'}</p>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          {RECURRENCE_LABELS[s.recurrence_type] || s.recurrence_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {DAY_NAMES[s.day_of_week]}s
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.start_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {s.academy?.name || 'Academia'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        De {formatDate(s.start_date)} até {formatDate(s.end_date)}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Cancelamento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Cancelar Aula
            </DialogTitle>
            <DialogDescription>
              {cancellingBooking?.series_id
                ? 'Esta aula faz parte de uma série recorrente.'
                : 'Confirme o cancelamento desta aula.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Detalhes da aula */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-meu-primary/10 text-meu-primary">
                    {(cancellingBooking?.teacherName || cancellingBooking?.teacher_name || 'P').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{cancellingBooking?.teacherName || cancellingBooking?.teacher_name || 'Professor'}</p>
                  <p className="text-sm text-gray-500">
                    {cancellingBooking && formatDate(cancellingBooking.start_at || cancellingBooking.date)} às {cancellingBooking && formatTime(cancellingBooking.start_at || cancellingBooking.date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Opções de cancelamento para séries */}
            {cancellingBooking?.series_id && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">O que você deseja cancelar?</p>
                <RadioGroup value={cancelType} onValueChange={(v) => setCancelType(v as any)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="flex-1 cursor-pointer">
                      <span className="font-medium">Apenas esta aula</span>
                      <span className="block text-xs text-gray-500">
                        {cancellingBooking && formatDate(cancellingBooking.start_at || cancellingBooking.date)}
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value="future" id="future" />
                    <Label htmlFor="future" className="flex-1 cursor-pointer">
                      <span className="font-medium">Esta e todas as próximas</span>
                      <span className="block text-xs text-gray-500">
                        Mantém aulas anteriores
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex-1 cursor-pointer">
                      <span className="font-medium">Toda a série</span>
                      <span className="block text-xs text-gray-500">
                        Cancela todas as aulas da série
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Aviso de crédito - verificar se está dentro do prazo de cancelamento gratuito */}
            {(() => {
              if (cancellingBooking?.is_reserved) return null
              
              const bookingTime = cancellingBooking?.start_at || cancellingBooking?.date
              if (!bookingTime) return null
              
              const now = new Date()
              const bookingDate = new Date(bookingTime)
              const cutoffTime = cancellingBooking?.cancellableUntil 
                ? new Date(cancellingBooking.cancellableUntil)
                : new Date(bookingDate.getTime() - 4 * 60 * 60 * 1000) // 4 horas antes
              
              const isFreeCancel = now <= cutoffTime
              const cutoffFormatted = cutoffTime.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              
              if (isFreeCancel) {
                return (
                  <div className="mt-4 text-xs text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="block mb-1">Cancelamento gratuito disponível</strong>
                        <p>Você está dentro do período de cancelamento gratuito. O crédito será estornado automaticamente.</p>
                        <p className="mt-1 text-green-600">Prazo: até {cutoffFormatted}</p>
                      </div>
                    </div>
                  </div>
                )
              } else {
                return (
                  <div className="mt-4 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="block mb-1">Cancelamento após o prazo</strong>
                        <p>O período de cancelamento gratuito já passou. O crédito não será estornado.</p>
                        <p className="mt-1 text-amber-600">Prazo era: até {cutoffFormatted}</p>
                      </div>
                    </div>
                  </div>
                )
              }
            })()}

            {/* Erro */}
            {cancelError && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{cancelError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false)
                setCancellingBooking(null)
                setCancelError(null)
              }}
              disabled={isCancelling}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
