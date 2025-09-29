'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  Plus,
  Download,
  Eye,
  Clock
} from 'lucide-react'

export default function CarteiraPage() {
  const { user } = useAuthStore()
  
  // Mock data - valores mais baixos e realistas
  const saldoAtual = 2
  const totalComprado = 5
  const totalGasto = 3
  
  const transacoes = [
    {
      id: 1,
      tipo: 'compra',
      descricao: 'Compra de 5 horas',
      valor: 350,
      horas: 5,
      data: '2024-01-20',
      status: 'concluida',
      metodo: 'PIX'
    },
    {
      id: 2,
      tipo: 'uso',
      descricao: 'Aula com João Silva',
      valor: -70,
      horas: -1,
      data: '2024-01-22',
      status: 'concluida',
      aluno: 'João Silva'
    },
    {
      id: 3,
      tipo: 'uso',
      descricao: 'Compra de 15 horas',
      valor: 300,
      horas: 15,
      data: '2024-01-15',
      status: 'concluida',
      metodo: 'Cartão'
    },
    {
      id: 4,
      tipo: 'uso',
      descricao: 'Aula com João Santos',
      valor: -20,
      horas: -1,
      data: '2024-01-23',
      status: 'concluida',
      aluno: 'João Santos'
    },
    {
      id: 5,
      tipo: 'compra',
      descricao: 'Compra de 15 horas',
      valor: 300,
      horas: 15,
      data: '2024-01-10',
      status: 'pendente',
      metodo: 'Boleto'
    }
  ]

  const estatisticas = [
    { label: 'Saldo Atual', valor: `${saldoAtual}h`, cor: 'text-[#27DFFF]', icon: Clock },
    { label: 'Total Comprado', valor: `${totalComprado}h`, cor: 'text-green-500', icon: TrendingUp },
    { label: 'Total Utilizado', valor: `${totalGasto}h`, cor: 'text-blue-500', icon: Wallet },
    { label: 'Taxa de Uso', valor: `${Math.round((totalGasto/totalComprado)*100)}%`, cor: 'text-purple-500', icon: TrendingUp }
  ]

  if (!user) {
    return null
  }

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Carteira de Horas
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie seu saldo e histórico de transações
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {estatisticas.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-700`}>
                    <stat.icon className={`h-6 w-6 ${stat.cor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Saldo Visual */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saldo Atual</h2>
              <Button className="bg-[#27DFFF] hover:bg-[#27DFFF]/90 text-[#04243D] font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Comprar Horas
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Horas disponíveis</span>
                <span className="text-3xl font-bold text-[#27DFFF]">{saldoAtual}h</span>
              </div>
              
              {/* Barra de Progresso */}
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                <div 
                  className="bg-[#27DFFF] h-4 rounded-full flex items-center justify-end pr-2" 
                  style={{ width: `${(saldoAtual / totalComprado) * 100}%` }}
                >
                  <span className="text-xs text-[#04243D] font-semibold">
                    {Math.round((saldoAtual / totalComprado) * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0h</span>
                <span>{totalComprado}h compradas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">+{totalComprado}h</div>
                <div className="text-sm text-green-600 dark:text-green-400">Compradas</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">-{totalGasto}h</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Utilizadas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Transações */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Transações</h2>
              <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            <div className="space-y-3">
              {transacoes.map((transacao) => (
                <div key={transacao.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {/* Ícone */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transacao.tipo === 'compra' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {transacao.tipo === 'compra' ? (
                        <CreditCard className={`h-5 w-5 ${
                          transacao.tipo === 'compra' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Detalhes */}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {transacao.descricao}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(transacao.data).toLocaleDateString('pt-BR')}</span>
                        {transacao.metodo && (
                          <>
                            <span>•</span>
                            <span>{transacao.metodo}</span>
                          </>
                        )}
                        {transacao.aluno && (
                          <>
                            <span>•</span>
                            <span>{transacao.aluno}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Valor e Status */}
                  <div className="text-right">
                    <div className={`font-bold text-lg ${
                      transacao.tipo === 'compra' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {transacao.tipo === 'compra' ? '+' : ''}{transacao.horas}h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      R$ {Math.abs(transacao.valor)}
                    </div>
                    <Badge 
                      variant={transacao.status === 'concluida' ? 'default' : 'secondary'}
                      className={`mt-1 ${
                        transacao.status === 'concluida' 
                          ? 'bg-green-500' 
                          : 'bg-yellow-500'
                      }`}
                    >
                      {transacao.status === 'concluida' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Mostrando 5 de 12 transações
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="dark:border-gray-600 dark:text-gray-300">
                  Anterior
                </Button>
                <Button variant="outline" size="sm" className="dark:border-gray-600 dark:text-gray-300">
                  Próximo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProfessorLayout>
  )
}
