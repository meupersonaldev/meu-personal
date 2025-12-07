'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
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
  MapPin,
  ArrowRight,
  TrendingUp,
  Filter,
  Building2,
  User,
  Wallet,
  Mail,
  Phone,
  Trash2,
  CheckCircle,
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
  const [studentList, setStudentList] = useState<{ id: string; name: string }[]>([])

  // Paginação (apenas para histórico)
  const [historyPage, setHistoryPage] = useState<number>(1)
  const historyLimit = 10

  // Aba ativa
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')

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

      // Paginação (apenas quando estiver na aba de histórico)
      if (activeTab === 'history') {
        params.append('page', historyPage.toString())
        params.append('limit', historyLimit.toString())
      }

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
  }, [user?.id, token, selectedMonth, selectedYear, selectedSource, selectedStudent, activeTab, historyPage])

  // Resetar página quando mudar filtros
  useEffect(() => {
    setHistoryPage(1)
  }, [selectedMonth, selectedYear, selectedSource, selectedStudent])

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

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500">
              Visão completa do seu desempenho e atividades
            </p>
          </div>

          <div className="flex flex-row overflow-x-auto pb-2 md:pb-0 gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm shrink-0 scrollbar-hide">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="min-w-[120px] w-auto border-0 bg-gray-50 font-medium whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="min-w-[90px] w-auto border-0 bg-gray-50 font-medium whitespace-nowrap">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="w-px bg-gray-200 hidden sm:block mx-1"></div>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className={`min-w-[140px] w-auto border-0 font-medium whitespace-nowrap ${selectedSource === 'private' ? 'bg-amber-50 text-amber-700' :
                selectedSource === 'academy' ? 'bg-purple-50 text-purple-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                <Filter className="w-4 h-4 mr-2 opacity-70" />
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="private">Particular (Carteira)</SelectItem>
                <SelectItem value="academy">Plataforma (Créditos)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Aluno */}
            {studentList.length > 0 && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
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
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Faturamento */}
              <Card className="bg-[#002C4E] text-white border-none shadow-meu-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-[#27DFFF]/10 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-[#27DFFF]/15"></div>
                <CardContent className="p-6 relative flex flex-col justify-between h-full">
                  <div className="space-y-6">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                            <DollarSign className="w-4 h-4 text-[#FFF373]" />
                          </div>
                          <span className="text-[#FFF373] text-xs font-bold uppercase tracking-wide">Carteira</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                          {formatCurrency(data.summary.private_earnings || 0)}
                        </h2>
                      </div>
                      <p className="text-white/60 text-xs mt-1 font-medium">Receita de Particulares</p>
                    </div>
                    <div className="h-px bg-gradient-to-r from-white/5 via-white/20 to-white/5" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                          <Clock className="w-4 h-4 text-[#27DFFF]" />
                        </div>
                        <span className="text-[#27DFFF] text-xs font-bold uppercase tracking-wide">Créditos</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-2xl font-bold text-white">
                          {data.summary.academy_hours || 0}
                        </h3>
                        <span className="text-sm text-white/60 font-medium">horas</span>
                      </div>
                      <p className="text-white/60 text-xs mt-1 font-medium">Acumulado na Plataforma</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aulas Realizadas */}
              <Card className="group bg-white border border-gray-100 shadow-meu hover:shadow-meu-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#002C4E]/[0.02] rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                <CardContent className="p-6 flex flex-col justify-between h-full relative">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 bg-[#002C4E]/5 rounded-xl flex items-center justify-center text-[#002C4E] group-hover:bg-[#002C4E] group-hover:text-white transition-colors">
                        <Activity className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className={`font-semibold ${data.summary.total_classes > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {selectedMonth !== 'all' ? 'Mensal' : 'Total'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-4xl font-bold text-[#002C4E] tracking-tight">
                        {data.summary.total_classes}
                      </h2>
                      <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                        Aulas Realizadas
                        {data.summary.total_classes > 0 && (
                          <span className="inline-flex items-center text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3 mr-1" /> Ativo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Total de aulas finalizadas</span>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Médio */}
              <Card className="group bg-white border border-gray-100 shadow-meu hover:shadow-meu-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#002C4E]/[0.02] rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                <CardContent className="p-6 flex flex-col justify-between h-full relative">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 bg-[#002C4E]/5 rounded-xl flex items-center justify-center text-[#002C4E] group-hover:bg-[#002C4E] group-hover:text-white transition-colors">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="bg-[#002C4E]/5 text-[#002C4E] hover:bg-[#002C4E]/10">
                        Média
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-4xl font-bold text-[#002C4E] tracking-tight">
                        {formatCurrency(data.summary.hourly_rate)}
                      </h2>
                      <p className="text-sm text-gray-500 font-medium">Valor Hora Médio</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Plataforma</p>
                      <p className="text-sm font-semibold text-[#002C4E]">1h de crédito</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Particular</p>
                      <p className="text-sm font-semibold text-[#002C4E]">{formatCurrency(data.summary.hourly_rate)}/h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lista de Aulas / Histórico */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'upcoming'
                      ? 'bg-[#002C4E] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Próximas Aulas
                    {data.bookings.filter(b => new Date(b.date) > new Date()).length > 0 && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {data.bookings.filter(b => new Date(b.date) > new Date()).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history'
                      ? 'bg-[#002C4E] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <Activity className="w-4 h-4" />
                    Histórico
                    {data.bookings.filter(b => new Date(b.date) <= new Date()).length > 0 && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {data.bookings.filter(b => new Date(b.date) <= new Date()).length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {(() => {
                    const now = new Date()
                    const filteredBookings = activeTab === 'upcoming'
                      ? data.bookings.filter(b => new Date(b.date) > now)
                      : data.bookings.filter(b => new Date(b.date) <= now)

                    if (filteredBookings.length === 0) {
                      return (
                        <div className="py-12 text-center">
                          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-900 font-medium">
                            {activeTab === 'upcoming' ? 'Nenhuma aula agendada' : 'Nenhuma aula no histórico'}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            {activeTab === 'upcoming' ? 'Quando houver novas aulas agendadas, elas aparecerão aqui.' : 'Tente ajustar os filtros de data.'}
                          </p>
                        </div>
                      )
                    }

                    if (activeTab === 'upcoming') {
                      return (
                        <div className="w-full max-w-full px-4 sm:px-0">
                          <Carousel
                            opts={{
                              align: "start",
                              loop: false,
                            }}
                            className="w-full"
                          >
                            <CarouselContent className="-ml-3 pb-4">
                              {filteredBookings.slice(0, 10).map((booking) => (
                                <CarouselItem key={booking.id} className="pl-3 basis-full md:basis-1/2">
                                  <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 overflow-hidden ring-1 ring-black/[0.02]">
                                    {/* Header Gradient - Compact */}
                                    <div className={`h-14 w-full bg-gradient-to-r ${booking.type === 'private'
                                      ? 'from-amber-400 to-orange-400'
                                      : 'from-[#002C4E] to-[#005F8C]' // Brand Blue gradient
                                      } px-4 py-2.5 flex justify-between items-start relative`}>
                                      {/* Decorative Pattern/Overlay */}
                                      <div className="absolute inset-0 bg-white/5 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

                                      <div className="relative z-10 flex flex-col items-start bg-black/10 backdrop-blur-sm rounded px-1.5 py-0.5 text-white border border-white/10">
                                        <span className="text-xs font-bold leading-none mb-0.5">
                                          {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[9px] uppercase font-medium opacity-90 leading-none">
                                          {new Date(booking.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}, {new Date(booking.date).getDate()}
                                        </span>
                                      </div>

                                      <Badge className="relative z-10 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md shadow-sm h-5 px-2 text-[10px]">
                                        {booking.type === 'private' ? 'Particular' : 'Plataforma'}
                                      </Badge>
                                    </div>

                                    {/* Body - Compact */}
                                    <div className="px-4 pb-4">
                                      <div className="flex justify-between items-end -mt-5 mb-3 px-1">
                                        {/* Floating Avatar - Smaller */}
                                        <Avatar className="h-12 w-12 border-4 border-white shadow-md ring-1 ring-gray-50/50">
                                          <AvatarImage src={booking.student_avatar || undefined} className="object-cover" />
                                          <AvatarFallback className={`font-bold text-base ${booking.type === 'private' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                                            }`}>
                                            {booking.student_name?.[0] || booking.academy_name?.[0] || 'C'}
                                          </AvatarFallback>
                                        </Avatar>

                                        {/* Price/Credits Tag */}
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

                                      {/* Actions - Compact & Explicit Cancel */}
                                      <div className="flex items-center gap-2">
                                        <Link href="/professor/checkin/scan" className="flex-1">
                                          <Button
                                            className={`w-full h-8 rounded-lg font-bold shadow-sm transition-all active:scale-[0.98] text-xs ${booking.type === 'private'
                                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200'
                                              : 'bg-meu-primary hover:bg-[#003f70] text-white shadow-blue-200'
                                              }`}
                                          >
                                            <CheckCircle className="w-3 h-3 mr-1.5" />
                                            Check-in
                                          </Button>
                                        </Link>

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
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <div className="flex justify-end gap-2 mt-2 mr-4">
                              <CarouselPrevious className="static translate-y-0 h-8 w-8 hover:bg-gray-100" />
                              <CarouselNext className="static translate-y-0 h-8 w-8 hover:bg-gray-100" />
                            </div>
                          </Carousel>
                          {filteredBookings.length > 10 && (
                            <div className="p-3 text-center">
                              <span className="text-xs text-gray-500">Exibindo 10 de {filteredBookings.length} agendamentos</span>
                            </div>
                          )}
                        </div>
                      )
                    }

                    const pagination = data.pagination
                    const totalBookings = pagination?.total || filteredBookings.length

                    return (
                      <>
                        <div className="divide-y divide-gray-100">
                          {filteredBookings.map((booking) => (
                          <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border border-gray-100">
                                <AvatarImage src={booking.student_avatar || undefined} />
                                <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                                  {booking.student_name?.[0] || booking.academy_name?.[0] || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-gray-900 flex flex-wrap items-center gap-2">
                                  {booking.student_name || booking.academy_name || 'Cliente'}
                                  {booking.type === 'private' ? (
                                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-100 font-normal">Particular</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50 border-purple-100 font-normal">Plataforma</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(booking.date).toLocaleDateString('pt-BR')}
                                    <span className="mx-1">•</span>
                                    {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {booking.type === 'private' ? (
                                <div className="font-bold text-gray-600">{formatCurrency(booking.earnings)}</div>
                              ) : (
                                <div className="font-bold text-gray-600">{booking.credits_cost || 1}h</div>
                              )}
                              <div className="text-[10px] text-gray-400 uppercase font-medium">{booking.status === 'COMPLETED' ? 'Realizada' : booking.status}</div>
                            </div>
                          </div>
                        ))}
                        </div>
                        
                        {/* Controles de Paginação */}
                        {pagination && pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 bg-gray-50">
                            <div className="text-sm text-gray-600">
                              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} atividades
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={!pagination.hasPrev}
                                className="h-8"
                              >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Anterior
                              </Button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                  let pageNum: number
                                  if (pagination.totalPages <= 5) {
                                    pageNum = i + 1
                                  } else if (pagination.page <= 3) {
                                    pageNum = i + 1
                                  } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i
                                  } else {
                                    pageNum = pagination.page - 2 + i
                                  }
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={pagination.page === pageNum ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setHistoryPage(pageNum)}
                                      className={`h-8 w-8 ${pagination.page === pageNum ? 'bg-[#002C4E] text-white' : ''}`}
                                    >
                                      {pageNum}
                                    </Button>
                                  )
                                })}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={!pagination.hasNext}
                                className="h-8"
                              >
                                Próxima
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Top Alunos / Breakdown */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#002C4E] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#002C4E]" />
                  Top Alunos
                </h3>
                <div className="space-y-3">
                  {data.by_student.length === 0 ? (
                    <Card className="border-dashed bg-gray-50 border-gray-200">
                      <CardContent className="p-8 text-center text-gray-500 text-sm">
                        <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        Sem dados de alunos para este filtro.
                      </CardContent>
                    </Card>
                  ) : data.by_student.slice(0, 5).map(student => (
                    <Card key={student.student_id} className="border-none shadow-meu hover:shadow-meu-lg transition-all group cursor-default">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-gray-100">
                          <AvatarImage src={student.student_avatar || undefined} className="object-cover" />
                          <AvatarFallback className="bg-[#002C4E]/10 text-[#002C4E] font-bold text-sm">
                            {student.student_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm text-[#002C4E]">{student.student_name}</div>
                          <div className="text-xs text-gray-500">{student.total_classes} aulas</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
        }
      </div >

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
    </ProfessorLayout >
  )
}
