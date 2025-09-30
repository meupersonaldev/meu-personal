'use client'

import { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'

interface Booking {
  id: string
  studentId: string
  teacherId: string
  studentName: string
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
  rating: number
  total_reviews: number
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

      // Buscar agendamentos do professor (todos os não cancelados)
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
      // Filtrar apenas PENDING e CONFIRMED no frontend
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

  const fetchDashboardData = async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const bookingsResponse = await fetch(
        `${API_URL}/api/bookings?teacher_id=${user.id}`,
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (!bookingsResponse.ok) {
        throw new Error('Erro ao buscar agendamentos')
      }

      const bookingsData = await bookingsResponse.json()
      const activeBookings = (bookingsData.bookings || []).filter(
        (b: Booking) => b.status === 'PENDING' || b.status === 'CONFIRMED'
      )
      setBookings(activeBookings)

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

  if (!user) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <ProfessorLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchDashboardData}>Tentar novamente</Button>
        </div>
      </ProfessorLayout>
    )
  }

  // Calcular dados
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date)
    const today = new Date()
    return bookingDate.toDateString() === today.toDateString()
  })

  const pendingBookings = bookings.filter(b => b.status === 'PENDING')

  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Faturamento */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
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

          {/* Aulas */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Aulas Realizadas</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.completed_bookings || 0}</p>
                <p className="text-sm text-gray-600">
                  {stats?.total_bookings || 0} agendamentos no total
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alunos */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-cyan to-cyan-400 text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total de Alunos</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.total_students || 0}</p>
                <p className="text-sm text-gray-600">Alunos atendidos</p>
              </div>
            </CardContent>
          </Card>

          {/* Pendentes */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Pendentes</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{pendingBookings.length}</p>
                <p className="text-sm text-gray-600">Aguardando confirmação</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas Aulas */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                Próximas Aulas
              </CardTitle>
              <p className="text-sm text-gray-500">{todayBookings.length} aula(s) hoje</p>
            </div>
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
                  className="p-5 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-meu-primary/20 transition-all duration-300"
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
                              {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-meu-primary" />
                            <span>
                              {new Date(booking.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-meu-primary" />
                            <span>{booking.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-meu-primary" />
                            <span>{booking.creditsCost} créditos</span>
                          </div>
                        </div>
                        {booking.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {booking.status === 'PENDING' && (
                      <div className="flex flex-col space-y-2">
                        <Button 
                          size="sm" 
                          className="bg-green-500 text-white hover:bg-green-600"
                          onClick={() => {/* TODO: Confirmar aula */}}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ProfessorLayout>
  )
}
