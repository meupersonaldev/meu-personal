'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import { 
  CreditCard,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface Stats {
  total_revenue: number
  monthly_earnings: {
    current_month: number
  }
  completed_bookings: number
  hourly_rate: number
}

export default function ProfessorCarteira() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        const response = await fetch(`${API_URL}/api/teachers/${user.id}/stats`)
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user?.id])

  if (loading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  if (error) {
    return (
      <ProfessorLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-gray-600">{error}</p>
        </div>
      </ProfessorLayout>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <ProfessorLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Carteira</h1>
          <p className="text-gray-600">Gerencie seus ganhos e faturamento</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Faturamento Total */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Faturamento Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats?.total_revenue || 0)}
              </p>
            </div>
          </div>

          {/* Faturamento Mensal */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Faturamento Mensal</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats?.monthly_earnings?.current_month || 0)}
              </p>
            </div>
          </div>

          {/* Valor por Hora */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor por Hora</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats?.hourly_rate || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
            Resumo de Aulas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Aulas Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completed_bookings || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Média por Aula</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.completed_bookings && stats?.total_revenue 
                  ? formatCurrency(stats.total_revenue / stats.completed_bookings)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Os valores são calculados automaticamente com base nas aulas concluídas. 
            Continue realizando aulas para aumentar seus ganhos!
          </p>
        </div>
      </div>
    </ProfessorLayout>
  )
}
