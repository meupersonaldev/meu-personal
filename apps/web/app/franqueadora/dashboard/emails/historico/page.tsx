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
  Info
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const statusConfig: Record<EmailStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-700', icon: Clock },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Mail },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  opened: { label: 'Aberto', color: 'bg-emerald-100 text-emerald-700', icon: Eye },
  clicked: { label: 'Clicado', color: 'bg-purple-100 text-purple-700', icon: MousePointer },
  bounced: { label: 'Bounce', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  complained: { label: 'Spam', color: 'bg-red-100 text-red-700', icon: XCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: XCircle }
}

const templateNames: Record<string, string> = {
  'welcome-student': 'Boas-vindas Aluno',
  'welcome-teacher': 'Boas-vindas Professor',
  'welcome-student-created': 'Aluno Criado',
  'welcome-teacher-created': 'Professor Criado',
  'student-linked': 'Aluno Vinculado',
  'teacher-approved': 'Professor Aprovado',
  'teacher-rejected': 'Professor Rejeitado',
  'password-reset': 'Redefinição de Senha'
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
  const [showFilters, setShowFilters] = useState(false)
  
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
      return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const formatRelativeDate = (date?: string) => {
    if (!date) return ''
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
    } catch {
      return ''
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
      <div className="p-3 sm:p-4 lg:p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/franqueadora/dashboard/emails')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Templates
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Emails</h1>
              <p className="text-gray-600">Acompanhe todos os emails enviados pelo sistema</p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => { fetchStats(); fetchLogs() }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                <div className="text-sm text-gray-500">Enviados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                <div className="text-sm text-gray-500">Entregues</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{stats.opened}</div>
                <div className="text-sm text-gray-500">Abertos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-gray-500">Falharam</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.bounced}</div>
                <div className="text-sm text-gray-500">Bounce</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Provider Info */}
        {stats && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                <span className="font-medium">Provedor atual:</span>{' '}
                {stats.provider === 'resend' ? 'Resend' : 'SMTP (Gmail)'}
                {stats.providerConfigured ? (
                  <span className="ml-2 text-green-600">✓ Configurado</span>
                ) : (
                  <span className="ml-2 text-orange-600">⚠ Não configurado</span>
                )}
              </p>
              {stats.provider === 'smtp' && (
                <p className="text-xs text-blue-700 mt-1">
                  Com SMTP, só é possível saber se o email foi enviado. Para rastrear entrega, abertura e cliques, configure o Resend.
                </p>
              )}
            </div>
          </div>
        )}


        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>
              
              {/* Filter toggles */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
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
                  <SelectTrigger className="w-[180px]">
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
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle>Emails Enviados</CardTitle>
            <CardDescription>
              {total} email{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meu-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum email encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const statusInfo = statusConfig[log.status]
                  const StatusIcon = statusInfo.icon
                  
                  return (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color} w-fit`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </div>
                        
                        {/* Email Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="font-medium text-gray-900 truncate">
                              {log.recipient_email}
                            </span>
                            {log.recipient_name && (
                              <span className="text-sm text-gray-500">
                                ({log.recipient_name})
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {log.subject}
                          </p>
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Erro: {log.error_message}
                            </p>
                          )}
                        </div>
                        
                        {/* Template & Date */}
                        <div className="flex flex-col items-end gap-1 text-right">
                          {log.template_slug && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {templateNames[log.template_slug] || log.template_slug}
                            </span>
                          )}
                          <span className="text-xs text-gray-500" title={formatDate(log.created_at)}>
                            {formatRelativeDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Timeline for delivered/opened/clicked */}
                      {(log.delivered_at || log.opened_at || log.clicked_at) && (
                        <div className="mt-3 pt-3 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                          {log.sent_at && (
                            <span>📤 Enviado: {formatDate(log.sent_at)}</span>
                          )}
                          {log.delivered_at && (
                            <span>✅ Entregue: {formatDate(log.delivered_at)}</span>
                          )}
                          {log.opened_at && (
                            <span>👁 Aberto: {formatDate(log.opened_at)}</span>
                          )}
                          {log.clicked_at && (
                            <span>🖱 Clicado: {formatDate(log.clicked_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FranqueadoraGuard>
  )
}
