'use client'

import { useEffect, useState } from 'react'
import { Calendar, User, GraduationCap, AlertCircle, Eye, X, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

interface Booking {
  id: string
  student_id: string
  teacher_id: string
  date: string
  duration: number
  notes?: string
  credits_cost: number
  status: string
  created_at: string
  studentName?: string
  teacherName?: string
}

export default function AgendamentosGestaoPage() {
  const { teachers, students, fetchTeachers, fetchStudents, franquiaUser } = useFranquiaStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchTeachers(), fetchStudents()])
      await fetchBookings()
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    if (!franquiaUser?.academyId) {
      console.log('No academy ID found')
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings?franchise_id=${franquiaUser.academyId}`)
      if (!response.ok) throw new Error('Failed to fetch bookings')

      const data = await response.json()

      // Enriquecer com nomes e filtrar apenas bookings com alunos (não disponibilidades vazias)
      const enrichedBookings = data.bookings
        ?.filter((b: any) => b.student_id || b.studentId) // Apenas aulas agendadas (com aluno)
        .map((booking: any) => ({
          ...booking,
          student_id: booking.student_id || booking.studentId,
          teacher_id: booking.teacher_id || booking.teacherId,
          studentName: booking.studentName || students.find(s => s.id === booking.studentId || s.id === booking.student_id)?.name || 'Aluno não encontrado',
          teacherName: booking.teacherName || teachers.find(t => t.id === booking.teacherId || t.id === booking.teacher_id)?.name || 'Professor não encontrado'
        })) || []

      setBookings(enrichedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
    }
  }

  const handleCancel = async (bookingId: string) => {
    const confirmation = confirm('Tem certeza que deseja cancelar este agendamento?')
    if (!confirmation) return

    const reason = prompt('Motivo do cancelamento (opcional):')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: reason ? `Cancelado pela academia: ${reason}` : 'Cancelado pela academia'
        })
      })

      if (!response.ok) throw new Error('Failed to cancel booking')

      toast.success('Agendamento cancelado com sucesso')
      await fetchBookings()
    } catch (error) {
      console.error('Error canceling booking:', error)
      toast.error('Erro ao cancelar agendamento')
    }
  }

  const handleComplete = async (bookingId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (!response.ok) throw new Error('Failed to complete booking')

      toast.success('Aula marcada como concluída')
      await fetchBookings()
    } catch (error) {
      console.error('Error completing booking:', error)
      toast.error('Erro ao marcar como concluída')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando agendamentos...</div>
        </div>
      </div>
    )
  }

  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Agendamentos</h1>
            <p className="text-gray-600">
              Visualize e gerencie o histórico completo de todas as aulas agendadas na academia
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
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
              <div className="text-2xl font-bold text-green-600">{confirmedBookings}</div>
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
              <div className="text-2xl font-bold text-blue-600">{completedBookings}</div>
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
              <div className="text-2xl font-bold text-red-600">{cancelledBookings}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-6">
        {filteredBookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-gray-600">
              {statusFilter === 'all'
                ? 'Ainda não há aulas agendadas na academia'
                : `Nenhum agendamento com status "${statusFilter}"`
              }
            </p>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Aula Agendada
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>

                      {/* Booking Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              <span className="font-medium">Aluno:</span> {booking.studentName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              <span className="font-medium">Professor:</span> {booking.teacherName}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              <span className="font-medium">Data:</span> {formatDate(booking.date)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              <span className="font-medium">Horário:</span> {formatTime(booking.date)} ({booking.duration} min)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-1">Observações:</div>
                          <div className="text-sm text-gray-600">{booking.notes}</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-3">
                        {booking.status === 'CONFIRMED' && (
                          <>
                            <Button
                              onClick={() => handleComplete(booking.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como Concluída
                            </Button>
                            <Button
                              onClick={() => handleCancel(booking.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar Aula
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => setSelectedBooking(booking)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-600"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Section */}
      {bookings.length > 0 && (
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Sobre a Gestão de Agendamentos
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Aulas são agendadas diretamente pelos alunos nos horários disponíveis dos professores</p>
                <p>• Você pode cancelar aulas confirmadas se necessário</p>
                <p>• Marque aulas como concluídas após a realização</p>
                <p>• Use os filtros para visualizar agendamentos por status</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Agendamento</h2>
                <Button
                  onClick={() => setSelectedBooking(null)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Custo</div>
                    <div className="font-medium text-gray-900">{selectedBooking.credits_cost} créditos</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Aluno</div>
                    <div className="font-medium text-gray-900">{selectedBooking.studentName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Professor</div>
                    <div className="font-medium text-gray-900">{selectedBooking.teacherName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Data</div>
                    <div className="font-medium text-gray-900">{formatDate(selectedBooking.date)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Horário</div>
                    <div className="font-medium text-gray-900">{formatTime(selectedBooking.date)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Duração</div>
                    <div className="font-medium text-gray-900">{selectedBooking.duration} minutos</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Criado em</div>
                    <div className="font-medium text-gray-900">
                      {new Date(selectedBooking.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Observações</div>
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}

                {selectedBooking.status === 'CONFIRMED' && (
                  <div className="flex items-center space-x-3 pt-4">
                    <Button
                      onClick={() => {
                        handleComplete(selectedBooking.id)
                        setSelectedBooking(null)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Concluída
                    </Button>
                    <Button
                      onClick={() => {
                        handleCancel(selectedBooking.id)
                        setSelectedBooking(null)
                      }}
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
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
