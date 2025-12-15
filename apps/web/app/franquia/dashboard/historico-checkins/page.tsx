'use client'

import { useEffect, useState } from 'react'
import { QrCode, CheckCircle, XCircle, Calendar, Clock, User, AlertCircle, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

interface CheckinRecord {
  id: string
  academy_id: string
  teacher_id: string
  booking_id?: string
  status: 'GRANTED' | 'DENIED'
  reason?: string
  method: string
  created_at: string
  teacherName?: string
  bookingInfo?: {
    date: string
    duration: number
    studentName: string
  }
}

export default function HistoricoCheckinsPage() {
  const { franquiaUser, teachers, fetchTeachers } = useFranquiaStore()
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'GRANTED' | 'DENIED'>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await fetchTeachers()
      await fetchCheckins()
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const fetchCheckins = async () => {
    if (!franquiaUser?.academyId) return

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const response = await fetch(`/api/checkins?academy_id=${franquiaUser.academyId}`)

      if (!response.ok) {
        // Se tabela não existe, retorna array vazio
        if (response.status === 404) {
          setCheckins([])
          return
        }
        throw new Error('Failed to fetch checkins')
      }

      const data = await response.json()

      // Enriquecer com nomes dos professores
      const enrichedCheckins = (data.checkins || []).map((checkin: any) => ({
        ...checkin,
        teacherName: teachers.find(t => t.id === checkin.teacher_id)?.name || 'Professor não encontrado'
      }))

      setCheckins(enrichedCheckins)
    } catch (error) {
      setCheckins([])
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
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'GRANTED') {
      return <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
        <CheckCircle className="h-3 w-3" />
        <span>Acesso Liberado</span>
      </Badge>
    }
    return <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
      <XCircle className="h-3 w-3" />
      <span>Acesso Negado</span>
    </Badge>
  }

  const getReasonText = (reason?: string) => {
    const reasons: Record<string, string> = {
      'NO_VALID_BOOKING_IN_WINDOW': 'Sem agendamento válido no horário',
      'BOOKING_NOT_FOUND': 'Agendamento não encontrado',
      'OUTSIDE_TOLERANCE_WINDOW': 'Fora do horário permitido',
      'NO_BOOKINGS_TODAY': 'Sem agendamentos para hoje'
    }
    return reason ? reasons[reason] || reason : 'Motivo não especificado'
  }

  const filterByDate = (checkin: CheckinRecord) => {
    if (dateFilter === 'all') return true

    const checkinDate = new Date(checkin.created_at)
    const now = new Date()

    if (dateFilter === 'today') {
      return checkinDate.toDateString() === now.toDateString()
    }

    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return checkinDate >= weekAgo
    }

    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return checkinDate >= monthAgo
    }

    return true
  }

  const filteredCheckins = checkins
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(filterByDate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const grantedCount = checkins.filter(c => c.status === 'GRANTED').length
  const deniedCount = checkins.filter(c => c.status === 'DENIED').length
  const todayCount = checkins.filter(c => {
    const checkinDate = new Date(c.created_at)
    const now = new Date()
    return checkinDate.toDateString() === now.toDateString()
  }).length

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando histórico...</div>
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
              Check-ins
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Histórico de Check-ins
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Visualize todos os acessos via QR Code na portaria da academia.
          </p>
        </div>
      </div>

      {/* Stats - Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total</h3>
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">{checkins.length}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Check-ins registrados</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Hoje</h3>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500/40 group-hover:text-purple-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">{todayCount}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Check-ins de hoje</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Liberados</h3>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{grantedCount}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Acessos liberados</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Negados</h3>
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">{deniedCount}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Acessos negados</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="GRANTED">Liberados</option>
            <option value="DENIED">Negados</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="today">Hoje</option>
            <option value="week">Última semana</option>
            <option value="month">Último mês</option>
            <option value="all">Todos os períodos</option>
          </select>

          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="ml-auto"
          >
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Checkins List */}
      <div className="space-y-4">
        {filteredCheckins.length === 0 ? (
          <Card className="p-8 text-center">
            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum check-in encontrado
            </h3>
            <p className="text-gray-600">
              {checkins.length === 0
                ? 'Ainda não houve tentativas de check-in via QR Code'
                : 'Nenhum check-in encontrado com os filtros selecionados'
              }
            </p>
          </Card>
        ) : (
          filteredCheckins.map((checkin) => (
            <Card key={checkin.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checkin.status === 'GRANTED' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    {checkin.status === 'GRANTED' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Check-in via QR Code
                        </h3>
                        {getStatusBadge(checkin.status)}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        <span className="font-medium">Professor:</span> {checkin.teacherName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        <span className="font-medium">Data:</span> {formatDate(checkin.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        <span className="font-medium">Horário:</span> {formatTime(checkin.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Reason (if denied) */}
                  {checkin.status === 'DENIED' && checkin.reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-red-900 mb-1">
                            Motivo da negação:
                          </div>
                          <div className="text-sm text-red-700">
                            {getReasonText(checkin.reason)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking Info (if exists) */}
                  {checkin.booking_id && (
                    <div className="mt-3 text-xs text-gray-500">
                      ID do Agendamento: {checkin.booking_id}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      {checkins.length > 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Sobre o Histórico de Check-ins
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Registra todas as tentativas de acesso via QR Code na portaria</p>
                <p>• Acesso liberado: professor tem agendamento válido no horário</p>
                <p>• Acesso negado: sem agendamento ou fora do horário permitido</p>
                <p>• Use os filtros para análise por período e status</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
