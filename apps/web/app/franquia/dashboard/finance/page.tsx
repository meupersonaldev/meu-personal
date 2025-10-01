'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CreditCard, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight, Filter, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

type FinancialSummary = {
  totalRevenue: number
  activeSubscriptions: number
  totalStudents: number
  averageTicket: number
  completedClasses: number
  monthlyGrowth: number
  revenueByPlan: Array<{ name: string; revenue: number; count: number }>
  transactions: Array<{
    id: string
    studentName: string
    teacherName: string
    planName: string
    amount: number
    date: string
    status: string
    type: string
  }>
}

export default function FinancePage() {
  const { franquiaUser, teachers, students } = useFranquiaStore()
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinancialSummary | null>(null)

  useEffect(() => {
    fetchFinancialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter])

  const fetchFinancialData = async () => {
    if (!franquiaUser?.academyId) {
      console.log('No academy ID found')
      return
    }

    setLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const url = `${API_URL}/api/financial/summary?academy_id=${franquiaUser.academyId}&period=${periodFilter}`
      console.log('Fetching financial data from:', url)
      
      const response = await fetch(url, { credentials: 'include' })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to fetch financial data: ${response.status}`)
      }

      const data = await response.json()
      console.log('Financial data received:', data)
      setSummary(data)
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast.error('Erro ao carregar dados financeiros. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return (
      <div className="p-6 ml-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 ml-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financeiro</h1>
            <p className="text-gray-600">Acompanhe receitas, lucros e métricas financeiras</p>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Todo período</option>
            </select>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className={`flex items-center text-sm ${summary.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.monthlyGrowth >= 0 ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {Math.abs(summary.monthlyGrowth).toFixed(1)}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Receita Total</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Baseado em {summary.activeSubscriptions} assinaturas ativas
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Assinaturas Ativas</div>
            <div className="text-3xl font-bold text-gray-900">
              {summary.activeSubscriptions}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.totalStudents} total de alunos
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Ticket Médio</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {summary.averageTicket.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Por aluno ativo
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Aulas Realizadas</div>
            <div className="text-3xl font-bold text-gray-900">
              {summary.completedClasses}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              No período selecionado
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Receita por Plano */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por Plano</h3>
          <div className="space-y-4">
            {summary.revenueByPlan.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p>Nenhuma receita registrada</p>
              </div>
            ) : (
              summary.revenueByPlan.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.count} assinatura(s)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {summary.totalRevenue > 0 ? ((item.revenue / summary.totalRevenue) * 100).toFixed(1) : '0'}% do total
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Estatísticas Gerais */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas Gerais</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-gray-900 font-medium">Total de Alunos</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{students.length}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-gray-900 font-medium">Total de Professores</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teachers.length}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-gray-900 font-medium">Aulas Concluídas</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{summary.completedClasses}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Histórico de Transações */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Transações</h3>
          <Badge variant="outline" className="text-sm">
            {summary.transactions.length} transação(ões)
          </Badge>
        </div>

        {summary.transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p>Nenhuma transação registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.studentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaction.planName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
