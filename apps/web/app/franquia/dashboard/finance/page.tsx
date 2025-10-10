'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CreditCard, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight, Filter, Loader2, Check, Clock, XCircle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

type Payment = {
  id: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  type: string
  billing_type: string
  status: string
  amount: number
  description: string
  due_date: string
  payment_date: string | null
  invoice_url: string | null
  pix_code: string | null
  created_at: string
}

type PaymentStats = {
  total_revenue: number
  pending_revenue: number
  overdue_revenue: number
  total_transactions: number
  by_status: {
    pending: number
    confirmed: number
    received: number
    overdue: number
    refunded: number
  }
  by_type: {
    plan_purchase: number
    booking_payment: number
    subscription: number
  }
  by_billing_type: {
    pix: number
    boleto: number
    credit_card: number
  }
  monthly_revenue: Array<{
    month: string
    revenue: number
  }>
}

export default function FinancePageNew() {
  const { franquiaUser } = useFranquiaStore()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchPayments()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, startDate, endDate])

  const fetchPayments = async () => {
    if (!franquiaUser?.academyId) return

    setLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      let url = `${API_URL}/api/payments/academy/${franquiaUser.academyId}?limit=50`

      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      }
      if (startDate) {
        url += `&start_date=${startDate}`
      }
      if (endDate) {
        url += `&end_date=${endDate}`
      }

      const response = await fetch(url, { credentials: 'include' })

      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }

      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      toast.error('Erro ao carregar pagamentos')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!franquiaUser?.academyId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      let url = `${API_URL}/api/payments/stats/${franquiaUser.academyId}`

      if (startDate) {
        url += `?start_date=${startDate}`
      }
      if (endDate) {
        url += `${startDate ? '&' : '?'}end_date=${endDate}`
      }

      const response = await fetch(url, { credentials: 'include' })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' },
      RECEIVED: { label: 'Recebido', className: 'bg-green-100 text-green-800' },
      OVERDUE: { label: 'Vencido', className: 'bg-red-100 text-red-800' },
      REFUNDED: { label: 'Estornado', className: 'bg-gray-100 text-gray-800' }
    }
    const { label, className } = config[status as keyof typeof config] || config.PENDING
    return <Badge className={className}>{label}</Badge>
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PLAN_PURCHASE: 'Compra de Plano',
      BOOKING_PAYMENT: 'Pagamento de Aula',
      SUBSCRIPTION: 'Assinatura'
    }
    return types[type] || type
  }

  const getBillingTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PIX: 'PIX',
      BOLETO: 'Boleto',
      CREDIT_CARD: 'Cartão de Crédito'
    }
    return types[type] || type
  }

  if (loading && !stats) {
    return (
      <div className="p-6 ml-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 ml-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financeiro</h1>
            <p className="text-gray-600">Acompanhe pagamentos e receitas via Asaas</p>
          </div>

          <Button onClick={() => { fetchPayments(); fetchStats() }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="RECEIVED">Recebido</option>
              <option value="OVERDUE">Vencido</option>
              <option value="REFUNDED">Estornado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setStatusFilter('all')
                setStartDate('')
                setEndDate('')
              }}
              variant="outline"
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Métricas Principais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-t-4 border-t-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600 mb-1">Receita Recebida</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {stats.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.by_status.received + stats.by_status.confirmed} pagamento(s)
            </div>
          </Card>

          <Card className="p-6 border-t-4 border-t-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">Pendente</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {stats.pending_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.by_status.pending} pagamento(s)
            </div>
          </Card>

          <Card className="p-6 border-t-4 border-t-red-500">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">Vencidos</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {stats.overdue_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.by_status.overdue} pagamento(s)
            </div>
          </Card>

          <Card className="p-6 border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">Total de Transações</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.total_transactions}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              No período selecionado
            </div>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      {stats && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Tipo</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Compra de Plano</span>
                <span className="font-semibold">{stats.by_type.plan_purchase}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pagamento de Aula</span>
                <span className="font-semibold">{stats.by_type.booking_payment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assinatura</span>
                <span className="font-semibold">{stats.by_type.subscription}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Forma de Pagamento</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">PIX</span>
                <span className="font-semibold">{stats.by_billing_type.pix}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Boleto</span>
                <span className="font-semibold">{stats.by_billing_type.boleto}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cartão de Crédito</span>
                <span className="font-semibold">{stats.by_billing_type.credit_card}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Recebido</span>
                <span className="font-semibold text-green-600">{stats.by_status.received}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confirmado</span>
                <span className="font-semibold text-blue-600">{stats.by_status.confirmed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pendente</span>
                <span className="font-semibold text-yellow-600">{stats.by_status.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vencido</span>
                <span className="font-semibold text-red-600">{stats.by_status.overdue}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Lista de Pagamentos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pagamentos Recebidos</h3>
          <Badge variant="outline">{payments.length} pagamento(s)</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.user.name}</div>
                      <div className="text-xs text-gray-500">{payment.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{payment.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{getTypeLabel(payment.type)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{getBillingTypeLabel(payment.billing_type)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        R$ {parseFloat(payment.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(payment.payment_date || payment.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
