'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building,
  DollarSign,
  BarChart3,
  MapPin,
  Activity
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import FranqueadoraNotificationsDropdown from '@/components/notifications/FranqueadoraNotificationsDropdown'

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
  }, [hydrated, isAuthenticated, fetchAcademies, fetchAnalytics])

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* KPIs Principais - Linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building className="h-6 w-6 sm:h-8 sm:w-8 text-meu-primary" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Franquias</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{analytics?.totalFranchises || 0}</p>
                    <p className="text-xs sm:text-sm text-meu-primary truncate">+{Number(analytics?.monthlyGrowth || 0).toFixed(1)}% este mês</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Franquias Ativas</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{analytics?.activeFranchises || 0}</p>
                    <p className="text-xs sm:text-sm text-blue-600 truncate">
                      {(Number(analytics?.activeFranchises || 0) / Number(analytics?.totalFranchises || 1) * 100).toFixed(0)}% da rede
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      R$ {(Number(analytics?.totalRevenue || 0) / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs sm:text-sm text-green-600 truncate">
                      Média: R$ {(Number(analytics?.averageRevenuePerFranchise || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-700" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-green-700">Royalties Mensais</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900">
                      R$ {(Number(analytics?.totalRoyalties || 0) / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs sm:text-sm text-green-600 truncate">Receita da franqueadora</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* KPIs Secundários - Linha 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Estados Atendidos</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {new Set(academies.map(a => a.state)).size}
                    </p>
                    <p className="text-xs sm:text-sm text-cyan-600 truncate">Cobertura nacional</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-pink-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Royalty Médio</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {academies.length > 0
                        ? (academies.reduce((sum, a) => sum + Number(a.royalty_percentage || 0), 0) / academies.length).toFixed(1)
                        : '0'
                      }%
                    </p>
                    <p className="text-xs sm:text-sm text-pink-600 truncate">Taxa padrão da rede</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Crescimento de Franquias</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Franquias criadas nos últimos 6 meses</p>
                {(() => {
                  // Calcular dados dos últimos 6 meses
                  const now = new Date()
                  const monthsData = []

                  // Usar dados vindos da API; caso não haja created_at, o mês contará como 0
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
                      month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
                      count
                    })
                  }

                  const maxCount = Math.max(...monthsData.map(m => m.count), 1)
                  
                  return (
                    <div className="h-40 sm:h-56">
                      <div className="flex items-end justify-between h-full space-x-1 sm:space-x-2">
                        {monthsData.map((data, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div className="w-full flex flex-col items-center justify-end h-full pb-6 sm:pb-8">
                              <span className="text-[10px] sm:text-xs font-semibold text-meu-primary mb-1">
                                {data.count}
                              </span>
                              <div 
                                className="w-full bg-gradient-to-t from-meu-primary to-meu-cyan rounded-t-lg transition-all duration-500 hover:opacity-80"
                                style={{ 
                                  height: `${(data.count / maxCount) * 100}%`,
                                  minHeight: data.count > 0 ? '8px' : '0px'
                                }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs text-gray-600 capitalize mt-1 sm:mt-2">
                              {data.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </Card>

              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Top Franquias</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Ranking das franquias com melhor performance financeira.</p>
                <div className="space-y-2 sm:space-y-3">
                  {academies
                    .sort((a, b) => Number(b.monthly_revenue || 0) - Number(a.monthly_revenue || 0))
                    .slice(0, 5)
                    .map((academy, index) => (
                      <div key={academy.id} className="flex items-start sm:items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center flex-1 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-meu-primary rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-white">#{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{academy.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600 flex items-center truncate">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{academy.city}, {academy.state}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">R$ {(Number(academy.monthly_revenue || 0) / 1000).toFixed(0)}k/mês</p>
                          <p className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">⭐ {Number(academy.royalty_percentage || 0)}%</p>
                        </div>
                      </div>
                    ))}
                </div>
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
      <div className="p-3 sm:p-4 lg:p-8">
          {/* Header Mobile - Removido pois já temos no layout */}
          
          {/* Header Desktop */}
          <div className="hidden lg:flex lg:items-center lg:justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Painel</p>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard — {franqueadora?.name || 'Franqueadora'}</h1>
            </div>
            <FranqueadoraNotificationsDropdown />
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Visão Geral</h2>
                <p className="text-sm text-gray-600">Acompanhe o desempenho da rede</p>
              </div>
              <FranqueadoraNotificationsDropdown />
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {renderTabContent()}
          </div>
      </div>
    </FranqueadoraGuard>
  )
}
