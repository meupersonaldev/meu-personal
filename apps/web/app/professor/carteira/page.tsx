'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import { useTeacherApproval } from '@/hooks/use-teacher-approval'
import { ApprovalBanner } from '@/components/teacher/approval-banner'
import { ApprovalBlock } from '@/components/teacher/approval-block'
import { 
  CreditCard,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react'

interface Stats {
  total_revenue: number
  monthly_earnings: {
    current_month: number
  }
  completed_bookings: number
  hourly_rate: number
  hours_earned: number
}

interface Transaction {
  id: string
  type: 'PURCHASE' | 'CONSUME' | 'REFUND' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REVOKE' | 'CREDIT_USED' | 'CREDIT_EARNED'
  hours: number
  amount: number
  created_at: string
  description?: string
  studentName?: string
}

export default function ProfessorCarteira() {
  const { user, token } = useAuthStore()
  const { isNotApproved, approvalStatus } = useTeacherApproval()
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0)
  const [averagePerLesson, setAveragePerLesson] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id || !token) return

      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

        // Buscar stats
        const statsResponse = await fetch(`${API_URL}/api/teachers/${user.id}/stats`, {
          headers,
          credentials: 'include'
        })
        
        let hourlyRate = 0
        if (statsResponse.ok) {
          const data = await statsResponse.json()
          setStats(data)
          hourlyRate = data.hourly_rate || 0
        }

        // Buscar aulas concluídas para calcular média e criar transações de crédito
        const timestamp = Date.now()
        const bookingsResponse = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}&_t=${timestamp}`, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        })
        
        let creditTransactions: Transaction[] = []
        
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          const completed = (bookingsData.bookings || [])
            .filter((b: any) => b.status === 'COMPLETED' || b.status === 'DONE')
          
          setCompletedLessonsCount(completed.length)
          
          if (completed.length > 0) {
            const totalValue = completed.reduce((sum: number, b: any) => sum + (b.hourlyRate || 0), 0)
            setAveragePerLesson(totalValue / completed.length)
          }
          
          // Criar transações de crédito a partir das aulas concluídas
          // Todas as aulas concluídas são GANHOS para o professor
          creditTransactions = completed.map((b: any) => ({
            id: `credit-${b.id}`,
            type: 'CREDIT_EARNED',
            hours: 0,
            amount: b.hourlyRate || 0,
            created_at: b.date,
            description: b.source === 'PROFESSOR' 
              ? `Aula Particular - ${b.studentName}` 
              : `Aula Academia - ${b.studentName}`,
            studentName: b.studentName
          }))
        }

        // Buscar transações de horas do professor
        const transactionsResponse = await fetch(`${API_URL}/api/teachers/${user.id}/transactions`, {
          headers,
          credentials: 'include'
        })
        
        if (transactionsResponse.ok) {
          const txData = await transactionsResponse.json()
          const hourTransactions = (txData.transactions || [])
            .map((tx: any) => {
              // Para PURCHASE, o valor deve ser negativo (gasto)
              // Verificar se tem o valor no meta_json
              const purchaseAmount = tx.meta_json?.amount || tx.meta_json?.price
              const amount = tx.type === 'PURCHASE' 
                ? -(purchaseAmount || ((tx.hours || 0) * hourlyRate))
                : ((tx.hours || 0) * hourlyRate)
              
              return {
                id: tx.id,
                type: tx.type,
                hours: tx.hours || 0,
                amount,
                created_at: tx.created_at,
                description: tx.meta_json?.description || ''
              }
            })
          
          // Combinar transações de horas e créditos, ordenar por data
          const allTransactions = [...hourTransactions, ...creditTransactions]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          
          setTransactions(allTransactions)
        } else {
          // Se falhar ao buscar hour_transactions, usar apenas creditTransactions
          setTransactions(creditTransactions.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ))
        }
      } catch (err) {
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user?.id, token])

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
        <ApprovalBanner approvalStatus={approvalStatus} userName={user?.name} />
        
        {isNotApproved ? (
          <ApprovalBlock 
            title={approvalStatus === 'rejected' ? 'Acesso Negado' : 'Carteira Bloqueada'}
            message={approvalStatus === 'rejected'
              ? 'Seu cadastro foi reprovado. Entre em contato com a administração para mais informações.'
              : 'Você poderá visualizar seu saldo e transações após a aprovação do seu cadastro pela administração.'}
            fullPage
            approvalStatus={approvalStatus}
          />
        ) : (
          <>
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

          {/* Horas Ganhas */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Horas Ganhas</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.hours_earned || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Agendamentos com você</p>
            </div>
          </div>
        </div>

        {/* Resumo de Aulas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
            Resumo de Aulas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Aulas Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">{completedLessonsCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Média por Aula</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(averagePerLesson)}
              </p>
            </div>
          </div>
        </div>

        {/* Histórico de Ganhos/Perdas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-meu-primary" />
            Histórico de Ganhos/Perdas
          </h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma transação registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Transação
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => {
                    const txDate = new Date(tx.created_at)
                    const isGain = tx.type === 'BONUS_UNLOCK' || tx.type === 'REFUND' || tx.type === 'CREDIT_EARNED' || tx.amount > 0
                    const isLoss = tx.type === 'CONSUME' || tx.type === 'REVOKE' || tx.type === 'CREDIT_USED' || tx.type === 'PURCHASE' || tx.amount < 0
                    
                    const typeLabels: Record<string, string> = {
                      PURCHASE: 'Compra de Crédito',
                      CONSUME: 'Aula Realizada',
                      REFUND: 'Reembolso',
                      BONUS_LOCK: 'Bônus Bloqueado',
                      BONUS_UNLOCK: 'Bônus Liberado',
                      REVOKE: 'Revogação',
                      CREDIT_USED: tx.studentName ? `Crédito Usado - ${tx.studentName}` : 'Crédito Usado',
                      CREDIT_EARNED: tx.description || (tx.studentName ? `Aula - ${tx.studentName}` : 'Aula Concluída')
                    }
                    
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isGain && <ArrowUpCircle className="h-4 w-4 text-green-600" />}
                            {isLoss && <ArrowDownCircle className="h-4 w-4 text-red-600" />}
                            {!isGain && !isLoss && <Clock className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm font-medium text-gray-900">
                              {typeLabels[tx.type] || tx.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold ${
                            isGain ? 'text-green-600' : isLoss ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {isGain && '+'}{isLoss && '-'}{formatCurrency(Math.abs(tx.amount))}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {txDate.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Os valores são calculados automaticamente com base nas aulas concluídas. 
            Continue realizando aulas para aumentar seus ganhos!
          </p>
        </div>
          </>
        )}
      </div>
    </ProfessorLayout>
  )
}
