'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import { useTeacherApproval } from '@/hooks/use-teacher-approval'
import { ApprovalBanner } from '@/components/teacher/approval-banner'
import { ApprovalBlock } from '@/components/teacher/approval-block'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  PieChart,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  type: 'PURCHASE' | 'CONSUME' | 'REFUND' | 'BONUS_LOCK' | 'BONUS_UNLOCK' | 'REVOKE' | 'CREDIT_USED' | 'CREDIT_EARNED' | 'PRIVATE_CLASS'
  hours: number
  amount: number
  created_at: string
  description?: string
  studentName?: string
  status?: 'COMPLETED' | 'PENDING' | 'CANCELED'
  meta_json?: any
}

interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  projectedRevenue: number
  totalHoursGiven: number
  totalHoursBought: number
  averageTicket: number
}

export default function ProfessorCarteira() {
  const { user, token } = useAuthStore()
  const { isNotApproved, approvalStatus } = useTeacherApproval()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    projectedRevenue: 0,
    totalHoursGiven: 0,
    totalHoursBought: 0,
    averageTicket: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'income' | 'expense'>('all')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

        // 1. Buscar Stats basicos
        const statsResponse = await fetch(`${API_URL}/api/teachers/${user.id}/stats`, { headers })
        const statsData = await statsResponse.json()
        const hourlyRate = statsData.hourly_rate || 0

        // 2. Buscar Transações de Horas (Compras e Consumo Academia)
        const txResponse = await fetch(`${API_URL}/api/teachers/${user.id}/transactions`, { headers })
        const txData = await txResponse.json()

        // 3. Buscar Agendamentos (Aulas Particulares e Projeções)
        const bookingsResponse = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}`, { headers })
        const bookingsData = await bookingsResponse.json()
        const allBookings = bookingsData.bookings || []

        // --- Processamento dos Dados ---

        let totalRevenue = 0
        let totalExpenses = 0
        let totalHoursGiven = 0
        let totalHoursBought = 0
        let projectedRevenue = 0
        let completedClassesCount = 0

        const processedTransactions: Transaction[] = []

          // Processar Transações de Horas
          ; (txData.transactions || []).forEach((tx: any) => {
            const purchaseAmount = tx.meta_json?.amount || tx.meta_json?.price

            if (tx.type === 'PURCHASE') {
              // Despesa
              const amount = purchaseAmount || ((tx.hours || 0) * hourlyRate) // Fallback
              totalExpenses += Number(amount)
              totalHoursBought += Number(tx.hours || 0)

              processedTransactions.push({
                id: tx.id,
                type: 'PURCHASE',
                hours: tx.hours,
                amount: -Number(amount), // Negativo para extrato
                created_at: tx.created_at,
                description: 'Compra de Pacote de Horas',
                status: 'COMPLETED'
              })
            } else if (tx.type === 'CONSUME') {
              // Receita da Academia (Aula dada pelo sistema)
              const amount = (tx.hours || 0) * hourlyRate
              totalRevenue += Number(amount)
              totalHoursGiven += Number(tx.hours || 0)
              completedClassesCount++

              processedTransactions.push({
                id: tx.id,
                type: 'CONSUME',
                hours: tx.hours,
                amount: Number(amount),
                created_at: tx.created_at,
                description: 'Aula via Academia (Banco de Horas)',
                status: 'COMPLETED'
              })
            } else if (tx.type === 'BONUS_LOCK') {
              // Hora pendente de aula agendada por aluno
              processedTransactions.push({
                id: tx.id,
                type: 'BONUS_LOCK',
                hours: tx.hours,
                amount: 0, // Ainda não é receita
                created_at: tx.created_at,
                description: tx.booking?.student_name
                  ? `Aula agendada - ${tx.booking.student_name}`
                  : 'Aula agendada por aluno (pendente)',
                studentName: tx.booking?.student_name,
                status: 'PENDING'
              })
            } else if (tx.type === 'BONUS_UNLOCK') {
              // Hora liberada após aula concluída
              const amount = (tx.hours || 0) * hourlyRate
              totalRevenue += Number(amount)
              totalHoursGiven += Number(tx.hours || 0)

              processedTransactions.push({
                id: tx.id,
                type: 'BONUS_UNLOCK',
                hours: tx.hours,
                amount: Number(amount),
                created_at: tx.created_at,
                description: tx.meta_json?.reason === 'late_cancellation_compensation'
                  ? 'Compensação (aluno cancelou após prazo)'
                  : tx.booking?.student_name
                    ? `Aula concluída - ${tx.booking.student_name}`
                    : 'Hora liberada (aula concluída)',
                studentName: tx.booking?.student_name,
                status: 'COMPLETED'
              })
            } else if (tx.type === 'REVOKE') {
              // Hora revogada (aluno cancelou antes do prazo)
              processedTransactions.push({
                id: tx.id,
                type: 'REVOKE',
                hours: tx.hours,
                amount: 0,
                created_at: tx.created_at,
                description: tx.booking?.student_name
                  ? `Cancelado - ${tx.booking.student_name}`
                  : 'Aula cancelada pelo aluno',
                studentName: tx.booking?.student_name,
                status: 'CANCELED'
              })
            } else if (tx.type === 'REFUND') {
              // Hora devolvida (reembolso de aula cancelada)
              totalHoursBought += Number(tx.hours || 0) // Horas voltam pro saldo
              processedTransactions.push({
                id: tx.id,
                type: 'REFUND',
                hours: tx.hours,
                amount: 0, // Não é receita/despesa monetária
                created_at: tx.created_at,
                description: tx.meta_json?.reason === 'booking_cancelled_refund_professor'
                  ? 'Reembolso - Aula cancelada'
                  : 'Horas devolvidas (reembolso)',
                status: 'COMPLETED'
              })
            }
          })

        // Processar Agendamentos (Aulas Particulares & Projeções)
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)

        allBookings.forEach((b: any) => {
          const isCompleted = b.status === 'COMPLETED' || b.status === 'DONE'
          const isPrivate = !!b.student_id // Tem aluno vinculado
          const bookingDate = new Date(b.date)

          // Se for aula particular completa, é receita extra (não vem do banco de horas da academia)
          if (isCompleted && isPrivate) {
            const amount = b.hourlyRate || 0
            const finalAmount = amount > 0 ? amount : hourlyRate

            // Evitar duplicar se o sistema ja criou transaction de CONSUME para essa aula
            // Geralmente para student_id != null é aula particular, então add.
            processedTransactions.push({
              id: `booking-${b.id}`,
              type: 'PRIVATE_CLASS',
              hours: b.duration / 60,
              amount: finalAmount,
              created_at: b.date,
              description: `Aula Particular - ${b.studentName || 'Aluno'}`,
              studentName: b.studentName,
              status: 'COMPLETED'
            })
            totalRevenue += finalAmount
            completedClassesCount++
            totalHoursGiven += (b.duration / 60)
          }

          // Projeção (Aulas futuras confirmadas)
          if ((b.status === 'PENDING' || b.status === 'RESERVED' || b.status === 'CONFIRMED') && bookingDate > now) {
            const estimatedValue = b.hourlyRate || hourlyRate
            if (bookingDate <= nextMonthEnd) {
              projectedRevenue += estimatedValue
            }
          }
        })

        // Ordenar
        processedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setTransactions(processedTransactions)
        setSummary({
          totalRevenue,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses,
          projectedRevenue,
          totalHoursGiven,
          totalHoursBought,
          averageTicket: completedClassesCount > 0 ? totalRevenue / completedClassesCount : 0
        })

      } catch (err) {
        console.error(err)
        setError('Falha ao carregar dados financeiros')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatHours = (val: number) => `${val.toFixed(1)}h`

  const handleExport = () => {
    if (transactions.length === 0) {
      alert('Nenhuma transação para exportar')
      return
    }

    const headers = ['Data', 'Descrição', 'Tipo', 'Horas', 'Valor (R$)', 'Status']
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString('pt-BR'),
      tx.description || '',
      tx.type,
      tx.hours.toFixed(1),
      formatCurrency(tx.amount),
      tx.status || 'COMPLETED'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `carteira-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredTransactions = transactions.filter(tx => {
    // Filter by tab (income/expense)
    if (filterTab === 'income' && tx.amount <= 0) return false
    if (filterTab === 'expense' && tx.amount >= 0) return false

    // Filter by date range
    if (dateFilter.start) {
      const txDate = new Date(tx.created_at)
      const startDate = new Date(dateFilter.start)
      if (txDate < startDate) return false
    }
    if (dateFilter.end) {
      const txDate = new Date(tx.created_at)
      const endDate = new Date(dateFilter.end)
      endDate.setHours(23, 59, 59, 999)
      if (txDate > endDate) return false
    }

    // Filter by type
    if (typeFilter.length > 0 && !typeFilter.includes(tx.type)) return false

    return true
  })

  // Chart Data Preparation (Simple Last 6 Months)
  const chartData = useMemo(() => {
    const months: Record<string, { revenue: number, expenses: number }> = {}
    const now = new Date()

    // Init last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
      months[key] = { revenue: 0, expenses: 0 }
    }

    transactions.forEach(tx => {
      const d = new Date(tx.created_at)
      const key = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
      if (months[key]) {
        if (tx.amount > 0) months[key].revenue += tx.amount
        else months[key].expenses += Math.abs(tx.amount)
      }
    })

    return Object.entries(months).map(([name, data]) => ({ name, ...data }))
  }, [transactions])

  if (loading) return <ProfessorLayout><div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div></ProfessorLayout>

  if (isNotApproved) return <ProfessorLayout><div className="p-6"><ApprovalBanner approvalStatus={approvalStatus} userName={user?.name} /><ApprovalBlock approvalStatus={approvalStatus} title="Financeiro Bloqueado" message="Aguarde aprovação." fullPage /></div></ProfessorLayout>

  // Derived state for display
  const hoursBalance = summary.totalHoursBought - summary.totalHoursGiven

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
            <p className="text-sm text-gray-500">Acompanhe seus saldos e faturamentos</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 flex-1 md:flex-none"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 md:flex-none"
              onClick={() => setShowFilterModal(!showFilterModal)}
            >
              <Filter className="h-4 w-4" /> Filtrar
            </Button>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="bg-white border-b px-6 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Filtrar Transações</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Transação</label>
                  <select
                    multiple
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="PURCHASE">Compra de Horas</option>
                    <option value="CONSUME">Aula Academia</option>
                    <option value="BONUS_LOCK">Aula Agendada</option>
                    <option value="BONUS_UNLOCK">Aula Concluída</option>
                    <option value="REVOKE">Cancelado</option>
                    <option value="REFUND">Reembolso</option>
                    <option value="PRIVATE_CLASS">Aula Particular</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDateFilter({ start: '', end: '' })
                    setTypeFilter([])
                  }}
                >
                  Limpar Filtros
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowFilterModal(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-6 space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">Saldo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(summary.netIncome)}</div>
                <p className="text-blue-200 text-sm mt-1 flex items-center gap-1">
                  {summary.netIncome >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {summary.netIncome >= 0 ? 'Lucro acumulado' : 'Déficit acumulado'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100 uppercase tracking-wider">Saldo de Horas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatHours(hoursBalance)}</div>
                <p className="text-indigo-200 text-sm mt-1 flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Disponíveis para uso
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Faturamento Total</CardTitle>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</div>
                <p className="text-xs text-gray-400 mt-1">Total de receitas geradas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Faturamento em Horas</CardTitle>
                <div className="p-2 bg-blue-100 rounded-full">
                  <History className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatHours(summary.totalHoursGiven)}</div>
                <p className="text-xs text-gray-400 mt-1">Total de aulas ministradas</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts & Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2">
              <Card className="h-full border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Fluxo de Caixa (Últimos 6 meses)</CardTitle>
                  <CardDescription>Comparativo de Receitas vs Despesas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4 flex items-end justify-between gap-2 px-2">
                    {chartData.map((item, idx) => {
                      const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.expenses))) || 1
                      const revHeight = (item.revenue / maxVal) * 100
                      const expHeight = (item.expenses / maxVal) * 100

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                          <div className="w-full flex items-end justify-center gap-1 h-[250px] relative">
                            {/* Tooltip mockup */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs p-2 rounded pointer-events-none z-10 w-max">
                              <p className="font-bold">{item.name}</p>
                              <p className="text-green-300">Entrada: {formatCurrency(item.revenue)}</p>
                              <p className="text-red-300">Saída: {formatCurrency(item.expenses)}</p>
                            </div>

                            <div style={{ height: `${Math.max(revHeight, 1)}%` }} className="w-full bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-all relative group-hover:bg-blue-600"></div>
                            <div style={{ height: `${Math.max(expHeight, 1)}%` }} className="w-full bg-red-400 rounded-t-sm opacity-80 hover:opacity-100 transition-all relative group-hover:bg-red-500"></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{item.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPIs Side Cards */}
            <div className="space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Métricas de Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Horas Ministradas</p>
                        <p className="text-xs text-gray-500">Total de aulas dadas</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">{summary.totalHoursGiven.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    {/* Progress bar mock: Hours given vs bought */}
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${Math.min((summary.totalHoursGiven / (summary.totalHoursBought || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-gray-500">
                    {summary.totalHoursBought > 0 ? `${((summary.totalHoursGiven / summary.totalHoursBought) * 100).toFixed(0)}% das horas compradas utilizadas` : 'Sem horas compradas'}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Ticket Médio</p>
                        <p className="text-xs text-gray-500">Por aula realizada</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(summary.averageTicket)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-0 text-white shadow-xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">Maximize seus ganhos</h3>
                  <p className="text-gray-400 text-sm mb-4">Compre pacotes maiores de horas para reduzir seu custo operacional e aumentar sua margem de lucro.</p>
                  <Button onClick={() => window.location.href = '/professor/comprar-horas'} className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold">
                    Comprar Horas
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transactions List */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
              <div>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>Todas as entradas e saídas da sua carteira</CardDescription>
              </div>
              <Tabs defaultValue="all" className="w-full md:w-[400px]" onValueChange={(val) => setFilterTab(val as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
                  <TabsTrigger value="income" className="flex-1">Entradas</TabsTrigger>
                  <TabsTrigger value="expense" className="flex-1">Saídas</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Nenhuma transação registrada</h3>
                  <p className="text-gray-500">Seu histórico financeiro aparecerá aqui.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Transação</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Horas</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.map((tx) => {
                          const isIncome = tx.amount > 0 // Money In
                          const isPurchase = tx.type === 'PURCHASE'
                          const isPending = tx.type === 'BONUS_LOCK'
                          const isCanceled = tx.type === 'REVOKE'
                          const isRefund = tx.type === 'REFUND'

                          // Logic for visual signs:
                          // Money: Income = Green (+), Expense = Red (-) or Black
                          // Hours: Purchase = Green (+), Consumed/Class = Red (-), Refund = Blue (+)
                          // Pending: Amber (waiting)

                          const hoursSign = isPurchase || tx.type === 'BONUS_LOCK' || tx.type === 'BONUS_UNLOCK' || isRefund ? '+' : '-'
                          const hoursColor = isPending ? 'text-amber-500' : isCanceled ? 'text-gray-400 line-through' : isRefund ? 'text-blue-600' : isPurchase || tx.type === 'BONUS_UNLOCK' ? 'text-green-600' : 'text-red-500'

                          const moneySign = isIncome ? '+' : ''
                          const moneyColor = isPending ? 'text-amber-500' : isIncome ? 'text-green-600' : 'text-gray-900'

                          return (
                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-lg",
                                    isPending ? "bg-amber-100 text-amber-600" :
                                      isCanceled ? "bg-gray-100 text-gray-400" :
                                        isRefund ? "bg-blue-100 text-blue-600" :
                                          isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                  )}>
                                    {isPending ? <Clock className="h-5 w-5" /> :
                                      isCanceled ? <ArrowDownRight className="h-5 w-5" /> :
                                        isRefund ? <ArrowUpRight className="h-5 w-5" /> :
                                          isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{tx.description}</p>
                                    <p className="text-xs text-gray-500">
                                      {tx.type === 'PRIVATE_CLASS' ? 'Aula Particular' :
                                        tx.type === 'PURCHASE' ? 'Recarga' :
                                          tx.type === 'BONUS_LOCK' ? 'Pendente' :
                                            tx.type === 'BONUS_UNLOCK' ? 'Aula Plataforma' :
                                              tx.type === 'REVOKE' ? 'Cancelado' :
                                                tx.type === 'REFUND' ? 'Reembolso' :
                                                  'Aula Academia'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-600">
                                  {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                                  <br />
                                  <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {tx.hours > 0 ? (
                                  <span className={cn("font-medium", hoursColor)}>
                                    {hoursSign}{tx.hours.toFixed(1)}h
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn("font-bold", moneyColor)}>
                                  {moneySign}{formatCurrency(tx.amount)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProfessorLayout>
  )
}
