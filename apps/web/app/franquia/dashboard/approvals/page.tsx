'use client'

import { useEffect, useState } from 'react'
import { Clock, Check, X, Calendar, User, GraduationCap, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

interface PendingBooking {
  id: string
  student_id: string
  teacher_id: string
  date: string
  duration: number
  notes?: string
  credits_cost: number
  created_at: string
  studentName?: string
  teacherName?: string
}

export default function ApprovalsPage() {
  const { teachers, students, fetchTeachers, fetchStudents } = useFranquiaStore()
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchTeachers(), fetchStudents()])
      await fetchPendingBookings()
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingBookings = async () => {
    try {
      // Buscar bookings com status PENDING da academia atual
      const response = await fetch(`http://localhost:3001/api/bookings?status=PENDING`)

      if (!response.ok) throw new Error('Failed to fetch bookings')

      const data = await response.json()

      // Enriquecer com nomes de alunos e professores
      const enrichedBookings = data.bookings?.map((booking: any) => ({
        ...booking,
        studentName: students.find(s => s.id === booking.student_id)?.name || 'Aluno não encontrado',
        teacherName: teachers.find(t => t.id === booking.teacher_id)?.name || 'Professor não encontrado'
      })) || []

      setPendingBookings(enrichedBookings)
    } catch (error) {
      console.error('Error fetching pending bookings:', error)
      setPendingBookings([])
    }
  }

  const handleApprove = async (bookingId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' })
      })

      if (!response.ok) throw new Error('Failed to approve booking')

      toast.success('Agendamento aprovado com sucesso!')
      await fetchPendingBookings()
    } catch (error) {
      console.error('Error approving booking:', error)
      toast.error('Erro ao aprovar agendamento')
    }
  }

  const handleReject = async (bookingId: string) => {
    const reason = prompt('Motivo da rejeição:')
    if (!reason || reason.trim() === '') {
      toast.error('É necessário informar um motivo para a rejeição')
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: `Rejeitado: ${reason}`
        })
      })

      if (!response.ok) throw new Error('Failed to reject booking')

      toast.success('Agendamento rejeitado')
      await fetchPendingBookings()
    } catch (error) {
      console.error('Error rejecting booking:', error)
      toast.error('Erro ao rejeitar agendamento')
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      return `${diffInMinutes} min atrás`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} h atrás`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} dias atrás`
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando aprovações...</div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Aprovação de Agendamentos</h1>
            <p className="text-gray-600">
              Analise e aprove aulas agendadas por alunos e professores
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">
              {pendingBookings.length} pendente{pendingBookings.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Aguardando Aprovação</div>
              <div className="text-2xl font-bold text-orange-600">{pendingBookings.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total de Aulas</div>
              <div className="text-2xl font-bold text-blue-600">{pendingBookings.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Professores Envolvidos</div>
              <div className="text-2xl font-bold text-green-600">
                {new Set(pendingBookings.map(b => b.teacher_id)).size}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-6">
        {pendingBookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum agendamento pendente
            </h3>
            <p className="text-gray-600">
              Todos os agendamentos foram processados. Você está em dia!
            </p>
          </Card>
        ) : (
          pendingBookings.map((booking) => (
            <Card key={booking.id} className="p-6 border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Agendamento de Aula
                        </h3>
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                          PENDENTE
                        </Badge>
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

                      {/* Credits Cost */}
                      <div className="mb-4">
                        <Badge className="bg-blue-100 text-blue-800">
                          {booking.credits_cost} crédito{booking.credits_cost !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <span>Solicitado {formatTimeAgo(booking.created_at)}</span>
                        <span>•</span>
                        <span>{new Date(booking.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleApprove(booking.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar Agendamento
                        </Button>
                        <Button
                          onClick={() => handleReject(booking.id)}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        <Button
                          onClick={() => setSelectedBooking(booking)}
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
      {pendingBookings.length > 0 && (
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Importante sobre Aprovações de Agendamentos
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Ao aprovar, a aula será confirmada e o aluno/professor serão notificados</p>
                <p>• Rejeições devem ser justificadas para transparência com alunos e professores</p>
                <p>• Créditos só são debitados após a confirmação do agendamento</p>
                <p>• Aulas confirmadas aparecem na agenda da academia e do professor</p>
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
                    <div className="text-sm text-gray-600 mb-1">Custo</div>
                    <div className="font-medium text-gray-900">{selectedBooking.credits_cost} créditos</div>
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

                <div className="flex items-center space-x-3 pt-4">
                  <Button
                    onClick={() => {
                      handleApprove(selectedBooking.id)
                      setSelectedBooking(null)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => {
                      handleReject(selectedBooking.id)
                      setSelectedBooking(null)
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
