'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import FranchiseLeadDetailsModal from '@/components/franchise-lead-details-modal'
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  MessageSquare, 
  Calendar,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/confirm-dialog'

interface FranchiseLead {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  investment_capacity?: string
  message?: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'CLOSED_WON' | 'CLOSED_LOST'
  created_at: string
  updated_at?: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta Enviada',
  NEGOTIATING: 'Em Negociação',
  CLOSED_WON: 'Fechado - Ganho',
  CLOSED_LOST: 'Fechado - Perdido'
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUALIFIED: 'bg-green-100 text-green-800',
  PROPOSAL_SENT: 'bg-purple-100 text-purple-800',
  NEGOTIATING: 'bg-orange-100 text-orange-800',
  CLOSED_WON: 'bg-emerald-100 text-emerald-800',
  CLOSED_LOST: 'bg-red-100 text-red-800'
}

export default function FranchiseLeadsPage() {
  const { user, franqueadora, isAuthenticated, token } = useFranqueadoraStore()
  const [leads, setLeads] = useState<FranchiseLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLead, setSelectedLead] = useState<FranchiseLead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const limit = 10

  const fetchLeads = useCallback(async () => {
    if (!isAuthenticated || !user || !token) {
      console.log('[LEADS PAGE] Não autenticado ou sem token')
      return
    }

    setIsLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      if (searchTerm) {
        params.append('name', searchTerm)
      }

      console.log('[LEADS PAGE] Buscando leads:', `${API_URL}/api/franqueadora/leads?${params}`)

      const response = await fetch(`${API_URL}/api/franqueadora/leads?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('[LEADS PAGE] Resposta status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[LEADS PAGE] Erro na resposta:', errorData)
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[LEADS PAGE] Dados recebidos:', { 
        success: data.success, 
        total: data.pagination?.total,
        leadsCount: data.data?.length 
      })
      
      if (data.success) {
        setLeads(data.data || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        throw new Error(data.error || 'Erro ao processar resposta')
      }
    } catch (error: any) {
      console.error('[LEADS PAGE] Erro ao buscar leads:', error)
      const errorMessage = error.message || 'Erro ao carregar leads. Tente novamente.'
      toast.error(errorMessage)
      // Limpar dados em caso de erro
      setLeads([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, token, page, searchTerm])

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads()
    }
  }, [isAuthenticated, fetchLeads])

  const handleViewDetails = (lead: FranchiseLead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedLead(null)
  }

  const handleExportLeads = async () => {
    if (exporting) return
    if (!total) {
      toast.info('Nenhum lead para exportar.')
      return
    }

    setExporting(true)

    try {
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule.default || xlsxModule
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Buscar todos os leads (sem paginação)
      const allLeads: FranchiseLead[] = []
      let currentPage = 1
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '100', // Buscar em lotes maiores para exportação
          sortBy: 'created_at',
          sortOrder: 'desc'
        })

        if (searchTerm) {
          params.append('name', searchTerm)
        }

        const response = await fetch(`${API_URL}/api/franqueadora/leads?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Falha ao buscar leads para exportação.')
        }

        const data = await response.json()
        if (data.success && data.data?.length > 0) {
          allLeads.push(...data.data)
          if (data.data.length < 100 || allLeads.length >= (data.pagination?.total || 0)) {
            hasMore = false
          } else {
            currentPage++
          }
        } else {
          hasMore = false
        }
      }

      if (!allLeads.length) {
        toast.info('Nenhum lead encontrado para exportar.')
        return
      }

      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      const headers = [
        'Nome',
        'Email',
        'Telefone',
        'Cidade',
        'Capacidade de Investimento',
        'Status',
        'Mensagem',
        'Data de Cadastro',
        'Última Atualização'
      ]

      const rows = [
        headers,
        ...allLeads.map((lead) => [
          lead.name || '',
          lead.email || '',
          lead.phone || '',
          lead.city || '',
          lead.investment_capacity || '',
          STATUS_LABELS[lead.status] || lead.status,
          lead.message || '',
          formatDate(lead.created_at),
          lead.updated_at ? formatDate(lead.updated_at) : ''
        ])
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 25 }, // Nome
        { wch: 30 }, // Email
        { wch: 15 }, // Telefone
        { wch: 20 }, // Cidade
        { wch: 25 }, // Capacidade de Investimento
        { wch: 20 }, // Status
        { wch: 50 }, // Mensagem
        { wch: 20 }, // Data de Cadastro
        { wch: 20 }  // Última Atualização
      ]
      worksheet['!cols'] = colWidths

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `leads_${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Leads exportados com sucesso!')
    } catch (error: any) {
      console.error('Erro ao exportar leads:', error)
      toast.error('Erro ao exportar leads. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!token) {
      toast.error('Não autenticado')
      setDeletingId(null)
      return
    }

    setIsDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/franqueadora/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao deletar lead')
      }

      toast.success('Lead deletado com sucesso!')
      // Recarregar a lista
      await fetchLeads()
    } catch (error: any) {
      console.error('Erro ao deletar lead:', error)
      toast.error(error.message || 'Erro ao deletar lead. Tente novamente.')
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Leads de Franquias
            </h1>
            <p className="text-gray-600">
              Gerencie os interessados em se tornar franqueados
            </p>
          </div>
          <Button
            onClick={handleExportLeads}
            disabled={!total || exporting}
            className="flex items-center gap-2"
          >
            <Download className={`h-4 w-4 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nome, email, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
        </div>

        {/* Leads Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
          </div>
        ) : leads.length === 0 ? (
          <Card className="p-8 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'Nenhum lead encontrado com os filtros aplicados.' : 'Nenhum lead cadastrado ainda.'}
            </p>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-meu-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-gray-700 hover:text-meu-primary flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.city ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {lead.city}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[lead.status] || STATUS_COLORS.NEW}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lead.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(lead)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(lead.id)}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Deletar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} leads
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Details Modal */}
        <FranchiseLeadDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          lead={selectedLead}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!deletingId}
          onClose={() => !isDeleting && setDeletingId(null)}
          onConfirm={() => deletingId && handleDeleteLead(deletingId)}
          title="Confirmar Exclusão"
          description="Tem certeza que deseja deletar este lead? Esta ação não pode ser desfeita."
          confirmText="Sim, Deletar"
          cancelText="Cancelar"
          type="danger"
          loading={isDeleting}
        />
      </div>
    </FranqueadoraGuard>
  )
}

