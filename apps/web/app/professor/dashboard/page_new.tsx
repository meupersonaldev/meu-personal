'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import {
  Clock,
  Calendar,
  CreditCard,
  MapPin,
  CheckCircle,
  Plus,
  Bell,
  User,
  ChevronRight,
  Wallet,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

export default function ProfessorDashboardPage() {
  const { user } = useAuthStore()
  
  // Mock data seguindo o MVP especificado
  const dashboardData = {
    horasDisponiveis: 12,
    aulasHoje: 3,
    faturamentoMes: 3200,
    proximasAulas: [
      {
        id: 1,
        aluno: 'Maria Silva',
        horario: '14:00',
        unidade: 'Academia Central',
        status: 'confirmada'
      },
      {
        id: 2,
        aluno: 'João Santos', 
        horario: '15:30',
        unidade: 'Academia Norte',
        status: 'confirmada'
      },
      {
        id: 3,
        aluno: 'Ana Costa',
        horario: '17:00',
        unidade: 'Academia Sul',
        status: 'pendente'
      }
    ],
    historicoCompras: [
      { id: 1, horas: 20, valor: 400, data: '15/01/2024' },
      { id: 2, horas: 15, valor: 300, data: '01/01/2024' }
    ]
  }

  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const horariosDisponiveis = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#04243D]">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-[#04243D] border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          {/* Logo e Nome */}
          <div className="flex items-center space-x-3">
            <Image 
              src="/images/logo.png" 
              alt="Meu Personal" 
              width={32} 
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-white font-semibold text-lg">Meu Personal</span>
          </div>

          {/* Notificações e Avatar */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-[#27DFFF] text-[#04243D] text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                2
              </span>
            </Button>
            <Avatar className="h-8 w-8 bg-[#27DFFF] text-[#04243D]">
              <AvatarFallback className="bg-[#27DFFF] text-[#04243D] font-semibold">
                {user.name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Resumo Rápido (Hero Card) */}
        <Card className="bg-white">
          <CardContent className="p-6">
            {/* Saudação */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Olá, {user.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-600">Aqui está o resumo do seu dia</p>
            </div>

            {/* KPIs em chips roláveis */}
            <div className="flex space-x-4 overflow-x-auto pb-2 mb-6">
              <div className="flex-shrink-0 bg-[#27DFFF] text-[#04243D] px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <div>
                    <div className="font-bold text-lg">{dashboardData.horasDisponiveis}h</div>
                    <div className="text-sm opacity-80">Disponíveis</div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-green-500 text-white px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <div className="font-bold text-lg">{dashboardData.aulasHoje}</div>
                    <div className="text-sm opacity-80">Aulas hoje</div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-blue-500 text-white px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <div className="font-bold text-lg">R$ {dashboardData.faturamentoMes.toLocaleString()}</div>
                    <div className="text-sm opacity-80">Este mês</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Principal */}
            <Button className="w-full bg-[#27DFFF] hover:bg-[#27DFFF]/90 text-[#04243D] font-semibold h-12">
              <Plus className="h-5 w-5 mr-2" />
              Comprar Horas
            </Button>
          </CardContent>
        </Card>

        {/* Agenda do Dia */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Próximas Aulas</h2>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Ver agenda
              </Button>
            </div>

            <div className="space-y-3">
              {dashboardData.proximasAulas.map((aula) => (
                <div key={aula.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#04243D] rounded-lg flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{aula.aluno}</div>
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{aula.horario}</span>
                          <MapPin className="h-4 w-4" />
                          <span>{aula.unidade}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={aula.status === 'confirmada' ? 'default' : 'secondary'}
                        className={aula.status === 'confirmada' ? 'bg-green-500' : ''}
                      >
                        {aula.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                      </Badge>
                      {aula.status === 'confirmada' && (
                        <Button size="sm" className="bg-[#27DFFF] hover:bg-[#27DFFF]/90 text-[#04243D]">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Check-in
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendário Compacto */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Calendário Semanal</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mini calendário rolável */}
            <div className="overflow-x-auto">
              <div className="flex space-x-2 min-w-max">
                {diasSemana.map((dia, index) => (
                  <div key={dia} className="flex-shrink-0 w-20">
                    <div className="text-center text-sm font-medium text-gray-600 mb-2">{dia}</div>
                    <div className="space-y-1">
                      {horariosDisponiveis.slice(0, 4).map((horario) => (
                        <button
                          key={horario}
                          className={`w-full text-xs py-1 rounded ${
                            Math.random() > 0.7 
                              ? 'bg-[#27DFFF] text-[#04243D] font-medium' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {horario}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Reservar Espaço
            </Button>
          </CardContent>
        </Card>

        {/* Carteira de Horas */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Carteira de Horas</h2>
              <Wallet className="h-6 w-6 text-gray-400" />
            </div>

            {/* Saldo atual com barra visual */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Saldo atual</span>
                <span className="text-2xl font-bold text-[#04243D]">{dashboardData.horasDisponiveis}h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-[#27DFFF] h-3 rounded-full" 
                  style={{ width: `${(dashboardData.horasDisponiveis / 20) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">de 20h compradas</div>
            </div>

            {/* Histórico de compras */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Histórico de Compras</h3>
              <div className="space-y-2">
                {dashboardData.historicoCompras.map((compra) => (
                  <div key={compra.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{compra.horas}h compradas</div>
                      <div className="text-sm text-gray-600">{compra.data}</div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      R$ {compra.valor}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-[#27DFFF] hover:bg-[#27DFFF]/90 text-[#04243D] font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Comprar Mais Horas
            </Button>
          </CardContent>
        </Card>

        {/* Feedback & Suporte */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Suporte</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-3" />
                Central de Ajuda
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="h-4 w-4 mr-3" />
                Falar com Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
