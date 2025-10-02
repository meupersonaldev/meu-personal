'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAvailableSlots,
  checkAllAcademiesHaveSlots,
  formatTime,
  getDayName,
  getDayOfWeek,
  type AvailableSlot,
  type AcademySlotStatus,
} from '@/lib/slots-api'
import { toast } from 'sonner'

interface SlotSelectorProps {
  academyId: string
  selectedDate: Date
  onSlotSelect: (slotId: string, time: string) => void
  selectedSlotId?: string
}

export function SlotSelector({
  academyId,
  selectedDate,
  onSlotSelect,
  selectedSlotId,
}: SlotSelectorProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [academiesStatus, setAcademiesStatus] = useState<AcademySlotStatus[]>([])

  const dayOfWeek = getDayOfWeek(selectedDate)
  const dayName = getDayName(dayOfWeek)

  useEffect(() => {
    loadSlots()
    checkAcademiesAvailability()
  }, [academyId, selectedDate])

  const loadSlots = async () => {
    setLoading(true)
    try {
      const availableSlots = await getAvailableSlots(academyId, dayOfWeek)
      setSlots(availableSlots)

      if (availableSlots.length === 0) {
        toast.warning('Nenhum horário disponível para esta data')
      }
    } catch (error) {
      console.error('Erro ao carregar slots:', error)
      toast.error('Erro ao carregar horários disponíveis')
    } finally {
      setLoading(false)
    }
  }

  const checkAcademiesAvailability = async () => {
    try {
      const status = await checkAllAcademiesHaveSlots(dayOfWeek)
      setAcademiesStatus(status)
    } catch (error) {
      console.error('Erro ao verificar academias:', error)
    }
  }

  const handleSlotClick = (slot: AvailableSlot) => {
    onSlotSelect(slot.slot_id, slot.slot_time)
  }

  const getCapacityColor = (available: number, max: number) => {
    const percentage = (available / max) * 100
    if (percentage > 50) return 'text-green-600'
    if (percentage > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meu-primary"></div>
            <span className="ml-3 text-gray-600">Carregando horários...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Informações do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-meu-primary" />
            {dayName} - {selectedDate.toLocaleDateString('pt-BR')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {slots.length} horários disponíveis
              </span>
            </div>
            {slots.length > 0 && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Disponível
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status de Outras Academias */}
      {academiesStatus.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status das Academias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {academiesStatus.map((academy) => (
                <div
                  key={academy.academy_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{academy.academy_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {academy.available_slots}/{academy.total_slots}
                    </span>
                    {academy.has_available_slots ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Slots */}
      {slots.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum horário disponível
              </h3>
              <p className="text-gray-600">
                Não há horários disponíveis para esta data. Tente selecionar outro dia.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slots.map((slot) => (
            <Button
              key={slot.slot_id}
              variant={selectedSlotId === slot.slot_id ? 'default' : 'outline'}
              className={`h-auto flex-col p-4 ${
                selectedSlotId === slot.slot_id
                  ? 'bg-meu-primary hover:bg-meu-primary/90'
                  : 'hover:border-meu-primary'
              }`}
              onClick={() => handleSlotClick(slot)}
            >
              <Clock className="h-5 w-5 mb-2" />
              <span className="font-semibold text-lg">
                {formatTime(slot.slot_time)}
              </span>
              <div className="flex items-center gap-1 mt-2">
                <Users className="h-3 w-3" />
                <span
                  className={`text-xs ${getCapacityColor(
                    slot.available_capacity,
                    slot.max_capacity
                  )}`}
                >
                  {slot.available_capacity}/{slot.max_capacity}
                </span>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Legenda */}
      {slots.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Vagas disponíveis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">●</span>
                <span>Muitas vagas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">●</span>
                <span>Poucas vagas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">●</span>
                <span>Últimas vagas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
