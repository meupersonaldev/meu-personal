'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  X
} from 'lucide-react'
import { useFranqueadoraStore, type Academy } from '@/lib/stores/franqueadora-store'

interface EditingFranchise extends Partial<Academy> {
  id: string
}

export default function DadosFranquiasPage() {
  const router = useRouter()
  const { academies, fetchAcademies, updateAcademy, deleteAcademy, isLoading } = useFranqueadoraStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'royalty' | 'created'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingFranchise, setEditingFranchise] = useState<EditingFranchise | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated) {
      fetchAcademies()
    }
  }, [hydrated, fetchAcademies])

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

    try {
      const { id, ...updates } = editingFranchise
      const success = await updateAcademy(id, updates)
      
      if (success) {
        toast.success('Franquia atualizada com sucesso!')
        setEditingFranchise(null)
        fetchAcademies() // Recarregar dados
      } else {
        toast.error('Erro ao atualizar franquia')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao atualizar franquia')
    }
  }

  const handleCancelEdit = () => {
    setEditingFranchise(null)
  }

  const handleDeleteFranchise = async (franchise: Academy) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE a franquia "${franchise.name}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    setIsDeleting(franchise.id)
    
    try {
      const success = await deleteAcademy(franchise.id)
      
      if (success) {
        toast.success('Franquia excluída com sucesso!')
      } else {
        toast.error('Erro ao excluir franquia')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast.error('Erro ao excluir franquia')
    } finally {
      setIsDeleting(null)
    }
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
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao atualizar status')
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
      console.error('Erro ao exportar:', error)
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
    <div className="min-h-screen bg-gray-50">
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
      </div>
    </div>
  )
}
