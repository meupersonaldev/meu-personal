'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Calendar,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface Booking {
  id: string
  date: string
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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string; icon: string; accent: string; gradient: string }> = {
  AVAILABLE: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-400', 
    text: 'text-white', 
    label: 'Disponível', 
    icon: '✓', 
    accent: 'border-l-emerald-600',
    gradient: 'from-emerald-500/20 to-teal-400/20'
  },
  PAID: { 
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
    text: 'text-white', 
    label: 'Confirmada', 
    icon: '👤', 
    accent: 'border-l-blue-600',
    gradient: 'from-blue-500/20 to-indigo-500/20'
  },
  CONFIRMED: { 
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
    text: 'text-white', 
    label: 'Confirmada', 
    icon: '👤', 
    accent: 'border-l-blue-600',
    gradient: 'from-blue-500/20 to-indigo-500/20'
  },
  RESERVED: { 
    bg: 'bg-gradient-to-r from-amber-500 to-orange-400', 
    text: 'text-white', 
    label: 'Reservada', 
    icon: '⏳', 
    accent: 'border-l-amber-600',
    gradient: 'from-amber-500/20 to-orange-400/20'
  },
  COMPLETED: { 
    bg: 'bg-gradient-to-r from-slate-400 to-slate-500', 
    text: 'text-white', 
    label: 'Concluída', 
    icon: '✔', 
    accent: 'border-l-slate-500',
    gradient: 'from-slate-400/20 to-slate-500/20'
  },
  CANCELED: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500', 
    text: 'text-white', 
    label: 'Cancelada', 
    icon: '✕', 
    accent: 'border-l-red-600',
    gradient: 'from-red-500/20 to-rose-500/20'
  },
  BLOCKED: { 
    bg: 'bg-gradient-to-r from-orange-500 to-red-400', 
    text: 'text-white', 
    label: 'Bloqueado', 
    icon: '🚫', 
    accent: 'border-l-orange-600',
    gradient: 'from-orange-500/20 to-red-400/20'
  },
}

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
        
        // Filtrar apenas aulas com alunos (não mostrar slots disponíveis)
        let filtered = allBookings.filter((b: Booking) => b.studentId)
        
        // Filtrar por academia se selecionada
        if (selectedAcademy !== 'todas') {
          filtered = filtered.filter((b: Booking) => b.franchiseId === selectedAcademy)
        }
        
        setBookings(filtered)
      }
    } catch {
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }, [user?.id, token, selectedAcademy, authFetch])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

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

  function getBookingsForDate(date: Date): Booking[] {
    return bookings.filter(b => {
      const bookingDate = new Date(b.date)
      return bookingDate.toDateString() === date.toDateString()
    })
  }

  function getBookingsForHour(date: Date, hour: number): Booking[] {
    return bookings.filter(b => {
      const bookingDate = new Date(b.date)
      return bookingDate.toDateString() === date.toDateString() && 
             bookingDate.getHours() === hour
    })
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  
  function formatEndTime(booking: Booking): string {
    const start = new Date(booking.date)
    const end = new Date(start.getTime() + (booking.duration || 60) * 60000)
    return end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getStatusStyle(booking: Booking) {
    if (booking.is_reserved) return STATUS_COLORS.RESERVED
    return STATUS_COLORS[booking.status] || STATUS_COLORS.AVAILABLE
  }

  if (!user || loadingAcademies) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  const weekDays = getWeekDays(currentDate)
  const monthDays = getMonthDays(currentDate)

  return (
    <ProfessorLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-meu-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Calendar className="h-6 w-6" />
                </div>
                Minha Agenda
              </h1>
              <p className="text-white/80 mt-1">Visualize e gerencie seus agendamentos</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => window.location.href = '/professor/disponibilidade'}
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Disponibilidade
              </Button>
              
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <MapPin className="h-4 w-4 text-white/80" />
                <select
                  value={selectedAcademy}
                  onChange={(e) => setSelectedAcademy(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                >
                  <option value="todas" className="text-gray-900">Todas as Unidades</option>
                  {teacherAcademies.map(a => (
                    <option key={a.id} value={a.id} className="text-gray-900">{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Controles do Calendário */}
        <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Navegação */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('prev')}
                  className="hover:bg-meu-primary/10 rounded-full h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToToday}
                  className="px-4 font-medium"
                >
                  Hoje
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('next')}
                  className="hover:bg-meu-primary/10 rounded-full h-9 w-9 p-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                
                {loading && <Loader2 className="h-4 w-4 animate-spin text-meu-primary" />}
              </div>
              
              {/* Título do período */}
              <h2 className="text-lg font-semibold text-center">
                {viewMode === 'day' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {viewMode === 'week' && `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              
              {/* Seletor de visualização */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      viewMode === mode 
                        ? 'bg-white text-meu-primary shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'day' ? '📅 Dia' : mode === 'week' ? '📆 Semana' : '🗓️ Mês'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legenda com contagem */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Mostrar apenas status relevantes para aulas com alunos */}
            {['CONFIRMED', 'RESERVED', 'COMPLETED', 'CANCELED'].map(key => {
              const value = STATUS_COLORS[key]
              return (
                <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${value.bg} ${value.text} shadow-sm hover:scale-105 transition-transform cursor-default`}>
                  <span>{value.icon}</span>
                  <span className="font-medium">{value.label}</span>
                </div>
              )
            })}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-meu-primary">{bookings.length}</span> aula{bookings.length !== 1 ? 's' : ''} agendada{bookings.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Calendário */}
        <Card className="overflow-hidden shadow-lg border-0 rounded-2xl">
          {/* Visualização por DIA */}
          {viewMode === 'day' && (
            <div className="divide-y">
              {HOURS.map(hour => {
                const hourBookings = getBookingsForHour(currentDate, hour)
                return (
                  <div key={hour} className="flex min-h-[60px]">
                    <div className="w-16 flex-shrink-0 p-2 text-xs text-gray-500 bg-gray-50 border-r">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 p-1">
                      {hourBookings.map(booking => (
                        <BookingCard 
                          key={booking.id} 
                          booking={booking} 
                          onClick={() => setSelectedBooking(booking)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Visualização por SEMANA */}
          {viewMode === 'week' && (
            <div>
              {/* Header dos dias - sticky */}
              <div className="grid grid-cols-8 border-b sticky top-0 z-10 bg-white">
                <div className="p-3 text-xs font-medium text-gray-400 bg-gradient-to-b from-gray-50 to-white border-r uppercase tracking-wider"></div>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString()
                  const dayBookings = getBookingsForDate(day)
                  return (
                    <div 
                      key={i} 
                      className={`p-3 text-center border-r last:border-r-0 transition-colors ${
                        isToday 
                          ? 'bg-gradient-to-b from-meu-primary/20 to-meu-primary/5' 
                          : 'bg-gradient-to-b from-gray-50 to-white'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div className={`text-xl font-bold mt-0.5 ${isToday ? 'text-meu-primary' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                      {dayBookings.length > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {dayBookings.length} aula{dayBookings.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Grade de horários */}
              <div className="max-h-[600px] overflow-y-auto">
                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <div className="p-2 text-xs font-medium text-gray-400 bg-gray-50/80 border-r flex items-start justify-center">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    {weekDays.map((day, i) => {
                      const hourBookings = getBookingsForHour(day, hour)
                      const isToday = day.toDateString() === new Date().toDateString()
                      return (
                        <div 
                          key={i} 
                          className={`min-h-[55px] p-1 border-r last:border-r-0 ${isToday ? 'bg-meu-primary/5' : ''}`}
                        >
                          {hourBookings.map(booking => (
                            <BookingCard 
                              key={booking.id} 
                              booking={booking} 
                              compact
                              onClick={() => setSelectedBooking(booking)}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visualização por MÊS */}
          {viewMode === 'month' && (
            <div>
              {/* Header dos dias da semana */}
              <div className="grid grid-cols-7 border-b bg-gradient-to-b from-gray-50 to-white">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, i) => (
                  <div key={day} className={`p-3 text-center text-xs font-semibold uppercase tracking-wider ${
                    i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              
              {/* Grade do mês */}
              <div className="grid grid-cols-7">
                {monthDays.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const dayBookings = getBookingsForDate(day)
                  
                  return (
                    <div 
                      key={i} 
                      className={`min-h-[110px] p-2 border-b border-r transition-colors hover:bg-gray-50 ${
                        !isCurrentMonth ? 'bg-gray-50/50' : isWeekend ? 'bg-gray-50/30' : 'bg-white'
                      } ${isToday ? 'ring-2 ring-inset ring-meu-primary/30 bg-meu-primary/5' : ''}`}
                    >
                      <div className={`flex items-center justify-between mb-1.5`}>
                        <span className={`text-sm font-bold ${
                          !isCurrentMonth ? 'text-gray-300' 
                          : isToday ? 'bg-meu-primary text-white w-7 h-7 rounded-full flex items-center justify-center' 
                          : 'text-gray-700'
                        }`}>
                          {day.getDate()}
                        </span>
                        {dayBookings.length > 0 && isCurrentMonth && (
                          <span className="text-[10px] bg-meu-primary/10 text-meu-primary px-1.5 py-0.5 rounded-full font-medium">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayBookings.slice(0, 3).map(booking => (
                          <BookingCard 
                            key={booking.id} 
                            booking={booking} 
                            minimal
                            onClick={() => setSelectedBooking(booking)}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <button className="text-[10px] text-meu-primary font-medium hover:underline pl-1">
                            +{dayBookings.length - 3} mais
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="sm:max-w-md">
            {selectedBooking && (
              <>
                {/* Header colorido */}
                <div className={`-m-6 mb-4 p-6 rounded-t-lg ${getStatusStyle(selectedBooking).bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <span className="text-2xl">{getStatusStyle(selectedBooking).icon}</span>
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${getStatusStyle(selectedBooking).text}`}>
                          {selectedBooking.studentName || getStatusStyle(selectedBooking).label}
                        </h3>
                        <p className={`text-sm opacity-80 ${getStatusStyle(selectedBooking).text}`}>
                          {getStatusStyle(selectedBooking).label}
                        </p>
                      </div>
                    </div>
                    {selectedBooking.series_id && (
                      <div className="bg-white/20 px-2 py-1 rounded-full text-white text-xs font-medium">
                        🔄 Série
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Detalhes */}
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Horário</p>
                        <p className="font-semibold">{formatTime(selectedBooking.date)} - {formatEndTime(selectedBooking)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Data</p>
                        <p className="font-semibold capitalize">{new Date(selectedBooking.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      </div>
                    </div>
                    
                    {selectedBooking.studentName && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Aluno</p>
                          <p className="font-semibold">{selectedBooking.studentName}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedBooking.franchiseName && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <MapPin className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidade</p>
                          <p className="font-semibold">{selectedBooking.franchiseName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedBooking.is_reserved && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⏳</span>
                        <div>
                          <p className="font-semibold text-amber-800">Reserva pendente</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Esta aula será confirmada automaticamente 7 dias antes, se o aluno tiver crédito.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProfessorLayout>
  )
}

// Componente de Card de Booking
function BookingCard({ 
  booking, 
  compact = false, 
  minimal = false,
  onClick 
}: { 
  booking: Booking
  compact?: boolean
  minimal?: boolean
  onClick?: () => void
}) {
  const style = booking.is_reserved 
    ? STATUS_COLORS.RESERVED 
    : STATUS_COLORS[booking.status] || STATUS_COLORS.AVAILABLE
  
  const time = new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  // Minimal - usado na visualização de mês
  if (minimal) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate shadow-sm 
          ${style.bg} ${style.text} hover:brightness-110 hover:shadow transition-all border-l-2 ${style.accent}`}
      >
        <span className="mr-1">{style.icon}</span>
        {booking.studentName || time}
      </button>
    )
  }
  
  // Compact - usado na visualização de semana
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left p-1.5 rounded-md shadow-sm 
          ${style.bg} ${style.text} hover:brightness-110 hover:shadow-md transition-all border-l-2 ${style.accent}`}
      >
        <div className="flex items-center gap-1">
          <span className="text-[10px]">{style.icon}</span>
          <span className="font-semibold text-[10px] truncate flex-1">
            {booking.studentName || style.label}
          </span>
          {booking.series_id && <span className="text-[8px]">🔄</span>}
        </div>
        <div className="text-[9px] opacity-80 mt-0.5">{time}</div>
      </button>
    )
  }
  
  // Full - usado na visualização de dia
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg shadow-md 
        ${style.bg} ${style.text} hover:brightness-110 hover:shadow-lg transition-all border-l-4 ${style.accent}`}
    >
      <div className="flex items-center gap-3">
        {booking.studentName ? (
          <Avatar className="h-8 w-8 border-2 border-white/30">
            <AvatarFallback className="text-sm font-bold bg-white/20">{booking.studentName.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
            {style.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate flex items-center gap-2">
            {booking.studentName || style.label}
            {booking.series_id && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">🔄 Série</span>}
          </div>
          <div className="text-xs opacity-80 flex items-center gap-2 mt-0.5">
            <span>🕐 {time}</span>
            {booking.franchiseName && <span>📍 {booking.franchiseName}</span>}
          </div>
        </div>
      </div>
    </button>
  )
}
