'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
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
  Activity,
  Target,
  Award,
  BarChart3,
  Filter,
  Download,
  Eye,
  MessageSquare,
  Phone,
  DollarSign,
  Zap,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react'

export default function ProfessorDashboardPage() {
  const { user } = useAuthStore()
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [formAula, setFormAula] = useState({
    aluno: '',
    data: '',
    hora: '',
    tipo: 'Musculação',
    unidade: 'Academia Centro',
    observacoes: ''
  })
  
  // Dados de teste realistas
  const dashboardData = {
    // KPIs principais
    horasDisponiveis: 2,
    aulasHoje: 1,
    faturamentoMes: 350,
    faturamentoAnterior: 280,
    totalAlunos: 3,
    alunosNovos: 1,
    metaMensal: 1000,
    
    // Performance e estatísticas
    taxaPresenca: 100,
    aulasRealizadas: 5,
    aulasAgendadas: 6,
    horasTrabalhadasSemana: 3,
    metaHorasSemana: 10,
    
    // Dados de tendência (últimos 7 dias)
    faturamentoDiario: [0, 70, 0, 70, 0, 140, 70],
    aulasDiarias: [0, 1, 0, 1, 0, 2, 1],
    
    // Top alunos por frequência
    topAlunos: [
      { nome: 'João Silva', aulas: 3, progresso: 100 },
      { nome: 'Maria Santos', aulas: 2, progresso: 75 },
      { nome: 'Carlos Lima', aulas: 1, progresso: 50 }
    ],
    
    // Próximas aulas expandidas
    proximasAulas: [
      {
        id: 1,
        aluno: 'João Silva',
        horario: '15:00',
        unidade: 'Academia Centro',
        status: 'confirmada',
        tipo: 'Musculação',
        avatar: 'JS',
        telefone: '(11) 99999-1234',
        ultimaAula: '2024-01-20',
        observacoes: 'Primeira aula experimental'
      }
    ],
    
    // Distribuição por tipo de treino
    tiposTreino: [
      { tipo: 'Musculação', quantidade: 3, cor: 'bg-blue-500' },
      { tipo: 'Funcional', quantidade: 2, cor: 'bg-green-500' },
      { tipo: 'Pilates', quantidade: 0, cor: 'bg-purple-500' },
      { tipo: 'Cardio', quantidade: 0, cor: 'bg-orange-500' }
    ]
  }

  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const horariosDisponiveis = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  const destaqueAgenda: Record<string, string[]> = {
    Seg: ['08:00', '10:00'],
    Qua: ['14:00'],
    Sex: ['16:00']
  }

  if (!user) {
    return null
  }

  const crescimentoFaturamento = ((dashboardData.faturamentoMes - dashboardData.faturamentoAnterior) / dashboardData.faturamentoAnterior * 100).toFixed(1)
  const progressoMeta = (dashboardData.faturamentoMes / dashboardData.metaMensal * 100).toFixed(0)
  const progressoHoras = (dashboardData.horasTrabalhadasSemana / dashboardData.metaHorasSemana * 100).toFixed(0)

  return (
    <ProfessorLayout>
      <div className="p-6 space-y-8">
        
        {/* Header Premium */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Olá, {user.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-600 text-lg">
              Aqui está sua performance hoje • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:border-meu-primary hover:text-meu-primary">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:border-meu-primary hover:text-meu-primary">
              <Download className="h-4 w-4 mr-2" />
              Relatório
            </Button>
          </div>
        </div>

        {/* KPIs Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Faturamento com crescimento */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  parseFloat(crescimentoFaturamento) >= 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {parseFloat(crescimentoFaturamento) >= 0 ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {Math.abs(parseFloat(crescimentoFaturamento))}%
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Faturamento</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">R$ {dashboardData.faturamentoMes.toLocaleString()}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-meu-primary to-meu-primary-dark h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parseFloat(progressoMeta))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{progressoMeta}% da meta (R$ {dashboardData.metaMensal.toLocaleString()})</p>
              </div>
            </CardContent>
          </Card>

          {/* Aulas com taxa de presença */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                  <Activity className="h-6 w-6" />
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  {dashboardData.taxaPresenca}% presença
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Aulas realizadas</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.aulasRealizadas}</p>
                <p className="text-sm text-gray-600">
                  <Target className="inline h-3 w-3 mr-1 text-meu-primary" />
                  {dashboardData.aulasAgendadas} agendadas este mês
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alunos com novos */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-cyan to-cyan-400 text-white">
                  <Users className="h-6 w-6" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  +{dashboardData.alunosNovos} novos
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total de alunos</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.totalAlunos}</p>
                <p className="text-sm text-gray-600">
                  <Users className="inline h-3 w-3 mr-1 text-meu-primary" />
                  Ativos este mês
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Horas trabalhadas */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Disponíveis</p>
                  <p className="text-sm font-semibold text-meu-primary">{dashboardData.horasDisponiveis}h</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Horas trabalhadas</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{dashboardData.horasTrabalhadasSemana}h</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parseFloat(progressoHoras))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{progressoHoras}% da meta semanal</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção Principal Premium */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Próximas Aulas Premium */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                    Próximas Aulas
                  </CardTitle>
                  <p className="text-sm text-gray-500">{dashboardData.aulasHoje} aula hoje</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setShowNovaAula(true)}
                  className="bg-meu-primary text-white hover:bg-meu-primary-dark font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Aula
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.proximasAulas.map((aula) => (
                  <div 
                    key={aula.id} 
                    className="group p-5 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-meu-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {aula.avatar}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                            aula.status === 'confirmada' ? 'bg-green-500' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {aula.aluno}
                            </h4>
                            <Badge 
                              className={`${
                                aula.status === 'confirmada'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              } font-medium`}
                            >
                              {aula.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-meu-primary" />
                              <span className="font-medium">{aula.horario}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-meu-primary" />
                              <span>{aula.unidade}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Activity className="h-4 w-4 text-meu-primary" />
                              <span>{aula.tipo}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-meu-primary" />
                              <span>Última: {aula.ultimaAula}</span>
                            </div>
                          </div>
                          {aula.observacoes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-blue-800">
                                <MessageSquare className="h-4 w-4 inline mr-2" />
                                {aula.observacoes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-200 text-gray-600 hover:border-meu-primary hover:text-meu-primary"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        {aula.status === 'confirmada' && (
                          <Button 
                            size="sm" 
                            className="bg-meu-cyan text-white hover:bg-meu-cyan/90 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com múltiplas seções */}
          <div className="space-y-6">
            
            {/* Top Alunos */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-meu-accent" />
                  Top Alunos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.topAlunos.map((aluno, index) => (
                  <div key={aluno.nome} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{aluno.nome}</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-meu-primary to-meu-cyan h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${aluno.progresso}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{aluno.progresso}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-meu-primary">{aluno.aulas}</p>
                      <p className="text-xs text-gray-500">aulas</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Insights e Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico de Performance Semanal */}
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-meu-primary" />
                Performance Semanal
              </CardTitle>
              <p className="text-sm text-gray-500">Faturamento dos últimos 7 dias</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.faturamentoDiario.map((valor, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-gray-600">
                      {diasSemana[index]}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-meu-primary to-meu-cyan h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(valor / Math.max(...dashboardData.faturamentoDiario)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-bold text-gray-900">R$ {valor}</span>
                      <div className="text-xs text-gray-500">{dashboardData.aulasDiarias[index]} aulas</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-meu-primary/10 to-meu-cyan/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Média diária</p>
                    <p className="text-lg font-bold text-meu-primary">
                      R$ {Math.round(dashboardData.faturamentoDiario.reduce((a, b) => a + b, 0) / 7)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">Total da semana</p>
                    <p className="text-lg font-bold text-meu-primary">
                      R$ {dashboardData.faturamentoDiario.reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda Rápida */}
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-meu-accent" />
                  Agenda Rápida
                </CardTitle>
                <p className="text-sm text-gray-500">Horários disponíveis hoje</p>
              </div>
              <Button 
                size="sm"
                className="bg-meu-accent text-meu-primary-dark hover:bg-meu-accent/90 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agendar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {horariosDisponiveis.slice(0, 9).map((horario) => {
                  const isOcupado = Math.random() > 0.6
                  return (
                    <button
                      key={horario}
                      className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isOcupado
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-meu-primary/10 text-meu-primary hover:bg-meu-primary hover:text-white border-2 border-meu-primary/20 hover:border-meu-primary'
                      }`}
                      disabled={isOcupado}
                    >
                      {horario}
                    </button>
                  )
                })}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-800">Horários livres</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    {horariosDisponiveis.filter(() => Math.random() > 0.6).length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium text-red-800">Horários ocupados</span>
                  </div>
                  <span className="text-sm font-bold text-red-700">
                    {horariosDisponiveis.filter(() => Math.random() <= 0.6).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal Nova Aula */}
        {showNovaAula && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nova Aula</h3>
                <button 
                  onClick={() => setShowNovaAula(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  // Simular agendamento
                  alert(`Aula agendada com sucesso!\n\nAluno: ${formAula.aluno}\nData: ${new Date(formAula.data).toLocaleDateString('pt-BR')}\nHorário: ${formAula.hora}\nTipo: ${formAula.tipo}\nUnidade: ${formAula.unidade}`)
                  setShowNovaAula(false)
                  setFormAula({
                    aluno: '',
                    data: '',
                    hora: '',
                    tipo: 'Musculação',
                    unidade: 'Academia Centro',
                    observacoes: ''
                  })
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno</label>
                  <input 
                    type="text" 
                    value={formAula.aluno}
                    onChange={(e) => setFormAula({...formAula, aluno: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent" 
                    placeholder="Digite o nome do aluno" 
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input 
                      type="date" 
                      value={formAula.data}
                      onChange={(e) => setFormAula({...formAula, data: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <select 
                      value={formAula.hora}
                      onChange={(e) => setFormAula({...formAula, hora: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="08:00">08:00</option>
                      <option value="09:00">09:00</option>
                      <option value="10:00">10:00</option>
                      <option value="14:00">14:00</option>
                      <option value="15:00">15:00</option>
                      <option value="16:00">16:00</option>
                      <option value="17:00">17:00</option>
                      <option value="18:00">18:00</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Treino</label>
                    <select 
                      value={formAula.tipo}
                      onChange={(e) => setFormAula({...formAula, tipo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    >
                      <option value="Musculação">Musculação</option>
                      <option value="Funcional">Funcional</option>
                      <option value="CrossFit">CrossFit</option>
                      <option value="Pilates">Pilates</option>
                      <option value="Cardio">Cardio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                    <select 
                      value={formAula.unidade}
                      onChange={(e) => setFormAula({...formAula, unidade: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    >
                      <option value="Academia Centro">Academia Centro</option>
                      <option value="Academia Norte">Academia Norte</option>
                      <option value="Academia Sul">Academia Sul</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea 
                    value={formAula.observacoes}
                    onChange={(e) => setFormAula({...formAula, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent" 
                    placeholder="Observações sobre a aula (opcional)..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowNovaAula(false)}
                    className="px-4 py-2"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="px-4 py-2 bg-meu-primary text-white hover:bg-meu-primary-dark"
                  >
                    Agendar Aula
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProfessorLayout>
  )
}
