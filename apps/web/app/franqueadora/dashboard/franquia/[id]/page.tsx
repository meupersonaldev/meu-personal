'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Building, 
  Users, 
  GraduationCap,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Activity,
  CalendarCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Settings,
  Coins
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useFranqueadoraStore, type Academy, type AcademyStats } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface EditingFranchise extends Partial<Academy> {
  id: string
}

export default function FranquiaDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const franchiseId = params.id as string
  
  const { academies, fetchAcademies, fetchAcademyStats, updateAcademy, isLoading } = useFranqueadoraStore()
  const [franchise, setFranchise] = useState<Academy | null>(null)
  const [stats, setStats] = useState<AcademyStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [editingFranchise, setEditingFranchise] = useState<EditingFranchise | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingCreditRelease, setIsTogglingCreditRelease] = useState(false)

  const successRate = stats && stats.totalBookings > 0
    ? stats.completedBookings / stats.totalBookings
    : 0
  const successRateClass =
    successRate >= 0.75
      ? 'bg-green-50 border-green-400'
      : successRate >= 0.5
        ? 'bg-yellow-50 border-yellow-400'
        : 'bg-red-50 border-red-400'
  const successRateMessage =
    successRate >= 0.75
      ? 'Ótimo engajamento dos alunos'
      : successRate >= 0.5
        ? 'Engajamento dentro do esperado'
        : 'Atenção: engajamento baixo'

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated) {
      fetchAcademies()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const fetchFranchiseStats = useCallback(async () => {
    if (!franchiseId) return
    
    setLoadingStats(true)
    try {
      const realStats = await fetchAcademyStats(franchiseId)
      
      if (realStats) {
        setStats(realStats)
      } else {
        toast.error('Erro ao carregar dados da franquia')
      }
    } catch {
      toast.error('Erro ao carregar dados da franquia')
    } finally {
      setLoadingStats(false)
    }
  }, [franchiseId, fetchAcademyStats])

  useEffect(() => {
    if (academies.length > 0 && franchiseId) {
      const foundFranchise = academies.find(a => a.id === franchiseId)
      setFranchise(foundFranchise || null)
      
      if (foundFranchise) {
        fetchFranchiseStats()
      }
    }
  }, [academies, franchiseId, fetchFranchiseStats])

  const handleBack = () => {
    router.push('/franqueadora/dashboard/dados-franquias')
  }

  const handleEdit = () => {
    if (!franchise) return
    
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

    setIsSaving(true)
    try {
      const { id, ...updates } = editingFranchise
      const success = await updateAcademy(id, updates)
      
      if (success) {
        toast.success('Franquia atualizada com sucesso!')
        setEditingFranchise(null)
        // Recarregar dados
        await fetchAcademies()
        if (franchise) {
          await fetchFranchiseStats()
        }
      } else {
        toast.error('Erro ao atualizar franquia')
      }
    } catch {
      toast.error('Erro ao atualizar franquia')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingFranchise(null)
  }

  const handleToggleCreditRelease = async (enabled: boolean) => {
    if (!franchise) return
    
    setIsTogglingCreditRelease(true)
    try {
      // Get current settings or create empty object
      const currentSettings = franchise.settings || {}
      const newSettings = {
        ...currentSettings,
        manualCreditReleaseEnabled: enabled
      }
      
      const success = await updateAcademy(franchise.id, { settings: newSettings })
      
      if (success) {
        toast.success(
          enabled 
            ? 'Liberação manual de créditos habilitada para esta franquia' 
            : 'Liberação manual de créditos desabilitada para esta franquia'
        )
        // Refresh data
        await fetchAcademies()
      } else {
        toast.error('Erro ao atualizar configuração')
      }
    } catch {
      toast.error('Erro ao atualizar configuração')
    } finally {
      setIsTogglingCreditRelease(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number, total: number) => {
    if (!value || !total || total === 0 || isNaN(value) || isNaN(total)) return '0.0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da franquia...</p>
        </div>
      </div>
    )
  }

  if (!franchise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Franquia não encontrada</h2>
          <p className="text-gray-600 mb-4">A franquia solicitada não existe ou foi removida.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
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
              <h1 className="text-3xl font-bold text-gray-900">{franchise.name}</h1>
              <p className="text-sm text-gray-600">Dashboard detalhado da franquia</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge 
              className={
                franchise.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }
            >
              {franchise.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            <Button 
              variant="outline"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Informações Básicas */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações da Franquia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Localização</p>
                <p className="font-medium text-gray-900">{franchise.city}, {franchise.state}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{franchise.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium text-gray-900">{franchise.phone || 'Não informado'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Criada em</p>
                <p className="font-medium text-gray-900">
                  {new Date(franchise.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Estatísticas Principais */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : stats && (
          <>
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Alunos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                    <p className="text-sm text-green-600">{stats.activeStudents} ativos</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <GraduationCap className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Professores</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
                    <p className="text-sm text-green-600">{stats.activeTeachers} ativos</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.monthlyRevenue || 0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Royalty: {formatCurrency((stats.monthlyRevenue || 0) * ((franchise.royalty_percentage || 0) / 100))}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-meu-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Créditos Disponíveis</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.creditsBalance ?? 0}
                    </p>
                    <p className="text-sm text-gray-600">{stats.plansActive ?? 0} planos ativos</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Agendamentos e Atividades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CalendarCheck className="h-5 w-5 mr-2 text-meu-primary" />
                  Agendamentos
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total de Agendamentos</span>
                    <span className="font-semibold text-gray-900">{stats.totalBookings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Concluídos
                    </span>
                    <span className="font-semibold text-green-600">
                      {stats.completedBookings} ({formatPercentage(stats.completedBookings, stats.totalBookings)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1 text-red-500" />
                      Cancelados
                    </span>
                    <span className="font-semibold text-red-600">
                      {stats.cancelledBookings} ({formatPercentage(stats.cancelledBookings, stats.totalBookings)})
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
                      <span className="font-bold text-meu-primary">
                        {formatPercentage(stats.completedBookings, stats.totalBookings)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-meu-primary" />
                  Atividade Recente
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Créditos em Circulação</span>
                    <span className="font-semibold text-gray-900">{stats.creditsBalance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Planos Ativos</span>
                    <span className="font-semibold text-gray-900">{stats.plansActive}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Taxa de Ocupação</span>
                    <span className="font-semibold text-meu-primary">
                      {formatPercentage(stats.activeStudents, stats.totalStudents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Professores Ativos</span>
                    <span className="font-semibold text-purple-600">
                      {formatPercentage(stats.activeTeachers, stats.totalTeachers)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Informações Financeiras */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-meu-primary" />
                Informações Financeiras
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Taxa de Franquia</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(franchise.franchise_fee)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Royalty Mensal</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency((stats.monthlyRevenue || 0) * ((franchise.royalty_percentage || 0) / 100))}
                  </p>
                  <p className="text-xs text-green-600">{franchise.royalty_percentage}% da receita</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Receita Líquida</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency((stats.monthlyRevenue || 0) * (1 - (franchise.royalty_percentage || 0) / 100))}
                  </p>
                  <p className="text-xs text-purple-600">Após royalty</p>
                </div>
              </div>
            </Card>

            {/* Status e Alertas */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-meu-primary" />
                Status e Alertas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-l-4 ${
                  franchise.is_active 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-center">
                    {franchise.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className={`font-medium ${
                      franchise.is_active ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Franquia {franchise.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    franchise.is_active ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {franchise.is_active 
                      ? 'Operando normalmente' 
                      : 'Franquia desativada - sem operações'
                    }
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-l-4 ${successRateClass}`}>
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-meu-primary mr-2" />
                    <span className="font-medium text-gray-800">
                      Engajamento dos Clientes
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-gray-600">
                    {successRateMessage}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Taxa de comparecimento: {stats ? formatPercentage(stats.completedBookings, stats.totalBookings) : '0%'}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Configurações de Funcionalidades */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-meu-primary" />
            Configurações de Funcionalidades
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Coins className="h-5 w-5 text-meu-primary" />
                <div>
                  <p className="font-medium text-gray-900">Liberação Manual de Créditos</p>
                  <p className="text-sm text-gray-600">
                    Permite que administradores da franquia liberem créditos manualmente para alunos e professores
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isTogglingCreditRelease && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-meu-primary"></div>
                )}
                <Switch
                  checked={franchise?.settings?.manualCreditReleaseEnabled === true}
                  onCheckedChange={handleToggleCreditRelease}
                  disabled={isTogglingCreditRelease}
                />
              </div>
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
                    disabled={isSaving}
                    className="bg-meu-primary hover:bg-meu-primary/90 text-white"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
    </FranqueadoraGuard>
  )
}
