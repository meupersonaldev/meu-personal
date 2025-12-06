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
  ChevronRight,
  Dumbbell,
  History,
  User,
  Mail,
  Phone,
  Settings,
  LogOut,
  Shield,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils'

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

interface ClassHistory {
  id: string
  date: string
  time: string
  teacher_name: string
  teacher_avatar?: string
  unit_name: string
  status: 'completed' | 'cancelled' | 'no_show'
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

// Função para obter o tempo do booking (start_at ou date)
function getBookingTime(booking: Booking): Date {
  const timeString = booking.start_at || booking.date
  if (!timeString) {
    return new Date(0) // Data inválida
  }

  // Se a string já tem Z (timezone UTC), usar diretamente
  if (timeString.endsWith('Z')) {
    return new Date(timeString)
  }

  // Se tem timezone offset (+03:00, -03:00), usar diretamente
  if (timeString.includes('+') || (timeString.includes('-') && timeString.length > 19 && timeString[10] === 'T' && (timeString[19] === '-' || timeString[19] === '+'))) {
    return new Date(timeString)
  }

  // Se não tem timezone, assumir que é UTC e adicionar Z
  const isoString = `${timeString}Z`
  return new Date(isoString)
}

// Função para formatar o prazo de cancelamento gratuito
function cutoffLabel(booking: Booking): string {
  const bookingTime = getBookingTime(booking)
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
  const cutoffIso = booking.cancellableUntil || new Date(bookingTime.getTime() - FOUR_HOURS_MS).toISOString()
  const cutoff = new Date(cutoffIso)

  if (isNaN(cutoff.getTime())) return 'Data inválida'

  const hour = String(cutoff.getHours()).padStart(2, '0')
  const minute = String(cutoff.getMinutes()).padStart(2, '0')
  const d = cutoff.toLocaleDateString('pt-BR')
  return `${d} ${hour}:${minute}`
}

export default function AulasPage() {
  const router = useRouter()
  const { user, token, logout, isAuthenticated } = useAuthStore()

  // Estados para Agendamentos
  const [bookings, setBookings] = useState<Booking[]>([])
  const [series, setSeries] = useState<BookingSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para Histórico
  const [historyClasses, setHistoryClasses] = useState<ClassHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Modal de cancelamento
  const [confirm, setConfirm] = useState<{ open: boolean; bookingId: string | null }>({ open: false, bookingId: null })
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  
  // Modal de informação sobre aulas reservadas
  const [showReservedInfo, setShowReservedInfo] = useState(false)

  const fetchBookings = useCallback(async () => {
    if (!token || !user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Buscar bookings do aluno
      const bookingsResp = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (bookingsResp.ok) {
        const data = await bookingsResp.json()
        const allBookings = Array.isArray(data) ? data : data.bookings || []

        const mappedBookings: Booking[] = allBookings.map((b: any) => ({
          id: b.id,
          start_at: b.startAt || b.start_at,
          date: b.date,
          end_at: b.endAt || b.end_at,
          status: b.status,
          status_canonical: b.status_canonical || b.status,
          is_reserved: b.is_reserved || false,
          series_id: b.series_id || null,
          teacher_id: b.teacherId || b.teacher_id,
          teacherName: b.teacherName,
          teacher_name: b.teacher_name,
          avatar_url: b.avatar_url,
          academy_id: b.franchiseId || b.academy_id || b.franchise_id,
          franchiseName: b.franchiseName,
          franchise_name: b.franchise_name,
          unit_id: b.unit_id,
          cancellableUntil: b.cancellableUntil || b.cancellable_until
        }))

        const now = new Date()
        const futureBookings = mappedBookings.filter((b: Booking) => {
          if ((b.status_canonical || b.status) === 'CANCELED' || (b.status_canonical || b.status) === 'CANCELLED') {
            return false
          }
          const bookingTime = b.start_at || b.date
          if (!bookingTime) return false
          const bookingDate = getBookingTime(b)
          if (isNaN(bookingDate.getTime())) return false
          return bookingDate.getTime() > now.getTime()
        })

        // Ordenar por data
        futureBookings.sort((a, b) => {
          const aTime = (a.start_at || a.date || '').toString()
          const bTime = (b.start_at || b.date || '').toString()
          if (!aTime || !bTime) return 0
          return new Date(aTime).getTime() - new Date(bTime).getTime()
        })

        setBookings(futureBookings)
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

  const fetchHistory = useCallback(async () => {
    if (!token || !user?.id) return

    setIsHistoryLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // Buscar todas as aulas do aluno
      const response = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const allBookings = Array.isArray(data) ? data : data.bookings || []
        
        const now = new Date()
        
        // Filtrar APENAS aulas passadas (data/hora já passou)
        const pastBookings = allBookings.filter((b: any) => {
          const bookingTime = b.startAt || b.start_at || b.date
          if (!bookingTime) return false
          
          // Usar getBookingTime para parsear corretamente
          const bookingDate = getBookingTime({
            start_at: b.startAt || b.start_at,
            date: b.date
          } as Booking)
          
          if (isNaN(bookingDate.getTime())) return false
          
          // Apenas aulas passadas (data/hora < agora)
          return bookingDate.getTime() < now.getTime()
        })
        
        // Mapear para o formato esperado pelo histórico
        const historyData: ClassHistory[] = pastBookings.map((b: any) => {
          const bookingTime = b.startAt || b.start_at || b.date
          const bookingDate = getBookingTime({
            start_at: b.startAt || b.start_at,
            date: b.date
          } as Booking)
          
          // Determinar status baseado no status_canonical
          const status = (b.status_canonical || b.status || '').toUpperCase()
          let historyStatus: 'completed' | 'cancelled' | 'no_show' = 'completed'
          
          if (status === 'CANCELED' || status === 'CANCELLED') {
            historyStatus = 'cancelled'
          } else if (status === 'DONE') {
            historyStatus = 'completed'
          } else if (status === 'PAID') {
            // Se está PAID e já passou, consideramos como concluída
            historyStatus = 'completed'
          } else {
            // Se passou mas não está marcada como concluída/cancelada, pode ser no_show
            historyStatus = 'no_show'
          }
          
          return {
            id: b.id,
            date: bookingTime,
            time: bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            teacher_name: b.teacherName || b.teacher_name || 'Professor',
            teacher_avatar: b.avatar_url,
            unit_name: b.franchiseName || b.franchise_name || 'Academia',
            status: historyStatus
          }
        })
        
        // Ordenar por data (mais recentes primeiro)
        historyData.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA // Descendente (mais recente primeiro)
        })
        
        setHistoryClasses(historyData)
      }
    } catch (error) {
      console.error('Erro ao buscar histórico', error)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [token, user?.id])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBookings()
      fetchHistory()
    }
  }, [isAuthenticated, token, fetchBookings, fetchHistory])

