'use client'

import { useState, useEffect } from 'react'
import { User, GraduationCap, CheckCircle, XCircle, Filter, Eye, X as XIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
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

  useEffect(() => {
    fetchEvents()
  }, [currentDate, view])

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
      
      // Converter para formato do calendário
      const calendarEvents = data.events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }))

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
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
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agenda da Academia</h1>
            <p className="text-gray-600">
              Visualize todos os agendamentos em um calendário
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-blue-600">{events.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Confirmados</div>
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.status === 'CONFIRMED').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Concluídos</div>
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.status === 'COMPLETED').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Cancelados</div>
              <div className="text-2xl font-bold text-red-600">
                {events.filter(e => e.status === 'CANCELLED').length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        <div style={{ height: '600px' }}>
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Agendamento</h2>
                <Button
                  onClick={() => setSelectedEvent(null)}
                  variant="ghost"
                  size="sm"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
