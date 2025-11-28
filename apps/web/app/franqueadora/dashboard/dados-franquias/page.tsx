'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Mail
} from 'lucide-react'
import { useFranqueadoraStore, type Academy } from '@/lib/stores/franqueadora-store'

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
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(false)

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated) {
      fetchAcademies()
    }
  }, [hydrated, fetchAcademies])

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
    router.push('/franqueadora/dashboard/add-franchise')
  }

  const handleViewFranchise = (franchise: Academy) => {
    router.push(`/franqueadora/dashboard/franquia/${franchise.id}`)
  }

  const handleEditFranchise = (franchise: Academy) => {
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
      console.log('[handleSaveEdit] Atualizando franquia:', id, updates)
      
      const success = await updateAcademy(id, updates)
      
      if (success) {
        toast.success('Franquia atualizada com sucesso!')
        setEditingFranchise(null)
        // Aguardar um pouco para garantir que o estado foi atualizado
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

  const fetchFranchiseAdmin = async (franchiseId: string) => {
    if (!franchiseId) {
      console.error('[fetchFranchiseAdmin] franchiseId não fornecido')
      return null
    }

    setLoadingAdmin(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      console.log('[fetchFranchiseAdmin] Buscando admin para franquia:', franchiseId)
      
      const response = await fetch(`${API_URL}/api/franchises/${franchiseId}/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[fetchFranchiseAdmin] Erro na resposta:', response.status, errorData)
        throw new Error(errorData.error || 'Erro ao buscar admin da franquia')
      }

      const admin = await response.json()
      console.log('[fetchFranchiseAdmin] Resposta da API:', {
        admin,
        hasId: !!admin?.id,
        hasEmail: !!admin?.email,
        hasName: !!admin?.name,
        franchiseId
      })
      
      if (!admin || !admin.id || !admin.email) {
        console.error('[fetchFranchiseAdmin] Dados do admin incompletos:', admin)
        throw new Error('Dados do admin incompletos')
      }

      // Não setar o estado aqui, deixar o handleOpenPasswordModal fazer isso
      // setFranchiseAdmin(admin)
      return admin
    } catch (error: any) {
      console.error('[fetchFranchiseAdmin] Erro:', error)
      toast.error(error.message || 'Erro ao buscar admin da franquia')
      return null
    } finally {
      setLoadingAdmin(false)
    }
  }

  const handleOpenPasswordModal = async (franchise: Academy | EditingFranchise) => {
    if (!franchise?.id) {
      toast.error('ID da franquia não encontrado')
      return
    }
    
    // Fechar modal anterior se estiver aberto
    setShowPasswordModal(false)
    
    // Limpar estado anterior antes de buscar novo admin
    setFranchiseAdmin(null)
    setPasswordData({ newPassword: '', confirmPassword: '' })
    
    console.log('[handleOpenPasswordModal] Buscando admin para franquia:', {
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      editingFranchiseId: editingFranchise?.id
    })
    
    const admin = await fetchFranchiseAdmin(franchise.id)
    if (admin && admin.id && admin.email) {
      console.log('[handleOpenPasswordModal] Admin encontrado:', {
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        franchiseId: franchise.id,
        franchiseName: franchise.name
      })
      
      // Verificar se o admin retornado corresponde à franquia correta
      if (admin.email === 'franquia@gmail.com') {
        console.warn('[handleOpenPasswordModal] ATENÇÃO: Email genérico detectado! Verificando se é o admin correto...')
      }
      
      // Aguardar um tick para garantir que o estado anterior foi limpo
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Só abrir o modal depois que o admin for carregado
      setFranchiseAdmin({
        id: admin.id,
        name: admin.name || 'Admin',
        email: admin.email
      })
      
      // Aguardar mais um tick antes de abrir o modal
      setTimeout(() => {
        setShowPasswordModal(true)
      }, 100)
    } else {
      console.error('[handleOpenPasswordModal] Admin não encontrado ou dados incompletos:', admin)
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

  const handleExportData = () => {
    try {
      const csvData = academies.map(academy => ({
        Nome: academy.name,
        Email: academy.email,
        Telefone: academy.phone || '',
        Cidade: academy.city || '',
        Estado: academy.state || '',
        'Receita Mensal': academy.monthly_revenue,
        'Royalty (%)': academy.royalty_percentage,
        Status: academy.is_active ? 'Ativa' : 'Inativa',
        'Data de Criação': new Date(academy.created_at).toLocaleDateString('pt-BR')
      }))

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `franquias_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dados das Franquias</h1>
              <p className="text-sm text-gray-600">Visualize e gerencie todas as franquias cadastradas</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              className="bg-meu-primary hover:bg-meu-primary/90 text-white"
              onClick={handleAddFranchise}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Franquia
            </Button>
          </div>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-8 w-8 text-meu-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{academies.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {academies.filter(a => a.is_active).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(academies.reduce((sum, a) => sum + a.monthly_revenue, 0))}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Royalty Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {academies.length > 0 
                    ? (academies.reduce((sum, a) => sum + a.royalty_percentage, 0) / academies.length).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, cidade ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Apenas Ativas</option>
                <option value="inactive">Apenas Inativas</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'royalty' | 'created')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary"
              >
                <option value="name">Nome</option>
                <option value="revenue">Receita</option>
                <option value="royalty">Royalty</option>
                <option value="created">Data de Criação</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Modal de Edição */}
        {editingFranchise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Editar Franquia</h2>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                    <Input
                      value={editingFranchise.name || ''}
                      onChange={(e) => setEditingFranchise({...editingFranchise, name: e.target.value})}
                      placeholder="Nome da franquia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <Input
                      type="email"
                      value={editingFranchise.email || ''}
                      onChange={(e) => setEditingFranchise({...editingFranchise, email: e.target.value})}
                      placeholder="email@franquia.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <Input
                      value={editingFranchise.phone || ''}
                      onChange={(e) => setEditingFranchise({...editingFranchise, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                    <Input
                      value={editingFranchise.city || ''}
                      onChange={(e) => setEditingFranchise({...editingFranchise, city: e.target.value})}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <Input
                      value={editingFranchise.state || ''}
                      onChange={(e) => setEditingFranchise({...editingFranchise, state: e.target.value})}
                      placeholder="SP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taxa de Franquia (R$)</label>
                    <Input
                      type="number"
                      value={editingFranchise.franchise_fee || 0}
                      onChange={(e) => setEditingFranchise({...editingFranchise, franchise_fee: parseFloat(e.target.value) || 0})}
                      placeholder="50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Royalty (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingFranchise.royalty_percentage || 0}
                      onChange={(e) => setEditingFranchise({...editingFranchise, royalty_percentage: parseFloat(e.target.value) || 0})}
                      placeholder="8.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Receita Mensal (R$)</label>
                    <Input
                      type="number"
                      value={editingFranchise.monthly_revenue || 0}
                      onChange={(e) => setEditingFranchise({...editingFranchise, monthly_revenue: parseFloat(e.target.value) || 0})}
                      placeholder="25000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={editingFranchise.is_active || false}
                        onChange={(e) => setEditingFranchise({...editingFranchise, is_active: e.target.checked})}
                        className="h-4 w-4 text-meu-primary focus:ring-meu-primary border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                        Franquia Ativa
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ações de Senha do Admin */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Gerenciar Senha do Admin</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!editingFranchise?.id) {
                          toast.error('ID da franquia não encontrado')
                          return
                        }
                        console.log('[Button] Clicou em Alterar Senha para franquia:', editingFranchise.id, editingFranchise.name)
                        handleOpenPasswordModal(editingFranchise)
                      }}
                      disabled={loadingAdmin || !editingFranchise?.id}
                      className="flex items-center gap-2"
                    >
                      {loadingAdmin ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          Carregando...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          Alterar Senha
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!editingFranchise?.id) {
                          toast.error('ID da franquia não encontrado')
                          return
                        }
                        handleResetPassword(editingFranchise)
                      }}
                      disabled={resetPasswordLoading || loadingAdmin || !editingFranchise?.id}
                      className="flex items-center gap-2"
                    >
                      {resetPasswordLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Resetar e Enviar por Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 mt-6">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveEdit}
                    className="bg-meu-primary hover:bg-meu-primary/90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Alterar Senha do Admin */}
        {showPasswordModal && franchiseAdmin && franchiseAdmin.id && franchiseAdmin.email && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Alterar Senha do Admin - {franchiseAdmin.name || 'N/A'}
                </h3>
                <div className="text-xs text-gray-500">
                  ID: {franchiseAdmin.id}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('[Modal] Fechando modal e limpando estado')
                    setShowPasswordModal(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setFranchiseAdmin(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email do Admin
                  </label>
                  <Input
                    type="email"
                    value={franchiseAdmin?.email || ''}
                    disabled
                    className="w-full bg-gray-50"
                    placeholder={loadingAdmin ? 'Carregando...' : 'Email não encontrado'}
                    readOnly
                  />
                  {franchiseAdmin?.email && (
                    <p className="text-xs text-gray-500 mt-1">
                      Admin ID: {franchiseAdmin.id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha *
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha *
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Digite a senha novamente"
                    className="w-full"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Observação:</strong> Como franqueadora, você pode alterar a senha do admin da franquia sem precisar da senha atual.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setFranchiseAdmin(null)
                  }}
                  disabled={passwordLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="bg-meu-primary hover:bg-meu-primary/90 text-white"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Franquias */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franquia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receita Mensal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Royalty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedAcademies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Nenhuma franquia encontrada</p>
                        <p className="text-sm">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando sua primeira franquia'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedAcademies.map((academy) => (
                    <tr key={academy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{academy.name}</div>
                          <div className="text-sm text-gray-500">{academy.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {academy.city}, {academy.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(academy.monthly_revenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{academy.royalty_percentage}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(academy)}
                          className="focus:outline-none"
                        >
                          <Badge 
                            className={
                              academy.is_active 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'
                            }
                          >
                            {academy.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(academy.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewFranchise(academy)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFranchise(academy)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFranchise(academy)}
                            className="text-red-600 hover:text-red-900"
                            title="Desativar"
                            disabled={isDeleting === academy.id}
                          >
                            {isDeleting === academy.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Resumo dos Resultados */}
        {filteredAndSortedAcademies.length > 0 && (
          <div className="mt-6 text-sm text-gray-600 text-center">
            Mostrando {filteredAndSortedAcademies.length} de {academies.length} franquias
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmDialog
          isOpen={deleteConfirmDialog.isOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Excluir Franquia"
          description={`Tem certeza que deseja EXCLUIR PERMANENTEMENTE a franquia "${deleteConfirmDialog.franchise?.name}"?

Esta ação não pode ser desfeita e irá remover:
• Todos os dados da franquia
• Professores e alunos vinculados
• Agendamentos e histórico
• Configurações e planos

Esta é uma ação permanente e irreversível.`}
          confirmText="Sim, Excluir Permanentemente"
          cancelText="Cancelar"
          type="danger"
          loading={isDeleting !== null}
        />
      </div>
    </FranqueadoraGuard>
  )
}
