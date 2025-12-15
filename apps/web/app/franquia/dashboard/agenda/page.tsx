'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Users, GraduationCap, CheckCircle, XCircle, Filter, Eye, X as XIcon, Loader2, Calendar as CalendarLucide } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { utcToLocal, getLocalTimeFromUtc } from '@/lib/timezone-utils'
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

      // Converter para formato do calendário e normalizar status
      const calendarEvents = data.events.map((event: any) => {
        // Criar objetos Date diretamente - a API já envia no formato correto
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

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
          start: startDate,
          end: endDate
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

      {/* Modal de Detalhes - Premium Style (Portal para evitar problemas de z-index/space-y) */}
      {selectedEvent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 99999 }}
        >
          {/* Backdrop with Blur */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectedEvent(null)}
          />

          {/* Modal Content */}
          <Card
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border-0 ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 bg-white rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com gradiente e branding */}
            <div
              className="relative p-6 sm:p-8 pb-6 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${selectedEvent.color}15 0%, ${selectedEvent.color}05 100%)`,
              }}
            >
              {/* Decorative Circle */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-50 blur-3xl"
                style={{ backgroundColor: selectedEvent.color }}
              />

              <Button
                onClick={() => setSelectedEvent(null)}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-700 transition-colors z-10"
              >
                <XIcon className="h-5 w-5" />
              </Button>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-black/5 bg-white"
                  >
                    <CalendarLucide className="h-7 w-7" style={{ color: selectedEvent.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(selectedEvent.status)}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Detalhes da Aula</h2>
                    <p className="text-gray-500 font-medium">
                      {format(selectedEvent.start, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Separator with accent */}
            <div className="h-1 w-full" style={{ backgroundColor: selectedEvent.color }} />

            {/* Conteúdo */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Horário da Aula - Design Simples */}
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-meu-primary/5 border border-meu-primary/10">
                <CalendarLucide className="h-5 w-5 text-meu-primary" />
                <span className="text-lg font-semibold text-gray-900">
                  {selectedEvent.start instanceof Date 
                    ? selectedEvent.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : format(new Date(selectedEvent.start), 'HH:mm')}
                  {' - '}
                  {selectedEvent.end instanceof Date 
                    ? selectedEvent.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : format(new Date(selectedEvent.end), 'HH:mm')}
                </span>
                <span className="text-sm text-gray-500">({selectedEvent.duration} min)</span>
              </div>

              {/* Participantes - Cards melhorados */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-meu-primary" />
                  Participantes
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Aluno */}
                  <div className="group p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-meu-primary/20 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-blue-600 mb-0.5 uppercase tracking-wide">Aluno</p>
                        <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{selectedEvent.studentName}</p>
                        {selectedEvent.studentEmail && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{selectedEvent.studentEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Professor */}
                  <div className="group p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
                        <GraduationCap className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-emerald-600 mb-0.5 uppercase tracking-wide">Professor</p>
                        <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{selectedEvent.teacherName}</p>
                        {selectedEvent.teacherEmail && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{selectedEvent.teacherEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedEvent.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="h-4 w-4 text-amber-500" />
                    Observações
                  </h3>
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-sm text-gray-700 leading-relaxed">
                    {selectedEvent.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 pb-8 pt-2">
              <Button
                onClick={() => setSelectedEvent(null)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium h-12 rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-[0.98]"
              >
                Fechar Detalhes
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

    </div>
  )
}
