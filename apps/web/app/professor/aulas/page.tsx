'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import { 
  QrCode,
  Clock,
  MapPin,
  Users,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import QRCode from 'react-qr-code'

interface Booking {
  id: string
  studentId: string
  teacherId: string
  studentName: string
  date: string
  duration: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'AVAILABLE' | 'BLOCKED'
  notes?: string
  creditsCost: number
  franchiseId?: string
  franchiseName?: string
}

const statusConfig = {
  PENDING: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  CONFIRMED: {
    label: 'Confirmada',
    color: 'bg-blue-100 text-blue-800',
    icon: AlertCircle
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  AVAILABLE: {
    label: 'Disponível',
    color: 'bg-gray-100 text-gray-800',
    icon: Calendar
  },
  BLOCKED: {
    label: 'Bloqueado',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle
  }
}

export default function ProfessorAulas() {
  const { user, token } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [busca, setBusca] = useState('')
  const [aulaQRCode, setAulaQRCode] = useState<Booking | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id || !token) return

      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        const response = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          setBookings(data.bookings || [])
        }
      } catch (error) {
        console.error('Erro ao carregar aulas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [user?.id, token])

  const aulasFiltradas = bookings.filter(booking => {
    const matchStatus = filtroStatus === 'todos' || booking.status === filtroStatus
    const matchBusca = booking.studentName?.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const gerarQRCode = (booking: Booking) => {
    setAulaQRCode(booking)
    setShowQRModal(true)
  }

  const qrData = aulaQRCode ? JSON.stringify({
    bookingId: aulaQRCode.id,
    teacherId: aulaQRCode.teacherId,
    studentId: aulaQRCode.studentId,
    professor: user?.name,
    aluno: aulaQRCode.studentName,
    data: aulaQRCode.date,
    franchiseId: aulaQRCode.franchiseId
  }) : ''

  if (loading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  return (
    <ProfessorLayout>
      <div className="px-4 py-6 md:px-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Minhas Aulas</h1>
          <p className="text-sm md:text-base text-gray-600">
            Gerencie suas aulas e gere QR Codes para check-in
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por aluno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-meu-primary"
              />
            </div>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {['todos', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  filtroStatus === status
                    ? 'bg-meu-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'todos'
                  ? 'Todas'
                  : statusConfig[status as keyof typeof statusConfig]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Aulas */}
        <div className="space-y-4">
          {aulasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma aula encontrada</h3>
              <p className="text-gray-600">
                {busca
                  ? 'Tente ajustar os filtros ou buscar por outros termos.'
                  : 'Você ainda não possui aulas agendadas.'}
              </p>
            </div>
          ) : (
            aulasFiltradas.map((booking) => {
              const config = statusConfig[booking.status] || statusConfig.PENDING
              const StatusIcon = config?.icon || Clock
              const podeGerarQR = booking.status === 'CONFIRMED'
              const lessonDate = new Date(booking.date)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 space-y-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 flex-1">
                      <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-meu-primary flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.studentName}
                          </h3>
                          <span
                            className={`mt-1 sm:mt-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-meu-primary" />
                            {lessonDate.toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-meu-primary" />
                            {lessonDate.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {booking.franchiseName && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-meu-primary" />
                              {booking.franchiseName}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>{booking.duration} minutos</span>
                          <span>{booking.creditsCost} créditos</span>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-gray-600 italic">
                            {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row justify-end gap-2 md:flex-col md:items-end">
                      {podeGerarQR && (
                        <Button
                          onClick={() => gerarQRCode(booking)}
                          size="sm"
                          className="bg-meu-primary hover:bg-meu-primary-dark whitespace-nowrap"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          QR Code
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {showQRModal && aulaQRCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-meu-primary mb-2">QR Code de Check-in</h2>
              <p className="text-gray-600">
                Aula com {aulaQRCode.studentName}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-6">
              <div className="flex justify-center">
                <QRCode
                  value={qrData}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono font-medium">{aulaQRCode.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data/Hora:</span>
                <span className="font-medium">
                  {new Date(aulaQRCode.date).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(aulaQRCode.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {aulaQRCode.franchiseName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Local:</span>
                  <span className="font-medium">{aulaQRCode.franchiseName}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowQRModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProfessorLayout>
  )
}
