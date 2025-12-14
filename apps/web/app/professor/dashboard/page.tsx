'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import ProfessorLayout from '@/components/layout/professor-layout'
import { ApprovalBanner } from '@/components/teacher/approval-banner'
import { ApprovalBlock } from '@/components/teacher/approval-block'
import { CheckinButton, CheckinResult } from '@/components/teacher/checkin-button'
import { QRCodeGenerator } from '@/components/teacher/qr-code-generator'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Clock,
  Calendar,
  Users,
  Activity,
  DollarSign,
  Loader2,
  AlertCircle,
  TrendingUp,
  Filter,
  Building2,
  CheckCircle,
  Check,
  Phone,
  UserPlus,
  Globe,
  Mail,
  Wallet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value?: number | null) => currencyFormatter.format(value ?? 0)

interface Booking {
  id: string
  date: string
  duration: number
  status: string
  status_canonical?: string
  credits_cost: number
  student_name: string | null
  student_id: string | null
  student_email?: string | null
  student_phone?: string | null
  student_avatar?: string | null
  academy_name: string | null
  academy_id: string | null
  earnings: number
  type: 'private' | 'academy'
  is_portfolio?: boolean
  connection_status?: string | null
  series_id?: string | null
}

interface HistoryData {
  summary: {
    total_classes: number
    total_earnings: number
    academy_earnings: number
    academy_hours: number
    private_earnings: number
    hourly_rate: number
  }
  by_student: Array<{
    student_id: string
    student_name: string
    student_email: string
    student_avatar?: string | null
    total_classes: number
    completed_classes: number
    total_earnings: number
    hourly_rate: number
  }>
  monthly: Array<{
    month: number
    year: number
    month_name: string
    total_classes: number
    academy_earnings: number
    private_earnings: number
    total_earnings: number
  }>
  bookings: Booking[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function ProfessorDashboardPage() {
  const { user, token } = useAuthStore()
  const [data, setData] = useState<HistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros Globais
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + '')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedSource, setSelectedSource] = useState<string>('all') // 'all' | 'private' | 'academy'
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedAcademy, setSelectedAcademy] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all') // 'all' | 'today' | 'week' | 'month'
  const [studentList, setStudentList] = useState<{ id: string; name: string }[]>([])
  const [academyList, setAcademyList] = useState<{ id: string; name: string }[]>([])
  const [hourBalance, setHourBalance] = useState<{ available_hours: number; pending_hours: number }>({ available_hours: 0, pending_hours: 0 })

  // Alunos da plataforma (não fidelizados)
  const [platformStudents, setPlatformStudents] = useState<Array<{
    id: string
    name: string
    email: string
    phone?: string
    user_id?: string
  }>>([])
  const [fidelizingId, setFidelizingId] = useState<string | null>(null)

  // Paginação (apenas para histórico)




  // Estado de cancelamento
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancelClick = (booking: Booking) => {
    setBookingToCancel(booking)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!bookingToCancel || !token) return
    setIsLoading(true)
    setIsCancelling(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Falha ao cancelar aula')

      toast.success('Aula cancelada com sucesso')
      setCancelDialogOpen(false)
      setBookingToCancel(null)
      loadData() // Recarregar dados
    } catch (error) {
      console.error('Erro ao cancelar:', error)
      toast.error('Erro ao cancelar aula. Tente novamente.')
      setIsLoading(false)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleFidelizar = async (studentId: string) => {
    if (!token || !user?.id) return
    setFidelizingId(studentId)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(
        `${API_URL}/api/teachers/${user.id}/students/${studentId}/portfolio`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({ is_portfolio: true })
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.status === 'PENDING') {
          toast.success('Solicitação enviada! Aguardando aprovação do aluno.')
        } else {
          toast.success('Aluno fidelizado! Agora está na sua carteira.')
        }
        // Recarregar dados para atualizar o status no histórico
        loadData()
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Erro ao solicitar fidelização')
      }
    } catch (error) {
      toast.error('Erro ao processar requisição')
    } finally {
      setFidelizingId(null)
    }
  }

  const loadData = async () => {
    if (!user?.id || !token) return
    setIsLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const params = new URLSearchParams()

      // Filtros de período
      if (selectedMonth && selectedMonth !== 'all') params.append('month', selectedMonth)
      if (selectedYear) params.append('year', selectedYear)

      // Filtro de tipo (plataforma vs particular)
      if (selectedSource !== 'all') params.append('type', selectedSource)

      // Filtro de aluno
      if (selectedStudent !== 'all') params.append('student_id', selectedStudent)



      const response = await fetch(
        `${API_URL}/api/teachers/${user.id}/history?${params.toString()}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized')
        throw new Error('Erro ao carregar dados')
      }

      const historyData = await response.json()
      setData(historyData)

      // Buscar stats para obter saldo de horas (available + pending)
      try {
        const statsResponse = await fetch(
          `${API_URL}/api/teachers/${user.id}/stats`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        )
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.hour_balance) {
            setHourBalance({
              available_hours: statsData.hour_balance.available_hours || 0,
              pending_hours: statsData.hour_balance.pending_hours || 0
            })
          }
        }
      } catch (statsErr) {
        console.error('Erro ao buscar stats:', statsErr)
      }

      // Buscar alunos da plataforma (não fidelizados)
      try {
        const studentsResponse = await fetch(
          `${API_URL}/api/teachers/${user.id}/students`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        )
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json()
          const platformOnly = (studentsData.students || []).filter(
            (s: any) => s.source === 'PLATFORM' && !s.is_portfolio
          )
          setPlatformStudents(platformOnly)
        }
      } catch (studentsErr) {
        console.error('Erro ao buscar alunos da plataforma:', studentsErr)
      }

      // Extrair lista única de alunos para o dropdown (apenas na primeira carga)
      if (studentList.length === 0 && historyData?.bookings) {
        const uniqueStudents = new Map<string, string>()
        historyData.bookings.forEach((b: Booking) => {
          if (b.student_id && b.student_name) {
            uniqueStudents.set(b.student_id, b.student_name)
          }
        })
        setStudentList(Array.from(uniqueStudents.entries()).map(([id, name]) => ({ id, name })))
      }

      // Extrair lista única de academias para o dropdown (apenas na primeira carga)
      if (academyList.length === 0 && historyData?.bookings) {
        const uniqueAcademies = new Map<string, string>()
        historyData.bookings.forEach((b: Booking) => {
          if (b.academy_id && b.academy_name) {
            uniqueAcademies.set(b.academy_id, b.academy_name)
          }
        })
        setAcademyList(Array.from(uniqueAcademies.entries()).map(([id, name]) => ({ id, name })))
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        setError('Sessão expirada. Faça login novamente.')
      } else {
        setError('Não foi possível carregar os dados do painel.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token, selectedMonth, selectedYear, selectedSource, selectedStudent, selectedAcademy, selectedStatus, selectedPeriod])



  // Constantes de Data
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ]

  const currentYear = new Date().getFullYear()
  const startYear = 2025
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  )

  if (!user) return null

  if (isLoading && !data) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  const isNotApproved = user.approval_status !== 'approved'

  // Memoized stats based on filters (backend handles filtering, but we can double check logic if needed)
  // Logic: The API returns summarized data based on the params.

  return (
    <ProfessorLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
        <ApprovalBanner approvalStatus={user.approval_status} userName={user.name} />

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500">
            Visão completa do seu desempenho e atividades
          </p>
        </div>

        {error ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button variant="outline" className="mt-4 border-red-200 text-red-700 hover:bg-red-100" onClick={loadData}>
              Tentar Novamente
            </Button>
          </div>
        ) : !data ? null : (
          <>
            {isNotApproved && (
              <ApprovalBlock
                title={user.approval_status === 'rejected' ? 'Acesso Negado' : 'Dashboard Bloqueado'}
                message="Aguarde a aprovação do cadastro para visualizar seus dados."
                approvalStatus={user.approval_status}
              />
            )}

            {/* KPI Grid */}
            {/* KPI Grid */}
            {/* KPI Grid */}
            {(() => {
              const now = new Date()
              let pastBookings = data.bookings.filter(b => new Date(b.date) <= now)

              // Aplicar filtros
              if (selectedPeriod === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                pastBookings = pastBookings.filter(b => {
                  const bookingDate = new Date(b.date)
                  return bookingDate >= today && bookingDate < tomorrow
                })
              } else if (selectedPeriod === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                pastBookings = pastBookings.filter(b => new Date(b.date) >= weekAgo)
              } else if (selectedPeriod === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                pastBookings = pastBookings.filter(b => new Date(b.date) >= monthAgo)
              }

              if (selectedStatus !== 'all') {
                pastBookings = pastBookings.filter(b => b.status === selectedStatus)
              }

              if (selectedAcademy !== 'all') {
                pastBookings = pastBookings.filter(b => b.academy_id === selectedAcademy)
              }

              // Calcular métricas
              const totalBookings = pastBookings.length
              const canceledBookings = pastBookings.filter(b => b.status === 'CANCELED' || b.status === 'CANCELLED').length
              const cancelRate = totalBookings > 0 ? ((canceledBookings / totalBookings) * 100).toFixed(1) : '0'

              // Aluno mais frequente (Removido por solicitação)

              // Horário mais popular
              const hourCounts = pastBookings.reduce((acc, b) => {
                const hour = new Date(b.date).getHours()
                acc[hour] = (acc[hour] || 0) + 1
                return acc
              }, {} as Record<number, number>)
              const topHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

              // Comparação Particular vs Plataforma
              const privateCount = pastBookings.filter(b => b.type === 'private').length
              const academyCount = pastBookings.filter(b => b.type === 'academy').length
              const privatePercentage = totalBookings > 0 ? ((privateCount / totalBookings) * 100).toFixed(0) : '0'
              const academyPercentage = totalBookings > 0 ? ((academyCount / totalBookings) * 100).toFixed(0) : '0'

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Faturamento (Carteira + Créditos) */}
                  <Card className="bg-[#002C4E] text-white border-none shadow-meu-lg relative overflow-hidden group md:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 p-32 bg-[#27DFFF]/10 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-[#27DFFF]/15"></div>
                    <CardContent className="p-5 relative flex flex-col justify-between h-full space-y-5">
                      {/* Carteira */}
                      <div>
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                          <DollarSign className="w-4 h-4 text-[#FFF373]" />
                          <span className="text-xs font-bold uppercase tracking-wider">Carteira</span>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-0.5">
                          {formatCurrency(data.summary.private_earnings || 0)}
                        </h2>
                      </div>

                      {/* Créditos (disponíveis + pendentes) */}
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                          <Clock className="w-4 h-4 text-[#27DFFF]" />
                          <span className="text-xs font-bold uppercase tracking-wider">Créditos</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-2xl font-bold text-white">
                            {Math.max(0, hourBalance.available_hours - hourBalance.pending_hours)} <span className="text-sm font-normal text-white/60">disponíveis</span>
                          </h3>
                        </div>
                        {hourBalance.pending_hours > 0 && (
                          <p className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            +{hourBalance.pending_hours} pendentes (aulas agendadas)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Taxa de Cancelamento */}
                  <Card className="border border-red-100 shadow-sm bg-white hover:bg-red-50/30 transition-colors">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        {/* Removed 'Taxa' badge */}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Cancelamentos</p>
                        <h3 className="text-2xl font-bold text-gray-900">{cancelRate}%</h3>
                        <p className="text-xs text-red-500 mt-1">{canceledBookings}/{totalBookings} aulas</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Aulas Realizadas e Horário (Grid interno ou Cards separados) */}
                  <div className="grid grid-rows-2 gap-4 lg:col-span-1">
                    {/* Aulas Realizadas */}
                    <Card className="border border-emerald-100 shadow-sm bg-white hover:bg-emerald-50/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Aulas Realizadas</p>
                          <h3 className="text-xl font-bold text-gray-900">
                            {totalBookings - canceledBookings}
                          </h3>
                          <p className="text-xs text-emerald-600 font-medium">Concluídas</p>
                        </div>
                        <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Horário Popular */}
                    <Card className="border border-purple-100 shadow-sm bg-white hover:bg-purple-50/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Horário Popular</p>
                          <h3 className="text-xl font-bold text-gray-900">
                            {topHourEntry ? `${topHourEntry[0]}:00h` : '-'}
                          </h3>
                          <p className="text-xs text-purple-600 font-medium">{topHourEntry ? `${topHourEntry[1]} aulas` : 'Sem dados'}</p>
                        </div>
                        <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                          <Clock className="w-5 h-5" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Distribuição */}
                  <Card className="border border-amber-100 shadow-sm bg-white hover:bg-amber-50/30 transition-colors lg:col-span-1">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Distribuição</h3>
                          <p className="text-xs text-gray-500">Origem das aulas</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-gray-600">Particular</span>
                            <span className="text-xs font-bold text-amber-600">{privatePercentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${privatePercentage}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-gray-600">Plataforma</span>
                            <span className="text-xs font-bold text-[#002C4E]">{academyPercentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#002C4E] rounded-full transition-all duration-500" style={{ width: `${academyPercentage}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Antigo Grid de KPIs (Removido e substituído pelo bloco acima) */}
            <div className="space-y-8">
              {/* Próximas Aulas (Always Visible if present) */}
              {(() => {
                const now = new Date()
                const upcomingBookings = data.bookings.filter(b => new Date(b.date) > now)

                if (upcomingBookings.length > 0) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[#002C4E] flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#002C4E]" />
                            Próximas Aulas
                          </h3>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                          {upcomingBookings.length} agendadas
                        </Badge>
                      </div>

                      <div className="w-full max-w-full px-4 sm:px-0">
                        <Carousel
                          opts={{
                            align: "start",
                            loop: false,
                          }}
                          className="w-full"
                        >
                          <CarouselContent className="-ml-3 pb-4">
                            {upcomingBookings.slice(0, 10).map((booking) => (
                              <CarouselItem key={booking.id} className="pl-3 basis-full md:basis-1/2 lg:basis-1/3">
                                <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 overflow-hidden ring-1 ring-black/[0.02]">
                                  {/* Header Gradient - Compact */}
                                  <div className={`h-14 w-full bg-gradient-to-r ${booking.type === 'private'
                                    ? 'from-amber-400 to-orange-400'
                                    : 'from-[#002C4E] to-[#005F8C]'
                                    } px-4 py-2.5 flex justify-center items-center relative`}>
                                    <div className="absolute inset-0 bg-white/5 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

                                    <div className="relative z-10 flex flex-col items-center bg-black/10 backdrop-blur-sm rounded px-3 py-1 text-white border border-white/10 shadow-sm">
                                      <span className="text-sm font-bold leading-none mb-0.5">
                                        {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <span className="text-[10px] uppercase font-medium opacity-90 leading-none">
                                        {new Date(booking.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}, {new Date(booking.date).getDate()}
                                      </span>
                                    </div>

                                    <Badge className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md shadow-sm h-6 px-2.5 text-[10px]">
                                      {booking.type === 'private' ? 'Particular' : 'Plataforma'}
                                    </Badge>
                                  </div>

                                  {/* Body - Compact */}
                                  <div className="px-4 pb-4">
                                    <div className="flex justify-between items-end -mt-5 mb-3 px-1">
                                      <Avatar className="h-12 w-12 border-4 border-white shadow-md ring-1 ring-gray-50/50">
                                        <AvatarImage src={booking.student_avatar || undefined} className="object-cover" />
                                        <AvatarFallback className={`font-bold text-base ${booking.type === 'private' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                                          }`}>
                                          {booking.student_name?.[0] || booking.academy_name?.[0] || 'C'}
                                        </AvatarFallback>
                                      </Avatar>

                                      <div className="bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-gray-100 text-[11px] font-bold text-gray-700 flex items-center gap-1 mb-1">
                                        {booking.type === 'private' ? (
                                          <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            {formatCurrency(booking.earnings)}
                                          </>
                                        ) : (
                                          <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                            {booking.credits_cost || 1}h
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div>
                                        <h3 className="font-bold text-gray-900 text-base leading-tight mb-0.5">
                                          {booking.student_name || booking.academy_name || 'Cliente'}
                                        </h3>
                                        {booking.student_phone && (
                                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px] group-hover:text-gray-700 transition-colors">
                                            <Phone className="w-3 h-3 opacity-70" />
                                            {booking.student_phone}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1.5">
                                      {/* Mensagem de status para RESERVED */}
                                      {(booking.status_canonical === 'RESERVED' || booking.status === 'PENDING') && (
                                        <div className={`text-[10px] px-2 py-1 rounded-md text-center ${
                                          booking.series_id 
                                            ? 'bg-amber-50 text-amber-700' 
                                            : (hourBalance.available_hours - hourBalance.pending_hours) >= 1
                                              ? 'bg-violet-50 text-violet-700'
                                              : 'bg-red-50 text-red-700'
                                        }`}>
                                          {booking.series_id 
                                            ? '⏳ Aguardando crédito do aluno' 
                                            : (hourBalance.available_hours - hourBalance.pending_hours) >= 1
                                              ? '⏳ Confirme para usar seu crédito'
                                              : '⚠️ Compre créditos para confirmar'}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          {(booking.status_canonical === 'RESERVED' || booking.status === 'PENDING') ? (
                                            booking.series_id ? (
                                              // Série recorrente - aguardando crédito do aluno (não tem ação do professor)
                                              <div className="w-full h-8 rounded-lg font-bold text-xs bg-amber-100 text-amber-700 flex items-center justify-center">
                                                Reservado
                                              </div>
                                            ) : (
                                              // Aluno fidelizado - professor precisa confirmar (só se tiver crédito)
                                              (hourBalance.available_hours - hourBalance.pending_hours) >= 1 ? (
                                                <Button
                                                  onClick={async () => {
                                                    try {
                                                      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                                      const res = await fetch(`${API_URL}/api/bookings/${booking.id}`, {
                                                        method: 'PATCH',
                                                        headers: {
                                                          'Content-Type': 'application/json',
                                                          'Authorization': `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify({ status: 'PAID' })
                                                      })
                                                      if (res.ok) {
                                                        toast.success('Aula confirmada com sucesso!')
                                                        loadData()
                                                      } else {
                                                        const data = await res.json()
                                                        if (data.error?.includes('Saldo de horas insuficiente')) {
                                                          toast.error('Você não tem créditos suficientes. Compre mais créditos para confirmar esta aula.', {
                                                            action: {
                                                              label: 'Comprar',
                                                              onClick: () => window.location.href = '/professor/comprar'
                                                            }
                                                          })
                                                        } else {
                                                          toast.error(data.error || 'Erro ao confirmar aula')
                                                        }
                                                      }
                                                    } catch {
                                                      toast.error('Erro ao confirmar aula')
                                                    }
                                                  }}
                                                  className="w-full h-8 rounded-lg font-bold text-xs bg-violet-500 hover:bg-violet-600 text-white"
                                                >
                                                  ✓ Confirmar Aula
                                                </Button>
                                              ) : (
                                                <Button
                                                  onClick={() => {
                                                    toast.error('Você não tem créditos suficientes para confirmar esta aula.', {
                                                      action: {
                                                        label: 'Comprar Créditos',
                                                        onClick: () => window.location.href = '/professor/comprar'
                                                      }
                                                    })
                                                  }}
                                                  className="w-full h-8 rounded-lg font-bold text-xs bg-gray-300 text-gray-600 cursor-not-allowed"
                                                >
                                                  Sem Créditos
                                                </Button>
                                              )
                                            )
                                          ) : (
                                            <CheckinButton
                                              bookingId={booking.id}
                                              bookingDate={new Date(booking.date)}
                                              status={booking.status_canonical || booking.status}
                                              variant={booking.type === 'private' ? 'private' : 'platform'}
                                              onSuccess={() => loadData()}
                                            />
                                          )}
                                        </div>

                                        {(booking.status_canonical === 'PAID' || booking.status === 'PAID') && booking.academy_id && (
                                          <QRCodeGenerator
                                            bookingId={booking.id}
                                            academyId={booking.academy_id}
                                            studentName={booking.student_name || undefined}
                                            bookingDate={booking.date}
                                          />
                                        )}

                                        <Button
                                          variant="ghost"
                                          onClick={() => handleCancelClick(booking)}
                                          className="h-8 px-2.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 font-medium text-[10px] transition-colors"
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <div className="flex justify-end gap-2 mt-2 mr-4">
                            <CarouselPrevious className="static translate-y-0 h-8 w-8 hover:bg-gray-100" />
                            <CarouselNext className="static translate-y-0 h-8 w-8 hover:bg-gray-100" />
                          </div>
                        </Carousel>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Histórico / Análise (Antigo Análise de Aulas Passadas) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#002C4E] flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#002C4E]" />
                      Histórico
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Visualize detalhes e insights das suas aulas realizadas
                    </p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-row flex-wrap gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth} modal={false}>
                    <SelectTrigger className="min-w-[120px] w-auto border-0 bg-gray-50 font-medium whitespace-nowrap">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear} onValueChange={setSelectedYear} modal={false}>
                    <SelectTrigger className="min-w-[90px] w-auto border-0 bg-gray-50 font-medium whitespace-nowrap">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <div className="w-px bg-gray-200 hidden sm:block mx-1"></div>

                  <Select value={selectedSource} onValueChange={setSelectedSource} modal={false}>
                    <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedSource === 'private' ? 'bg-amber-50 text-amber-700' :
                      selectedSource === 'academy' ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                      <Filter className="w-4 h-4 mr-2 opacity-70" />
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Origens</SelectItem>
                      <SelectItem value="private">Particular</SelectItem>
                      <SelectItem value="academy">Plataforma</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filtro de Aluno */}
                  {studentList.length > 0 && (
                    <Select value={selectedStudent} onValueChange={setSelectedStudent} modal={false}>
                      <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedStudent !== 'all' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                        <Users className="w-4 h-4 mr-2 opacity-70" />
                        <SelectValue placeholder="Aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Alunos</SelectItem>
                        {studentList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Filtro de Unidade */}
                  {academyList.length > 0 && (
                    <>
                      <div className="w-px bg-gray-200 hidden sm:block mx-1"></div>
                      <Select value={selectedAcademy} onValueChange={setSelectedAcademy} modal={false}>
                        <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedAcademy !== 'all' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                          }`}>
                          <Building2 className="w-4 h-4 mr-2 opacity-70" />
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Unidades</SelectItem>
                          {academyList.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {/* Filtro de Status */}
                  <div className="w-px bg-gray-200 hidden sm:block mx-1"></div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus} modal={false}>
                    <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedStatus !== 'all' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                      <CheckCircle className="w-4 h-4 mr-2 opacity-70" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                      <SelectItem value="RESERVED">Reservado</SelectItem>
                      <SelectItem value="COMPLETED">Concluída</SelectItem>
                      <SelectItem value="CANCELED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filtro de Período Rápido */}
                  <div className="w-px bg-gray-200 hidden sm:block mx-1"></div>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod} modal={false}>
                    <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedPeriod !== 'all' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                      <Clock className="w-4 h-4 mr-2 opacity-70" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo Período</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta Semana</SelectItem>
                      <SelectItem value="month">Este Mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabela de Aulas Passadas com Insights */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <CardTitle className="text-lg font-bold text-[#002C4E]">
                      Detalhamento de Aulas
                    </CardTitle>
                    <CardDescription>
                      {(() => {
                        const now = new Date()
                        const pastBookings = data.bookings.filter(b => new Date(b.date) <= now)
                        return `${pastBookings.length} ${pastBookings.length === 1 ? 'aula encontrada' : 'aulas encontradas'}`
                      })()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const now = new Date()
                      let pastBookings = data.bookings.filter(b => new Date(b.date) <= now)

                      // Aplicar filtros locais
                      // Filtro por Período
                      if (selectedPeriod === 'today') {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        pastBookings = pastBookings.filter(b => {
                          const bookingDate = new Date(b.date)
                          return bookingDate >= today && bookingDate < tomorrow
                        })
                      } else if (selectedPeriod === 'week') {
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        pastBookings = pastBookings.filter(b => new Date(b.date) >= weekAgo)
                      } else if (selectedPeriod === 'month') {
                        const monthAgo = new Date()
                        monthAgo.setMonth(monthAgo.getMonth() - 1)
                        pastBookings = pastBookings.filter(b => new Date(b.date) >= monthAgo)
                      }

                      // Filtro por Status
                      if (selectedStatus !== 'all') {
                        pastBookings = pastBookings.filter(b => b.status === selectedStatus)
                      }

                      // Filtro por Academia
                      if (selectedAcademy !== 'all') {
                        pastBookings = pastBookings.filter(b => b.academy_id === selectedAcademy)
                      }

                      if (pastBookings.length === 0) {
                        return (
                          <div className="py-12 text-center">
                            <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-900 font-medium">Nenhuma aula encontrada</p>
                            <p className="text-gray-500 text-sm mt-1">Tente ajustar os filtros para ver mais resultados.</p>
                          </div>
                        )
                      }

                      // Calcular insights (removido do render e movido para renderização direta das linhas)

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Data/Hora</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Aluno</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Unidade</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Ganho</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {pastBookings.map((booking) => {
                                const bookingDate = new Date(booking.date)
                                const isRecent = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24) <= 7

                                return (
                                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {bookingDate.toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isRecent && (
                                          <Badge variant="secondary" className="w-fit mt-1 text-[10px] bg-green-50 text-green-700 border-green-100">
                                            Recente
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border border-gray-100">
                                          <AvatarImage src={booking.student_avatar || undefined} />
                                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                                            {booking.student_name?.[0] || booking.academy_name?.[0] || 'C'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-semibold text-gray-900 text-sm">
                                            {booking.student_name || booking.academy_name || 'Cliente'}
                                          </div>
                                          {booking.student_email && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                              <Mail className="w-3 h-3" />
                                              {booking.student_email}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-900 font-medium">
                                          {booking.academy_name || 'Não informado'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      {booking.type === 'private' ? (
                                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-100 font-medium">
                                          <Wallet className="w-3 h-3 mr-1" />
                                          Dinheiro
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-100 font-medium">
                                          <Clock className="w-3 h-3 mr-1" />
                                          Plataforma
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <div className="flex flex-col items-end">
                                        {booking.type === 'private' ? (
                                          <>
                                            <span className="font-bold text-green-600 text-sm">
                                              {formatCurrency(booking.earnings)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {booking.duration || 60} min
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="font-bold text-purple-600 text-sm">
                                              {booking.credits_cost || 1}h
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {booking.duration || 60} min
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <Badge
                                        variant="secondary"
                                        className={
                                          booking.status === 'COMPLETED' || booking.status === 'DONE'
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : booking.status === 'CANCELED' || booking.status === 'CANCELLED'
                                              ? 'bg-red-50 text-red-700 border-red-100'
                                              : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                        }
                                      >
                                        {booking.status === 'COMPLETED' || booking.status === 'DONE'
                                          ? 'Realizada'
                                          : booking.status === 'CANCELED' || booking.status === 'CANCELLED'
                                            ? 'Cancelada'
                                            : booking.status}
                                      </Badge>
                                    </td>
                                    <td className="py-4 px-6">
                                      {/* Botão de Fidelização - só aparece para aulas concluídas de alunos da plataforma */}
                                      {(booking.status === 'COMPLETED' || booking.status === 'DONE') && 
                                       booking.student_id && 
                                       !booking.is_portfolio && (
                                        booking.connection_status === 'PENDING' ? (
                                          <Badge className="bg-amber-50 text-amber-700 border-amber-100">
                                            Aguardando
                                          </Badge>
                                        ) : booking.connection_status === 'REJECTED' ? (
                                          <Badge className="bg-red-50 text-red-700 border-red-100">
                                            Recusado
                                          </Badge>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => handleFidelizar(booking.student_id!)}
                                            disabled={fidelizingId === booking.student_id}
                                            className="bg-[#002C4E] hover:bg-[#003f70] text-white h-7 px-2 text-xs"
                                          >
                                            {fidelizingId === booking.student_id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <>
                                                <UserPlus className="h-3 w-3 mr-1" />
                                                Fidelizar
                                              </>
                                            )}
                                          </Button>
                                        )
                                      )}
                                      {booking.is_portfolio && (
                                        <Badge className="bg-green-50 text-green-700 border-green-100">
                                          <Check className="h-3 w-3 mr-1" />
                                          Fidelizado
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Cards de Insights */}

              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false)
          setBookingToCancel(null)
          setIsCancelling(false)
        }}
        onConfirm={handleConfirmCancel}
        title="Cancelar Aula"
        description={`Tem certeza que deseja cancelar a aula com ${bookingToCancel?.student_name || 'o aluno'}? Esta ação não pode ser desfeita.`}
        confirmText="Confirmar Cancelamento"
        cancelText="Manter Aula"
        type="danger"
        loading={isCancelling}
      />
    </ProfessorLayout>
  )
}
