'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Types
interface CreditGrant {
  id: string
  recipient_id: string
  recipient_email: string
  recipient_name: string
  credit_type: 'STUDENT_CLASS' | 'PROFESSOR_HOUR'
  quantity: number
  reason: string
  granted_by_id: string
  granted_by_email: string
  franqueadora_id: string
  franchise_id: string | null
  transaction_id: string
  created_at: string
}

interface HistoryResponse {
  grants: CreditGrant[]
  total: number
  page: number
  totalPages: number
}

interface HistoryFilters {
  startDate?: string
  endDate?: string
  recipientEmail?: string
  creditType?: 'STUDENT_CLASS' | 'PROFESSOR_HOUR' | ''
  page: number
  limit: number
}

interface CreditGrantHistoryProps {
  token: string
  refreshTrigger?: number
}

export function CreditGrantHistory({ token, refreshTrigger }: CreditGrantHistoryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<HistoryFilters>({
    page: 1,
    limit: 10,
  })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', filters.page.toString())
      params.append('limit', filters.limit.toString())

      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.recipientEmail) params.append('recipientEmail', filters.recipientEmail)
      if (filters.creditType) params.append('creditType', filters.creditType)

      const response = await fetch(
        `${API_URL}/api/admin/credits/history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico')
      }

      const result: HistoryResponse = await response.json()
      setData(result)
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [API_URL, token, filters])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, refreshTrigger])

  const handleFilterChange = (key: keyof HistoryFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value, // Reset page when other filters change
    }))
  }

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
    })
  }

  const getCreditTypeLabel = (type: string) => {
    return type === 'STUDENT_CLASS' ? 'Aulas' : 'Horas'
  }

  const getCreditTypeBadgeClass = (type: string) => {
    return type === 'STUDENT_CLASS'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700'
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const hasActiveFilters =
    filters.startDate || filters.endDate || filters.recipientEmail || filters.creditType

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-meu-primary" />
            <h3 className="text-lg font-semibold">Histórico de Liberações</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-meu-primary text-meu-primary' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 h-2 w-2 rounded-full bg-meu-primary" />
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="rounded-lg border p-4 bg-gray-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-start-date">Data Inicial</Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-end-date">Data Final</Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-email">Email do Destinatário</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="filter-email"
                    type="email"
                    placeholder="Buscar por email..."
                    value={filters.recipientEmail || ''}
                    onChange={(e) => handleFilterChange('recipientEmail', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-type">Tipo de Crédito</Label>
                <Select
                  value={filters.creditType || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('creditType', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger id="filter-type">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="STUDENT_CLASS">Aulas (Aluno)</SelectItem>
                    <SelectItem value="PROFESSOR_HOUR">Horas (Professor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
            </div>
          ) : data && data.grants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Liberado por</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.grants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{grant.recipient_name}</p>
                        <p className="text-sm text-gray-500">{grant.recipient_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getCreditTypeBadgeClass(
                          grant.credit_type
                        )}`}
                      >
                        {getCreditTypeLabel(grant.credit_type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {grant.quantity}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs truncate" title={grant.reason}>
                        {grant.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{grant.granted_by_email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{formatDate(grant.created_at)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma liberação encontrada</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {(data.page - 1) * filters.limit + 1} a{' '}
              {Math.min(data.page * filters.limit, data.total)} de {data.total} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page >= data.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default CreditGrantHistory
