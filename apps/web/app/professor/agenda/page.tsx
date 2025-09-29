'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { bookingsAPI } from '@/lib/api'

// Locais das academias (constantes)
const locations = [
  'Academia FitLife - Vila Madalena',
  'Academia FitLife - Pinheiros',
  'Academia FitLife - Itaim',
  'Academia FitLife - Moema',
  'Academia FitLife - Jardins',
  'Academia FitLife - Brooklin'
]

interface Booking {
  id: string
  studentId: string
  teacherId: string
  studentName: string
  date: string
  duration: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  creditsCost: number
  createdAt: string
  updatedAt: string
}

export default function ProfessorAgenda() {
  const { user, token } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Carregar agendamentos
  useEffect(() => {
    const loadBookings = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await bookingsAPI.getAll({ teacher_id: user.id })
        setBookings(response.bookings || [])
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [user?.id])

  const updateBookingStatus = async (bookingId: string, status: 'CONFIRMED' | 'CANCELLED') => {
    if (!token) return

    try {
      await bookingsAPI.update(bookingId, { status }, token)

      // Atualizar lista local
      setBookings(bookings.map(booking =>
        booking.id === bookingId ? { ...booking, status } : booking
      ))
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      alert('Erro ao atualizar agendamento. Tente novamente.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada'
      case 'PENDING':
        return 'Pendente'
      case 'COMPLETED':
        return 'Concluída'
      case 'CANCELLED':
        return 'Cancelada'
      default:
        return status
    }
  }

  // Filtrar agendamentos por data selecionada
  const selectedDateString = selectedDate.toISOString().split('T')[0]
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date).toISOString().split('T')[0]
    return bookingDate === selectedDateString
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto pt-20">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Calendar className="w-6 h-6 mr-2" />
                Minha Agenda
              </h1>
              <p className="text-gray-600 mt-1">Gerencie seus agendamentos e horários</p>
            </div>
          </div>

          {/* Seletor de Data */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão para hoje */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Hoje
            </Button>
          </div>
        </div>

        {/* Lista de Agendamentos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Agendamentos do Dia
          </h2>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Nenhum agendamento para este dia
              </h3>
              <p className="text-gray-400">
                Você não possui agendamentos para{' '}
                {selectedDate.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-800">
                              {formatTime(booking.date)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{booking.studentName}</span>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                          >
                            {getStatusText(booking.status)}
                          </span>
                        </div>

                        {booking.notes && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Observações:</strong> {booking.notes}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{booking.duration} minutos</span>
                          <span>{booking.creditsCost} créditos</span>
                        </div>
                      </div>

                      {booking.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'CONFIRMED')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {bookings.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Confirmadas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {bookings.filter(b => b.status === 'CONFIRMED').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {bookings.filter(b => b.status === 'PENDING').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Canceladas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {bookings.filter(b => b.status === 'CANCELLED').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}