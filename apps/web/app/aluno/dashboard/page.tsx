'use client'

import { useEffect, useState } from 'react'
import { Calendar, History, TrendingUp, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface StudentStats {
  totalBookings: number
  completed: number
  pending: number
  cancelled: number
}

export default function StudentDashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<StudentStats>({
    totalBookings: 0,
    completed: 0,
    pending: 0,
    cancelled: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${user.id}/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalBookings: data.total_bookings || 0,
            completed: data.completed_bookings || 0,
            pending: data.pending_bookings || 0,
            cancelled: data.cancelled_bookings || 0
          })
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [user?.id])

  if (!user || !isAuthenticated) {
    return null
  }

  const firstName = user?.name?.split(' ')[0] || 'Aluno'

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Olá, {firstName}! 👋</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          Acompanhe suas estatísticas e atividades
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-meu-primary/20 hover:border-meu-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Agendamentos Totais</CardTitle>
            <History className="h-5 w-5 text-meu-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalBookings}</div>
            <p className="text-xs text-gray-500 mt-1">Agendamentos no total</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 hover:border-green-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Concluídas</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
            <p className="text-xs text-gray-500 mt-1">Aulas concluídas</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 hover:border-blue-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">Aulas pendentes</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 hover:border-red-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.cancelled}</div>
            <p className="text-xs text-gray-500 mt-1">Aulas canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Recente */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhuma aula recente</p>
            <p className="text-xs mt-1">Suas aulas aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
