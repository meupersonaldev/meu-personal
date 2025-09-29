'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Dumbbell,
  Activity,
  Heart,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

export default function ReservarEspacoPage() {
  const { user } = useAuthStore()
  const [selectedUnidade, setSelectedUnidade] = useState('')
  const [selectedEspaco, setSelectedEspaco] = useState('')
  const [selectedData, setSelectedData] = useState('')
  const [selectedHorario, setSelectedHorario] = useState('')
  const [duracao, setDuracao] = useState('1')
  
  // Mock data das unidades e espaços
  const unidades = [
    {
      id: 'centro',
      nome: 'Academia Centro',
      endereco: 'Rua das Flores, 123 - Centro',
      espacos: [
        {
          id: 'musculacao',
          nome: 'Área de Musculação',
          capacidade: 15,
          equipamentos: ['Esteiras', 'Pesos livres', 'Máquinas'],
          preco: 25,
          icon: Dumbbell
        },
        {
          id: 'funcional',
          nome: 'Espaço Funcional',
          capacidade: 10,
          equipamentos: ['TRX', 'Kettlebells', 'Medicine balls'],
          preco: 30,
          icon: Activity
        },
        {
          id: 'cardio',
          nome: 'Área Cardio',
          capacidade: 8,
          equipamentos: ['Esteiras', 'Bikes', 'Elípticos'],
          preco: 20,
          icon: Heart
        }
      ]
    },
    {
      id: 'norte',
      nome: 'Academia Norte',
      endereco: 'Av. Principal, 456 - Zona Norte',
      espacos: [
        {
          id: 'crossfit',
          nome: 'Box CrossFit',
          capacidade: 12,
          equipamentos: ['Barras', 'Anilhas', 'Puxadores'],
          preco: 35,
          icon: Zap
        },
        {
          id: 'funcional',
          nome: 'Sala Funcional',
          capacidade: 8,
          equipamentos: ['Cordas', 'Pneus', 'Escadas'],
          preco: 30,
          icon: Activity
        }
      ]
    }
  ]
  
  const horariosDisponiveis = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]
  
  // Mock de horários ocupados
  const horariosOcupados = new Set([
    'centro-musculacao-2024-01-25-15:00',
    'norte-crossfit-2024-01-25-18:00'
  ])
  
  const isHorarioOcupado = (unidadeId: string, espacoId: string, data: string, horario: string) => {
    return horariosOcupados.has(`${unidadeId}-${espacoId}-${data}-${horario}`)
  }
  
  const unidadeSelecionada = unidades.find(u => u.id === selectedUnidade)
  const espacoSelecionado = unidadeSelecionada?.espacos.find(e => e.id === selectedEspaco)
  
  const calcularPrecoTotal = () => {
    if (!espacoSelecionado) return 0
    return espacoSelecionado.preco * parseInt(duracao)
  }
  
  const handleReservar = () => {
    if (!selectedUnidade || !selectedEspaco || !selectedData || !selectedHorario) {
      alert('Por favor, preencha todos os campos')
      return
    }
    
    // Simular reserva
    alert(`Reserva realizada com sucesso!\n\nUnidade: ${unidadeSelecionada?.nome}\nEspaço: ${espacoSelecionado?.nome}\nData: ${new Date(selectedData).toLocaleDateString('pt-BR')}\nHorário: ${selectedHorario}\nDuração: ${duracao}h\nTotal: R$ ${calcularPrecoTotal()}`)
    
    // Reset form
    setSelectedUnidade('')
    setSelectedEspaco('')
    setSelectedData('')
    setSelectedHorario('')
    setDuracao('1')
  }

  if (!user) {
    return null
  }

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservar Espaço
          </h1>
          <p className="text-gray-600">
            Reserve espaços nas academias para suas aulas particulares
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Reserva */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Seleção de Unidade */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-meu-primary" />
                  Escolha a Unidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {unidades.map(unidade => (
                  <div
                    key={unidade.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedUnidade === unidade.id
                        ? 'border-meu-primary bg-meu-primary/5'
                        : 'border-gray-200 hover:border-meu-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedUnidade(unidade.id)
                      setSelectedEspaco('')
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{unidade.nome}</h3>
                        <p className="text-sm text-gray-500">{unidade.endereco}</p>
                        <p className="text-xs text-meu-primary mt-1">
                          {unidade.espacos.length} espaços disponíveis
                        </p>
                      </div>
                      {selectedUnidade === unidade.id && (
                        <CheckCircle className="h-5 w-5 text-meu-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Seleção de Espaço */}
            {selectedUnidade && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-meu-primary" />
                    Escolha o Espaço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {unidadeSelecionada?.espacos.map(espaco => {
                    const Icon = espaco.icon
                    return (
                      <div
                        key={espaco.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedEspaco === espaco.id
                            ? 'border-meu-primary bg-meu-primary/5'
                            : 'border-gray-200 hover:border-meu-primary/50'
                        }`}
                        onClick={() => setSelectedEspaco(espaco.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-meu-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="h-5 w-5 text-meu-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{espaco.nome}</h3>
                              <p className="text-sm text-gray-500 mb-2">
                                Capacidade: {espaco.capacidade} pessoas
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {espaco.equipamentos.map(eq => (
                                  <Badge key={eq} variant="secondary" className="text-xs">
                                    {eq}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-sm font-semibold text-meu-primary mt-2">
                                R$ {espaco.preco}/hora
                              </p>
                            </div>
                          </div>
                          {selectedEspaco === espaco.id && (
                            <CheckCircle className="h-5 w-5 text-meu-primary" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Data e Horário */}
            {selectedEspaco && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
                    Data e Horário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={selectedData}
                        onChange={(e) => setSelectedData(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duração (horas)
                      </label>
                      <select
                        value={duracao}
                        onChange={(e) => setDuracao(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      >
                        <option value="1">1 hora</option>
                        <option value="2">2 horas</option>
                        <option value="3">3 horas</option>
                      </select>
                    </div>
                  </div>

                  {selectedData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horário Disponível
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {horariosDisponiveis.map(horario => {
                          const isOcupado = isHorarioOcupado(selectedUnidade, selectedEspaco, selectedData, horario)
                          return (
                            <Button
                              key={horario}
                              variant={selectedHorario === horario ? "default" : "outline"}
                              size="sm"
                              disabled={isOcupado}
                              onClick={() => setSelectedHorario(horario)}
                              className={`${
                                selectedHorario === horario
                                  ? 'bg-meu-primary text-white'
                                  : isOcupado
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'hover:border-meu-primary hover:text-meu-primary'
                              }`}
                            >
                              {horario}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo da Reserva */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-meu-primary" />
                  Resumo da Reserva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedUnidade ? (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Selecione uma unidade para começar</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unidade:</span>
                        <span className="font-medium">{unidadeSelecionada?.nome}</span>
                      </div>
                      
                      {espacoSelecionado && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Espaço:</span>
                          <span className="font-medium">{espacoSelecionado.nome}</span>
                        </div>
                      )}
                      
                      {selectedData && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data:</span>
                          <span className="font-medium">
                            {new Date(selectedData).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      
                      {selectedHorario && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Horário:</span>
                          <span className="font-medium">{selectedHorario}</span>
                        </div>
                      )}
                      
                      {duracao && espacoSelecionado && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duração:</span>
                            <span className="font-medium">{duracao}h</span>
                          </div>
                          
                          <div className="border-t pt-3">
                            <div className="flex justify-between text-lg font-semibold">
                              <span>Total:</span>
                              <span className="text-meu-primary">R$ {calcularPrecoTotal()}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      onClick={handleReservar}
                      disabled={!selectedUnidade || !selectedEspaco || !selectedData || !selectedHorario}
                      className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold"
                    >
                      Confirmar Reserva
                    </Button>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Política de Cancelamento</p>
                          <p>Cancelamentos até 2h antes são gratuitos. Após esse período, será cobrada taxa de 50%.</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProfessorLayout>
  )
}
