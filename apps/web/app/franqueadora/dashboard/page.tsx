'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building,
  DollarSign,
  BarChart3,
  Bell,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'

export default function FranqueadoraDashboard() {
  const router = useRouter()
  const {
    user,
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
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/franqueadora')
    }
  }, [router, isAuthenticated, hydrated])

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

  if (!isAuthenticated) {
    return null
  }

  if (!user) {
    console.error('No user found in store')
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building className="h-8 w-8 text-meu-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Franquias</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalFranchises || 0}</p>
                    <p className="text-sm text-meu-primary">+{analytics?.monthlyGrowth?.toFixed(1) || 0}% este mês</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Franquias Ativas</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.activeFranchises || 0}</p>
                    <p className="text-sm text-blue-600">{academies.filter(a => a.is_active).length} operando</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {analytics ? ((analytics.totalRevenue || 0) / 1000).toFixed(1) : '0'}k</p>
                    <p className="text-sm text-green-600">+{analytics?.monthlyGrowth?.toFixed(1) || 0}% este mês</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Crescimento de Franquias</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Gráfico de Crescimento Mensal</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Franquias</h3>
                <p className="text-sm text-gray-500 mb-4">Ranking das franquias com melhor performance financeira.</p>
                <div className="space-y-3">
                  {academies
                    .sort((a, b) => b.monthly_revenue - a.monthly_revenue)
                    .slice(0, 5)
                    .map((academy, index) => (
                      <div key={academy.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-meu-primary rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-white">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{academy.name}</p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {academy.city}, {academy.state}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Receita R$ {(academy.monthly_revenue / 1000).toFixed(0)}k/mês</p>
                          <p className="text-sm text-gray-600">⭐ {academy.royalty_percentage}% royalty</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard da Franqueadora</h1>
              <p className="text-sm text-gray-600">Bem-vindo, Admin Meu Personal</p>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Painel</p>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard da Franqueadora</h1>
          </div>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
