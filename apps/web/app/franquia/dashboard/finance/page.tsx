'use client'

import { useState, useMemo } from 'react'
import { DollarSign, CreditCard, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-store'

export default function FinancePage() {
  const { plans, students, teachers, classes, analytics } = useFranquiaStore()
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Calcular métricas financeiras
  const totalRevenue = useMemo(() => {
    return students.reduce((sum, student) => {
      const plan = plans.find(p => p.id === student.planId)
      return sum + (plan?.price || 0)
    }, 0)
  }, [students, plans])

  const activeSubscriptions = students.filter(s => s.status === 'active').length
  const totalSubscriptions = students.length

  // Receita por tipo de plano
  const revenueByPlan = useMemo(() => {
    const planRevenue = new Map<string, { name: string; revenue: number; count: number }>()

    students.forEach(student => {
      const plan = plans.find(p => p.id === student.planId)
      if (plan) {
        const current = planRevenue.get(plan.id) || { name: plan.name, revenue: 0, count: 0 }
        planRevenue.set(plan.id, {
          name: plan.name,
          revenue: current.revenue + plan.price,
          count: current.count + 1
        })
      }
    })

    return Array.from(planRevenue.values()).sort((a, b) => b.revenue - a.revenue)
  }, [students, plans])

  // Histórico de transações (mock - substituir por dados reais)
  const transactions = useMemo(() => {
    return students.map(student => {
      const plan = plans.find(p => p.id === student.planId)
      return {
        id: student.id,
        studentName: student.name,
        planName: plan?.name || 'Plano não encontrado',
        amount: plan?.price || 0,
        date: student.join_date,
        status: student.status === 'active' ? 'completed' : 'pending'
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [students, plans])

  // Crescimento mensal (calculado)
  const monthlyGrowth = analytics?.monthlyGrowth || 0

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
              onChange={(e) => setPeriodFilter(e.target.value as any)}
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
            <div className={`flex items-center text-sm ${monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthlyGrowth >= 0 ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {Math.abs(monthlyGrowth).toFixed(1)}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">Receita Total</div>
            <div className="text-3xl font-bold text-gray-900">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Baseado em {activeSubscriptions} assinaturas ativas
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
              {activeSubscriptions}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {totalSubscriptions} total de alunos
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
              R$ {activeSubscriptions > 0 ? (totalRevenue / activeSubscriptions).toFixed(2) : '0,00'}
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
              {classes.filter(c => c.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {classes.length} total de agendamentos
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Receita por Plano */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por Plano</h3>
          <div className="space-y-4">
            {revenueByPlan.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p>Nenhuma receita registrada</p>
              </div>
            ) : (
              revenueByPlan.map((item, index) => (
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
                      {totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0'}% do total
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
                <div className="text-gray-900 font-medium">Planos Disponíveis</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{plans.filter(p => p.is_active).length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Histórico de Transações */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Transações</h3>
          <Badge variant="outline" className="text-sm">
            {transactions.length} transação(ões)
          </Badge>
        </div>

        {transactions.length === 0 ? (
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
                {transactions.map((transaction) => (
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
