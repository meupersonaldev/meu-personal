'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { MobileSearchBar } from '@/components/mobile/MobileSearchBar'
import { MobileCard } from '@/components/mobile/MobileCard'
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
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Buscar agendamentos do professor
        const bookingsResponse = await fetch(
          `${API_URL}/api/bookings?teacher_id=${user.id}`,
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (!bookingsResponse.ok) {
          const errorData = await bookingsResponse.json().catch(() => ({}))
          console.error('Erro ao buscar agendamentos:', errorData)
          throw new Error(errorData.message || 'Erro ao buscar agendamentos')
        }

        const bookingsData = await bookingsResponse.json()
        const activeBookings = (bookingsData.bookings || []).filter(
          (b: Booking) => b.status === 'PENDING' || b.status === 'CONFIRMED'
        )
        setBookings(activeBookings)

        // Buscar estatísticas do professor
        const statsResponse = await fetch(
          `${API_URL}/api/teachers/${user.id}/stats`,
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados do dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  if (!user) return null

  if (isLoading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  if (error) {
    return (
      <ProfessorLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4 px-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-gray-600 text-center">{error}</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </ProfessorLayout>
    )
  }

  const pendingBookings = bookings.filter(b => b.status === 'PENDING')
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED')

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' })
      })

      if (response.ok) {
        setBookings(prev => prev.map(b => 
          b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
        ))
      }
    } catch (error) {
      console.error('Erro ao confirmar:', error)
    }
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden w-full min-h-screen bg-gray-50 pb-20">
        <MobileHeader />
        <MobileSearchBar placeholder="Procure por aluno, aula ou data..." />

        <div className="w-full px-4 py-4 space-y-4 overflow-x-hidden">
          {/* Stats Cards Mobile */}
          <div className="w-full grid grid-cols-2 gap-3">
            <MobileCard padding="sm" className="!p-3.5">
              <div className="flex flex-col w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002C4E] to-[#27DFFF] flex items-center justify-center mb-2.5">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-gray-500 font-medium mb-1">Faturamento Mensal</span>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">
                  R$ {stats?.monthly_earnings?.current_month?.toFixed(0) || '0'}
                </p>
                <span className="text-[10px] text-gray-400">R$ {stats?.hourly_rate || 0}/hora</span>
              </div>
            </MobileCard>

            <MobileCard padding="sm" className="!p-3.5">
              <div className="flex flex-col w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-2.5">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-gray-500 font-medium mb-1">Créditos Utilizados</span>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">{stats?.total_credits_used || 0}</p>
                <span className="text-[10px] text-gray-400">Créditos gastos</span>
              </div>
            </MobileCard>

            <MobileCard padding="sm" className="!p-3.5">
              <div className="flex flex-col w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFF373] to-yellow-400 flex items-center justify-center mb-2.5">
                  <Activity className="h-5 w-5 text-[#002C4E]" />
                </div>
                <span className="text-xs text-gray-500 font-medium mb-1">Aulas Concluídas</span>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">{stats?.completed_bookings || 0}</p>
                <span className="text-[10px] text-gray-400">Finalizadas</span>
              </div>
            </MobileCard>

            <MobileCard padding="sm" className="!p-3.5">
              <div className="flex flex-col w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2.5">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-gray-500 font-medium mb-1">Agendamentos Ativos</span>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">{(stats?.pending_bookings || 0) + (stats?.total_bookings || 0) - (stats?.completed_bookings || 0) - (stats?.cancelled_bookings || 0)}</p>
                <span className="text-[10px] text-gray-400">{confirmedBookings.length} confirmado(s) · {pendingBookings.length} pendente(s)</span>
              </div>
            </MobileCard>

            <MobileCard padding="sm" className="!p-3.5">
              <div className="flex flex-col w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-2.5">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-gray-500 font-medium mb-1">Cancelamentos</span>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">{stats?.cancelled_bookings || 0}</p>
                <span className="text-[10px] text-gray-400">Canceladas</span>
              </div>
            </MobileCard>
          </div>

          {/* Próximas Aulas Mobile */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Próximas Aulas</h2>
              <button className="text-xs text-[#002C4E] font-semibold">Ver todas</button>
            </div>

            {bookings.length === 0 ? (
              <MobileCard className="!p-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-medium">Nenhuma aula agendada</p>
                  <p className="text-gray-400 text-xs mt-1">Aguarde os alunos agendarem</p>
                </div>
              </MobileCard>
            ) : (
              <div className="w-full space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <MobileCard key={booking.id} className="!p-3.5">
                    <div className="flex items-start space-x-3 w-full">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#002C4E] to-[#27DFFF] rounded-xl flex items-center justify-center text-white font-bold">
                          {booking.studentName?.substring(0, 2).toUpperCase() || 'AL'}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          booking.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-amber-500'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight">
                            {booking.studentName}
                          </h3>
                          <Badge
                            className={`text-[10px] px-2 py-0.5 ${
                              booking.status === 'CONFIRMED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Pendente'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(booking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>{booking.duration}min</span>
                          </div>
                        </div>

                        {booking.notes && (
                          <p className="text-[11px] text-gray-500 line-clamp-1">{booking.notes}</p>
                        )}
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            )}
          </div>
        </div>

        <MobileBottomNav />
      </div>

      {/* Desktop View */}
      <ProfessorLayout>
        <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Olá, {user.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-600 text-lg">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Faturamento Mensal</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  R$ {stats?.monthly_earnings?.current_month?.toFixed(2) || '0,00'}
                </p>
                <p className="text-xs text-gray-500">Valor por hora: R$ {stats?.hourly_rate || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Créditos Utilizados</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.total_credits_used || 0}</p>
                <p className="text-sm text-gray-600">Créditos gastos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Aulas Concluídas</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.completed_bookings || 0}</p>
                <p className="text-sm text-gray-600">Aulas finalizadas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Agendamentos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{(stats?.pending_bookings || 0) + (stats?.total_bookings || 0) - (stats?.completed_bookings || 0) - (stats?.cancelled_bookings || 0)}</p>
                <p className="text-sm text-gray-600">{confirmedBookings.length} confirmado(s) · {pendingBookings.length} pendente(s)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Cancelamentos</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.cancelled_bookings || 0}</p>
                <p className="text-sm text-gray-600">Aulas canceladas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas Aulas Desktop */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                Próximas Aulas
              </CardTitle>
              <p className="text-sm text-gray-500">{bookings.length} aula(s) agendada(s)</p>
            </div>
            <Link href="/professor/agenda">
              <Button variant="outline" size="sm" className="gap-2">
                Ver Agenda Completa
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma aula agendada</p>
                <p className="text-sm text-gray-400 mt-2">Aguarde os alunos agendarem aulas com você</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-5 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-meu-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {booking.studentName?.substring(0, 2).toUpperCase() || 'AL'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                          booking.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold text-gray-900 text-lg">
                            {booking.studentName}
                          </h4>
                          <Badge
                            className={`${
                              booking.status === 'CONFIRMED'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            } font-medium`}
                          >
                            {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-meu-primary" />
                            <span className="font-medium">
                              {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-meu-primary" />
                            <span>{new Date(booking.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-meu-primary" />
                            <span>{booking.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-meu-primary" />
                            <span>{booking.creditsCost} créditos</span>
                          </div>
                          {booking.franchiseName && (
                            <div className="flex items-center space-x-2 col-span-2">
                              <MapPin className="h-4 w-4 text-meu-primary" />
                              <span className="font-medium">{booking.franchiseName}</span>
                            </div>
                          )}
                        </div>
                        {booking.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {booking.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmBooking(booking.id)}
                        className="bg-green-500 text-white hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </ProfessorLayout>
    </>
  )
}
