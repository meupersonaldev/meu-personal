'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import {
  Calendar,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Settings,
  Ban
} from 'lucide-react'
import { toast } from 'sonner'

interface Booking {
  id: string
  date: string
  startAt?: string
  endAt?: string
  duration: number
  status: string
  studentId?: string
  studentName?: string
  teacherId: string
  franchiseId?: string
  franchiseName?: string
  is_reserved?: boolean
  series_id?: string
}

type ViewMode = 'day' | 'week' | 'month'



const HOURS = Array.from({ length: 24 }, (_, i) => i) // 00:00 - 23:00 (24h - cada academia define seu horário)

export default function AgendaPage() {
  const { user, token } = useAuthStore()
  const { academies: teacherAcademies, loading: loadingAcademies } = useTeacherAcademies()

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAcademy, setSelectedAcademy] = useState<string>('todas')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Função auxiliar para fazer fetch autenticado
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }, [token])

  // Buscar bookings
  const fetchBookings = useCallback(async () => {
    if (!user?.id || !token) return

    setLoading(true)
    try {
      // Buscar todos os bookings do professor (API retorna todos)
      const res = await authFetch(`/api/bookings?teacher_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        const allBookings = data.bookings || []

        // DEBUG: Log para verificar bookings recebidos
        console.log('[Agenda DEBUG] Total bookings recebidos:', allBookings.length)
        const seriesBookings = allBookings.filter((b: Booking) => b.series_id)
        console.log('[Agenda DEBUG] Bookings de séries:', seriesBookings.length, seriesBookings.map((b: Booking) => ({
          id: b.id,
          series_id: b.series_id,
          date: b.date,
          startAt: b.startAt,
          studentId: b.studentId,
          studentName: b.studentName,
          status: b.status
        })))

        // Filtrar apenas aulas com alunos (não mostrar slots disponíveis)
        let filtered = allBookings.filter((b: Booking) => b.studentId)
        console.log('[Agenda DEBUG] Após filtrar por studentId:', filtered.length)
        
        // DEBUG: Mostrar bookings de série que passaram o filtro
        const seriesFiltered = filtered.filter((b: Booking) => b.series_id)
        console.log('[Agenda DEBUG] Séries após filtro studentId:', seriesFiltered.length, seriesFiltered.map((b: Booking) => ({
          id: b.id,
          studentId: b.studentId,
          studentName: b.studentName,
          date: b.date,
          startAt: b.startAt
        })))

        // Filtrar por academia se selecionada
        if (selectedAcademy !== 'todas') {
          filtered = filtered.filter((b: Booking) => b.franchiseId === selectedAcademy)
          console.log('[Agenda DEBUG] Após filtrar por academia:', filtered.length)
        }

        console.log('[Agenda DEBUG] Setando bookings:', filtered.length, 'bookings')
        setBookings(filtered)
      } else {
        console.error('[Agenda DEBUG] Erro na resposta:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('[Agenda DEBUG] Erro ao carregar agenda:', err)
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }, [user?.id, token, selectedAcademy, authFetch])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // DEBUG: Função temporária para regenerar bookings de uma série com problemas
  const regenerateSeries = async (seriesId: string) => {
    try {
      console.log(`[Agenda] Regenerando série ${seriesId}...`)
      const res = await authFetch(`/api/booking-series/${seriesId}/regenerate`, {
        method: 'POST'
      })
      const data = await res.json()
      console.log('[Agenda] Resultado da regeneração:', data)
      if (res.ok) {
        toast.success(`Regeneração: ${data.createdCount} bookings criados!`)
        fetchBookings() // Recarregar a agenda
      } else {
        toast.error(data.error || 'Erro ao regenerar série')
      }
    } catch (error) {
      console.error('[Agenda] Erro ao regenerar série:', error)
      toast.error('Erro ao regenerar série')
    }
  }

  // Helpers de data
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function getWeekDays(date: Date): Date[] {
    const start = getWeekStart(date)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  function getMonthDays(date: Date): Date[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Começar do domingo da primeira semana
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // Terminar no sábado da última semana
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  function navigate(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  // Helper para extrair data local (YYYY-MM-DD) sem conversão UTC
  function getLocalDateStr(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function getBookingsForDate(date: Date): Booking[] {
    const targetDateStr = getLocalDateStr(date) // YYYY-MM-DD local
    const result = bookings.filter(b => {
      // Usar startAt se disponível (tem hora completa), senão usar date
      if (b.startAt) {
        const bookingDate = new Date(b.startAt)
        const bookingDateStr = getLocalDateStr(bookingDate)
        const match = bookingDateStr === targetDateStr
        // DEBUG: Log para séries
        if (b.series_id) {
          console.log(`[getBookingsForDate] Série ${b.id}: startAt=${b.startAt}, bookingDateStr=${bookingDateStr}, targetDateStr=${targetDateStr}, match=${match}`)
        }
        return match
      }
      // Se não tem startAt, usar o campo date diretamente (já é YYYY-MM-DD)
      const bookingDateStr = b.date?.split('T')[0] || b.date
      return bookingDateStr === targetDateStr
    })
    return result
  }

  function getBookingsForHour(date: Date, hour: number): Booking[] {
    const targetDateStr = getLocalDateStr(date) // YYYY-MM-DD local
    return bookings.filter(b => {
      // Usar startAt se disponível (tem hora completa)
      const bookingDateTime = b.startAt ? new Date(b.startAt) : new Date(b.date)
      const bookingDateStr = getLocalDateStr(bookingDateTime)
      return bookingDateStr === targetDateStr &&
        bookingDateTime.getHours() === hour
    })
  }

  function formatTime(booking: Booking): string {
    // Usar startAt se disponível (tem hora correta), senão usar date
    const dateStr = booking.startAt || booking.date
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatEndTime(booking: Booking): string {
    // Usar startAt se disponível, senão usar date
    const start = booking.startAt ? new Date(booking.startAt) : new Date(booking.date)
    const end = new Date(start.getTime() + (booking.duration || 60) * 60000)
    return end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Novas cores de status (Premium)
  // Lógica:
  // - Confirmado (PAID): Aula confirmada com créditos debitados
  // - Reservado (RESERVED): Série recorrente onde o ALUNO não tem crédito ainda
  // - Solicitação (is_reserved=true + status não é RESERVED): Aluno da carteira solicitou aula mas PROFESSOR não tem crédito
  function getStatusStyle(booking: Booking) {
    // Solicitação: aluno da carteira solicitou aula mas PROFESSOR não tem crédito para agendar
    // is_reserved=true indica que é uma solicitação pendente de crédito do professor
    // MAS se o status for RESERVED, é uma série pendente de crédito do aluno (não solicitação)
    if (booking.is_reserved && booking.status !== 'RESERVED') {
      return {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        label: 'Solicitação',
        icon: '⏳',
        accent: 'border-l-violet-500',
        border: 'border-violet-200'
      }
    }

    const styles: Record<string, any> = {
      AVAILABLE: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        label: 'Disponível',
        icon: '✓',
        accent: 'border-l-emerald-500',
        border: 'border-emerald-200'
      },
      CONFIRMED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        label: 'Confirmado',
        icon: 'user-check',
        accent: 'border-l-emerald-500',
        border: 'border-emerald-200'
      },
      PAID: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        label: 'Confirmado',
        icon: 'user-check',
        accent: 'border-l-emerald-500',
        border: 'border-emerald-200'
      },
      RESERVED: {
        // Série recorrente onde o ALUNO não tem crédito ainda (pendente de crédito do aluno)
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        label: 'Reservado',
        icon: 'clock',
        accent: 'border-l-yellow-500',
        border: 'border-yellow-200'
      },
      COMPLETED: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        label: 'Concluída',
        icon: 'check-circle',
        accent: 'border-l-gray-400',
        border: 'border-gray-200'
      },
      CANCELED: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        label: 'Cancelado',
        icon: 'x-circle',
        accent: 'border-l-red-500',
        border: 'border-red-200'
      }
    }

    return styles[booking.status] || styles.AVAILABLE
  }

  if (!user || loadingAcademies) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#002C4E]" />
            <p className="text-gray-500 font-medium animate-pulse">Carregando sua agenda...</p>
          </div>
        </div>
      </ProfessorLayout>
    )
  }

  const weekDays = getWeekDays(currentDate)
  const monthDays = getMonthDays(currentDate)

  // DEBUG: Log do estado atual
  console.log('[Agenda RENDER] bookings.length:', bookings.length, 'viewMode:', viewMode)
  const seriesInState = bookings.filter(b => b.series_id)
  if (seriesInState.length > 0) {
    console.log('[Agenda RENDER] Séries no estado:', seriesInState.map(b => ({ id: b.id, studentName: b.studentName, date: b.date, startAt: b.startAt })))
  }
  
  // DEBUG: Verificar dias da semana e bookings para cada dia
  if (viewMode === 'week') {
    console.log('[Agenda RENDER] Dias da semana:', weekDays.map(d => getLocalDateStr(d)))
    weekDays.forEach((day, i) => {
      const dayBookings = getBookingsForDate(day)
      if (dayBookings.length > 0) {
        console.log(`[Agenda RENDER] Dia ${i} (${getLocalDateStr(day)}): ${dayBookings.length} bookings`)
      }
    })
  }

  return (
    <ProfessorLayout>
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
        {/* Header Premium */}
        <div className="relative overflow-hidden bg-[#002C4E] rounded-3xl p-8 text-white shadow-2xl shadow-blue-900/20">
          <div className="absolute top-0 right-0 p-32 bg-[#27DFFF]/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 p-24 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
                  <Calendar className="h-6 w-6 text-[#27DFFF]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Minha Agenda
                </h1>
              </div>
              <p className="text-blue-100/80 text-lg font-light max-w-xl leading-relaxed">
                Gerencie seus horários e acompanhe seus alunos em um só lugar.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
                <div className="px-3 py-2 flex items-center gap-2 text-blue-100 border-r border-white/10 pr-4">
                  <MapPin className="h-4 w-4 text-[#27DFFF]" />
                  <span className="text-sm font-medium">Unidade</span>
                </div>
                <select
                  value={selectedAcademy}
                  onChange={(e) => setSelectedAcademy(e.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer py-2 pl-2 pr-4 [&>option]:text-gray-900"
                >
                  <option value="todas">Todas as Unidades</option>
                  {teacherAcademies.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => window.location.href = '/professor/disponibilidade'}
                className="bg-[#27DFFF] hover:bg-[#20b2cc] text-[#002C4E] font-bold rounded-xl h-auto py-3 px-5 shadow-[0_0_20px_rgba(39,223,255,0.3)] transition-all hover:scale-[1.02]"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Disponibilidade
              </Button>
            </div>
          </div>

          {/* KPI Cards Mini */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Total Hoje</p>
              <p className="text-2xl font-bold text-white">
                {bookings.filter(b => {
                  const bookingDate = b.startAt ? new Date(b.startAt) : new Date(b.date)
                  return getLocalDateStr(bookingDate) === getLocalDateStr(new Date())
                }).length}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Confirmados (Semana)</p>
              <p className="text-2xl font-bold text-[#27DFFF]">
                {bookings.filter(b => b.status === 'PAID' && !b.is_reserved).length}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Reservados (Semana)</p>
              <p className="text-2xl font-bold text-yellow-300">
                {bookings.filter(b => b.status === 'RESERVED').length}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Solicitações (Semana)</p>
              <p className="text-2xl font-bold text-violet-300">
                {bookings.filter(b => b.is_reserved === true && b.status !== 'RESERVED').length}
              </p>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('prev')}
              className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 hover:text-[#002C4E]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 py-1.5 min-w-[180px] text-center">
              <span className="text-sm font-bold text-gray-800 block capitalize">
                {viewMode === 'day' && currentDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                {viewMode === 'week' && `${weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
                {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              {(viewMode === 'week' || viewMode === 'month') && (
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                  {currentDate.getFullYear()}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('next')}
              className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 hover:text-[#002C4E]"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Legend with Tooltips */}
          {/* Legend with Cards & Tooltips */}
          <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
            {[
              { color: 'bg-emerald-500', label: 'Confirmado', desc: 'Aula confirmada com créditos', border: 'border-emerald-100', bg: 'bg-emerald-50/50' },
              { color: 'bg-yellow-500', label: 'Reservado', desc: 'Série pendente de crédito do aluno', border: 'border-yellow-100', bg: 'bg-yellow-50/50' },
              { color: 'bg-violet-500', label: 'Solicitação', desc: 'Aluno solicitou, você precisa de crédito', border: 'border-violet-100', bg: 'bg-violet-50/50' },
              { color: 'bg-red-500', label: 'Cancelado', desc: 'Aula cancelada', border: 'border-red-100', bg: 'bg-red-50/50' }
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${item.border} ${item.bg} transition-all hover:shadow-sm`}>
                <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>

                {/* Info Icon with Tooltip */}
                <div className="group relative ml-1 cursor-help">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-400 hover:text-[#002C4E] hover:border-[#002C4E] transition-colors">
                    !
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 p-2 bg-[#002C4E] text-white text-[10px] font-medium text-center rounded-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50 shadow-lg whitespace-normal">
                    {item.desc}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#002C4E]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={goToToday}
              className="rounded-xl border-gray-200 text-gray-600 hover:text-[#002C4E] hover:border-[#002C4E] hover:bg-blue-50/50 font-medium"
            >
              Hoje
            </Button>
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${viewMode === mode
                    ? 'bg-white text-[#002C4E] shadow-sm scale-105'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden min-h-[600px]">

          {/* Visualização por DIA */}
          {viewMode === 'day' && (
            <div className="divide-y divide-gray-50">
              <div className="grid grid-cols-[80px_1fr] bg-gray-50/50 border-b border-gray-100 p-4 sticky top-0 z-10 backdrop-blur-sm">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mt-2">Horário</div>
                <div className="text-md font-bold text-[#002C4E] pl-4">
                  Agendamentos
                </div>
              </div>
              <div className="max-h-[700px] overflow-y-auto">
                {HOURS.map(hour => {
                  const hourBookings = getBookingsForHour(currentDate, hour)
                  return (
                    <div key={hour} className="group grid grid-cols-[80px_1fr] min-h-[100px] hover:bg-blue-50/30 transition-colors">
                      <div className="p-4 text-sm font-medium text-gray-400 border-r border-gray-100 text-center group-hover:text-[#002C4E] transition-colors">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="p-3 relative">
                        {/* Linhas de grade sutis */}
                        <div className="absolute inset-x-0 top-1/2 border-t border-gray-50 border-dashed pointer-events-none"></div>

                        <div className="space-y-2 relative z-10">
                          {hourBookings.length === 0 && (
                            <div className="h-full flex items-center">
                              <span className="text-xs text-gray-300 italic px-2 opacity-0 group-hover:opacity-100 transition-opacity">Disponível</span>
                            </div>
                          )}
                          {hourBookings.map(booking => (
                            <div key={booking.id} onClick={() => setSelectedBooking(booking)} className="cursor-pointer">
                              <div className={`p-4 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md ${getStatusStyle(booking).bg} ${getStatusStyle(booking).border} ${getStatusStyle(booking).accent} border-l-4`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-white/50 backdrop-blur-sm ${getStatusStyle(booking).text}`}>
                                      {booking.studentName?.charAt(0) || <User className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <h4 className={`font-bold text-sm ${getStatusStyle(booking).text}`}>
                                        {booking.studentName || 'Disponível'}
                                      </h4>
                                      <p className="text-xs text-gray-500 font-medium">
                                        {booking.franchiseName || 'Remoto'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/50 ${getStatusStyle(booking).text}`}>
                                      {formatTime(booking)} - {formatEndTime(booking)}
                                    </span>
                                  </div>
                                </div>
                                {booking.series_id && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/40 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <Clock className="h-3 w-3" /> Recorrente
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Visualização por SEMANA */}
          {viewMode === 'week' && (
            <div className="flex flex-col h-full">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="p-4 bg-gray-50/50 border-r border-gray-100"></div>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={i}
                      className={`p-4 text-center border-r border-gray-50 transition-colors relative overflow-hidden ${isToday ? 'bg-blue-50/30' : ''
                        }`}
                    >
                      {isToday && <div className="absolute top-0 inset-x-0 h-1 bg-[#27DFFF]"></div>}
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-[#27DFFF]' : 'text-gray-400'}`}>
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                      <div className={`text-2xl font-black ${isToday ? 'text-[#002C4E]' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="max-h-[700px] overflow-y-auto">
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                  {/* Coluna de Horas */}
                  <div className="bg-gray-50/30 border-r border-gray-100 relative z-10">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-[120px] border-b border-gray-100 p-2 text-right">
                        <span className="text-xs font-medium text-gray-400 -mt-2.5 block bg-white/50 rounded px-1 sticky top-0">
                          {hour}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Colunas dos Dias */}
                  {weekDays.map((day, i) => (
                    <div key={i} className="border-r border-gray-50 relative min-h-[100px]">
                      {/* Grid Lines */}
                      {HOURS.map(h => (
                        <div key={h} className="h-[120px] border-b border-gray-50/50"></div>
                      ))}

                      {/* Cards Absolutos - Posicionados por Hora */}
                      {getBookingsForDate(day).map(booking => {
                        // Usar startAt se disponível (tem hora correta), senão usar date
                        const bookingDateTime = booking.startAt ? new Date(booking.startAt) : new Date(booking.date)
                        const startHour = bookingDateTime.getHours()
                        const topPosition = startHour * 120 // 120px height per hour block

                        return (
                          <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className="absolute left-1 right-1 z-10 m-0.5 cursor-pointer group"
                            style={{ top: `${topPosition}px`, height: '110px' }} // Altura do card fixa ou dinâmica
                          >
                            <div className={`h-full p-2.5 rounded-lg border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 ${getStatusStyle(booking).bg} ${getStatusStyle(booking).border} ${getStatusStyle(booking).accent} border-l-[3px]`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wide opacity-70 ${getStatusStyle(booking).text}`}>
                                  {formatTime(booking)}
                                </span>
                                {booking.series_id && <span className="text-[8px]">🔄</span>}
                              </div>
                              <p className={`text-xs font-bold leading-tight line-clamp-2 ${getStatusStyle(booking).text}`}>
                                {booking.studentName || 'Ocupado'}
                              </p>
                              {booking.franchiseName && (
                                <p className="text-[9px] text-gray-500 mt-1 line-clamp-1 opacity-80">
                                  📍 {booking.franchiseName}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Visualização por MÊS */}
          {viewMode === 'month' && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="bg-gray-50 p-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {d}
                  </div>
                ))}

                {monthDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const isToday = day.toDateString() === new Date().toDateString()
                  const dayBookings = getBookingsForDate(day)

                  return (
                    <div
                      key={i}
                      className={`min-h-[120px] bg-white p-2 transition-colors hover:bg-blue-50/20 ${!isCurrentMonth ? 'bg-gray-50/50 grayscale opacity-60' : ''
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#27DFFF] text-[#002C4E] shadow-sm' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                          {day.getDate()}
                        </span>
                        {dayBookings.length > 0 && isCurrentMonth && (
                          <span className="text-[9px] font-bold bg-blue-50 text-[#002C4E] px-1.5 py-0.5 rounded-md">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayBookings.slice(0, 3).map(booking => (
                          <div
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer truncate border-l-2 ${getStatusStyle(booking).bg} ${getStatusStyle(booking).accent} ${getStatusStyle(booking).text}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0"></span>
                            {booking.studentName?.split(' ')[0] || formatTime(booking)}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[9px] text-gray-400 font-medium pl-1 mt-1 hover:text-[#002C4E] cursor-pointer">
                            + {dayBookings.length - 3} mais...
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Premium */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-white rounded-2xl">
            <DialogTitle className="sr-only">Detalhes do Agendamento</DialogTitle>
            {selectedBooking && (
              <>
                <div className={`p-6 relative overflow-hidden ${getStatusStyle(selectedBooking).bg}`}>
                  <div className="absolute top-0 right-0 p-12 bg-white/10 rounded-full -mr-6 -mt-6 blur-xl"></div>
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 backdrop-blur-sm text-xs font-bold uppercase tracking-wide mb-3 ${getStatusStyle(selectedBooking).text}`}>
                        {getStatusStyle(selectedBooking).icon === 'user-check' ? (
                          <User className="h-3 w-3" />
                        ) : getStatusStyle(selectedBooking).icon === 'ban' ? (
                          <Ban className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {getStatusStyle(selectedBooking).label}
                      </div>
                      <h3 className={`text-xl font-bold ${getStatusStyle(selectedBooking).text}`}>
                        {selectedBooking.studentName || 'Disponível'}
                      </h3>
                      <p className={`text-sm opacity-80 font-medium ${getStatusStyle(selectedBooking).text}`}>
                        {selectedBooking.franchiseName || 'Nenhuma unidade vinculada'}
                      </p>
                    </div>
                    {selectedBooking.studentId && (
                      <div className="h-12 w-12 rounded-xl bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                        <span className={`text-lg font-bold ${getStatusStyle(selectedBooking).text}`}>
                          {selectedBooking.studentName?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-white space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</p>
                      <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <Calendar className="h-4 w-4 text-[#002C4E]" />
                        {new Date(selectedBooking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Horário</p>
                      <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <Clock className="h-4 w-4 text-[#002C4E]" />
                        {formatTime(selectedBooking)} - {formatEndTime(selectedBooking)}
                      </div>
                    </div>
                  </div>

                  {selectedBooking.status === 'RESERVED' && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-full mt-0.5">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-800">Reserva Pendente</h4>
                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                          Esta aula de série está aguardando crédito do aluno. Será confirmada automaticamente 7 dias antes.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedBooking.is_reserved && selectedBooking.status !== 'RESERVED' && (
                    <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 flex items-start gap-3">
                      <div className="p-2 bg-violet-100 rounded-full mt-0.5">
                        <Clock className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-violet-800">Solicitação de Aula</h4>
                        <p className="text-xs text-violet-700 leading-relaxed mt-1">
                          Um aluno da sua carteira solicitou esta aula. Você precisa ter créditos para confirmar.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedBooking.series_id && (
                    <div className="border-t border-gray-100 pt-6">
                      <Button
                        onClick={() => {
                          regenerateSeries(selectedBooking.series_id!)
                          setSelectedBooking(null)
                        }}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border-0 h-12 rounded-xl"
                      >
                        🔄 Regenerar Série
                      </Button>
                      <p className="text-center text-[10px] text-gray-400 mt-2">
                        Use isso apenas se houver problemas na recorrência.
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedBooking(null)}
                      className="w-full font-bold h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProfessorLayout>
  )
}


