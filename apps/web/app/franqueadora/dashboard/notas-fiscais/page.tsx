'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  CheckSquare,
  Square,
  FileCheck,
  Loader2,
} from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { invoicesAPI } from '@/lib/api'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'

interface Sale {
  payment_intent: {
    id: string
    type: 'STUDENT_PACKAGE' | 'PROF_HOURS'
    amount_cents: number
    status: string
    created_at: string
    payload_json: any
  }
  user: {
    id: string
    name: string
    email: string
    cpf: string
  }
  invoice: any
}

interface Invoice {
  id: string
  payment_intent_id: string
  type: 'NFE' | 'NFC_E'
  status: 'PENDING' | 'ISSUED' | 'CANCELED' | 'ERROR'
  customer_name: string
  customer_email: string
  nfe_key?: string
  nfe_url?: string
  nfe_number?: string
  amount_cents: number
  service_description: string
  error_message?: string
  issued_at?: string
  created_at: string
}

export default function NotasFiscaisPage() {
  const router = useRouter()
  const { franqueadora, isAuthenticated } = useFranqueadoraStore()
  const [activeTab, setActiveTab] = useState<'sales' | 'invoices'>('sales')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Sales (vendas sem nota fiscal)
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set())
  const [issuing, setIssuing] = useState(false)
  const [salesPagination, setSalesPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  })

  // Invoices (notas fiscais emitidas)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [invoicesPagination, setInvoicesPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  })

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      if (activeTab === 'sales') {
        fetchSales()
      } else {
        fetchInvoices()
      }
    }
  }, [hydrated, isAuthenticated, activeTab, salesPagination.offset, statusFilter])

  const fetchSales = async () => {
    if (!franqueadora?.id) return

    setLoading(true)
    try {
      const response = await invoicesAPI.getSalesWithoutInvoice({
        franqueadora_id: franqueadora.id,
        limit: salesPagination.limit,
        offset: salesPagination.offset,
      })

      setSales(response.sales || [])
      setSalesPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
      }))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar vendas')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!franqueadora?.id) return

    setLoading(true)
    try {
      const response = await invoicesAPI.getInvoices({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: invoicesPagination.limit,
        offset: invoicesPagination.offset,
      })

      setInvoices(response.invoices || [])
      setInvoicesPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
      }))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar notas fiscais')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSale = (paymentIntentId: string) => {
    setSelectedSales((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(paymentIntentId)) {
        newSet.delete(paymentIntentId)
      } else {
        newSet.add(paymentIntentId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedSales.size === sales.length) {
      setSelectedSales(new Set())
    } else {
      setSelectedSales(new Set(sales.map((s) => s.payment_intent.id)))
    }
  }

  const handleBatchIssue = async () => {
    if (selectedSales.size === 0) {
      toast.error('Selecione pelo menos uma venda')
      return
    }

    setIssuing(true)
    try {
      const response = await invoicesAPI.batchIssue({
        payment_intent_ids: Array.from(selectedSales),
        type: 'NFE',
      })

      const successCount = response.results?.filter((r: any) => r.status === 'success').length || 0
      const errorCount = response.errors?.length || 0

      toast.success(
        `Notas fiscais emitidas: ${successCount} sucesso, ${errorCount} erros`
      )

      if (errorCount > 0) {
        response.errors?.forEach((error: any) => {
          toast.error(`Erro em ${error.payment_intent_id}: ${error.error}`)
        })
      }

      setSelectedSales(new Set())
      fetchSales()
      setActiveTab('invoices')
      fetchInvoices()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao emitir notas fiscais')
    } finally {
      setIssuing(false)
    }
  }

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta nota fiscal?')) {
      return
    }

    try {
      await invoicesAPI.cancelInvoice(invoiceId)
      toast.success('Nota fiscal cancelada com sucesso')
      fetchInvoices()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar nota fiscal')
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ISSUED: { variant: 'default', icon: CheckCircle, label: 'Emitida', color: 'text-green-600' },
      PENDING: { variant: 'secondary', icon: Clock, label: 'Pendente', color: 'text-yellow-600' },
      CANCELED: { variant: 'destructive', icon: XCircle, label: 'Cancelada', color: 'text-red-600' },
      ERROR: { variant: 'destructive', icon: AlertCircle, label: 'Erro', color: 'text-red-600' },
    }

    const config = variants[status] || variants.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8">
        {/* Aviso de Implementação */}
        <div className="mb-6 rounded-lg border border-yellow-500 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">
                Funcionalidade em Implementação
              </h3>
              <p className="text-sm text-yellow-700">
                A emissão de notas fiscais ainda está sendo implementada. Algumas funcionalidades podem não estar totalmente disponíveis.
                Para emitir notas fiscais, configure as informações fiscais da franqueadora no painel do ASAAS (Notas Fiscais → Configurações).
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/franqueadora/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Notas Fiscais
              </h1>
              <p className="text-sm text-gray-600">
                Gerencie a emissão de notas fiscais para todas as vendas
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'sales'
                ? 'border-b-2 border-meu-primary text-meu-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vendas sem NFe ({salesPagination.total})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'border-b-2 border-meu-primary text-meu-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Notas Emitidas ({invoicesPagination.total})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'sales' ? (
          <div className="space-y-4">
            {/* Actions Bar */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-sm"
                  >
                    {selectedSales.size === sales.length ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Selecionar Todos
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedSales.size} selecionada(s)
                  </span>
                </div>
                <Button
                  onClick={handleBatchIssue}
                  disabled={selectedSales.size === 0 || issuing}
                  className="bg-meu-primary hover:bg-meu-primary/90"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Emitindo...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Emitir Selecionadas ({selectedSales.size})
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Sales List */}
            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-meu-primary mx-auto mb-4" />
                <p className="text-gray-600">Carregando vendas...</p>
              </Card>
            ) : sales.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma venda sem nota fiscal encontrada</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <Card
                    key={sale.payment_intent.id}
                    className="p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedSales.has(sale.payment_intent.id)}
                        onChange={() => handleSelectSale(sale.payment_intent.id)}
                        className="mt-1 h-4 w-4 text-meu-primary"
                      />
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {sale.user.name}
                            </p>
                            <p className="text-sm text-gray-600">{sale.user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">
                              {formatCurrency(sale.payment_intent.amount_cents)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(sale.payment_intent.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">
                            {sale.payment_intent.type === 'STUDENT_PACKAGE'
                              ? 'Pacote Aluno'
                              : 'Horas Professor'}
                          </Badge>
                          <Badge variant="outline">
                            CPF: {sale.user.cpf || 'Não informado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {salesPagination.total > salesPagination.limit && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSalesPagination((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }))
                  }
                  disabled={salesPagination.offset === 0}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página{' '}
                  {Math.floor(salesPagination.offset / salesPagination.limit) + 1} de{' '}
                  {Math.ceil(salesPagination.total / salesPagination.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSalesPagination((prev) => ({
                      ...prev,
                      offset: prev.offset + prev.limit,
                    }))
                  }
                  disabled={
                    salesPagination.offset + salesPagination.limit >=
                    salesPagination.total
                  }
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por cliente, NFe..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="all">Todos os status</option>
                  <option value="ISSUED">Emitidas</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="CANCELED">Canceladas</option>
                  <option value="ERROR">Erro</option>
                </select>
                <Button
                  variant="outline"
                  onClick={fetchInvoices}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </Card>

            {/* Invoices List */}
            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-meu-primary mx-auto mb-4" />
                <p className="text-gray-600">Carregando notas fiscais...</p>
              </Card>
            ) : invoices.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma nota fiscal encontrada</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {invoices
                  .filter((inv) => {
                    if (searchTerm) {
                      const search = searchTerm.toLowerCase()
                      return (
                        inv.customer_name.toLowerCase().includes(search) ||
                        inv.customer_email.toLowerCase().includes(search) ||
                        inv.nfe_key?.toLowerCase().includes(search) ||
                        inv.nfe_number?.toLowerCase().includes(search)
                      )
                    }
                    return true
                  })
                  .map((invoice) => (
                    <Card
                      key={invoice.id}
                      className="p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(invoice.status)}
                            <span className="text-sm text-gray-500">
                              {invoice.type}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {invoice.customer_name}
                          </p>
                          <p className="text-sm text-gray-600">{invoice.customer_email}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {invoice.service_description}
                          </p>
                          {invoice.nfe_key && (
                            <p className="text-xs text-gray-500 mt-1">
                              Chave: {invoice.nfe_key}
                            </p>
                          )}
                          {invoice.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Erro: {invoice.error_message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-bold text-lg text-gray-900">
                            {formatCurrency(invoice.amount_cents)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.issued_at
                              ? formatDate(invoice.issued_at)
                              : formatDate(invoice.created_at)}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {invoice.nfe_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(invoice.nfe_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}
                            {invoice.status === 'ISSUED' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelInvoice(invoice.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}

            {/* Pagination */}
            {invoicesPagination.total > invoicesPagination.limit && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInvoicesPagination((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }))
                  }
                  disabled={invoicesPagination.offset === 0}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página{' '}
                  {Math.floor(invoicesPagination.offset / invoicesPagination.limit) + 1} de{' '}
                  {Math.ceil(invoicesPagination.total / invoicesPagination.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInvoicesPagination((prev) => ({
                      ...prev,
                      offset: prev.offset + prev.limit,
                    }))
                  }
                  disabled={
                    invoicesPagination.offset + invoicesPagination.limit >=
                    invoicesPagination.total
                  }
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </FranqueadoraGuard>
  )
}

