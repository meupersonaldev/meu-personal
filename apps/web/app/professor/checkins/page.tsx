'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QrCode, CheckCircle, XCircle, Calendar, Clock, AlertCircle, Filter } from 'lucide-react'

interface CheckinRecord {
  id: string
  academy_id: string
  teacher_id: string
  booking_id?: string | null
  status: 'GRANTED' | 'DENIED'
  reason?: string | null
  method: string
  created_at: string
}

export default function ProfessorCheckinsPage() {
  const { user, token } = useAuthStore()
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'GRANTED' | 'DENIED'>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')


  useEffect(() => {
    if (!user?.id) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadData() {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await api.checkins.getAll({ teacher_id: user.id })
      setCheckins(data.checkins || [])
    } catch (error) {
      console.error(error)
      setCheckins([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const getStatusBadge = (status: string) => {
    if (status === 'GRANTED') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>Liberado</span>
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
        <XCircle className="h-3 w-3" />
        <span>Negado</span>
      </Badge>
    )
  }

  const filterByDate = (c: CheckinRecord) => {
    if (dateFilter === 'all') return true
    const d = new Date(c.created_at)
    const now = new Date()
    if (dateFilter === 'today') {
      return d.toDateString() === now.toDateString()
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return d >= monthAgo
    }
    return true
  }

  const filteredCheckins = useMemo(() => {
    return checkins
      .filter(c => statusFilter === 'all' || c.status === statusFilter)
      .filter(filterByDate)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [checkins, statusFilter, dateFilter])

  const grantedCount = checkins.filter(c => c.status === 'GRANTED').length
  const deniedCount = checkins.filter(c => c.status === 'DENIED').length
  const todayCount = checkins.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length

  if (!user?.id || !token) {
    return null
  }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Meus Check-ins</h1>
          <p className="text-gray-600 mt-2">Visualize suas validações via QR Code na entrada da academia</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-blue-600">{checkins.length}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Hoje</div>
                <div className="text-2xl font-bold text-purple-600">{todayCount}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Liberados</div>
                <div className="text-2xl font-bold text-green-600">{grantedCount}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Negados</div>
                <div className="text-2xl font-bold text-red-600">{deniedCount}</div>
              </div>
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

            <Button onClick={loadData} variant="outline" size="sm" className="ml-auto">
              Atualizar
            </Button>
          </div>
        </Card>

        {/* List */}
        <div className="space-y-4">
          {filteredCheckins.length === 0 ? (
            <Card className="p-8 text-center">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum check-in encontrado</h3>
              <p className="text-gray-600">
                {checkins.length === 0
                  ? 'Você ainda não realizou check-ins.'
                  : 'Nenhum check-in encontrado com os filtros selecionados'}
              </p>
            </Card>
          ) : (
            filteredCheckins.map((checkin) => (
              <Card key={checkin.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      checkin.status === 'GRANTED' ? 'bg-green-100' : 'bg-red-100'
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
                          <h3 className="text-lg font-semibold text-gray-900">Check-in via QR Code</h3>
                          {getStatusBadge(checkin.status)}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
                      <div className="flex items-center space-x-2 text-sm">
                        <QrCode className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">
                          <span className="font-medium">Método:</span> {checkin.method}
                        </span>
                      </div>
                    </div>

                    {/* Reason (if denied) */}
                    {checkin.status === 'DENIED' && checkin.reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-red-900 mb-1">Motivo da negação</div>
                            <div className="text-sm text-red-700">{checkin.reason}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking ID */}
                    {checkin.booking_id && (
                      <div className="mt-3 text-xs text-gray-500">Agendamento: {checkin.booking_id}</div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