  const cancelBooking = async (id: string) => {
    if (!token || cancellingBookingId) return // Prevenir múltiplos cliques

    setCancellingBookingId(id)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || data?.message || 'Erro ao cancelar')
      }
      // Recarregar dados
      await fetchBookings()
      setConfirm({ open: false, bookingId: null })
    } catch (err: any) {
      console.error('Erro ao cancelar:', err)
      alert(err?.message || 'Erro ao cancelar')
    } finally {
      setCancellingBookingId(null)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    const status = booking.status_canonical || booking.status
    if (status === 'CANCELED' || status === 'CANCELLED') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
    }

    if (booking.is_reserved) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Reservada
        </Badge>
      )
    }

    if (booking.series_id) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Repeat className="h-3 w-3 mr-1" />
          Série
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Confirmada
      </Badge>
    )
  }

  const getHistoryStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Concluída</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
      case 'no_show':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">Falta</Badge>
      default:
        return null
    }
  }

  // Separar a próxima aula (primeira da lista ordenada) das demais
  const nextClass = bookings[0]
  const otherClasses = bookings.slice(1)

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Unificado */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
          Olá, <span className="text-blue-600">{user.name?.split(' ')[0] || 'Aluno'}</span>!
        </h1>
        <p className="text-gray-500 text-lg">
          Bem-vindo ao seu painel principal.
        </p>
      </div>

      <Tabs defaultValue="aulas" className="w-full space-y-6">
        <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex p-1 bg-gray-100/80 rounded-xl">
          <TabsTrigger value="aulas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Aulas e Agenda</TabsTrigger>
          <TabsTrigger value="historico" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Histórico</TabsTrigger>
          <TabsTrigger value="perfil" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Meu Perfil</TabsTrigger>
        </TabsList>

        {/* TAB 1: AULAS (Dashboard Principal Atual) */}
        <TabsContent value="aulas" className="space-y-8 focus-visible:outline-none ring-0">
          {/* Stats Premium */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                    Confirmadas
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {bookings.filter(b => !b.is_reserved && (b.status !== 'CANCELED')).length}
                  </p>
                  <p className="text-blue-100 text-sm font-medium">Aulas futuras</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                      Aulas Reservadas
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-white hover:text-white hover:bg-white/30 bg-white/15 border-2 border-white/40 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all"
                      onClick={() => setShowReservedInfo(true)}
                    >
                      <Info className="h-3.5 w-3.5 mr-1.5" />
                      Saiba mais
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {bookings.filter(b => b.is_reserved && (b.status_canonical || b.status) !== 'CANCELED' && (b.status_canonical || b.status) !== 'CANCELLED').length}
                  </p>
                  <p className="text-amber-100 text-sm font-medium">Aguardando crédito</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Repeat className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                    Recorrentes
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {series.filter(s => s.status === 'ACTIVE').length}
                  </p>
                  <p className="text-emerald-100 text-sm font-medium">Séries ativas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Coluna da Esquerda (2/3) - Aulas */}
            <div className="lg:col-span-2 space-y-8">

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Loader2 className="h-10 w-10 animate-spin text-meu-primary mb-4" />
                  <p className="text-gray-500 animate-pulse">Carregando suas aulas...</p>
                </div>
              ) : error ? (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 text-red-700">
                  <AlertCircle className="h-6 w-6" />
                  <p>{error}</p>
                </div>
              ) : bookings.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-gray-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                      <Calendar className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma aula agendada</h3>
                    <p className="text-gray-500 max-w-sm mb-8">
                      Você ainda não tem treinos marcados. Que tal começar sua jornada agora?
                    </p>
                    <Button
                      size="lg"
                      className="bg-meu-primary hover:bg-meu-primary-dark text-white rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => router.push('/aluno/professores')}
                    >
                      Agendar Primeira Aula
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Hero Card - Próxima Aula */}
                  {nextClass && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          Sua Próxima Aula
                        </h2>
                      </div>

                      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-blue-100 transition-all hover:shadow-2xl group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Dumbbell className="h-64 w-64 transform rotate-12" />
                        </div>

                        <div className="p-6 md:p-8 relative z-10">
                          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
                            {/* Data Box */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-2xl p-4 w-20 md:w-24 border border-blue-100">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {new Date(nextClass.start_at || nextClass.date || '').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                              </span>
                              <span className="text-3xl md:text-4xl font-black">
                                {new Date(nextClass.start_at || nextClass.date || '').getDate()}
                              </span>
                              <span className="text-xs font-medium text-blue-600/80">
                                {new Date(nextClass.start_at || nextClass.date || '').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                              </span>
                            </div>

                            {/* Detalhes */}
                            <div className="flex-1 space-y-4">
                              <div className="flex flex-wrap gap-2 items-start">
                                {getStatusBadge(nextClass)}
                                <Badge variant="outline" className="text-gray-500 border-gray-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(nextClass.start_at || nextClass.date)}
                                </Badge>
                              </div>

                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                  {nextClass.teacherName || nextClass.teacher_name || 'Personal Trainer'}
                                </h3>
                                <div className="flex items-center gap-2 text-gray-500 mt-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{nextClass.franchiseName || nextClass.franchise_name || 'Unidade Principal'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-2">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarImage src={nextClass.avatar_url} />
                                  <AvatarFallback className="bg-blue-100 text-blue-700">
                                    {(nextClass.teacherName || nextClass.teacher_name || 'P').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm text-gray-500">
                                  Com <strong>{nextClass.teacherName || nextClass.teacher_name || 'Professor'}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Ação */}
                            <div className="w-full md:w-auto mt-4 md:mt-0">
                              <Button
                                variant="outline"
                                className="w-full md:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                                onClick={() => setConfirm({ open: true, bookingId: nextClass.id })}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Progresso / Status Visual */}
                        <div className="h-1.5 w-full bg-gray-100">
                          <div className="h-full bg-blue-500 w-full origin-left transform transition-transform duration-1000 ease-out" style={{ transform: 'scaleX(1)' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista Próximas Aulas */}
                  {otherClasses.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        Demais Agendamentos
                      </h3>

                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                        {otherClasses.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50 transition-colors group"
                          >
                            {/* Data Mini */}
                            <div className="flex sm:flex-col items-center gap-2 sm:gap-0 min-w-[60px] text-gray-500">
                              <span className="text-sm font-bold text-gray-900">
                                {new Date(booking.start_at || booking.date || '').getDate()}
                              </span>
                              <span className="text-xs uppercase">
                                {new Date(booking.start_at || booking.date || '').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {booking.teacherName || booking.teacher_name || 'Personal'}
                                </span>
                                {getStatusBadge(booking)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(booking.start_at || booking.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.franchiseName || booking.franchise_name || 'Academia'}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => setConfirm({ open: true, bookingId: booking.id })}
                              title="Cancelar aula"
                            >
                              <XCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Aviso sobre reservas */}
              {bookings.some(b => b.is_reserved) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Atenção às reservas</p>
                    <p className="leading-relaxed opacity-90">
                      Aulas reservadas precisam de crédito até 7 dias antes. Sem crédito, elas serão canceladas automaticamente pelo sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna da Direita (1/3) - Séries e Info */}
            <div className="space-y-8">
              {/* Séries Sidebar */}
              {series.filter(s => s.status === 'ACTIVE').length > 0 && (
                <Card className="border-0 shadow-md bg-gradient-to-b from-white to-gray-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <Repeat className="h-4 w-4 text-blue-700" />
                      </div>
                      Séries Ativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {series.filter(s => s.status === 'ACTIVE').map(s => (
                      <div key={s.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900">{s.teacher?.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-5 bg-blue-50 text-blue-700">
                            {RECURRENCE_LABELS[s.recurrence_type] || s.recurrence_type}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-gray-500 text-xs">
                          <p className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            Todo(a) {DAY_NAMES[s.day_of_week]}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {s.start_time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: HISTÓRICO */}
        <TabsContent value="historico" className="space-y-6 focus-visible:outline-none ring-0">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b border-gray-100/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5 text-meu-primary" />
                Histórico Completo
              </CardTitle>
              <CardDescription>
                Visualize todas as aulas que você já realizou ou agendadas anteriormente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-meu-primary mb-2" />
                  <p>Carregando histórico...</p>
                </div>
              ) : historyClasses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">Nenhuma aula no histórico</p>
                  <p className="text-sm mt-1">Conclua sua primeira aula para vê-la aqui!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyClasses.map((item) => (
                    <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border border-gray-100">
                          {item.teacher_avatar && <AvatarImage src={item.teacher_avatar} />}
                          <AvatarFallback>{item.teacher_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{item.teacher_name}</p>
                            {getHistoryStatusBadge(item.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(item.date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.unit_name}
                          </p>
                        </div>
                      </div>
                      {/* Future actions like "Ver Detalhes" could go here */}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PERFIL */}
        <TabsContent value="perfil" className="space-y-6 focus-visible:outline-none ring-0">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Cartão de Perfil Principal */}
            <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-meu-primary to-blue-600 relative">
                <div className="absolute -bottom-12 left-6">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                      {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="mt-14 px-6 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-gray-500">Aluno</p>
                  </div>
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mt-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Informações de Contato</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="text-sm">(11) 99999-9999</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Segurança</h3>
                    <div className="space-y-3">
                      <Button variant="outline" size="sm" className="w-full justify-start text-gray-600">
                        <Shield className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => logout()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair da Conta
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Cartão Lateral de Plano (Placeholder) */}
            <Card className="border-none shadow-md bg-gradient-to-b from-gray-900 to-meu-primary text-white">
              <CardHeader>
                <CardTitle className="text-lg">Meu Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                    <Dumbbell className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Plano Gold</h3>
                  <p className="text-blue-200 text-sm">Acesso Total</p>
                </div>

                <div className="space-y-2 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Status</span>
                    <span className="font-semibold text-green-300">Ativo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Renovação</span>
                    <span className="font-semibold">15/12/2024</span>
                  </div>
                </div>

                <Button className="w-full bg-white text-meu-primary hover:bg-blue-50">
                  Gerenciar Assinatura
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Informação sobre Aulas Reservadas */}
      <Dialog open={showReservedInfo} onOpenChange={setShowReservedInfo}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
          
          <DialogHeader className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Aulas Reservadas
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Entenda como funcionam as aulas reservadas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-700" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Débito Automático</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      As aulas reservadas serão <strong className="text-amber-900">debitadas 1 semana antes</strong> da data agendada se você tiver crédito disponível.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-amber-200" />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Sem Crédito</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Caso você <strong className="text-amber-900">não tenha crédito</strong> no momento do débito, a aula será <strong className="text-red-600">cancelada automaticamente</strong> pelo sistema.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-amber-200" />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Dica Importante</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Mantenha créditos disponíveis para garantir que suas aulas reservadas sejam confirmadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 pb-2">
            <Button
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all"
              onClick={() => setShowReservedInfo(false)}
            >
              Entendi, obrigado!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento - Mantido igual */}
      <Dialog open={confirm.open} onOpenChange={(open) => !open && setConfirm({ open: false, bookingId: null })}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl overflow-hidden">
          {(() => {
            const b = bookings.find(x => x.id === confirm.bookingId)
            if (!b) return null

            const text = cutoffLabel(b)
            const now = new Date()
            const cutoff = b.cancellableUntil
              ? new Date(b.cancellableUntil)
              : new Date(getBookingTime(b).getTime() - 4 * 60 * 60 * 1000)
            const isBeforeCutoff = now <= cutoff

            const isLateCancellation = !b.is_reserved && !isBeforeCutoff;

            return (
              <>
                <div className={`h-2 w-full absolute top-0 left-0 ${isLateCancellation ? 'bg-amber-500' : 'bg-red-500'}`} />

                <DialogHeader className="pt-6">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    {isLateCancellation ? (
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    )}
                    <span className="ml-1">Cancelar Agendamento</span>
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                    {b.series_id
                      ? 'Esta aula faz parte de uma recorrência. O cancelamento afeta apenas esta data.'
                      : 'Você tem certeza que deseja cancelar esta aula?'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-white shadow-sm">
                      <AvatarImage src={b.avatar_url} />
                      <AvatarFallback>{(b.teacherName || 'P').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-900">{b.teacherName || b.teacher_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(b.start_at || b.date)} às {formatTime(b.start_at || b.date)}
                      </p>
                    </div>
                  </div>

                  {!b.is_reserved && (
                    <div className={cn(
                      "rounded-lg p-4 text-sm border",
                      isBeforeCutoff
                        ? "bg-green-50 border-green-100 text-green-800"
                        : "bg-amber-50 border-amber-100 text-amber-800"
                    )}>
                      <p className="font-semibold mb-1 flex items-center gap-2">
                        {isBeforeCutoff ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {isBeforeCutoff ? 'Cancelamento Gratuito' : 'Fora do Prazo Gratuito'}
                      </p>
                      <p className="opacity-90 leading-relaxed">
                        {isBeforeCutoff
                          ? `Seu crédito será devolvido integralmente. Prazo até: ${text}`
                          : `O prazo para cancelamento gratuito encerrou em ${text}. Seu crédito não será estornado.`}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto text-gray-600"
                    onClick={() => setConfirm({ open: false, bookingId: null })}
                    disabled={!!cancellingBookingId}
                  >
                    Manter Aula
                  </Button>
                  <Button
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                    onClick={() => confirm.bookingId && cancelBooking(confirm.bookingId)}
                    disabled={cancellingBookingId === confirm.bookingId}
                  >
                    {cancellingBookingId === confirm.bookingId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
