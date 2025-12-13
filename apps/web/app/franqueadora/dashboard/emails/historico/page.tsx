'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MousePointer,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Info,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { badgeVariants } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'

interface EmailLog {
  id: string
  recipient_email: string
  recipient_name?: string
  subject: string
  template_slug?: string
  provider: 'smtp' | 'resend'
  status: EmailStatus
  error_message?: string
  created_at: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
}

interface EmailStats {
  total: number
  sent: number
  delivered: number
  opened: number
  failed: number
  bounced: number
  provider: string
  providerConfigured: boolean
}

const statusConfig: Record<EmailStatus, { label: string; className: string; icon: any }> = {
  pending: { label: 'Pendente', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  sent: { label: 'Enviado', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Mail },
  delivered: { label: 'Entregue', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  opened: { label: 'Aberto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Eye },
  clicked: { label: 'Clicado', className: 'bg-purple-50 text-purple-700 border-purple-200', icon: MousePointer },
  bounced: { label: 'Bounce', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  complained: { label: 'Spam', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  failed: { label: 'Falhou', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle }
}

const templateNames: Record<string, string> = {
  'welcome-student': 'Boas-vindas Aluno',
  'welcome-teacher': 'Boas-vindas Professor',
  'welcome-student-created': 'Aluno Criado',
  'welcome-teacher-created': 'Professor Criado',
  'student-linked': 'Aluno Vinculado',
  'teacher-approved': 'Professor Aprovado',
  'teacher-rejected': 'Professor Rejeitado',
  'password-reset': 'Redefinição de Senha',
  'policy-published': 'Política Publicada',
  'policy-rollback': 'Rollback de Política'
}

export default function EmailHistoryPage() {
  const router = useRouter()
  const { token, isAuthenticated } = useFranqueadoraStore()

  const [logs, setLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [templateFilter, setTemplateFilter] = useState<string>('all')
  const [searchEmail, setSearchEmail] = useState('')

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'


  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/email-logs/stats`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [token, API_URL])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (templateFilter && templateFilter !== 'all') {
        params.append('templateSlug', templateFilter)
      }
      if (searchEmail) {
        params.append('recipientEmail', searchEmail)
      }

      const response = await fetch(`${API_URL}/api/email-logs?${params.toString()}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico')
      }

      const data = await response.json()
      setLogs(data.data || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, templateFilter, searchEmail, token, API_URL])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchStats()
      fetchLogs()
    }
  }, [hydrated, isAuthenticated, fetchStats, fetchLogs])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, templateFilter, searchEmail])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    try {
      return format(new Date(date), "dd/MM HH:mm", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary"></div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 min-h-screen space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/franqueadora/dashboard/emails')} className="shrink-0 rounded-full h-10 w-10">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Histórico de Envios</h1>
              <p className="text-gray-500 text-sm">Monitoramento de entrega de emails</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => { fetchStats(); fetchLogs() }}
            disabled={isLoading}
            className="w-full lg:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>

        {/* Provider Info Banner */}
        {stats && (
          <div className={cn(
            "rounded-lg p-4 flex items-center gap-3 border",
            stats.provider === 'resend' 
              ? "bg-emerald-50 border-emerald-200" 
              : "bg-amber-50 border-amber-200"
          )}>
            <Info className={cn("h-5 w-5 shrink-0", stats.provider === 'resend' ? "text-emerald-600" : "text-amber-600")} />
            <div className="flex-1">
              {stats.provider === 'resend' ? (
                <p className="text-sm text-emerald-800">
                  <span className="font-medium">Resend ativo</span> — Rastreamento completo habilitado (entrega, abertura, cliques, bounces)
                </p>
              ) : (
                <p className="text-sm text-amber-800">
                  <span className="font-medium">SMTP ativo</span> — Apenas envio básico. Configure o Resend para rastrear aberturas e cliques.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            <Card className="shadow-sm border-gray-100 bg-white">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-blue-100 bg-blue-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">Enviados</div>
                <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-green-100 bg-green-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-green-400 mb-1">Entregues</div>
                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Abertos</div>
                <div className="text-2xl font-bold text-emerald-600">{stats.opened}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-red-100 bg-red-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-red-400 mb-1">Falhas</div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-orange-100 bg-orange-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] uppercase font-bold text-orange-400 mb-1">Bounce</div>
                <div className="text-2xl font-bold text-orange-600">{stats.bounced}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and List */}
        <Card className="shadow-sm border-gray-200">
          <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 bg-gray-50/50">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10 h-10 bg-white"
                />
              </div>
            </form>

            {/* Filter toggles */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-10 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="opened">Abertos</SelectItem>
                  <SelectItem value="failed">Falharam</SelectItem>
                  <SelectItem value="bounced">Bounce</SelectItem>
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-white">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos templates</SelectItem>
                  {Object.entries(templateNames).map(([slug, name]) => (
                    <SelectItem key={slug} value={slug}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-0">
            {/* Mobile List (Cards) */}
            <div className="lg:hidden divide-y divide-gray-100">
              {logs.map((log) => {
                const statusInfo = statusConfig[log.status]
                return (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{log.recipient_email}</span>
                        {log.recipient_name && <span className="text-xs text-gray-500">{log.recipient_name}</span>}
                      </div>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold border", statusInfo.className)}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-600 line-clamp-1">{log.subject}</p>
                      {log.template_slug && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                          {templateNames[log.template_slug] || log.template_slug}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR }) : ''}</span>
                      {log.opened_at && <span className="text-emerald-600 font-medium">Aberto {formatDate(log.opened_at)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop List (Table) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Destinatário</th>
                    <th className="px-4 py-3">Assunto / Template</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Eventos</th>
                    <th className="px-4 py-3 text-right">Enviado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => {
                    const statusInfo = statusConfig[log.status]
                    const StatusIcon = statusInfo.icon
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{log.recipient_email}</div>
                          {log.recipient_name && <div className="text-xs text-gray-500">{log.recipient_name}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700 max-w-[250px] truncate" title={log.subject}>{log.subject}</div>
                          {log.template_slug && (
                            <div className="text-xs text-gray-400 mt-0.5">{templateNames[log.template_slug] || log.template_slug}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border w-fit", statusInfo.className)}>
                            <StatusIcon className="h-3 w-3" /> {statusInfo.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
                            {log.delivered_at && <span>Entregue: {formatDate(log.delivered_at)}</span>}
                            {log.opened_at && <span className="text-emerald-600 font-bold">Aberto: {formatDate(log.opened_at)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          <div title={formatDate(log.created_at)}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination & Empty State */}
          {logs.length === 0 && !isLoading && (
            <div className="p-12 text-center text-gray-500">
              <Mail className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Nenhum email encontrado com os filtros atuais.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-xl">
              <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </FranqueadoraGuard>
  )
}
