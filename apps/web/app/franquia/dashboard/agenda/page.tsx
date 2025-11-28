'use client'

import { useState, useEffect } from 'react'
import { User, GraduationCap, CheckCircle, XCircle, Filter, Eye, X as XIcon, Loader2, Settings } from 'lucide-react'
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

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(
        `${API_URL}/api/calendar/events?academy_id=${franquiaUser.academyId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`,
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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Agenda da Academia</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Visualize todos os agendamentos em um calendário
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="COMPLETED">Concluídos</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Total</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{events.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Confirmados</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {events.filter(e => e.status === 'CONFIRMED').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Concluídos</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {events.filter(e => e.status === 'COMPLETED').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Cancelados</div>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {events.filter(e => e.status === 'CANCELLED').length}
              </div>
            </div>
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
