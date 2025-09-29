'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayoutNew from '@/components/layout/professor-layout-new'
import {
  Clock,
  Calendar,
  CreditCard,
  MapPin,
  CheckCircle,
  Plus,
  User,
  Wallet,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Users,
  Star,
  Activity
} from 'lucide-react'

export default function ProfessorDashboardPageNew() {
  const { user } = useAuthStore()
  
  // Mock data seguindo o MVP especificado
  const dashboardData = {
    horasDisponiveis: 12,
    aulasHoje: 3,
    faturamentoMes: 3200,
    totalAlunos: 28,
    avaliacaoMedia: 4.8,
    proximasAulas: [
      {
        id: 1,
        aluno: 'Maria Silva',
        horario: '14:00',
        unidade: 'Academia Central',
        status: 'confirmada',
        tipo: 'Musculação'
      },
      {
        id: 2,
        aluno: 'João Santos', 
        horario: '15:30',
        unidade: 'Academia Norte',
        status: 'confirmada',
        tipo: 'Funcional'
      },
      {
        id: 3,
        aluno: 'Ana Costa',
        horario: '17:00',
        unidade: 'Academia Sul',
        status: 'pendente',
        tipo: 'Pilates'
      }
    ]
  }

  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const horariosDisponiveis = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

  if (!user) {
    return null
  }

  return (
    <ProfessorLayoutNew>
      <div className="p-6 space-y-6">
        
        {/* Header de Boas-vindas */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Olá, {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Aqui está o resumo do seu dia
          </p>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Horas Disponíveis */}
          <Card className="bg-gradient-to-br from-meu-cyan to-blue-400 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Horas Disponíveis</p>
                  <p className="text-3xl font-bold">{dashboardData.horasDisponiveis}h</p>
                  <p className="text-blue-100 text-xs mt-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Pronto para usar
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aulas Hoje */}
          <Card className="bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-meu-primary/70 text-sm font-medium">Aulas Hoje</p>
                  <p className="text-3xl font-bold">{dashboardData.aulasHoje}</p>
                  <p className="text-meu-primary/70 text-xs mt-1">
                    <Activity className="h-3 w-3 inline mr-1" />
                    Agendadas
                  </p>
                </div>
                <div className="bg-meu-primary/20 p-3 rounded-xl">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Faturamento</p>
                  <p className="text-3xl font-bold">R$ {dashboardData.faturamentoMes.toLocaleString()}</p>
                  <p className="text-green-100 text-xs mt-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Este mês
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Alunos */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Alunos</p>
                  <p className="text-3xl font-bold">{dashboardData.totalAlunos}</p>
                  <p className="text-purple-100 text-xs mt-1">
                    <Star className="h-3 w-3 inline mr-1" />
                    {dashboardData.avaliacaoMedia} média
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Próximas Aulas */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  Próximas Aulas
                </CardTitle>
                <Button 
                  size="sm" 
                  className="bg-meu-accent hover:bg-meu-accent/90 text-meu-primary-dark"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Aula
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.proximasAulas.map((aula) => (
                  <div 
                    key={aula.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-meu-primary rounded-xl flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {aula.aluno}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{aula.horario}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{aula.unidade}</span>
                          </div>
                        </div>
                        <span className="text-xs bg-meu-accent/20 text-meu-primary px-2 py-1 rounded-full">
                          {aula.tipo}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={aula.status === 'confirmada' ? 'default' : 'secondary'}
                        className={aula.status === 'confirmada' ? 'bg-green-500' : 'bg-yellow-500'}
                      >
                        {aula.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                      </Badge>
                      {aula.status === 'confirmada' && (
                        <Button 
                          size="sm" 
                          className="bg-meu-cyan hover:bg-meu-cyan/90 text-meu-primary-dark"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Check-in
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Carteira de Horas */}
          <div>
            <Card className="bg-white dark:bg-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-meu-cyan" />
                  Carteira de Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Saldo Atual */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-meu-cyan mb-2">
                    {dashboardData.horasDisponiveis}h
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Disponíveis</p>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-4">
                    <div 
                      className="bg-gradient-to-r from-meu-cyan to-blue-400 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(dashboardData.horasDisponiveis / 20) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {dashboardData.horasDisponiveis} de 20h compradas
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-meu-accent hover:bg-meu-accent/90 text-meu-primary-dark font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Comprar Mais Horas
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-meu-cyan text-meu-cyan hover:bg-meu-cyan/10"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ver Histórico
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendário Semanal */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Calendário Semanal
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {diasSemana.map((dia, index) => (
                <div key={dia} className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white mb-3">
                    {dia}
                  </div>
                  <div className="space-y-2">
                    {horariosDisponiveis.slice(0, 3).map((horario) => (
                      <button
                        key={horario}
                        className={`w-full text-xs py-2 px-1 rounded-lg transition-all duration-200 ${
                          Math.random() > 0.7 
                            ? 'bg-meu-cyan text-white font-medium shadow-md' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {horario}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                className="border-meu-accent text-meu-primary hover:bg-meu-accent/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Reservar Novo Horário
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProfessorLayoutNew>
  )
}
