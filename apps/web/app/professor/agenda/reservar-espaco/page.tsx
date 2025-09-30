'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

interface Franchise {
  id: string
  name: string
  address: string
  is_active: boolean
}

interface Booking {
  id: string
  date: string
  status: string
  franchiseId?: string
}

export default function ReservarHorarioPage() {
  const { user } = useAuthStore()
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [academyIds, setAcademyIds] = useState<string[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string>('')
  const [selectedData, setSelectedData] = useState('')
  // Removidos: selectedHorario, duracao (warnings)
  interface Slot { time: string; is_free: boolean; remaining: number; max_capacity: number; current_occupancy: number; slot_duration?: number }
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Buscar horários livres quando unidade e data forem selecionadas
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedFranchise || !selectedData) {
        setAvailableSlots([])
        return
      }
      try {
        setLoadingSlots(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/academies/${selectedFranchise}/available-slots?date=${selectedData}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableSlots((data.slots || []) as Slot[])
        } else {
          setAvailableSlots([])
        }
      } catch (e) {
        console.error('Erro ao carregar horários livres:', e)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [selectedFranchise, selectedData])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Buscar franquias disponíveis
        const franchisesResponse = await fetch(`${API_URL}/api/franchises`)
        console.log('Franchises response status:', franchisesResponse.status)
        
        if (franchisesResponse.ok) {
          const data = await franchisesResponse.json()
          console.log('Franchises data:', data)
          setFranchises(data.franchises || [])
        } else {
          console.error('Error fetching franchises:', await franchisesResponse.text())
        }

        // Buscar agendamentos existentes do professor
        const bookingsResponse = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}`)
        if (bookingsResponse.ok) {
          const data = await bookingsResponse.json()
          setBookings(data.bookings || [])
        }

        // Buscar preferências do professor (academy_ids)
        const prefRes = await fetch(`${API_URL}/api/teachers/${user.id}/preferences`)
        if (prefRes.ok) {
          const pref = await prefRes.json()
          setAcademyIds(pref.academy_ids || [])
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  // Filtrar franquias pelas preferências do professor
  const franchisesFiltradas = useMemo(() => {
    if (!academyIds?.length) return franchises
    return franchises.filter(f => academyIds.includes(f.id))
  }, [franchises, academyIds])

  const franchiseSelecionada = franchisesFiltradas.find(f => f.id === selectedFranchise)

  // Verificação local opcional (não usada mais pois backend informa disponibilidade)

  const handleReservarHorario = async (horario: string) => {
    if (!selectedFranchise || !selectedData) {
      toast.error('Selecione uma unidade e data primeiro')
      return
    }

    setSubmitting(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // Criar data/hora completa a partir do horário (HH:mm)
      const [hours, minutes] = horario.split(':')
      const bookingDate = new Date(selectedData + 'T00:00:00')
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacher_id: user?.id,
          student_id: null, // Sem aluno ainda - slot disponível
          franchise_id: selectedFranchise,
          date: bookingDate.toISOString(),
          duration: (availableSlots.find(s => s.time === horario)?.slot_duration) || 60,
          credits_cost: 1, // Custo padrão
          notes: observacoes || `Horário disponível (${horario})`,
          status: 'AVAILABLE' // Status especial para slots disponíveis
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Horário reservado com sucesso!')
        
        // Atualizar lista de bookings localmente
        const newBooking = {
          id: data.booking?.id || Date.now().toString(),
          date: bookingDate.toISOString(),
          status: 'AVAILABLE',
          franchiseId: selectedFranchise
        }
        
        setBookings([...bookings, newBooking])
      } else {
        toast.error(data.message || 'Erro ao reservar horário')
      }
    } catch (error) {
      console.error('Erro ao reservar:', error)
      toast.error('Erro ao processar reserva')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservar Horário
          </h1>
          <p className="text-gray-600">
            Reserve horários nas unidades para disponibilizar aos alunos
          </p>
        </div>

        {/* Info sobre o sistema */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Como funciona:</strong> Você pode reservar horários em qualquer unidade do sistema. 
              Escolha a franquia, data e horário para disponibilizar aos seus alunos.
            </p>
          </div>
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
                {franchisesFiltradas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhuma unidade disponível
                  </p>
                ) : (
                  franchisesFiltradas.map(franchise => (
                    <div
                      key={franchise.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedFranchise === franchise.id
                          ? 'border-meu-primary bg-meu-primary/5'
                          : 'border-gray-200 hover:border-meu-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedFranchise(franchise.id)
                        setSelectedData('')
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{franchise.name}</h3>
                          <p className="text-sm text-gray-500">{franchise.address}</p>
                        </div>
                        {selectedFranchise === franchise.id && (
                          <CheckCircle className="h-5 w-5 text-meu-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Data e Horários Livres */}
            {selectedFranchise && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
                    Data e Horários Livres
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
                        onChange={(e) => {
                          setSelectedData(e.target.value)
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horários Disponíveis
                      </label>
                      {loadingSlots ? (
                        <div className="text-sm text-gray-500">Carregando horários...</div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-sm text-gray-500">Nenhum horário livre para esta data.</div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant="outline"
                              size="sm"
                              disabled={!slot.is_free || submitting}
                              onClick={() => handleReservarHorario(slot.time)}
                              className={`${
                                slot.is_free
                                  ? 'hover:bg-meu-primary hover:text-white hover:border-meu-primary'
                                  : 'bg-red-100 text-red-700 cursor-not-allowed border-red-200'
                              }`}
                            >
                              {slot.is_free ? `✓ ${slot.time}` : `✕ ${slot.time}`}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações (opcional)
                    </label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Ex: Disponível para treino de hipertrofia..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informações Laterais */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-meu-primary" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedFranchise ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Selecione uma unidade para começar</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Unidade Selecionada:</span>
                        <p className="font-medium text-gray-900">{franchiseSelecionada?.name}</p>
                        <p className="text-sm text-gray-500">{franchiseSelecionada?.address}</p>
                      </div>
                      
                      {selectedData && (
                        <div>
                          <span className="text-sm text-gray-600">Data:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedData + 'T00:00:00').toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long' 
                            })}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-sm text-gray-600">Duração:</span>
                        <p className="font-medium text-gray-900">Conforme configuração da unidade</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Como funciona?</p>
                          <p>Clique em um horário livre para reservá-lo. O horário ficará disponível para seus alunos agendarem.</p>
                        </div>
                      </div>
                    </div>

                    {submitting && (
                      <div className="flex items-center justify-center space-x-2 text-meu-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Reservando horário...</span>
                      </div>
                    )}
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
