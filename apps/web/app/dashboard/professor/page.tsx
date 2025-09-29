'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProfessorData, type Aula, type Aluno } from '@/hooks/use-professor-data'
import ProfessorLayout from '@/components/layout/professor-layout'
import { 
  Calendar, Users, DollarSign, Clock, TrendingUp, 
  QrCode, Star, ChevronRight,
  Activity, CreditCard, MapPin, User, Award,
  ChevronLeft, ChevronRight as ChevronRightIcon, Plus,
  Edit, Trash2, Copy, X, Phone, Mail
} from 'lucide-react'

const mockAlunos = [
  { id: 1, nome: 'João Silva', pacoteValor: 500, ultimaAula: '15/09', frequencia: 95 },
  { id: 2, nome: 'Maria Santos', pacoteValor: 300, ultimaAula: '16/09', frequencia: 88 },
  { id: 3, nome: 'Ana Costa', pacoteValor: 400, ultimaAula: '17/09', frequencia: 100 },
  { id: 4, nome: 'Pedro Oliveira', pacoteValor: 750, ultimaAula: '14/09', frequencia: 92 },
]

const mockExtrato = [
  { id: 1, data: '17/09', tipo: 'entrada', descricao: 'Aula - João Silva', valor: 100 },
  { id: 2, data: '17/09', tipo: 'entrada', descricao: 'Aula - Maria Santos', valor: 100 },
  { id: 3, data: '16/09', tipo: 'saida', descricao: 'Uso espaço - Centro', valor: -50 },
  { id: 4, data: '15/09', tipo: 'entrada', descricao: 'Aula em grupo (5 alunos)', valor: 500 },
]

// Dados completos da agenda para o calendário
const mockAgendaCompleta = [
  { id: 1, data: '2025-09-17', hora: '08:00', aluno: 'João Silva', tipo: 'Musculação', status: 'confirmado', unidade: 'Centro', valor: 100, recorrente: true },
  { id: 2, data: '2025-09-17', hora: '09:00', aluno: 'Maria Santos', tipo: 'Funcional', status: 'confirmado', unidade: 'Centro', valor: 100, recorrente: false },
  { id: 3, data: '2025-09-17', hora: '10:00', aluno: 'Pedro Oliveira', tipo: 'CrossFit', status: 'pendente', unidade: 'Sul', valor: 120, recorrente: false },
  { id: 4, data: '2025-09-18', hora: '08:00', aluno: 'Ana Costa', tipo: 'Pilates', status: 'confirmado', unidade: 'Centro', valor: 90, recorrente: true },
  { id: 5, data: '2025-09-18', hora: '14:00', aluno: 'Carlos Mendes', tipo: 'Musculação', status: 'confirmado', unidade: 'Norte', valor: 100, recorrente: false },
  { id: 6, data: '2025-09-19', hora: '07:00', aluno: 'Lucia Ferreira', tipo: 'Funcional', status: 'confirmado', unidade: 'Centro', valor: 100, recorrente: true },
  { id: 7, data: '2025-09-19', hora: '16:00', aluno: 'Roberto Lima', tipo: 'CrossFit', status: 'pendente', unidade: 'Sul', valor: 120, recorrente: false },
  { id: 8, data: '2025-09-20', hora: '09:00', aluno: 'Fernanda Costa', tipo: 'Pilates', status: 'confirmado', unidade: 'Norte', valor: 90, recorrente: true },
  { id: 9, data: '2025-09-21', hora: '08:00', aluno: 'João Silva', tipo: 'Musculação', status: 'confirmado', unidade: 'Centro', valor: 100, recorrente: true },
  { id: 10, data: '2025-09-22', hora: '10:00', aluno: 'Grupo Funcional', tipo: 'Funcional', status: 'confirmado', unidade: 'Centro', valor: 300, recorrente: false },
]

const unidades = ['Todas', 'Centro', 'Sul', 'Norte']
const tiposAula = ['Todos', 'Musculação', 'Funcional', 'CrossFit', 'Pilates']

