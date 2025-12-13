'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building,
  DollarSign,
  BarChart3,
  MapPin,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Users,
  Wallet,
  PieChart
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import FranqueadoraNotificationsDropdown from '@/components/notifications/FranqueadoraNotificationsDropdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function FranqueadoraDashboard() {
  const router = useRouter()
  const {
    user,
    franqueadora,
    isAuthenticated,
    academies,
    analytics,
    fetchAnalytics,
    fetchAcademies,
    isLoading
  } = useFranqueadoraStore()
  const [activeTab] = useState<'overview' | 'franchises' | 'leads' | 'settings'>('overview')

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchAcademies()
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated])

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  // Novo Design: Card Corporativo
  const KPICard = ({
    title,
    value,
    trend,
    trendLabel,
    icon: Icon,
  }: {
    title: string
    value: string | number
    trend?: string
    trendLabel?: string
    icon: any
  }) => (
    <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
      <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
      <div className="p-4 sm:p-6 pl-6 sm:pl-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-3">
          <span className="text-2xl sm:text-3xl font-bold text-meu-primary font-feature-settings-tnum tracking-tight">
            {value}
          </span>
          {trend && (
            <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 sm:mt-0 w-fit">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </span>
          )}
        </div>
        {trendLabel && (
          <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">{trendLabel}</p>
        )}
      </div>
    </Card>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPIs Principais - Linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KPICard
                title="Total de Franquias"
                value={analytics?.totalFranchises || 0}
                trend={`+${Number(analytics?.monthlyGrowth || 0).toFixed(1)}%`}
                trendLabel="vs. mês anterior"
                icon={Building}
              />

              <KPICard
                title="Franquias Ativas"
                value={`${analytics?.activeFranchises || 0}`}
                trend={`${(Number(analytics?.activeFranchises || 0) / Number(analytics?.totalFranchises || 1) * 100).toFixed(0)}%`}
                trendLabel="Taxa de ocupação"
                icon={Activity}
              />

              <KPICard
                title="Receita Total"
                value={`R$ ${(Number(analytics?.totalRevenue || 0) / 1000).toFixed(1)}k`}
                trendLabel="Faturamento acumulado"
                icon={Wallet}
              />

              <KPICard
                title="Royalties (Mês)"
                value={`R$ ${(Number(analytics?.totalRoyalties || 0) / 1000).toFixed(1)}k`}
                trendLabel="Receita recorrente"
                icon={DollarSign}
              />
            </div>

            {/* Gráficos e Listas - Linha 2 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Gráfico de Crescimento (Ocupa 2 colunas) */}
              <Card className="col-span-1 xl:col-span-2 border border-gray-100 shadow-sm p-4 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-meu-primary">Crescimento da Rede</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Evolução do número de franquias nos últimos 6 meses</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs border-gray-200 text-gray-600 hover:text-meu-primary hover:border-meu-primary transition-colors w-full sm:w-auto">
                    Relatório Detalhado
                  </Button>
                </div>

                {(() => {
                  const now = new Date()
                  const monthsData = []
                  const sourceAcademies = academies

                  for (let i = 5; i >= 0; i--) {
                    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

                    const count = sourceAcademies.filter(a => {
                      if (!a.created_at) return false
                      const createdDate = new Date(a.created_at)
                      return createdDate >= monthDate && createdDate < nextMonthDate
                    }).length

                    monthsData.push({
                      month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                      count
                    })
                  }

                  const maxCount = Math.max(...monthsData.map(m => m.count), 1)

                  return (
                    <div className="h-[250px] sm:h-[320px] w-full mt-4">
                      <div className="flex items-end justify-between h-full space-x-2 sm:space-x-6 px-2 sm:px-4">
                        {monthsData.map((data, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                              <div className="mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <span className="text-[10px] sm:text-sm font-bold text-meu-primary bg-blue-50 px-2 py-1 rounded">
                                  {data.count}
                                </span>
                              </div>
                              <div
                                className="w-full max-w-[30px] sm:max-w-[50px] bg-meu-primary/80 group-hover:bg-meu-primary rounded-t-sm transition-all duration-500 relative"
                                style={{
                                  height: `${(data.count / maxCount) * 100}%`,
                                  minHeight: '4px'
                                }}
                              >
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase mt-2 sm:mt-4 group-hover:text-meu-primary transition-colors">
                              {data.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </Card>

              {/* Top Franquias (Ocupa 1 coluna) */}
              <Card className="col-span-1 border border-gray-100 shadow-sm p-4 sm:p-8 bg-white flex flex-col h-[400px] sm:h-auto">
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-meu-primary">Top Performance</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Ranking por faturamento</p>
                  </div>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {academies
                    .sort((a, b) => Number(b.monthly_revenue || 0) - Number(a.monthly_revenue || 0))
                    .slice(0, 5)
                    .map((academy, index) => (
                      <div key={academy.id} className="group flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={cn(
                            "w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-xs sm:text-sm font-bold transition-transform group-hover:scale-110",
                            index === 0 ? "bg-meu-primary text-meu-accent" :
                              index === 1 ? "bg-gray-100 text-gray-600" :
                                index === 2 ? "bg-orange-50 text-orange-600" :
                                  "bg-slate-50 text-slate-400"
                          )}>
                            {index + 1}º
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-meu-primary transition-colors truncate max-w-[100px] sm:max-w-[140px]">{academy.name}</p>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 flex items-center uppercase tracking-wide">
                              <MapPin className="h-3 w-3 mr-1" />
                              {academy.city}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-meu-primary transition-colors">
                            {(Number(academy.monthly_revenue || 0) / 1000).toFixed(1)}k
                          </p>
                        </div>
                      </div>
                    ))}

                  {academies.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8 text-gray-400">
                      <BarChart3 className="h-12 w-12 text-gray-200 mb-2" />
                      <p className="text-sm">Nenhuma franquia registrada</p>
                    </div>
                  )}
                </div>

                <Button variant="ghost" className="w-full mt-4 sm:mt-6 text-[10px] sm:text-xs font-medium text-gray-400 hover:text-meu-primary hover:bg-meu-primary/5 uppercase tracking-wider">
                  Ver Ranking Completo
                </Button>
              </Card>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto space-y-6 sm:space-y-10 mb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-meu-primary/5 text-meu-primary text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
                Dashboard
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 font-mono">v1.2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
              Visão Geral
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
              Acompanhe o desempenho da rede {franqueadora?.name} e gerencie suas franquias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <FranqueadoraNotificationsDropdown />
            </div>
            <Button size="lg" className="w-full sm:w-auto bg-meu-primary hover:bg-meu-primary-dark text-white shadow-lg shadow-meu-primary/20 transition-all hover:scale-105 active:scale-95">
              <PieChart className="h-4 w-4 mr-2" />
              Relatório Mensal
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {renderTabContent()}
      </div>
    </FranqueadoraGuard>
  )
}
