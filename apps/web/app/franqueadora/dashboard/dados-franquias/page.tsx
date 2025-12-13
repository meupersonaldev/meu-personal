'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/ui/export-button'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  MapPin,
  DollarSign,
  TrendingUp,
  Users,
  Plus,
  Save,
  X,
  Lock,
  KeyRound,
  Mail,
  ChevronDown,
  Filter
} from 'lucide-react'
import { useFranqueadoraStore, type Academy } from '@/lib/stores/franqueadora-store'
import { cn } from '@/lib/utils'

interface EditingFranchise extends Partial<Academy> {
  id: string
}

export default function DadosFranquiasPage() {
  const router = useRouter()
  const { franqueadora, academies, fetchAcademies, updateAcademy, deleteAcademy, isLoading, token } = useFranqueadoraStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'royalty' | 'created'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingFranchise, setEditingFranchise] = useState<EditingFranchise | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    franchise: Academy | null
  }>({
    isOpen: false,
    franchise: null
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [franchiseAdmin, setFranchiseAdmin] = useState<{ id: string; name: string; email: string } | null>(null)
  const [editingFranchiseAdmin, setEditingFranchiseAdmin] = useState<{ id: string; name: string; email: string } | null>(null)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [loadingEditingAdmin, setLoadingEditingAdmin] = useState(false)

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated) {
      fetchAcademies()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // Limpar estado do admin quando o modal for fechado
  useEffect(() => {
    if (!showPasswordModal) {
      setFranchiseAdmin(null)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    }
  }, [showPasswordModal])

  const handleBack = () => {
    router.push('/franqueadora/dashboard')
  }

  const handleAddFranchise = () => {
    router.push('/franqueadora/dashboard/nova-franquia')
  }

  const handleViewFranchise = (franchise: Academy) => {
    router.push(`/franqueadora/dashboard/franquia/${franchise.id}`)
  }

  const handleEditFranchise = async (franchise: Academy) => {
    // Limpar estado anterior primeiro
    setEditingFranchiseAdmin(null)
    setEditingFranchise({
      id: franchise.id,
      name: franchise.name,
      email: franchise.email,
      phone: franchise.phone || '',
      city: franchise.city || '',
      state: franchise.state || '',
      franchise_fee: franchise.franchise_fee,
      royalty_percentage: franchise.royalty_percentage,
      monthly_revenue: franchise.monthly_revenue,
      is_active: franchise.is_active
    })

    // Buscar o admin da franquia ao abrir o modal de edição
    await new Promise(resolve => setTimeout(resolve, 50))

    try {
      const admin = await fetchFranchiseAdmin(franchise.id, true) // true = forEditing
      if (admin && admin.id && admin.email) {
        setEditingFranchiseAdmin({
          id: admin.id,
          name: admin.name || 'Admin',
          email: admin.email
        })

        // Atualizar o email da franquia com o email do admin se forem diferentes
        if (franchise.email !== admin.email) {
          setEditingFranchise(prev => prev ? {
            ...prev,
            email: admin.email
          } : null)
        }
      }
    } catch (error) {
      console.error('[handleEditFranchise] Erro ao buscar admin:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingFranchise) return

    // Validação básica
    if (!editingFranchise.name || !editingFranchise.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    try {
      const { id, ...updates } = editingFranchise

      const success = await updateAcademy(id, updates)

      if (success) {
        toast.success('Franquia atualizada com sucesso!')
        setEditingFranchise(null)
        setTimeout(() => {
          fetchAcademies() // Recarregar dados
        }, 100)
      } else {
        toast.error('Erro ao atualizar franquia. Verifique os dados e tente novamente.')
      }
    } catch (error: any) {
      console.error('[handleSaveEdit] Erro:', error)
      toast.error(error.message || 'Erro ao atualizar franquia')
    }
  }

  const handleCancelEdit = () => {
    setEditingFranchise(null)
    setEditingFranchiseAdmin(null)
  }

  const handleDeleteFranchise = (franchise: Academy) => {
    setDeleteConfirmDialog({
      isOpen: true,
      franchise
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDialog.franchise) return

    setIsDeleting(deleteConfirmDialog.franchise.id)
    setDeleteConfirmDialog({ isOpen: false, franchise: null })

    try {
      const success = await deleteAcademy(deleteConfirmDialog.franchise.id)

      if (success) {
        toast.success('Franquia excluída com sucesso!')
      } else {
        toast.error('Erro ao excluir franquia')
      }
    } catch (error) {
      toast.error('Erro ao excluir franquia')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmDialog({ isOpen: false, franchise: null })
  }

  const handleToggleStatus = async (franchise: Academy) => {
    try {
      const success = await updateAcademy(franchise.id, { is_active: !franchise.is_active })

      if (success) {
        toast.success(`Franquia ${!franchise.is_active ? 'ativada' : 'desativada'} com sucesso!`)
        fetchAcademies()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const fetchFranchiseAdmin = async (franchiseId: string, forEditing: boolean = false) => {
    if (!franchiseId) return null

    if (forEditing) {
      setLoadingEditingAdmin(true)
    } else {
      setLoadingAdmin(true)
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const response = await fetch(`${API_URL}/api/franchises/${franchiseId}/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar admin da franquia')
      }

      const admin = await response.json()

      if (!admin || !admin.id || !admin.email) {
        throw new Error('Dados do admin incompletos')
      }

      return admin
    } catch (error: any) {
      if (!forEditing) {
        toast.error(error.message || 'Erro ao buscar admin da franquia')
      }
      return null
    } finally {
      if (forEditing) {
        setLoadingEditingAdmin(false)
      } else {
        setLoadingAdmin(false)
      }
    }
  }

  const handleOpenPasswordModal = async (franchise: Academy | EditingFranchise) => {
    if (!franchise?.id) {
      toast.error('ID da franquia não encontrado')
      return
    }

    setShowPasswordModal(false)
    setFranchiseAdmin(null)
    setPasswordData({ newPassword: '', confirmPassword: '' })

    const admin = await fetchFranchiseAdmin(franchise.id)
    if (admin && admin.id && admin.email) {
      await new Promise(resolve => setTimeout(resolve, 50))

      setFranchiseAdmin({
        id: admin.id,
        name: admin.name || 'Admin',
        email: admin.email
      })

      setTimeout(() => {
        setShowPasswordModal(true)
      }, 100)
    } else {
      toast.error('Não foi possível encontrar o admin desta franquia')
    }
  }

  const handleChangePassword = async () => {
    if (!franchiseAdmin) return

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Preencha todos os campos')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setPasswordLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/users/${franchiseAdmin.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: passwordData.newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso!')
      setShowPasswordModal(false)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setFranchiseAdmin(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleResetPassword = async (franchise: Academy) => {
    setResetPasswordLoading(true)
    try {
      const admin = await fetchFranchiseAdmin(franchise.id)
      if (!admin) return

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/users/${admin.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao resetar senha')
      }

      toast.success(`Email de redefinição de senha enviado para ${data.email || admin.email}`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar senha')
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Franquias')

      // Definir colunas
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Telefone', key: 'telefone', width: 18 },
        { header: 'Cidade', key: 'cidade', width: 20 },
        { header: 'Estado', key: 'estado', width: 10 },
        { header: 'Receita Mensal', key: 'receita', width: 18 },
        { header: 'Royalty (%)', key: 'royalty', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Data de Criação', key: 'criacao', width: 15 }
      ]

      // Estilizar header
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      }
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

      // Adicionar dados
      academies.forEach(academy => {
        worksheet.addRow({
          nome: academy.name,
          email: academy.email,
          telefone: academy.phone || '',
          cidade: academy.city || '',
          estado: academy.state || '',
          receita: academy.monthly_revenue,
          royalty: academy.royalty_percentage,
          status: academy.is_active ? 'Ativa' : 'Inativa',
          criacao: new Date(academy.created_at).toLocaleDateString('pt-BR')
        })
      })

      // Formatar coluna de receita como moeda
      worksheet.getColumn('receita').numFmt = '"R$"#,##0.00'

      // Gerar buffer e download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `franquias_${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Dados exportados com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar dados')
    }
  }

  // Filtrar e ordenar franquias
  const filteredAndSortedAcademies = academies
    .filter(academy => {
      const matchesSearch = academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        academy.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        academy.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && academy.is_active) ||
        (filterStatus === 'inactive' && !academy.is_active)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: string | number, bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'revenue':
          aValue = a.monthly_revenue
          bValue = b.monthly_revenue
          break
        case 'royalty':
          aValue = a.royalty_percentage
          bValue = b.royalty_percentage
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Reusable Component for Corporate Card
  const KPICard = ({
    title,
    value,
    icon: Icon,
    colorClass = "text-meu-primary"
  }: {
    title: string
    value: string | number
    icon: any
    colorClass?: string
  }) => (
    <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group p-4 sm:p-6">
      <div className="flex items-center">
        <div className={cn("p-2 sm:p-3 rounded-lg bg-gray-50 group-hover:bg-meu-primary/5 transition-colors", colorClass)}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="ml-3 sm:ml-4">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-meu-primary">{value}</p>
        </div>
      </div>
    </Card>
  )

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados das franquias...</p>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-20">

        {/* Header Responsive */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-gray-500 hover:text-meu-primary -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">Dados das Franquias</h1>
              <p className="text-xs sm:text-sm text-gray-500">Visualize e gerencie todas as franquias cadastradas</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <ExportButton onClick={handleExportData} className="w-full sm:w-auto" />
            <Button
              className="bg-meu-primary hover:bg-meu-primary-dark text-white shadow-lg shadow-meu-primary/20 w-full sm:w-auto"
              onClick={handleAddFranchise}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Franquia
            </Button>
          </div>
        </div>

        {/* Estatísticas Resumidas - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard
            title="Total"
            value={academies.length}
            icon={Building}
          />
          <KPICard
            title="Ativas"
            value={academies.filter(a => a.is_active).length}
            icon={Users}
            colorClass="text-emerald-600"
          />
          <KPICard
            title="Receita Total"
            value={formatCurrency(academies.reduce((sum, a) => sum + a.monthly_revenue, 0))}
            icon={DollarSign}
            colorClass="text-blue-600"
          />
          <KPICard
            title="Royalty Médio"
            value={`${academies.length > 0 ? (academies.reduce((sum, a) => sum + a.royalty_percentage, 0) / academies.length).toFixed(1) : '0'}%`}
            icon={TrendingUp}
            colorClass="text-purple-600"
          />
        </div>

        {/* Filtros e Busca - Collapsible on Mobile */}
        <Card className="p-4 sm:p-5 border-gray-100 shadow-sm bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, cidade ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-gray-200 focus:border-meu-primary focus:ring-meu-primary"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary text-sm bg-white w-full sm:w-auto"
                >
                  <option value="all">Status: Todos</option>
                  <option value="active">Apenas Ativas</option>
                  <option value="inactive">Apenas Inativas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'royalty' | 'created')}
                  className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary text-sm bg-white"
                >
                  <option value="name">Nome</option>
                  <option value="revenue">Receita</option>
                  <option value="royalty">Royalty</option>
                  <option value="created">Data</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-9 w-9 p-0"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </Card>

        {/* List View - Responsive (Card for Mobile, Table for Desktop) */}
        <Card className="overflow-hidden border-gray-100 shadow-sm bg-white">
          {filteredAndSortedAcademies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">Nenhuma franquia encontrada</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando sua primeira franquia'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {filteredAndSortedAcademies.map((academy) => (
                  <div key={academy.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{academy.name}</h3>
                        <p className="text-xs text-gray-500">{academy.email}</p>
                      </div>
                      <Badge
                        variant={academy.is_active ? "default" : "destructive"}
                        className={cn(
                          "uppercase text-[10px]",
                          academy.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                        )}
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(academy); }}
                      >
                        {academy.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1.5 text-gray-400" />
                        <span className="truncate">{academy.city}, {academy.state}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1.5 text-gray-400" />
                        {formatCurrency(academy.monthly_revenue)}
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1.5 text-gray-400" />
                        {academy.royalty_percentage}%
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFranchise(academy)}
                        className="text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFranchise(academy)}
                        className="text-xs h-8"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFranchise(academy)}
                        className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Franquia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Receita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Royalty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedAcademies.map((academy) => (
                      <tr key={academy.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-meu-primary">{academy.name}</span>
                            <span className="text-xs text-gray-500">{academy.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            {academy.city}, {academy.state}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(academy.monthly_revenue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{academy.royalty_percentage}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "cursor-pointer transition-colors",
                              academy.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            )}
                            onClick={() => handleToggleStatus(academy)}
                          >
                            {academy.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFranchise(academy)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-meu-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFranchise(academy)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFranchise(academy)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* Resumo dos Resultados */}
        {filteredAndSortedAcademies.length > 0 && (
          <div className="text-xs sm:text-sm text-gray-500 text-center">
            Mostrando {filteredAndSortedAcademies.length} de {academies.length} franquias
          </div>
        )}

        {/* Modal de Edição (Simplified/Standardized) */}
        {editingFranchise && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-0 ring-1 ring-black/5">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                  <h2 className="text-xl font-bold text-meu-primary">Editar Franquia</h2>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="rounded-full h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Nome</label>
                    <Input
                      value={editingFranchise.name || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, name: e.target.value })}
                      className="border-gray-200 focus:border-meu-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Email</label>
                    <Input
                      type="email"
                      value={editingFranchiseAdmin?.email || editingFranchise.email || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, email: e.target.value })}
                      className="border-gray-200 focus:border-meu-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Telefone</label>
                    <Input
                      value={editingFranchise.phone || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, phone: e.target.value })}
                      className="border-gray-200 focus:border-meu-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Cidade</label>
                      <Input
                        value={editingFranchise.city || ''}
                        onChange={(e) => setEditingFranchise({ ...editingFranchise, city: e.target.value })}
                        className="border-gray-200 focus:border-meu-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Estado</label>
                      <Input
                        value={editingFranchise.state || ''}
                        onChange={(e) => setEditingFranchise({ ...editingFranchise, state: e.target.value })}
                        className="border-gray-200 focus:border-meu-primary"
                      />
                    </div>
                  </div>

                  {/* ... (Other inputs similar style) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Receita (R$)</label>
                    <Input
                      type="number"
                      value={editingFranchise.monthly_revenue || 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, monthly_revenue: parseFloat(e.target.value) || 0 })}
                      className="border-gray-200 focus:border-meu-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">Royalty (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingFranchise.royalty_percentage || 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, royalty_percentage: parseFloat(e.target.value) || 0 })}
                      className="border-gray-200 focus:border-meu-primary"
                    />
                  </div>


                  <div className="md:col-span-2 pt-2">
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={editingFranchise.is_active || false}
                        onChange={(e) => setEditingFranchise({ ...editingFranchise, is_active: e.target.checked })}
                        className="h-4 w-4 text-meu-primary focus:ring-meu-primary border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                        Franquia Ativa no Sistema
                      </label>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h4 className="text-sm font-bold text-meu-primary mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Acesso Administrativo
                  </h4>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPasswordModal(editingFranchise)}
                      disabled={loadingAdmin}
                      className="text-gray-600 border-gray-200 hover:border-meu-primary hover:text-meu-primary"
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(editingFranchise as Academy)}
                      disabled={resetPasswordLoading}
                      className="text-gray-600 border-gray-200 hover:border-meu-primary hover:text-meu-primary"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Reset de Senha
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                  <Button variant="ghost" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-meu-primary hover:bg-meu-primary-dark text-white px-6 shadow-md shadow-meu-primary/20"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Alterar Senha (Standardized) */}
        {showPasswordModal && franchiseAdmin && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Nova Senha</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowPasswordModal(false)} className="rounded-full h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md mb-4">
                    Definindo nova senha para <strong>{franchiseAdmin.email}</strong>
                  </div>

                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Nova Senha (min. 6 caracteres)"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Confirmar Nova Senha"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>Cancelar</Button>
                    <Button onClick={handleChangePassword} disabled={passwordLoading} className="bg-meu-primary text-white">
                      {passwordLoading ? 'Alterando...' : 'Confirmar Alteração'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirmDialog.isOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Excluir Franquia"
          description={`Tem certeza que deseja excluir "${deleteConfirmDialog.franchise?.name}"?`}
          confirmText="Sim, Excluir"
          cancelText="Cancelar"
          type="danger"
          loading={isDeleting !== null}
        />
      </div>
    </FranqueadoraGuard>
  )
}
