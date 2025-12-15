'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Loader2, Check, Clock, XCircle, RefreshCw } from 'lucide-react'
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

  const fetchPayments = async (forceRefresh = false) => {
    if (!franquiaUser?.academyId) return

    setLoading(true)
    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      let url = `/api/payments/franchise/${franquiaUser.academyId}/asaas?limit=100`

      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      }
      if (startDate) {
        url += `&start_date=${startDate}`
      }
      if (endDate) {
        url += `&end_date=${endDate}`
      }
      if (forceRefresh) {
        url += `&force_refresh=true`
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }

      const data = await response.json()

      // Mapear para formato esperado pelo frontend
      const mappedPayments = (data.payments || []).map((p: any) => ({
        id: p.id,
        user: {
          id: p.customer || '',
          name: p.customer_name || 'Cliente não identificado',
          email: '',
          role: 'STUDENT'
        },
        type: p.description?.includes('Plano') ? 'PLAN_PURCHASE' :
          p.description?.includes('Aula') ? 'BOOKING_PAYMENT' :
            p.description?.includes('Assinatura') ? 'SUBSCRIPTION' : 'PLAN_PURCHASE',
        billing_type: p.billing_type || 'PIX',
        status: p.status,
        amount: p.franchise_split, // Valor que a franquia recebe (90% do total)
        description: p.description || 'Pagamento',
        due_date: p.due_date,
        payment_date: p.payment_date,
        invoice_url: p.invoice_url,
        pix_code: p.pix_code,
        created_at: p.created_at,
        // Campos adicionais do Asaas
        total_value: p.total_value,
        franchise_split: p.franchise_split,
        franchisor_split: p.franchisor_split
      })).map((p: any) => ({
        ...p,
        user: {
          ...p.user,
          name: p.customer_name || p.user.name,
          email: p.customer_email || p.user.email
        }
      }))

      setPayments(mappedPayments)
    } catch (error: any) {
      console.error('[fetchPayments] Erro:', error)
      toast.error('Erro ao carregar pagamentos do Asaas.')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (forceRefresh = false) => {
    if (!franquiaUser?.academyId) return

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      let url = `/api/payments/franchise/${franquiaUser.academyId}/asaas?limit=1000`

      if (startDate) {
        url += `&start_date=${startDate}`
      }
      if (endDate) {
        url += `${startDate ? '&' : '&'}end_date=${endDate}`
      }
      if (forceRefresh) {
        url += `&force_refresh=true`
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()

      // Usar stats do Asaas (já calculados com split)
      if (data.stats) {
        setStats({
          total_revenue: data.stats.total_revenue || 0,
          pending_revenue: data.stats.pending_revenue || 0,
          overdue_revenue: data.stats.overdue_revenue || 0,
          total_transactions: data.stats.total_transactions || 0,
          by_status: data.stats.by_status || {
            pending: 0,
            confirmed: 0,
            received: 0,
            overdue: 0,
            refunded: 0
          },
          by_type: data.stats.by_type || {
            plan_purchase: 0,
            booking_payment: 0,
            subscription: 0
          },
          by_billing_type: data.stats.by_billing_type || {
            pix: 0,
            boleto: 0,
            credit_card: 0
          },
          monthly_revenue: []
        })
      }
    } catch (error: any) {
      console.error('[fetchStats] Erro:', error)
      // Silenciar erros de estatísticas para não poluir UI
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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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
              Financeiro
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Gestão Financeira
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Acompanhe pagamentos e receitas via Asaas.
          </p>
        </div>

        <Button
          onClick={() => {
            fetchPayments(true);
            fetchStats(true)
          }}
          variant="outline"
          size="sm"
          className="text-xs border-gray-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
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
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
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
              size="sm"
              className="w-full text-xs"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats - Premium KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all duration-300" />
            <div className="p-4 sm:p-6 pl-6 sm:pl-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Receita Recebida</h3>
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                R$ {stats.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">
                {stats.by_status.received + stats.by_status.confirmed} pagamento(s)
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 group-hover:w-2 transition-all duration-300" />
            <div className="p-4 sm:p-6 pl-6 sm:pl-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Pendente</h3>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500/40 group-hover:text-yellow-500 transition-colors" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-yellow-600 tracking-tight">
                R$ {stats.pending_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">
                {stats.by_status.pending} pagamento(s)
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-2 transition-all duration-300" />
            <div className="p-4 sm:p-6 pl-6 sm:pl-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Vencidos</h3>
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
                R$ {stats.overdue_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">
                {stats.by_status.overdue} pagamento(s)
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
            <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
            <div className="p-4 sm:p-6 pl-6 sm:pl-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Transações</h3>
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">
                {stats.total_transactions}
              </span>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">No período selecionado</p>
            </div>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Por Tipo</h3>
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

          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Por Forma de Pagamento</h3>
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

          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Por Status</h3>
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
      <Card className="p-4 sm:p-6">
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
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
