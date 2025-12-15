'use client'

import { useState, useEffect } from 'react'
import { User, GraduationCap, CheckCircle, XCircle, Filter, Eye, X as XIcon, Loader2, Settings, TrendingUp, Calendar as CalendarLucide } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { utcToLocal } from '@/lib/timezone-utils'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-custom.css'

// Configurar localização para português
const locales = {
  'pt-BR': ptBR,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  studentId: string
  studentName: string
  studentEmail?: string
  teacherId: string
  teacherName: string
  teacherEmail?: string
  duration: number
  notes?: string
  color: string
}

export default function AgendaAcademiaPage() {
  const { franquiaUser } = useFranquiaStore()
  const [statusFilter, setStatusFilter] = useState<'all' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Aguardar hidratação do estado
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && franquiaUser?.academyId) {
      fetchEvents()
    }
  }, [isHydrated, franquiaUser?.academyId, view, currentDate])

  const fetchEvents = async () => {
    if (!franquiaUser?.academyId) return

    setLoading(true)
    try {
      // Calcular range baseado na view
      let startDate, endDate

      if (view === 'month') {
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      } else if (view === 'week') {
        startDate = startOfWeek(currentDate, { locale: ptBR })
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)
      } else {
        startDate = currentDate
        endDate = currentDate
      }

      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const response = await fetch(
        `/api/calendar/events?academy_id=${franquiaUser.academyId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`,
        { credentials: 'include' }
      )

      if (!response.ok) throw new Error('Failed to fetch events')

      const data = await response.json()

      // Converter para formato do calendário (corrigir timezone e normalizar status)
      const calendarEvents = data.events.map((event: any) => {
        // Usar função utilitária para conversão de timezone
        const startLocal = utcToLocal(event.start)
        const endLocal = utcToLocal(event.end)

        // Normalizar status para garantir consistência
        let normalizedStatus = event.status
        if (event.status === 'PAID' || event.status_canonical === 'PAID') {
          normalizedStatus = 'CONFIRMED'
        } else if (event.status === 'DONE' || event.status_canonical === 'DONE') {
          normalizedStatus = 'COMPLETED'
        } else if (event.status === 'CANCELED' || event.status_canonical === 'CANCELED') {
          normalizedStatus = 'CANCELLED'
        } else if (event.status === 'RESERVED' || event.status_canonical === 'RESERVED') {
          normalizedStatus = 'CONFIRMED'
        }

        return {
          ...event,
          status: normalizedStatus,
          start: startLocal,
          end: endLocal
        }
      })

      setEvents(calendarEvents)
    } catch (error) {
      toast.error('Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    // Definir cor baseada no status
    let backgroundColor = event.color

    if (event.status === 'CANCELLED') {
      backgroundColor = '#ef4444' // Vermelho (red-500 do Tailwind)
    } else if (event.status === 'COMPLETED') {
      backgroundColor = event.color || '#3b82f6' // Azul para concluídos
    } else if (event.status === 'CONFIRMED') {
      backgroundColor = event.color || '#10b981' // Verde para confirmados
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  if (!isHydrated || (!franquiaUser?.academyId && loading)) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600">Carregando agenda da academia...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto space-y-6 sm:space-y-8 mb-20">
      {/* Header Section - Premium Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-meu-primary/5 text-meu-primary text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
              Agenda
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Agenda da Academia
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Visualize todos os agendamentos em um calendário interativo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
          >
            <option value="all">Todos</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Stats - Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total</h3>
              <CalendarLucide className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">{events.length}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Agendamentos no período</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Confirmados</h3>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
              {events.filter(e => e.status === 'CONFIRMED').length}
            </span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas agendadas</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Concluídos</h3>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500/40 group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
              {events.filter(e => e.status === 'COMPLETED').length}
            </span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas realizadas</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Cancelados</h3>
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
              {events.filter(e => e.status === 'CANCELLED').length}
            </span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas canceladas</p>
          </div>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-4 sm:p-6">
        <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={(event) => setSelectedEvent(event)}
            eventPropGetter={eventStyleGetter}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            messages={{
              next: 'Próximo',
              previous: 'Anterior',
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              agenda: 'Agenda',
              date: 'Data',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'Nenhum evento neste período',
              showMore: (total) => `+ Ver mais (${total})`
            }}
          />
        </div>
      </Card>

      {/* Modal de Detalhes */}
      {selectedEvent && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalhes do Agendamento</h2>
                <Button
                  onClick={() => setSelectedEvent(null)}
                  variant="ghost"
                  size="sm"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    {getStatusBadge(selectedEvent.status)}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Duração</div>
                    <div className="font-medium text-gray-900">{selectedEvent.duration} minutos</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Aluno</div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">{selectedEvent.studentName}</div>
                        {selectedEvent.studentEmail && (
                          <div className="text-xs text-gray-500">{selectedEvent.studentEmail}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Professor</div>
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">{selectedEvent.teacherName}</div>
                        {selectedEvent.teacherEmail && (
                          <div className="text-xs text-gray-500">{selectedEvent.teacherEmail}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Data</div>
                    <div className="font-medium text-gray-900">
                      {format(selectedEvent.start, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Horário</div>
                    <div className="font-medium text-gray-900">
                      {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                    </div>
                  </div>
                </div>

                {selectedEvent.notes && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Observações</div>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                      {selectedEvent.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