export default function DashboardProfessorPage() {
  const { user } = useAuthStore()
  const { 
    data, 
    loading, 
    addAula, 
    updateAula, 
    deleteAula, 
    addAluno, 
    updateAluno, 
    deleteAluno,
    getAulasHoje 
  } = useProfessorData()
  
  // Estados da UI
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showQRCode, setShowQRCode] = useState(false)
  
  // Estados para o calendário
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  
  // Estados dos modais
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [showNovoAluno, setShowNovoAluno] = useState(false)
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  
  // Estados dos formulários
  const [formAula, setFormAula] = useState({
    data: '',
    hora: '',
    aluno: '',
    tipo: 'Musculação',
    unidade: 'Centro',
    valor: 100,
    recorrente: false,
    observacoes: ''
  })
  
  const [formAluno, setFormAluno] = useState({
    nome: '',
    telefone: '',
    email: '',
    pacoteValor: 500,
    ativo: true
  })

  if (loading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </ProfessorLayout>
    )
  }

  const aulasHoje = getAulasHoje()
  
  // Handlers dos formulários
  const handleSubmitAula = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (aulaEditando) {
      updateAula(aulaEditando.id, {
        ...formAula,
        status: 'confirmado'
      })
      setAulaEditando(null)
    } else {
      addAula({
        ...formAula,
        status: 'confirmado'
      })
    }
    
    setShowNovaAula(false)
    setFormAula({
      data: '',
      hora: '',
      aluno: '',
      tipo: 'Musculação',
      unidade: 'Centro',
      valor: 100,
      recorrente: false,
      observacoes: ''
    })
  }
  
  const handleSubmitAluno = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (alunoEditando) {
      updateAluno(alunoEditando.id, formAluno)
      setAlunoEditando(null)
    } else {
      addAluno({
        ...formAluno,
        ultimaAula: new Date().toISOString().split('T')[0],
        frequencia: 100
      })
    }
    
    setShowNovoAluno(false)
    setFormAluno({
      nome: '',
      telefone: '',
      email: '',
      pacoteValor: 500,
      ativo: true
    })
  }
  
  const handleEditAula = (aula: Aula) => {
    setAulaEditando(aula)
    setFormAula({
      data: aula.data,
      hora: aula.hora,
      aluno: aula.aluno,
      tipo: aula.tipo,
      unidade: aula.unidade,
      valor: aula.valor,
      recorrente: aula.recorrente,
      observacoes: aula.observacoes || ''
    })
    setShowNovaAula(true)
  }
  
  const handleEditAluno = (aluno: Aluno) => {
    setAlunoEditando(aluno)
    setFormAluno({
      nome: aluno.nome,
      telefone: aluno.telefone,
      email: aluno.email,
      pacoteValor: aluno.pacoteValor,
      ativo: aluno.ativo
    })
    setShowNovoAluno(true)
  }

  return (
    <ProfessorLayout onShowQRCode={() => setShowQRCode(true)}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Aulas este mês</p>
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.aulasMes}</p>
                <p className="text-xs text-green-600 mt-2">+12% vs mês anterior</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Faturamento Est.</p>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {data.stats.faturamentoEstimado}</p>
                <p className="text-xs text-green-600 mt-2">+8% vs mês anterior</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Alunos</p>
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalAlunos}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{data.stats.aulasHoje} aulas hoje</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Horas Disponíveis</p>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.horasDisponiveis}h</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Prontas para usar</p>
              </div>
            </div>


            {/* Agenda do Dia */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agenda de Hoje</h3>
                <button 
                  onClick={() => setShowNovaAula(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-meu-accent text-meu-primary font-medium rounded-lg hover:bg-meu-accent/90 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Aula</span>
                </button>
              </div>
              <div className="space-y-3">
                {aulasHoje.length > 0 ? aulasHoje.map((aula) => (
                  <div key={aula.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 text-center">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{aula.hora}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{aula.aluno}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{aula.tipo}</span>
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span>{aula.unidade}</span>
                          <span>•</span>
                          <span>R$ {aula.valor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        aula.status === 'confirmado' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {aula.status}
                      </span>
                      <button 
                        onClick={() => handleEditAula(aula)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => deleteAula(aula.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma aula agendada para hoje</p>
                    <button 
                      onClick={() => setShowNovaAula(true)}
                      className="mt-2 text-meu-primary hover:text-meu-primary-dark font-medium"
                    >
                      Agendar primeira aula
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-6">
            {/* Header da Agenda */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agenda Completa</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Gerencie suas aulas e horários</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Filtros */}
                  <select 
                    value={filtroUnidade} 
                    onChange={(e) => setFiltroUnidade(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {unidades.map(unidade => (
                      <option key={unidade} value={unidade}>{unidade}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={filtroTipo} 
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {tiposAula.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>

                  {/* Botões de Visualização */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {(['month', 'week', 'day'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          viewMode === mode 
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setShowNovaAula(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-meu-accent text-meu-primary font-medium rounded-lg hover:bg-meu-accent/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nova Aula</span>
                  </button>
                </div>
              </div>

              {/* Navegação do Calendário */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => {
                      const newDate = new Date(currentDate)
                      newDate.setMonth(currentDate.getMonth() - 1)
                      setCurrentDate(newDate)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    }).replace(/^\w/, c => c.toUpperCase())}
                  </h3>
                  
                  <button 
                    onClick={() => {
                      const newDate = new Date(currentDate)
                      newDate.setMonth(currentDate.getMonth() + 1)
                      setCurrentDate(newDate)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hoje
                </button>
              </div>

              {/* Calendário Mensal */}
              {viewMode === 'month' && (
                <div className="grid grid-cols-7 gap-1">
                  {/* Cabeçalho dos dias da semana */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                    <div key={dia} className="p-3 text-center text-sm font-medium text-gray-500 border-b">
                      {dia}
                    </div>
                  ))}
                  
                  {/* Dias do mês */}
                  {Array.from({ length: 35 }, (_, i) => {
                    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const startOfCalendar = new Date(startOfMonth)
                    startOfCalendar.setDate(startOfCalendar.getDate() - startOfMonth.getDay())
                    
                    const currentDay = new Date(startOfCalendar)
                    currentDay.setDate(startOfCalendar.getDate() + i)
                    
                    const dayString = currentDay.toISOString().split('T')[0]
                    const isCurrentMonth = currentDay.getMonth() === currentDate.getMonth()
                    const isToday = dayString === new Date().toISOString().split('T')[0]
                    
                    // Filtrar aulas do dia
                    const aulasFiltered = mockAgendaCompleta.filter(aula => {
                      const matchData = aula.data === dayString
                      const matchUnidade = filtroUnidade === 'Todas' || aula.unidade === filtroUnidade
                      const matchTipo = filtroTipo === 'Todos' || aula.tipo === filtroTipo
                      return matchData && matchUnidade && matchTipo
                    })
                    
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[100px] p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''
                        } ${isToday ? 'bg-meu-accent/10 border-meu-accent' : ''}`}
                        onClick={() => setSelectedDate(dayString)}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-meu-primary' : ''}`}>
                          {currentDay.getDate()}
                        </div>
                        
                        {/* Aulas do dia */}
                        <div className="space-y-1">
                          {aulasFiltered.slice(0, 3).map((aula) => (
                            <div 
                              key={aula.id} 
                              className={`text-xs p-1 rounded truncate ${
                                aula.status === 'confirmado' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                              title={`${aula.hora} - ${aula.aluno} (${aula.tipo})`}
                            >
                              {aula.hora} {aula.aluno}
                            </div>
                          ))}
                          {aulasFiltered.length > 3 && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{aulasFiltered.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lista de Aulas (Visualização Semanal/Diária) */}
              {(viewMode === 'week' || viewMode === 'day') && (
                <div className="space-y-4">
                  {mockAgendaCompleta
                    .filter(aula => {
                      const aulaDate = new Date(aula.data)
                      const matchUnidade = filtroUnidade === 'Todas' || aula.unidade === filtroUnidade
                      const matchTipo = filtroTipo === 'Todos' || aula.tipo === filtroTipo
                      
                      if (viewMode === 'day') {
                        return aulaDate.toDateString() === currentDate.toDateString() && matchUnidade && matchTipo
                      } else {
                        // Semana atual
                        const startOfWeek = new Date(currentDate)
                        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
                        const endOfWeek = new Date(startOfWeek)
                        endOfWeek.setDate(startOfWeek.getDate() + 6)
                        
                        return aulaDate >= startOfWeek && aulaDate <= endOfWeek && matchUnidade && matchTipo
                      }
                    })
                    .sort((a, b) => new Date(a.data + ' ' + a.hora).getTime() - new Date(b.data + ' ' + b.hora).getTime())
                    .map((aula) => (
                      <div key={aula.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">
                              {new Date(aula.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(aula.data).toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </div>
                          </div>
                          
                          <div className="w-16 text-center">
                            <div className="text-sm font-semibold text-gray-900">{aula.hora}</div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{aula.aluno}</h4>
                              {aula.recorrente && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Recorrente
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                              <span>{aula.tipo}</span>
                              <span>•</span>
                              <MapPin className="h-3 w-3" />
                              <span>{aula.unidade}</span>
                              <span>•</span>
                              <span>R$ {aula.valor}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            aula.status === 'confirmado' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {aula.status}
                          </span>
                          
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => setAulaEditando(aula)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Nova Aula */}
            {showNovaAula && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nova Aula</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aluno</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Nome do aluno" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                        <input type="time" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {tiposAula.slice(1).map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {unidades.slice(1).map(unidade => (
                            <option key={unidade} value={unidade}>{unidade}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                      <input type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="100" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="recorrente" className="rounded" />
                      <label htmlFor="recorrente" className="text-sm text-gray-700 dark:text-gray-300">Aula recorrente (toda semana)</label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button 
                      onClick={() => setShowNovaAula(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => setShowNovaAula(false)}
                      className="px-4 py-2 bg-meu-accent text-meu-primary font-medium rounded-lg hover:bg-meu-accent/90 transition-colors"
                    >
                      Salvar Aula
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alunos' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Meus Alunos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockAlunos.map((aluno) => (
                <div key={aluno.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                      {aluno.frequencia}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{aluno.nome}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Última: {aluno.ultimaAula}</p>
                  <p className="text-sm font-medium text-meu-primary mt-2">R$ {aluno.pacoteValor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Extrato Financeiro</h2>
              <div className="space-y-3">
                {mockExtrato.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.tipo === 'entrada' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <TrendingUp className={`h-4 w-4 ${
                          item.tipo === 'entrada' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.descricao}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.data}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      item.tipo === 'entrada' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.tipo === 'entrada' ? '+' : ''}R$ {item.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Aula */}
        {showNovaAula && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {aulaEditando ? 'Editar Aula' : 'Nova Aula'}
                </h3>
                <button 
                  onClick={() => {
                    setShowNovaAula(false)
                    setAulaEditando(null)
                    setFormAula({
                      data: '',
                      hora: '',
                      aluno: '',
                      tipo: 'Musculação',
                      unidade: 'Centro',
                      valor: 100,
                      recorrente: false,
                      observacoes: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitAula} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aluno</label>
                  <input 
                    type="text" 
                    value={formAula.aluno}
                    onChange={(e) => setFormAula({...formAula, aluno: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    placeholder="Nome do aluno" 
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                    <input 
                      type="date" 
                      value={formAula.data}
                      onChange={(e) => setFormAula({...formAula, data: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                    <input 
                      type="time" 
                      value={formAula.hora}
                      onChange={(e) => setFormAula({...formAula, hora: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select 
                      value={formAula.tipo}
                      onChange={(e) => setFormAula({...formAula, tipo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Musculação">Musculação</option>
                      <option value="Funcional">Funcional</option>
                      <option value="CrossFit">CrossFit</option>
                      <option value="Pilates">Pilates</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
                    <select 
                      value={formAula.unidade}
                      onChange={(e) => setFormAula({...formAula, unidade: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Centro">Centro</option>
                      <option value="Sul">Sul</option>
                      <option value="Norte">Norte</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    value={formAula.valor}
                    onChange={(e) => setFormAula({...formAula, valor: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    placeholder="100" 
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                  <textarea 
                    value={formAula.observacoes}
                    onChange={(e) => setFormAula({...formAula, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    placeholder="Observações sobre a aula..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="recorrente" 
                    checked={formAula.recorrente}
                    onChange={(e) => setFormAula({...formAula, recorrente: e.target.checked})}
                    className="rounded" 
                  />
                  <label htmlFor="recorrente" className="text-sm text-gray-700 dark:text-gray-300">
                    Aula recorrente (toda semana)
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowNovaAula(false)
                      setAulaEditando(null)
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-meu-accent text-meu-primary font-medium rounded-lg hover:bg-meu-accent/90 transition-colors"
                  >
                    {aulaEditando ? 'Salvar Alterações' : 'Salvar Aula'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Check-in */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Check-in QR Code</h3>
                <button 
                  onClick={() => setShowQRCode(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <QrCode className="h-32 w-32 text-white" />
                </div>
                <div className="text-center mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Check-in de Aula
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mostre este código para seus alunos confirmarem presença
                  </p>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    ⏱️ Válido por 5 minutos
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Código: #CHK{Date.now().toString().slice(-6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfessorLayout>
  )
}
