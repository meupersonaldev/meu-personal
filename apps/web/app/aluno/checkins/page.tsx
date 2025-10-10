'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QrCode, CheckCircle, XCircle, Calendar, Clock, AlertCircle, Filter } from 'lucide-react'

interface CheckinRecord {
  id: string
  academy_id: string
  student_id: string
  booking_id?: string | null
  status: 'GRANTED' | 'DENIED'
  reason?: string | null
  method: string
  created_at: string
}

export default function StudentCheckinsPage() {
  const { user } = useAuthStore()
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
    setLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/checkins?student_id=${user?.id}`, {
        credentials: 'include'
      })
      if (!res.ok) {
        setCheckins([])
        return
      }
      const data = await res.json()
      setCheckins(data.checkins || [])
    } catch {
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

  if (!user?.id) {
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
    <div className="w-full flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Histórico de Check-ins
        </h1>
        <p className="text-sm text-gray-600">
          Visualize suas validações via QR Code na entrada da academia
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-blue-200">
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

        <Card className="p-4 border-2 border-purple-200">
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

        <Card className="p-4 border-2 border-green-200">
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

        <Card className="p-4 border-2 border-red-200">
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

      {/* Filtros */}
      <Card className="p-4 border-2 border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Período
            </label>
            <div className="flex flex-wrap gap-2">
              {(['today', 'week', 'month', 'all'] as const).map((period) => (
                <Button
                  key={period}
                  variant={dateFilter === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter(period)}
                  className={dateFilter === period ? 'bg-meu-primary text-white' : ''}
                >
                  {period === 'today' && 'Hoje'}
                  {period === 'week' && 'Última Semana'}
                  {period === 'month' && 'Último Mês'}
                  {period === 'all' && 'Todos'}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'GRANTED', 'DENIED'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status ? 'bg-meu-primary text-white' : ''}
                >
                  {status === 'all' && 'Todos'}
                  {status === 'GRANTED' && 'Liberados'}
                  {status === 'DENIED' && 'Negados'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de Check-ins */}
      <Card className="border-2 border-gray-200">
        <div className="p-6">
          {filteredCheckins.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum check-in encontrado</p>
              <p className="text-sm mt-2">
                {statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Tente ajustar os filtros acima'
                  : 'Seus check-ins aparecerão aqui'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCheckins.map((checkin) => (
                <Card key={checkin.id} className="border border-gray-200 hover:border-meu-primary/30 transition-all">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          checkin.status === 'GRANTED' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {checkin.status === 'GRANTED' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            Check-in {checkin.status === 'GRANTED' ? 'Liberado' : 'Negado'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Método: {checkin.method}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(checkin.status)}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(checkin.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(checkin.created_at)}
                      </span>
                    </div>

                    {checkin.reason && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-900">
                          <strong>Motivo:</strong> {checkin.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
