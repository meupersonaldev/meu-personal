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
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users
} from 'lucide-react'

export default function HorariosLivresPage() {
  const { user } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUnidade, setSelectedUnidade] = useState('todas')
  
  // Mock data dos horários
  const unidades = ['Todas', 'Centro', 'Norte', 'Sul']
  const horariosDisponiveis = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]
  
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  // Gerar calendário da semana
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })
  }
  
  const weekDays = getWeekDays()
  
  // Mock de horários ocupados (simulação)
  const horariosOcupados = new Set([
    '2024-01-25-15:00-Centro',
    '2024-01-26-09:00-Norte',
    '2024-01-27-14:00-Sul'
  ])
  
  const isHorarioOcupado = (date: Date, horario: string, unidade: string) => {
    const dateStr = date.toISOString().split('T')[0]
    return horariosOcupados.has(`${dateStr}-${horario}-${unidade}`)
  }
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
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
            Horários Livres
          </h1>
          <p className="text-gray-600">
            Visualize e gerencie seus horários disponíveis
          </p>
        </div>

        {/* Controles */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Navegação da Semana */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Filtro de Unidade */}
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedUnidade}
                  onChange={(e) => setSelectedUnidade(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-meu-cyan focus:border-transparent"
                >
                  {unidades.map(unidade => (
                    <option key={unidade} value={unidade.toLowerCase()}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade de Horários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
              Grade de Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  <div className="p-3 text-center font-medium text-gray-500">
                    Horário
                  </div>
                  {weekDays.map((day, index) => (
                    <div key={day.toISOString()} className="p-3 text-center">
                      <div className="font-medium text-gray-900">
                        {diasSemana[index]}
                      </div>
                      <div className="text-sm text-gray-500">
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grade de horários */}
                <div className="space-y-2">
                  {horariosDisponiveis.map(horario => (
                    <div key={horario} className="grid grid-cols-8 gap-2">
                      <div className="p-3 text-center font-medium text-gray-700 bg-gray-50 rounded-lg">
                        {horario}
                      </div>
                      {weekDays.map(day => {
                        const isOcupado = selectedUnidade !== 'todas' 
                          ? isHorarioOcupado(day, horario, selectedUnidade)
                          : unidades.slice(1).some(u => isHorarioOcupado(day, horario, u))
                        
                        const isPast = day < new Date() && day.toDateString() !== new Date().toDateString()
                        
                        return (
                          <div key={`${day.toISOString()}-${horario}`} className="p-2">
                            <Button
                              variant={isOcupado ? "secondary" : "outline"}
                              size="sm"
                              disabled={isPast || isOcupado}
                              className={`w-full h-12 ${
                                isOcupado 
                                  ? 'bg-red-100 text-red-700 border-red-200 cursor-not-allowed' 
                                  : isPast
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'hover:bg-meu-cyan hover:text-white border-meu-cyan/30'
                              }`}
                            >
                              {isOcupado ? (
                                <div className="text-center">
                                  <Users className="h-3 w-3 mx-auto mb-1" />
                                  <span className="text-xs">Ocupado</span>
                                </div>
                              ) : isPast ? (
                                <span className="text-xs">Passado</span>
                              ) : (
                                <div className="text-center">
                                  <Plus className="h-3 w-3 mx-auto mb-1" />
                                  <span className="text-xs">Livre</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white border-2 border-meu-cyan rounded"></div>
            <span className="text-sm text-gray-600">Disponível</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-200 rounded"></div>
            <span className="text-sm text-gray-600">Ocupado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
            <span className="text-sm text-gray-600">Passado</span>
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-meu-cyan mb-1">
                {horariosDisponiveis.length * 7 - Array.from(horariosOcupados).length}
              </div>
              <div className="text-sm text-gray-600">Horários Livres</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">
                {Array.from(horariosOcupados).length}
              </div>
              <div className="text-sm text-gray-600">Horários Ocupados</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-700 mb-1">
                {horariosDisponiveis.length * 7}
              </div>
              <div className="text-sm text-gray-600">Total de Slots</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProfessorLayout>
  )
}
