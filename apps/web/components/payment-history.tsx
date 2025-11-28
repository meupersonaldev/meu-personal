'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, QrCode, Barcode, CreditCard, Calendar, DollarSign } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

interface PaymentIntent {
  id: string
  type: 'STUDENT_PACKAGE' | 'PROF_HOURS'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED'
  amount_cents: number
  checkout_url?: string | null
  invoice_url?: string | null
  bank_slip_url?: string | null
  payment_url?: string | null
  pix_copy_paste?: string | null
  created_at: string
  updated_at: string
  payload_json: {
    package_title?: string
    classes_qty?: number
    hours_qty?: number
    payment_method?: string
  }
}

interface PaymentHistoryProps {
  className?: string
}

export function PaymentHistory({ className }: PaymentHistoryProps) {
  const { token } = useAuthStore()
  const [payments, setPayments] = useState<PaymentIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED'>('all')

  useEffect(() => {
    if (!token) return
    loadPayments()
  }, [token, filter])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const statusParam = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`${API_BASE_URL}/api/packages/payment-history${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico')
      }

      const data = await response.json()
      setPayments(data.payment_intents || [])
    } catch (error: any) {
      console.error('Erro ao carregar histórico de pagamentos:', error)
      toast.error('Erro ao carregar histórico de pagamentos')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      PAID: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      FAILED: { label: 'Falhou', className: 'bg-red-100 text-red-800' },
      CANCELED: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' }
    }
    const variant = variants[status] || variants.PENDING
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  const getPaymentMethodIcon = (method?: string) => {
    const normalized = (method || '').toUpperCase()
    if (normalized === 'PIX') return <QrCode className="h-4 w-4" />
    if (normalized === 'BOLETO') return <Barcode className="h-4 w-4" />
    if (normalized === 'CREDIT_CARD') return <CreditCard className="h-4 w-4" />
    return <DollarSign className="h-4 w-4" />
  }

  const getPaymentMethodLabel = (method?: string) => {
    const normalized = (method || '').toUpperCase()
    if (normalized === 'PIX') return 'PIX'
    if (normalized === 'BOLETO') return 'Boleto'
    if (normalized === 'CREDIT_CARD') return 'Cartão de Crédito'
    return 'Não informado'
  }

  const getPaymentLink = (payment: PaymentIntent) => {
    // Priorizar checkout_url, depois invoice_url, bank_slip_url e payment_url
    return payment.checkout_url || payment.invoice_url || payment.bank_slip_url || payment.payment_url || null
  }

  const handleOpenPayment = (payment: PaymentIntent) => {
    const link = getPaymentLink(payment)
    if (link) {
      window.open(link, '_blank')
    } else {
      toast.error('Link de pagamento não disponível. Entre em contato com o suporte.')
    }
  }

  const hasPaymentLink = (payment: PaymentIntent) => {
    return !!(payment.checkout_url || payment.invoice_url || payment.bank_slip_url || payment.payment_url)
  }

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    paid: payments.filter(p => p.status === 'PAID').length,
    failed: payments.filter(p => p.status === 'FAILED').length,
    canceled: payments.filter(p => p.status === 'CANCELED').length
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-meu-primary" />
              Histórico de Pagamentos
            </span>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={filter === 'PENDING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('PENDING')}
              >
                Pendentes
              </Button>
              <Button
                variant={filter === 'PAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('PAID')}
              >
                Pagos
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
              <div className="text-xs text-yellow-600">Pendentes</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.paid}</div>
              <div className="text-xs text-green-600">Pagos</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
              <div className="text-xs text-red-600">Falhados</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{stats.canceled}</div>
              <div className="text-xs text-gray-600">Cancelados</div>
            </div>
          </div>

          {/* Lista de pagamentos */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(payment.status)}
                        <span className="text-sm font-medium text-gray-900">
                          {payment.payload_json?.package_title || 'Pagamento'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount_cents)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.payload_json?.payment_method)}
                          <span>{getPaymentMethodLabel(payment.payload_json?.payment_method)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                      {payment.type === 'STUDENT_PACKAGE' && payment.payload_json?.classes_qty && (
                        <div className="mt-2 text-sm text-gray-600">
                          {payment.payload_json.classes_qty} {payment.payload_json.classes_qty === 1 ? 'aula' : 'aulas'}
                        </div>
                      )}
                      {payment.type === 'PROF_HOURS' && payment.payload_json?.hours_qty && (
                        <div className="mt-2 text-sm text-gray-600">
                          {payment.payload_json.hours_qty} {payment.payload_json.hours_qty === 1 ? 'hora' : 'horas'}
                        </div>
                      )}
                    </div>
                    {payment.status === 'PENDING' && hasPaymentLink(payment) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPayment(payment)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Acessar Pagamento
                      </Button>
                    )}
                    {payment.status === 'PENDING' && !hasPaymentLink(payment) && (
                      <div className="text-xs text-gray-500 italic">
                        Link não disponível
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

