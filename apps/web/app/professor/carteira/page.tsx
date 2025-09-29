'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { 
  CreditCard,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  Download,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Dados mockados da carteira
const mockCarteira = {
  saldoCreditos: 45,
  valorEstimado: 3600, // 45 créditos * R$ 80/hora
  faturamentoMes: 8500,
  creditosUtilizados: 23,
  proximoVencimento: '2024-02-15'
}

// Pacotes de créditos para professores
const pacotesCreditos = [
  {
    id: 1,
    nome: 'Básico',
    creditos: 10,
    preco: 200,
    desconto: 0,
    popular: false
  },
  {
    id: 2,
    nome: 'Profissional',
    creditos: 25,
    preco: 450,
    desconto: 10,
    popular: true
  },
  {
    id: 3,
    nome: 'Premium',
    creditos: 50,
    preco: 800,
    desconto: 20,
    popular: false
  },
  {
    id: 4,
    nome: 'Enterprise',
    creditos: 100,
    preco: 1400,
    desconto: 30,
    popular: false
  }
]

// Histórico de transações
const mockTransacoes = [
  {
    id: 1,
    tipo: 'compra',
    descricao: 'Compra de pacote Premium',
    creditos: 50,
    valor: 800,
    data: '2024-01-15',
    status: 'concluida'
  },
  {
    id: 2,
    tipo: 'uso',
    descricao: 'Aula com João Silva',
    creditos: -2,
    valor: -160,
    data: '2024-01-18',
    status: 'concluida'
  },
  {
    id: 3,
    tipo: 'uso',
    descricao: 'Aula com Maria Santos',
    creditos: -2,
    valor: -160,
    data: '2024-01-18',
    status: 'concluida'
  },
  {
    id: 4,
    tipo: 'recorrencia',
    descricao: 'Aulas recorrentes - João Silva',
    creditos: -8,
    valor: -640,
    data: '2024-01-20',
    status: 'agendada'
  },
  {
    id: 5,
    tipo: 'estorno',
    descricao: 'Estorno - Aula cancelada',
    creditos: 2,
    valor: 160,
    data: '2024-01-19',
    status: 'concluida'
  }
]

const tipoConfig = {
  compra: {
    label: 'Compra',
    icon: ArrowDownCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  uso: {
    label: 'Uso',
    icon: ArrowUpCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  recorrencia: {
    label: 'Recorrência',
    icon: Repeat,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  estorno: {
    label: 'Estorno',
    icon: ArrowDownCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }
}

export default function ProfessorCarteira() {
  const { user } = useAuthStore()
  const [visualizacao, setVisualizacao] = useState<'saldo' | 'comprar' | 'historico'>('saldo')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [pacoteSelecionado, setPacoteSelecionado] = useState<any>(null)

  const transacoesFiltradas = mockTransacoes.filter(transacao => 
    filtroTipo === 'todos' || transacao.tipo === filtroTipo
  )

  const comprarPacote = (pacote: any) => {
    setPacoteSelecionado(pacote)
    // Aqui integraria com o sistema de pagamento
    console.log('Comprando pacote:', pacote)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Carteira</h1>
              <p className="text-gray-600">Gerencie seus créditos e faturamento</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={visualizacao === 'saldo' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('saldo')}
                size="sm"
              >
                Saldo
              </Button>
              <Button
                variant={visualizacao === 'comprar' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('comprar')}
                size="sm"
              >
                Comprar
              </Button>
              <Button
                variant={visualizacao === 'historico' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('historico')}
                size="sm"
              >
                Histórico
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-app py-6">
        {visualizacao === 'saldo' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Créditos Disponíveis</p>
                    <p className="text-3xl font-bold text-primary">{mockCarteira.saldoCreditos}</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Valor Estimado</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(mockCarteira.valorEstimado)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Faturamento Mês</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(mockCarteira.faturamentoMes)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Créditos Utilizados</p>
                    <p className="text-3xl font-bold text-orange-600">{mockCarteira.creditosUtilizados}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Uso (Simulado) */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-primary mb-4">Uso de Créditos nos Últimos 7 Dias</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {[12, 8, 15, 6, 10, 14, 9].map((valor, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-accent rounded-t-lg transition-all duration-300 hover:bg-accent/80"
                      style={{ height: `${(valor / 15) * 100}%` }}
                    ></div>
                    <span className="text-xs text-gray-600 mt-2">
                      {new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximo Vencimento */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Próximo Vencimento</h3>
                  <p className="text-gray-600">
                    Seus créditos vencem em {new Date(mockCarteira.proximoVencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Comprar Mais Créditos
                </Button>
              </div>
            </div>
          </div>
        )}

        {visualizacao === 'comprar' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-primary mb-2">Escolha seu Pacote de Créditos</h2>
              <p className="text-gray-600">Selecione o pacote que melhor atende suas necessidades</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pacotesCreditos.map((pacote) => (
                <div
                  key={pacote.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-lg ${
                    pacote.popular ? 'border-accent' : 'border-gray-100'
                  }`}
                >
                  {pacote.popular && (
                    <div className="bg-accent text-primary text-xs font-bold px-3 py-1 rounded-full mb-4 text-center">
                      MAIS POPULAR
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-primary mb-2">{pacote.nome}</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {pacote.creditos}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">créditos</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(pacote.preco)}
                    </div>
                    {pacote.desconto > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        {pacote.desconto}% de desconto
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Válido por 6 meses
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Receipt className="h-4 w-4 mr-2" />
                      Nota fiscal inclusa
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagamento seguro
                    </div>
                  </div>
                  <Button
                    fullWidth
                    variant={pacote.popular ? 'default' : 'outline'}
                    onClick={() => comprarPacote(pacote)}
                  >
                    Comprar Agora
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {visualizacao === 'historico' && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Histórico de Transações</h3>
                <div className="flex space-x-2">
                  {['todos', 'compra', 'uso', 'recorrencia', 'estorno'].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setFiltroTipo(tipo)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filtroTipo === tipo
                          ? 'bg-accent text-primary'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tipo === 'todos' ? 'Todas' : tipoConfig[tipo as keyof typeof tipoConfig]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de Transações */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Transações</h3>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {transacoesFiltradas.map((transacao) => {
                  const config = tipoConfig[transacao.tipo as keyof typeof tipoConfig]
                  const Icon = config.icon
                  
                  return (
                    <div key={transacao.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transacao.descricao}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(transacao.data).toLocaleDateString('pt-BR')} • {config.label}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${transacao.creditos > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transacao.creditos > 0 ? '+' : ''}{transacao.creditos} créditos
                          </p>
                          <p className={`text-sm ${transacao.valor > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(transacao.valor))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
