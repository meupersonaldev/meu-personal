'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Users,
  ChevronDown,
  Edit2
} from 'lucide-react'
import { toast } from 'sonner'

interface Franchise {
  id: string
  name: string
  city: string
  state: string
}

interface Booking {
  id: string
  date: string
  status:
    | 'AVAILABLE'
    | 'PENDING'
    | 'RESERVED'
    | 'CONFIRMED'
    | 'PAID'
    | 'COMPLETED'
    | 'DONE'
    | 'CANCELED'
    | 'CANCELLED'
    | 'BLOCKED'
  franchiseId?: string
}

interface Student {
  id: string
  name: string
  email: string
  phone?: string
  user_id?: string
  hourly_rate?: number
}

export default function ReservarHorarioPage() {
  const { user, token } = useAuthStore()
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
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', email: '', phone: '', hourly_rate: '' })
  const [selectedHorario, setSelectedHorario] = useState<string>('')
  const [expandedStep, setExpandedStep] = useState<number>(1) // Controla qual step está expandido

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const authFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    if (!token) {
      throw new Error('Sessao expirada. Faca login novamente.')
    }

    let headers: Record<string, string> = {}
    if (init.headers instanceof Headers) {
      headers = Object.fromEntries(init.headers.entries())
    } else if (Array.isArray(init.headers)) {
      headers = Object.fromEntries(init.headers)
    } else if (init.headers) {
      headers = { ...(init.headers as Record<string, string>) }
    }

    return fetch(url, {
      ...init,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
  }, [token])

  // Buscar horários livres quando unidade e data forem selecionadas
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedFranchise || !selectedData) {
        setAvailableSlots([])
        return
      }
      try {
        setLoadingSlots(true)
        const timestamp = Date.now() // Cache buster
        const res = await authFetch(
          `${API_URL}/api/academies/${selectedFranchise}/available-slots?date=${selectedData}&teacher_id=${user?.id}&_t=${timestamp}`
        )
        if (res.ok) {
          const data = await res.json()
          setAvailableSlots((data.slots || []) as Slot[])
        } else {
          setAvailableSlots([])
        }
      } catch (e) {
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [selectedFranchise, selectedData, authFetch, user?.id])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setLoading(true)

        // Buscar academias do professor
        const academiesResponse = await authFetch(`${API_URL}/api/teachers/${user.id}/academies`)

        if (academiesResponse.ok) {
          const data = await academiesResponse.json()
          setFranchises(data.academies || [])
        }

        // Buscar agendamentos existentes do professor
        const bookingsResponse = await authFetch(`${API_URL}/api/bookings?teacher_id=${user.id}`)
        if (bookingsResponse.ok) {
          const data = await bookingsResponse.json()
          setBookings(data.bookings || [])
        }

        // Buscar preferências do professor (academy_ids)
        const prefRes = await authFetch(`${API_URL}/api/teachers/${user.id}/preferences`)
        if (prefRes.ok) {
          const pref = await prefRes.json()
          setAcademyIds(pref.academy_ids || [])
        }

        // Buscar alunos do professor
        const studentsRes = await authFetch(`${API_URL}/api/teachers/${user.id}/students`)
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          setStudents(studentsData.students || [])
        }
      } catch (error) {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token, authFetch])

  // Filtrar franquias pelas preferências do professor
  const franchisesFiltradas = useMemo(() => {
    if (!academyIds?.length) return franchises
    return franchises.filter(f => academyIds.includes(f.id))
  }, [franchises, academyIds])

  const franchiseSelecionada = franchisesFiltradas.find(f => f.id === selectedFranchise)

  // Verificação local opcional (não usada mais pois backend informa disponibilidade)

  const handleCreateStudent = async () => {
    if (!newStudent.name || !newStudent.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    if (!selectedFranchise) {
      toast.error('Selecione uma unidade primeiro')
      return
    }

    try {
      const response = await authFetch(`${API_URL}/api/teachers/${user?.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name,
          email: newStudent.email,
          phone: newStudent.phone,
          academy_id: selectedFranchise,
          hourly_rate: newStudent.hourly_rate ? parseFloat(newStudent.hourly_rate) : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Aluno cadastrado com sucesso!')
        setStudents([...students, data.student])
        setSelectedStudent(data.student.id)
        setShowNewStudentForm(false)
        setNewStudent({ name: '', email: '', phone: '', hourly_rate: '' })
      } else {
        toast.error(data.message || 'Erro ao cadastrar aluno')
      }
    } catch (error) {
      toast.error('Erro ao processar cadastro')
    }
  }

  const handleReservarHorario = async (horario: string) => {
    if (!selectedFranchise || !selectedData) {
      toast.error('Selecione uma unidade e data primeiro')
      return
    }

    if (!selectedStudent) {
      toast.error('Selecione um aluno ou cadastre um novo')
      return
    }

    setSubmitting(true)

    try {
      const bookingDate = new Date(`${selectedData}T${horario}:00Z`)

      if (isNaN(bookingDate.getTime())) {
        toast.error('Data ou horário inválido')
        setSubmitting(false)
        return
      }

      const slot = availableSlots.find(s => s.time === horario)
      const slotDuration = slot?.slot_duration || 60
      const endTime = new Date(bookingDate.getTime() + slotDuration * 60000)

      const selectedStudentData = students.find(s => s.id === selectedStudent)
      const studentId = selectedStudentData?.user_id || selectedStudent

      if (!studentId) {
        toast.error('Aluno invalido. Atualize a lista e tente novamente.')
        setSubmitting(false)
        return
      }

      const response = await authFetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'PROFESSOR',
          professorId: user?.id,
          studentId,
          academyId: selectedFranchise, // Usar academyId diretamente (franchise_id)
          startAt: bookingDate.toISOString(),
          endAt: endTime.toISOString(),
          professorNotes:
            observacoes ||
            `Agendamento para ${selectedStudentData?.name || 'Aluno selecionado'}`
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Horário reservado com sucesso!')

        const bookingsResponse = await authFetch(`${API_URL}/api/bookings?teacher_id=${user?.id}`)
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          setBookings(bookingsData.bookings || [])
        }

        if (selectedFranchise && selectedData) {
          const timestamp = Date.now() // Cache buster
          const slotsResponse = await authFetch(
            `${API_URL}/api/academies/${selectedFranchise}/available-slots?date=${selectedData}&teacher_id=${user?.id}&_t=${timestamp}`
          )
          if (slotsResponse.ok) {
            const slotsData = await slotsResponse.json()
            setAvailableSlots((slotsData.slots || []) as Slot[])
          }
        }

        setSelectedStudent('')
        setSelectedHorario('')
        setObservacoes('')
      } else {
        toast.error(data.message || 'Erro ao reservar horário')
      }
    } catch (error) {
      toast.error('Erro ao processar reserva')
    } finally {
      setSubmitting(false)
    }
  }

  // Calcular progresso do wizard (ANTES dos returns condicionais)
  const progress = useMemo(() => {
    let step = 0
    if (selectedFranchise) step = 1
    if (selectedStudent) step = 2
    if (selectedData) step = 3
    if (selectedHorario) step = 4
    return (step / 4) * 100
  }, [selectedFranchise, selectedStudent, selectedData, selectedHorario])

  if (!user || !token) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-4 md:p-8">
        {/* Header Moderno */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-meu-primary to-blue-600 bg-clip-text text-transparent mb-2">
                Reservar Horário
              </h1>
              <p className="text-gray-600 text-lg">
                Reserve horários para seus alunos de forma rápida e fácil
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Users className="h-5 w-5 text-meu-primary" />
              <span className="text-sm font-medium text-gray-700">{students.length} alunos</span>
            </div>
          </div>
          
          {/* Barra de Progresso */}
          <div className="bg-white rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-meu-primary to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className={selectedFranchise ? 'text-meu-primary font-medium' : ''}>Unidade</span>
            <span className={selectedStudent ? 'text-meu-primary font-medium' : ''}>Aluno</span>
            <span className={selectedData ? 'text-meu-primary font-medium' : ''}>Data</span>
            <span className={selectedHorario ? 'text-meu-primary font-medium' : ''}>Horário</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Reserva */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Seleção de Unidade */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader 
                className="bg-gradient-to-r from-meu-primary/10 to-blue-50 cursor-pointer"
                onClick={() => setExpandedStep(expandedStep === 1 ? 0 : 1)}
              >
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center">
                    <div className="p-2 bg-meu-primary rounded-lg mr-3">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="block">Passo 1: Escolha a Unidade</span>
                      {selectedFranchise && expandedStep !== 1 ? (
                        <span className="text-sm font-normal text-meu-primary">
                          ✓ {franchiseSelecionada?.name}
                        </span>
                      ) : (
                        <span className="text-sm font-normal text-gray-600">Selecione onde deseja reservar</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedFranchise && expandedStep !== 1 && (
                      <Edit2 className="h-4 w-4 text-meu-primary" />
                    )}
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${expandedStep === 1 ? 'rotate-180' : ''}`} />
                  </div>
                </CardTitle>
              </CardHeader>
              {expandedStep === 1 && (
                <CardContent className="pt-6">
                {franchisesFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Nenhuma unidade disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {franchisesFiltradas.map(franchise => (
                      <div
                        key={franchise.id}
                        className={`group relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                          selectedFranchise === franchise.id
                            ? 'border-meu-primary bg-gradient-to-br from-meu-primary/10 to-blue-50 shadow-md scale-105'
                            : 'border-gray-200 hover:border-meu-primary/50 hover:shadow-md hover:scale-102'
                        }`}
                        onClick={() => {
                          setSelectedFranchise(franchise.id)
                          setSelectedData('')
                          setExpandedStep(2) // Auto-expandir próximo passo
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{franchise.name}</h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {franchise.address}
                            </p>
                          </div>
                          {selectedFranchise === franchise.id && (
                            <div className="flex-shrink-0 ml-3">
                              <div className="bg-meu-primary rounded-full p-1">
                                <CheckCircle className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              )}
            </Card>

            {/* Seleção de Aluno */}
            {selectedFranchise && (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-4">
                <CardHeader 
                  className="bg-gradient-to-r from-blue-50 to-meu-primary/10 cursor-pointer"
                  onClick={() => setExpandedStep(expandedStep === 2 ? 0 : 2)}
                >
                  <CardTitle className="flex items-center justify-between text-xl">
                    <div className="flex items-center">
                      <div className="p-2 bg-meu-primary rounded-lg mr-3">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="block">Passo 2: Selecionar Aluno</span>
                        {selectedStudent && expandedStep !== 2 ? (
                          <span className="text-sm font-normal text-meu-primary">
                            ✓ {students.find(s => s.id === selectedStudent)?.name}
                          </span>
                        ) : (
                          <span className="text-sm font-normal text-gray-600">Escolha para quem é a reserva</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedStudent && expandedStep !== 2 && (
                        <Edit2 className="h-4 w-4 text-meu-primary" />
                      )}
                      <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${expandedStep === 2 ? 'rotate-180' : ''}`} />
                    </div>
                  </CardTitle>
                </CardHeader>
                {expandedStep === 2 && (
                  <CardContent className="space-y-4 pt-6">
                  {!showNewStudentForm ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Escolha o aluno
                        </label>
                        <select
                          value={selectedStudent}
                          onChange={(e) => {
                            setSelectedStudent(e.target.value)
                            if (e.target.value) setExpandedStep(3) // Auto-expandir próximo passo
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        >
                          <option value="">Selecione um aluno...</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name} - {student.email}
                              {student.hourly_rate ? ` (R$ ${student.hourly_rate.toFixed(2)}/h)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setShowNewStudentForm(true)}
                          className="w-full"
                        >
                          + Cadastrar Novo Aluno
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do Aluno *
                          </label>
                          <input
                            type="text"
                            value={newStudent.name}
                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                            placeholder="Ex: João Silva"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={newStudent.email}
                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                            placeholder="joao@email.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Telefone (opcional)
                          </label>
                          <input
                            type="tel"
                            value={newStudent.phone}
                            onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor da Hora/Aula (R$) (opcional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newStudent.hourly_rate}
                            onChange={(e) => setNewStudent({ ...newStudent, hourly_rate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                            placeholder="Ex: 150.00"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleCreateStudent}
                          className="flex-1 bg-meu-primary hover:bg-meu-primary/90"
                        >
                          Cadastrar Aluno
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewStudentForm(false)
                            setNewStudent({ name: '', email: '', phone: '', hourly_rate: '' })
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
                )}
              </Card>
            )}

            {/* Data e Horários Livres */}
            {selectedFranchise && selectedStudent && (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 animate-in slide-in-from-bottom-4">
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                  <CardTitle className="flex items-center text-xl">
                    <div className="p-2 bg-meu-primary rounded-lg mr-3">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="block">Passo 3: Data e Horário</span>
                      <span className="text-sm font-normal text-gray-600">Escolha quando será a aula</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
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
                              onClick={() => setSelectedHorario(slot.time)}
                              className={`${
                                selectedHorario === slot.time
                                  ? 'bg-meu-primary text-white border-meu-primary'
                                  : slot.is_free
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

                      {selectedStudent && (
                        <div>
                          <span className="text-sm text-gray-600">Aluno:</span>
                          <p className="font-medium text-gray-900">
                            {students.find(s => s.id === selectedStudent)?.name}
                            {students.find(s => s.id === selectedStudent)?.hourly_rate && (
                              <span className="ml-2 text-sm text-green-600 font-semibold">
                                (R$ {students.find(s => s.id === selectedStudent)?.hourly_rate?.toFixed(2)}/h)
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {selectedHorario && (
                        <div>
                          <span className="text-sm text-gray-600">Horário:</span>
                          <p className="font-medium text-gray-900">{selectedHorario}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-sm text-gray-600">Duração:</span>
                        <p className="font-medium text-gray-900">
                          {selectedHorario ? `${availableSlots.find(s => s.time === selectedHorario)?.slot_duration || 60} minutos` : 'Conforme configuração da unidade'}
                        </p>
                      </div>
                    </div>

                    {selectedHorario && selectedStudent && selectedData ? (
                      <Button
                        onClick={() => handleReservarHorario(selectedHorario)}
                        disabled={submitting}
                        className="w-full bg-meu-primary hover:bg-meu-primary/90"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Confirmando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar Reserva
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Como funciona?</p>
                            <p>Selecione unidade, aluno, data e horário para confirmar a reserva.</p>
                            <br></br>
                            <p>Após isso, será criado um agendamento em "Minha Agenda" por lá, você pode monitorar suas reservas e agendamentos feitos por outros alunos </p>
                          </div>
                        </div>
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

