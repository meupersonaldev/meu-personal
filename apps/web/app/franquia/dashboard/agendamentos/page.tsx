'use client'

import { useState } from 'react'
import { Calendar, Clock, Plus, Eye, Edit, Trash2, User, GraduationCap, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import BookingModal from '@/components/modals/booking-modal'

export default function AgendamentosPage() {
  const { classes, teachers, students, updateClass, deleteClass } = useFranquiaStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')
  const [bookingModal, setBookingModal] = useState(false)

  // Filtrar agendamentos
  const filteredClasses = classes.filter(classItem => {
    const teacher = teachers.find(t => t.id === classItem.teacherId)
    const student = students.find(s => s.id === classItem.studentId)

    const matchesSearch = searchTerm === '' ||
      teacher?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || classItem.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Ordenar por data e hora
  const sortedClasses = filteredClasses.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`)
    const dateB = new Date(`${b.date} ${b.time}`)
    return dateB.getTime() - dateA.getTime() // Mais recentes primeiro
  })

  const handleStatusChange = (classId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    updateClass(classId, { status: newStatus })

    const statusMessages = {
      scheduled: 'Aula reagendada',
      completed: 'Aula marcada como concluída',
      cancelled: 'Aula cancelada'
    }

    toast.success(statusMessages[newStatus])
  }

  const handleDeleteClass = (classItem: any) => {
    const teacher = teachers.find(t => t.id === classItem.teacherId)
    const student = students.find(s => s.id === classItem.studentId)

    if (confirm(`Excluir aula de ${teacher?.name} com ${student?.name}?`)) {
      deleteClass(classItem.id)
      toast.success('Aula excluída com sucesso!')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendada'
      case 'completed':
        return 'Concluída'
      case 'cancelled':
        return 'Cancelada'
      default:
        return 'Desconhecido'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agendamentos</h1>
            <p className="text-gray-600">Gerencie as aulas agendadas</p>
          </div>
          <Button onClick={() => setBookingModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Aula
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por professor ou aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="scheduled">Agendadas</option>
            <option value="completed">Concluídas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Agendadas</div>
            <div className="text-blue-900 text-xl font-bold">
              {classes.filter(c => c.status === 'scheduled').length}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Concluídas</div>
            <div className="text-green-900 text-xl font-bold">
              {classes.filter(c => c.status === 'completed').length}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 text-sm font-medium">Canceladas</div>
            <div className="text-red-900 text-xl font-bold">
              {classes.filter(c => c.status === 'cancelled').length}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-sm font-medium">Total</div>
            <div className="text-gray-900 text-xl font-bold">{classes.length}</div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-4">
        {sortedClasses.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma aula encontrada</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros para ver mais resultados'
                : 'Comece agendando a primeira aula'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setBookingModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agendar Primeira Aula
              </Button>
            )}
          </Card>
        ) : (
          sortedClasses.map((classItem) => {
            const teacher = teachers.find(t => t.id === classItem.teacherId)
            const student = students.find(s => s.id === classItem.studentId)

            return (
              <Card key={classItem.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(classItem.status)}`}>
                      {getStatusIcon(classItem.status)}
                    </div>

                    {/* Class Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getStatusColor(classItem.status)} text-xs font-medium`}>
                          {getStatusLabel(classItem.status)}
                        </Badge>
                        <span className="text-lg font-semibold text-gray-900">
                          R$ {classItem.price}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {teacher?.name || 'Professor não encontrado'}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {student?.name || 'Aluno não encontrado'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(classItem.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {classItem.time}
                        </div>
                      </div>

                      {teacher && teacher.specialties && teacher.specialties.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {teacher.specialties.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Status Actions */}
                    {classItem.status === 'scheduled' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(classItem.id, 'completed')}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Marcar como concluída"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(classItem.id, 'cancelled')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Cancelar aula"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {classItem.status === 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(classItem.id, 'scheduled')}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Reagendar"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Delete Action */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClass(classItem)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
      />
    </div>
  )
}