'use client'

import { useState, useEffect, useMemo } from 'react'
import { User, GraduationCap, AlertCircle, CheckCircle, XCircle, Filter, Eye, X as XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-supabase-store'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
  resource: {
    teacherId: string
    studentId: string
    teacherName: string
    studentName: string
    status: 'scheduled' | 'completed' | 'cancelled'
  }
}

export default function AgendaAcademiaPage() {
  const { classes, teachers, students, fetchClasses, fetchTimeSlots } = useFranquiaStore()
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<View>('month')

  // Carregar dados ao montar
  useEffect(() => {
    fetchClasses()
    fetchTimeSlots()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Converter classes para eventos do calendário
  const events = useMemo<CalendarEvent[]>(() => {
    return classes
      .filter(c => statusFilter === 'all' || c.status === statusFilter)
      .map(classItem => {
        const teacher = teachers.find(t => t.id === classItem.teacherId)
        const student = students.find(s => s.id === classItem.studentId)
        
        // Criar data/hora de início e fim
        const [hours, minutes] = (classItem.time || '09:00').split(':')
        const startDate = new Date(classItem.date)
        startDate.setHours(parseInt(hours), parseInt(minutes), 0)
        
        const endDate = new Date(startDate)
        endDate.setMinutes(endDate.getMinutes() + (classItem.duration || 60))

        return {
          id: classItem.id,
          title: `${teacher?.name || 'Professor'} → ${student?.name || 'Aluno'}`,
          start: startDate,
          end: endDate,
          resource: {
            teacherId: classItem.teacherId,
            studentId: classItem.studentId,
            teacherName: teacher?.name || 'Professor',
            studentName: student?.name || 'Aluno',
            status: classItem.status
          }
        }
      })
  }, [classes, teachers, students, statusFilter])

  // Estatísticas gerais
  const stats = useMemo(() => ({
    total: classes.length,
    scheduled: classes.filter(c => c.status === 'scheduled').length,
    completed: classes.filter(c => c.status === 'completed').length,
    cancelled: classes.filter(c => c.status === 'cancelled').length
  }), [classes])

  // Estilo dos eventos baseado no status
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6' // blue
    let borderColor = '#2563eb'
    
    if (event.resource.status === 'completed') {
      backgroundColor = '#10b981' // green
      borderColor = '#059669'
    } else if (event.resource.status === 'cancelled') {
      backgroundColor = '#ef4444' // red
      borderColor = '#dc2626'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '4px 8px'
      }
    }
  }

  return (
    <div className="p-6 ml-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agenda da Academia</h1>
            <p className="text-gray-600">Visualize todos os agendamentos de professores e alunos</p>
          </div>
        </div>
      </div>

      {/* Stats Acima do Calendário */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setStatusFilter('all')}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total de Aulas</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setStatusFilter('scheduled')}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Agendadas</div>
              <div className="text-2xl font-bold text-amber-600">{stats.scheduled}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setStatusFilter('completed')}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Concluídas</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setStatusFilter('cancelled')}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Canceladas</div>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtro Ativo */}
      {statusFilter !== 'all' && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Filter className="h-3 w-3 mr-1" />
            Filtrando: {statusFilter === 'scheduled' ? 'Agendadas' : statusFilter === 'completed' ? 'Concluídas' : 'Canceladas'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Limpar filtro
          </Button>
        </div>
      )}

      {/* Calendário */}
      <Card className="p-6">
        <div style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={(newView) => setView(newView)}
            views={['month', 'week', 'day', 'agenda']}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => setSelectedEvent(event)}
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
              event: 'Aula',
              noEventsInRange: 'Não há aulas neste período',
              showMore: (total) => `+ ${total} mais`
            }}
            culture="pt-BR"
          />
        </div>
      </Card>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <Card className="w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes da Aula</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Professor</div>
                  <div className="font-semibold text-gray-900">{selectedEvent.resource.teacherName}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Aluno</div>
                  <div className="font-semibold text-gray-900">{selectedEvent.resource.studentName}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={
                    selectedEvent.resource.status === 'completed' ? 'bg-green-600' :
                    selectedEvent.resource.status === 'scheduled' ? 'bg-blue-600' :
                    'bg-red-600'
                  }>
                    {selectedEvent.resource.status === 'completed' ? 'Concluída' :
                     selectedEvent.resource.status === 'scheduled' ? 'Agendada' :
                     'Cancelada'}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-gray-600 mb-1">Horário</div>
                <div className="font-semibold text-gray-900">
                  {format(selectedEvent.start, 'dd/MM/yyyy HH:mm', { locale: ptBR })} - {format(selectedEvent.end, 'HH:mm', { locale: ptBR })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}