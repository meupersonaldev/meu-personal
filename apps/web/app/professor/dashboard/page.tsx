'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  Clock,
  Calendar,
  CheckCircle,
  Users,
  Activity,
  DollarSign,
  Loader2,
  AlertCircle,
  MapPin,
  ArrowRight
} from 'lucide-react'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value?: number | null) => currencyFormatter.format(value ?? 0)

interface Booking {
  id: string
  studentId: string
  teacherId: string
  studentName: string
  franchiseName?: string
  franchiseAddress?: string
  date: string
  duration: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  creditsCost: number
}

interface Stats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  total_students: number
  total_revenue: number
  total_credits_used: number
  hourly_rate: number
  monthly_earnings: {
    current_month: number
  }
}

export default function ProfessorDashboardPage() {
  const { user, token } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    if (!token) {
      setIsLoading(false)
      setError('Sessão expirada. Faça login novamente.')
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const requestInit: RequestInit = {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }

        const bookingsResponse = await fetch(
          `${API_URL}/api/bookings?teacher_id=${user.id}`,
          requestInit
        )

        if (!bookingsResponse.ok) {
          if (bookingsResponse.status === 401) {
            throw new Error('Unauthorized')
          }
          const errorData = await bookingsResponse.json().catch(() => ({}))
          console.error('Erro ao buscar agendamentos:', errorData)
          throw new Error(errorData.message || 'Erro ao buscar agendamentos')
        }

        const bookingsData = await bookingsResponse.json()
        const activeBookings = (bookingsData.bookings || []).filter(
          (b: Booking) => b.status === 'PENDING' || b.status === 'CONFIRMED'
        )
        setBookings(activeBookings)

        const statsResponse = await fetch(
          `${API_URL}/api/teachers/${user.id}/stats`,
          requestInit
        )

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        } else if (statsResponse.status === 401) {
          throw new Error('Unauthorized')
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        if (err instanceof Error && err.message === 'Unauthorized') {
          setError('Sessão expirada. Faça login novamente.')
        } else {
          setError('Erro ao carregar dados do dashboard')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id, token])

  if (!user) return null

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED')
  const activeBookingsCount = confirmedBookings.length + pendingBookings.length

  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const firstName = user.name?.split(' ')[0] || 'Professor'

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'CONFIRMED' })
      })

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
          )
        )
      }
    } catch (err) {
      console.error('Erro ao confirmar:', err)
    }
  }

  let content: React.ReactNode

  if (isLoading) {
    content = (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    )
  } else if (error) {
    content = (
      <div className="flex flex-col items-center justify-center space-y-4 min-h-[50vh] px-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600 text-center">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    )
  } else {
    content = (
      <div className="space-y-6 md:space-y-8">
        <section className="space-y-2 md:space-y-3">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm md:text-lg text-gray-600 capitalize">
            {formattedDate}
          </p>
        </section>

        <section>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="grid min-w-[620px] grid-cols-1 gap-3 sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
              <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 md:text-sm">
                        Faturamento Mensal
                      </p>
                      <p className="text-lg font-bold text-gray-900 md:text-2xl">
                        {formatCurrency(stats?.monthly_earnings?.current_month)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">
                    Valor por hora: {formatCurrency(stats?.hourly_rate)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 md:text-sm">
                        Créditos Utilizados
                      </p>
                      <p className="text-lg font-bold text-gray-900 md:text-2xl">
                        {stats?.total_credits_used ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">Créditos gastos</p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 md:text-sm">
                        Aulas Concluídas
                      </p>
                      <p className="text-lg font-bold text-gray-900 md:text-2xl">
                        {stats?.completed_bookings ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">Aulas finalizadas</p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 md:text-sm">
                        Agendamentos Ativos
                      </p>
                      <p className="text-lg font-bold text-gray-900 md:text-2xl">
                        {activeBookingsCount}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">
                    {confirmedBookings.length} confirmada(s) · {pendingBookings.length} pendente(s)
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 md:text-sm">
                        Cancelamentos
                      </p>
                      <p className="text-lg font-bold text-gray-900 md:text-2xl">
                        {stats?.cancelled_bookings ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 md:text-sm">Aulas canceladas</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section>
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 md:text-xl">
                  Próximas Aulas
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {bookings.length} aula(s) agendada(s)
                </p>
              </div>
              <Link href="/professor/agenda" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="flex w-full items-center justify-center gap-2 sm:w-auto">
                  Ver agenda completa
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma aula agendada</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Aguarde os alunos agendarem aulas com você
                  </p>
                </div>
              ) : (
                bookings.map((booking) => {
                  const bookingDate = new Date(booking.date)
                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 md:p-5 shadow-sm transition-all hover:border-meu-primary/20 hover:shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="relative">
                            <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white font-bold text-lg shadow-lg">
                              {booking.studentName?.substring(0, 2).toUpperCase() ||
                                'AL'}
                            </div>
                            <span
                              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                                booking.status === 'CONFIRMED'
                                  ? 'bg-green-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                              <h4 className="text-base md:text-lg font-semibold text-gray-900">
                                {booking.studentName}
                              </h4>
                              <Badge
                                className={`w-fit ${
                                  booking.status === 'CONFIRMED'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}
                              >
                                {booking.status === 'CONFIRMED'
                                  ? 'Confirmada'
                                  : 'Pendente'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-meu-primary" />
                                <span className="font-medium">
                                  {bookingDate.toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'UTC'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-meu-primary" />
                                <span>
                                  {bookingDate.toLocaleDateString('pt-BR', {
                                    timeZone: 'UTC'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-meu-primary" />
                                <span>{booking.duration} min</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-meu-primary" />
                                <span>{booking.creditsCost} crédito(s)</span>
                              </div>
                            </div>

                            {booking.franchiseName && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4 text-meu-primary" />
                                <span className="font-medium">
                                  {booking.franchiseName}
                                </span>
                              </div>
                            )}

                            {booking.notes && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                {booking.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {booking.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmBooking(booking.id)}
                            className="w-full md:w-auto bg-green-500 text-white hover:bg-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <ProfessorLayout>
      <div className="px-4 pt-6 pb-8 md:px-8 md:pt-8 md:pb-12">
        {content}
      </div>
    </ProfessorLayout>
  )
}
