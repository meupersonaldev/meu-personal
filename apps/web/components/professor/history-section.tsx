'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  Building2,
  User
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value?: number | null) => currencyFormatter.format(value ?? 0)

interface HistoryData {
  summary: {
    total_classes: number
    total_earnings: number
    academy_earnings: number
    academy_hours: number
    private_earnings: number
    hourly_rate: number
  }
  by_student: Array<{
    student_id: string
    student_name: string
    student_email: string
    total_classes: number
    completed_classes: number
    total_earnings: number
    hourly_rate: number
  }>
  monthly: Array<{
    month: number
    year: number
    month_name: string
    total_classes: number
    academy_earnings: number
    private_earnings: number
    total_earnings: number
  }>
  bookings: Array<{
    id: string
    date: string
    duration: number
    status: string
    credits_cost: number
    student_name: string | null
    student_id: string | null
    academy_name: string | null
    academy_id: string | null
    earnings: number
    type: 'private' | 'academy'
  }>
}

interface HistorySectionProps {
  userId: string
  token: string
}

export function HistorySection({ userId, token }: HistorySectionProps) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const params = new URLSearchParams()
      
      if (selectedMonth) params.append('month', selectedMonth)
      if (selectedYear) params.append('year', selectedYear)
      if (selectedStudent !== 'all') params.append('student_id', selectedStudent)
      if (selectedType !== 'all') params.append('type', selectedType)

      const response = await fetch(
        `${API_URL}/api/teachers/${userId}/history?${params.toString()}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico')
      }

      const historyData = await response.json()
      setData(historyData)
    } catch {
      setError('Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token, selectedMonth, selectedYear, selectedStudent, selectedType])

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ]

  const currentYear = new Date().getFullYear()
  const startYear = 2025 // Ano de início do projeto
  const years = Array.from(
    { length: currentYear - startYear + 1 }, 
    (_, i) => startYear + i
  ).reverse() // Mais recente primeiro

  const uniqueStudents = data?.by_student || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 min-h-[50vh] px-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600 text-center">{error}</p>
        <Button onClick={loadData}>Tentar novamente</Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mês</label>
              <Select value={selectedMonth || 'all'} onValueChange={(value) => setSelectedMonth(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Aluno</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os alunos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {uniqueStudents.map((student) => (
                    <SelectItem key={student.student_id} value={student.student_id}>
                      {student.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="private">Aulas Particulares</SelectItem>
                  <SelectItem value="academy">Academia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMonth('')
                setSelectedYear(new Date().getFullYear().toString())
                setSelectedStudent('all')
                setSelectedType('all')
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totalizadores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Ganhos Totais
                </p>
                <p className="text-lg font-bold text-gray-900 md:text-2xl">
                  {formatCurrency(data.summary.total_earnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Aulas Dadas
                </p>
                <p className="text-lg font-bold text-gray-900 md:text-2xl">
                  {data.summary.total_classes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Academia
                </p>
                <p className="text-lg font-bold text-gray-900 md:text-2xl">
                  {formatCurrency(data.summary.academy_earnings)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.summary.academy_hours}h trabalhadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Particulares
                </p>
                <p className="text-lg font-bold text-gray-900 md:text-2xl">
                  {formatCurrency(data.summary.private_earnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ganhos por Aluno */}
      {data.by_student.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ganhos por Aluno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.by_student.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:border-meu-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white font-bold">
                      {student.student_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {student.student_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {student.completed_classes} aula(s) • {formatCurrency(student.hourly_rate)}/h
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(student.total_earnings)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolução Mensal */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Mensal (Últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.monthly.map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-meu-primary" />
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {month.month_name} {month.year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {month.total_classes} aula(s)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(month.total_earnings)}
                  </p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>Acad: {formatCurrency(month.academy_earnings)}</span>
                    <span>•</span>
                    <span>Part: {formatCurrency(month.private_earnings)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Aulas */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Aulas ({data.bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma aula encontrada</p>
              <p className="text-sm text-gray-400 mt-2">
                Ajuste os filtros para ver mais resultados
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:border-meu-primary/20 transition-all gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      booking.type === 'private' 
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                        : 'bg-gradient-to-br from-purple-500 to-purple-600'
                    } text-white`}>
                      {booking.type === 'private' ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {booking.student_name || booking.academy_name || 'Academia'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1">
                        <span>
                          {new Date(booking.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span>•</span>
                        <span>{booking.duration} min</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {booking.type === 'private' ? 'Particular' : 'Academia'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right md:text-left">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(booking.earnings)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
