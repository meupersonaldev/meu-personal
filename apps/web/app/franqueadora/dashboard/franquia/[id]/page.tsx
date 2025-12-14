'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  X,
  Settings,
  Coins,
  Save,
  Clock,
  Repeat
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useFranqueadoraStore, type Academy, type AcademyStats, type AcademyFinance } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface EditingFranchise extends Partial<Academy> {
  id: string
}

export default function FranquiaDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const franchiseId = params.id as string

  const { academies, fetchAcademies, fetchAcademyStats, fetchAcademyFinance, updateAcademy, isLoading } = useFranqueadoraStore()
  const [franchise, setFranchise] = useState<Academy | null>(null)
  const [stats, setStats] = useState<AcademyStats | null>(null)
  const [finance, setFinance] = useState<AcademyFinance | null>(null)
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
      ? 'Ótimo engajamento'
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
      // Buscar stats e dados financeiros em paralelo
      const [realStats, financeData] = await Promise.all([
        fetchAcademyStats(franchiseId),
        fetchAcademyFinance(franchiseId)
      ])

      if (realStats) {
        // Se tiver dados financeiros do Asaas, usar a receita mensal de lá
        if (financeData?.revenue?.monthly) {
          setStats({
            ...realStats,
            monthlyRevenue: financeData.revenue.monthly
          })
        } else {
          setStats(realStats)
        }
        setFinance(financeData)
      } else {
        toast.error('Erro ao carregar dados da franquia')
      }
    } catch {
      toast.error('Erro ao carregar dados da franquia')
    } finally {
      setLoadingStats(false)
    }
  }, [franchiseId, fetchAcademyStats, fetchAcademyFinance])

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
      const currentSettings = franchise.settings || {}
      const newSettings = {
        ...currentSettings,
        manualCreditReleaseEnabled: enabled
      }

      const success = await updateAcademy(franchise.id, { settings: newSettings })

      if (success) {
        toast.success(
          enabled
            ? 'Liberação manual de créditos habilitada'
            : 'Liberação manual de créditos desabilitada'
        )
        // Atualizar estado local imediatamente
        setFranchise(prev => prev ? { ...prev, settings: newSettings } : null)
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Carregando dados da franquia...</p>
        </div>
      </div>
    )
  }

  if (!franchise) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Franquia não encontrada</h2>
          <p className="text-gray-500 mb-6">A franquia solicitada não existe ou foi removida.</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 pb-4 border-b border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-gray-500 hover:text-meu-primary w-fit -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building className="h-7 w-7 text-meu-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-meu-primary tracking-tight">{franchise.name}</h1>
                <p className="text-sm text-gray-500">{franchise.city}, {franchise.state}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Badge
                className={`text-xs px-3 py-1 ${franchise.is_active
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                  }`}
              >
                {franchise.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1 sm:flex-none"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="p-4 border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email</p>
                <p className="font-medium text-gray-900 text-sm truncate">{franchise.email}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Telefone</p>
                <p className="font-medium text-gray-900 text-sm">{franchise.phone || '-'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Localização</p>
                <p className="font-medium text-gray-900 text-sm">{franchise.city}, {franchise.state}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Criada em</p>
                <p className="font-medium text-gray-900 text-sm">
                  {new Date(franchise.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* KPIs Principais */}
        {loadingStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6"><div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div></Card>
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-600"><Users className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-blue-500/80 tracking-wider">Alunos</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalStudents}</p>
                    <p className="text-xs text-blue-600 font-medium">{stats.activeStudents} ativos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-purple-100 bg-purple-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-600"><GraduationCap className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-purple-500/80 tracking-wider">Professores</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.totalTeachers}</p>
                    <p className="text-xs text-purple-600 font-medium">{stats.activeTeachers} ativos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-green-100 bg-green-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-100 text-green-600"><DollarSign className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-green-500/80 tracking-wider">Receita Mensal</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.monthlyRevenue || 0)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-cyan-100 bg-cyan-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-cyan-100 text-meu-primary"><CreditCard className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-cyan-500/80 tracking-wider">Créditos</p>
                    <p className="text-2xl font-bold text-cyan-900">{stats.creditsBalance ?? 0}</p>
                    <p className="text-xs text-cyan-600 font-medium">{stats.plansActive ?? 0} planos ativos</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Agendamentos e Atividades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-meu-primary" />
                    Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600">Total de Agendamentos</span>
                      <span className="font-bold text-gray-900">{stats.totalBookings}</span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" /> Concluídos
                      </span>
                      <span className="font-bold text-green-600">
                        {stats.completedBookings} ({formatPercentage(stats.completedBookings, stats.totalBookings)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-red-500" /> Cancelados
                      </span>
                      <span className="font-bold text-red-600">
                        {stats.cancelledBookings} ({formatPercentage(stats.cancelledBookings, stats.totalBookings)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-50/50">
                      <span className="text-sm font-bold text-meu-primary">Taxa de Sucesso</span>
                      <span className="font-bold text-meu-primary text-lg">
                        {formatPercentage(stats.completedBookings, stats.totalBookings)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-meu-primary" />
                    Atividade
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600">Créditos em Circulação</span>
                      <span className="font-bold text-gray-900">{stats.creditsBalance}</span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600">Planos Ativos</span>
                      <span className="font-bold text-gray-900">{stats.plansActive}</span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600">Taxa de Ocupação (Alunos)</span>
                      <span className="font-bold text-meu-primary">
                        {formatPercentage(stats.activeStudents, stats.totalStudents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-600">Taxa de Ocupação (Professores)</span>
                      <span className="font-bold text-purple-600">
                        {formatPercentage(stats.activeTeachers, stats.totalTeachers)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPIs Secundários - Novos dados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-orange-100 bg-orange-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-orange-100 text-orange-600"><CalendarCheck className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-orange-500/80 tracking-wider">Check-ins (Mês)</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.monthlyCheckins ?? 0}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-indigo-100 bg-indigo-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600"><Clock className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-500/80 tracking-wider">Horas Professores</p>
                    <p className="text-2xl font-bold text-indigo-900">{stats.availableProfHours ?? 0}h</p>
                    <p className="text-xs text-indigo-600 font-medium">{stats.lockedProfHours ?? 0}h reservadas</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-amber-100 bg-amber-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-100 text-amber-600"><Calendar className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Agend. Pendentes</p>
                    <p className="text-2xl font-bold text-amber-900">{stats.pendingBookings ?? 0}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 border-teal-100 bg-teal-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-teal-100 text-teal-600"><Repeat className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-teal-500/80 tracking-wider">Séries Recorrentes</p>
                    <p className="text-2xl font-bold text-teal-900">{stats.recurringSeriesActive ?? 0}</p>
                    <p className="text-xs text-teal-600 font-medium">ativas</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Financeiro */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-meu-primary" />
                  Informações Financeiras
                  {finance?.academy?.asaasConnected && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Asaas Conectado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1">Taxa de Franquia</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{formatCurrency(finance?.revenue?.franchiseFee || franchise.franchise_fee)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider mb-1">Receita Mensal</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-900">
                      {formatCurrency(finance?.revenue?.monthly || stats.monthlyRevenue || 0)}
                    </p>
                    {finance?.period && (
                      <p className="text-[10px] text-green-600 mt-1">
                        {new Date(finance.period.start).toLocaleDateString('pt-BR', { month: 'short' })} - {new Date(finance.period.end).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider mb-1">Royalty Mensal</p>
                    <p className="text-xl lg:text-2xl font-bold text-amber-900">
                      {formatCurrency(finance?.revenue?.royalty || ((stats.monthlyRevenue || 0) * ((franchise.royalty_percentage || 0) / 100)))}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1">{finance?.revenue?.royaltyPercentage || franchise.royalty_percentage}% da receita</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-purple-500 tracking-wider mb-1">Receita Líquida</p>
                    <p className="text-xl lg:text-2xl font-bold text-purple-900">
                      {formatCurrency(finance?.revenue?.net || ((stats.monthlyRevenue || 0) * (1 - (franchise.royalty_percentage || 0) / 100)))}
                    </p>
                    <p className="text-[10px] text-purple-600 mt-1">Após royalty</p>
                  </div>
                </div>
                {finance?.revenue?.pending && finance.revenue.pending > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span><strong>{formatCurrency(finance.revenue.pending)}</strong> em pagamentos pendentes</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status e Alertas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border-l-4 ${franchise.is_active ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                <div className="flex items-center gap-2">
                  {franchise.is_active ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-bold ${franchise.is_active ? 'text-green-800' : 'text-red-800'}`}>
                    Franquia {franchise.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${franchise.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {franchise.is_active ? 'Operando normalmente' : 'Franquia desativada'}
                </p>
              </div>
              <div className={`p-4 rounded-xl border-l-4 ${successRateClass}`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-600" />
                  <span className="font-bold text-gray-800">Engajamento dos Clientes</span>
                </div>
                <p className="text-sm mt-1 text-gray-600">{successRateMessage}</p>
              </div>
            </div>
          </>
        )}

        {/* Configurações */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-meu-primary" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start sm:items-center gap-3">
                <Coins className="h-5 w-5 text-meu-primary mt-0.5 sm:mt-0 shrink-0" />
                <div>
                  <p className="font-bold text-gray-900 text-sm">Liberação Manual de Créditos</p>
                  <p className="text-xs text-gray-500">
                    Permite que admins da franquia liberem créditos manualmente.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
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
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        {editingFranchise && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Editar Franquia</h2>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-8 w-8 p-0 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome *</label>
                    <Input
                      value={editingFranchise.name || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, name: e.target.value })}
                      placeholder="Nome da franquia"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email *</label>
                    <Input
                      type="email"
                      value={editingFranchise.email || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, email: e.target.value })}
                      placeholder="email@franquia.com"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Telefone</label>
                    <Input
                      value={editingFranchise.phone || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cidade</label>
                    <Input
                      value={editingFranchise.city || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, city: e.target.value })}
                      placeholder="São Paulo"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Estado</label>
                    <Input
                      value={editingFranchise.state || ''}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, state: e.target.value })}
                      placeholder="SP"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Taxa Franquia (R$)</label>
                    <Input
                      type="number"
                      value={editingFranchise.franchise_fee || 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, franchise_fee: parseFloat(e.target.value) || 0 })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Royalty (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingFranchise.royalty_percentage || 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, royalty_percentage: parseFloat(e.target.value) || 0 })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Receita Mensal (R$)</label>
                    <Input
                      type="number"
                      value={editingFranchise.monthly_revenue || 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, monthly_revenue: parseFloat(e.target.value) || 0 })}
                      className="h-10"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={editingFranchise.is_active || false}
                        onChange={(e) => setEditingFranchise({ ...editingFranchise, is_active: e.target.checked })}
                        className="h-4 w-4 text-meu-primary focus:ring-meu-primary border-gray-300 rounded"
                      />
                      <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                        Franquia Ativa
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <Button variant="outline" onClick={handleCancelEdit} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="bg-meu-primary hover:bg-meu-primary/90 text-white w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </FranqueadoraGuard>
  )
}
