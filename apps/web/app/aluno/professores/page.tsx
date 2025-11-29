'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Loader2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentUnitsStore } from '@/lib/stores/student-units-store'
import type { Teacher } from '@/lib/stores/student-store'
import WizardStepper from '@/components/franchise-form/WizardStepper'
import { academiesAPI, teachersAPI } from '@/lib/api'


export default function StudentProfessoresPage() {
  const router = useRouter()
  const { user, isAuthenticated, token } = useAuthStore()
  const {
    units,
    availableUnits,
    isLoading: isUnitsLoading,
    fetchUnits,
    fetchAvailableUnits,
  } = useStudentUnitsStore()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isTeachersLoading, setIsTeachersLoading] = useState(false)
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<number>(0)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(false)
  const [availableTeacherIds, setAvailableTeacherIds] = useState<Set<string>>(new Set())
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false)
  const [balanceAvailable, setBalanceAvailable] = useState<number | null>(null)
  const [teacherBookings, setTeacherBookings] = useState<Record<string, any[]>>({})
  // Estado para professores buscados por academy_id
  const [academyTeachers, setAcademyTeachers] = useState<any[]>([])
  const [academyTeachersLoading, setAcademyTeachersLoading] = useState<boolean>(false)

  useEffect(() => {
    if (user?.id) {
      fetchUnits()
      fetchAvailableUnits()
    }
  }, [user?.id, fetchUnits, fetchAvailableUnits])

  // Pré-checagem de créditos do aluno
  useEffect(() => {
    const loadBalance = async () => {
      if (!token) return
      try {
        setBalanceLoading(true)
        const res = await fetch(`/api/packages/student/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const available = Number(
          data?.balance?.available_classes ?? (
            data?.balance
              ? (data.balance.total_purchased - data.balance.total_consumed - data.balance.locked_qty)
              : 0
          )
        )
        setBalanceAvailable(Number.isFinite(available) ? available : 0)
      } finally {
        setBalanceLoading(false)
      }
    }
    loadBalance()
  }, [token])

  // Função para buscar professores por academy_id (não mais usada para exibição principal, mas mantida se necessário)
  const loadTeachersByAcademy = useCallback(async (academyId: string) => {
    // Implementação mantida para referência ou uso futuro
  }, [])

  // Carregar professores removido - usamos activeTeachers carregado no início


  // Lista unificada de academias disponíveis (derivadas das unidades)
  const allLocations = useMemo(() => {
    const map = new Map<string, { id: string; label: string; city?: string | null; state?: string | null }>()

    const append = (academyId?: string | null, name?: string | null, city?: string | null, state?: string | null) => {
      if (!academyId) return
      if (map.has(academyId)) return
      map.set(academyId, {
        id: academyId,
        label: name || 'Academia',
        city,
        state,
      })
    }

    for (const su of units) {
      const academyId = (su.unit as any)?.academy_legacy_id || null
      append(academyId, su.unit?.name, su.unit?.city, su.unit?.state)
    }
    for (const u of availableUnits) {
      const academyId = (u as any)?.academy_legacy_id || null
      append(academyId, u.name, u.city, u.state)
    }

    return Array.from(map.values())
  }, [units, availableUnits])

  const selectedLocation = useMemo(
    () => (allLocations || []).find((loc) => loc.id === selectedAcademyId),
    [allLocations, selectedAcademyId],
  )

  const activeTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) => teacher.is_active && (teacher.teacher_profiles?.[0]?.is_available ?? true),
      ),
    [teachers],
  )

  useEffect(() => {
    if (!selectedAcademyId) {
      setTeachers([])
      return
    }

    let cancelled = false
    const fetchTeachers = async () => {
      try {
        setIsTeachersLoading(true)
        setAvailabilityError(null)
        setAvailableTeacherIds(new Set())
        const data = await teachersAPI.getAll({ academy_id: selectedAcademyId })
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data?.teachers || []
          setTeachers(
            list.filter(
              (teacher: Teacher) =>
                teacher.is_active && (teacher.teacher_profiles?.[0]?.is_available ?? true),
            ),
          )
        }
      } catch (error) {
        console.error('Erro ao carregar professores:', error)
        if (!cancelled) {
          setTeachers([])
        }
      } finally {
        if (!cancelled) {
          setIsTeachersLoading(false)
        }
      }
    }

    fetchTeachers()
  }, [selectedAcademyId])

  if (!user || !isAuthenticated) {
    return null
  }

  return (
    <div id="aluno-professores-page" className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-meu-primary/5">
      <div id="aluno-professores-container" className="max-w-6xl mx-auto flex flex-col gap-5 p-4 sm:gap-7 sm:p-6 md:p-8">
        {/* Header */}
        <div id="aluno-professores-header" className="flex flex-col gap-2 sm:gap-3">
          <h1 id="aluno-professores-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Encontre seu Professor
          </h1>
          <p id="aluno-professores-subtitle" className="text-sm sm:text-base text-gray-600">
            Siga os passos abaixo para agendar sua aula personalizada
          </p>
        </div>

        {/* Stepper */}
        <div id="aluno-professores-stepper-container" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <WizardStepper
          steps={["Unidade", "Dia", "Professor"]}
          current={currentStep}
          onSelect={(idx) => {
            if (idx <= currentStep) {
              setCurrentStep(idx)
              if (idx < 2) {
                setAvailableTeacherIds(new Set())
                setAvailabilityError(null)
                setCheckingAvailability(false)
              }
            }
          }}
        />
        </div>

        {/* Container único para todos os steps - apenas o ativo é exibido */}
        <Card id="aluno-professores-main-card" className="border-2 border-meu-primary/30 shadow-lg">
          {/* Step 1: Seletor de Unidade */}
          {currentStep === 0 && (
            <div id="aluno-professores-step-1" className="animate-in fade-in duration-300">
              <CardHeader id="aluno-professores-step-1-header" className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle id="aluno-professores-step-1-title" className="text-lg sm:text-xl flex items-center gap-3">
                  <div id="aluno-professores-step-1-icon" className="p-2 bg-meu-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <span className="font-bold">Passo 1: Selecione sua Unidade</span>
                </CardTitle>
              </CardHeader>
              <CardContent id="aluno-professores-step-1-content" className="p-4 sm:p-6 md:p-8">
                {isUnitsLoading ? (
                  <div id="aluno-professores-step-1-loading" className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-meu-primary" />
                    <p className="text-sm text-gray-500">Carregando unidades...</p>
                  </div>
                ) : (
                  <div id="aluno-professores-step-1-form" className="space-y-4">
                    <Select value={selectedAcademyId} onValueChange={(value) => {
                      setSelectedAcademyId(value)
                      setCurrentStep(1)
                    }}>
                      <SelectTrigger id="aluno-professores-unit-select-trigger" className="w-full h-12 sm:h-14 text-sm sm:text-base border-2 hover:border-meu-primary/50 transition-colors">
                        <SelectValue placeholder={(allLocations || []).length ? 'Escolha a unidade onde deseja treinar...' : 'Nenhuma unidade disponível'} />
                      </SelectTrigger>
                      <SelectContent id="aluno-professores-unit-select-content" className="max-h-64 sm:max-h-80">
                        {(allLocations || []).map((u) => (
                          <SelectItem key={u.id} id={`aluno-professores-unit-option-${u.id}`} value={u.id} className="text-sm sm:text-base py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="font-semibold text-gray-900">{u.label}</span>
                              {(u.city || u.state) && (
                                <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {u.city ? `${u.city}` : ''}{u.state ? `, ${u.state}` : ''}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div id="aluno-professores-step-1-actions" className="flex justify-end mt-6">
                      <Button
                        id="aluno-professores-step-1-continue-btn"
                        disabled={!selectedAcademyId}
                        onClick={() => setCurrentStep(1)}
                        className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-meu-primary hover:bg-meu-primary-dark text-white shadow-md hover:shadow-lg transition-all"
                      >
                        Continuar para Escolha do Dia
                        <Calendar className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          )}

          {/* Step 2: Selecionar Dia */}
          {selectedAcademyId && currentStep === 1 && (
            <div id="aluno-professores-step-2" className="animate-in fade-in duration-300">
              <CardHeader id="aluno-professores-step-2-header" className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle id="aluno-professores-step-2-title" className="text-lg sm:text-xl flex items-center gap-3">
                  <div id="aluno-professores-step-2-icon" className="p-2 bg-meu-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Passo 2: Escolha o Dia</span>
                    {selectedLocation?.label && (
                      <span id="aluno-professores-step-2-subtitle" className="text-xs sm:text-sm font-normal text-gray-500">para {selectedLocation.label}</span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent id="aluno-professores-step-2-content" className="p-4 sm:p-6 md:p-8">
                <div id="aluno-professores-step-2-form" className="space-y-6">
                  <div id="aluno-professores-date-selector" className="flex flex-col gap-3">
                    <label id="aluno-professores-date-label" className="text-sm font-semibold text-gray-700">Selecione a data da aula</label>
                    <input
                      id="aluno-professores-date-input"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={today}
                      className="border-2 rounded-lg px-4 py-3 w-full sm:w-auto text-sm sm:text-base hover:border-meu-primary/50 focus:border-meu-primary focus:ring-2 focus:ring-meu-primary/20 transition-all"
                    />
                    <div id="aluno-professores-balance-info" className="text-xs sm:text-sm text-gray-600">
                      {balanceLoading ? (
                        <span id="aluno-professores-balance-loading" className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando créditos...</span>
                      ) : balanceAvailable != null ? (
                        balanceAvailable > 0 ? (
                          <span id="aluno-professores-balance-available" className="text-green-700">Créditos disponíveis: {balanceAvailable}</span>
                        ) : (
                          <span id="aluno-professores-balance-unavailable" className="text-red-600">Você não possui créditos suficientes</span>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div id="aluno-professores-step-2-actions" className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-4 border-t">
                    <Button
                      id="aluno-professores-step-2-back-btn"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(0)
                        setAvailableTeacherIds(new Set())
                        setAvailabilityError(null)
                      }}
                      className="h-11 sm:h-12 px-6 text-sm sm:text-base font-semibold border-2 hover:bg-gray-50"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Voltar para Unidade
                    </Button>
                    <Button
                      id="aluno-professores-step-2-check-availability-btn"
                      onClick={async () => {
                        if (!selectedAcademyId || !selectedDate) return
                        try {
                          console.log(`[DEBUG] Verificando disponibilidade para ${activeTeachers.length} professores`)
                          setAvailabilityError(null)
                          setCheckingAvailability(true)
                          // Para cada professor, verificar se há ao menos um horário livre neste dia
                          // Usar o endpoint bookings-by-date que já tem a lógica correta de filtrar horários ocupados
                          const results = await Promise.all(
                            activeTeachers.map(async (t) => {
                              try {
                                // Usar o endpoint correto que já filtra horários ocupados
                                const bookings = await teachersAPI.getBookingsByDate(t.id, selectedDate)
                                const bookingsList = Array.isArray(bookings) ? bookings : []
                                console.log(`[DEBUG] Professor ${t.name} (${t.id}): ${bookingsList.length} bookings`)
                                // Se há pelo menos um booking disponível (retornado pelo endpoint), o professor está disponível
                                const anyFree = bookingsList.length > 0
                                
                                // Para compatibilidade, manter a estrutura de bookings
                                const dayBookings = bookingsList
                                
                                return { id: t.id, available: anyFree, bookings: dayBookings }
                              } catch (error) {
                                console.error('Erro ao verificar disponibilidade', error)
                                return { id: t.id, available: false, bookings: [] }
                              }
                            }),
                          )
                          const availIds = new Set(results.filter((r) => r.available).map((r) => r.id))
                          const bookingsMap: Record<string, any[]> = {}
                          results.forEach((res) => {
                            bookingsMap[res.id] = res.bookings || []
                          })
                          setTeacherBookings(bookingsMap)
                          setAvailableTeacherIds(availIds)
                          setCurrentStep(2)
                        } catch (e: any) {
                          setAvailabilityError(e?.message || 'Erro ao verificar disponibilidade')
                        } finally {
                          setCheckingAvailability(false)
                        }
                      }}
                      disabled={!selectedDate || activeTeachers.length === 0 || checkingAvailability}
                      className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-meu-primary hover:bg-meu-primary-dark text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {checkingAvailability ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando disponibilidade...
                        </>
                      ) : (
                        <>
                          Ver Professores Disponíveis
                          <Users className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    {balanceAvailable !== null && balanceAvailable <= 0 && (
                      <Button
                        id="aluno-professores-step-2-buy-credits-btn"
                        variant="outline"
                        onClick={() => router.push('/aluno/comprar')}
                        className="h-11 sm:h-12 px-6 text-sm sm:text-base"
                      >
                        Comprar créditos
                      </Button>
                    )}
                  </div>
                  {availabilityError && (
                    <div id="aluno-professores-step-2-error" className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <p id="aluno-professores-step-2-error-message" className="text-sm text-red-700 font-medium">{availabilityError}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          )}

          {/* Step 3: Lista de Professores Disponíveis */}
          {selectedAcademyId && currentStep === 2 && (
            <div id="aluno-professores-step-3" className="animate-in fade-in duration-300">
              <CardHeader id="aluno-professores-step-3-header" className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle id="aluno-professores-step-3-title" className="text-lg sm:text-xl flex items-center gap-3">
                  <div id="aluno-professores-step-3-icon" className="p-2 bg-meu-primary/10 rounded-lg">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Passo 3: Professores Disponíveis</span>
                    {selectedLocation?.label && (
                      <span id="aluno-professores-step-3-subtitle" className="text-xs sm:text-sm font-normal text-gray-500">
                        em {selectedLocation.label} {selectedDate ? `• ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent id="aluno-professores-step-3-content" className="p-4 sm:p-6 md:p-8">
              {checkingAvailability ? (
                <div id="aluno-professores-step-3-loading" className="flex items-center justify-center py-10 sm:py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-meu-primary" />
                </div>
              ) : activeTeachers.length === 0 ? (
                <div id="aluno-professores-step-3-empty" className="text-center py-10 sm:py-12 text-gray-500">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p id="aluno-professores-step-3-empty-title" className="text-base sm:text-lg font-medium">Nenhum professor encontrado</p>
                  <p id="aluno-professores-step-3-empty-message" className="text-xs sm:text-sm mt-1.5 sm:mt-2 px-4">
                    Não há professores cadastrados nesta academia no momento.
                  </p>
                </div>
              ) : (
                (() => {
                  // Filtrar professores que têm disponibilidade na data selecionada
                  const teachersList = activeTeachers.filter(t => availableTeacherIds.has(t.id))
                  
                  if (teachersList.length === 0) {
                    return (
                      <div id="aluno-professores-step-3-no-availability" className="text-center py-10 sm:py-12 text-gray-500">
                        <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                        <p id="aluno-professores-step-3-no-availability-title" className="text-base sm:text-lg font-medium">Nenhum professor disponível</p>
                        <p id="aluno-professores-step-3-no-availability-message" className="text-xs sm:text-sm mt-1.5 sm:mt-2 px-4">
                          Nenhum professor tem horários livres para a data selecionada ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}).
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCurrentStep(1)
                            setAvailableTeacherIds(new Set())
                          }}
                          className="mt-4"
                        >
                          Escolher outra data
                        </Button>
                      </div>
                    )
                  }
                  return (
                    <>
                      <div id="aluno-professores-step-3-header-actions" className="flex items-center justify-between mb-6 pb-4 border-b">
                        <p id="aluno-professores-step-3-count" className="text-sm text-gray-600">
                          <span className="font-semibold text-meu-primary">{teachersList.length}</span> {teachersList.length === 1 ? 'professor disponível' : 'professores disponíveis'}
                        </p>
                        <Button
                          id="aluno-professores-step-3-change-date-btn"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentStep(1)
                            setAvailableTeacherIds(new Set())
                          }}
                          className="text-xs sm:text-sm"
                        >
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          Alterar Data
                        </Button>
                      </div>
                      <div id="aluno-professores-step-3-grid" className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {teachersList.map((teacher) => (
                          <Card
                            key={teacher.id}
                            id={`aluno-professores-teacher-card-${teacher.id}`}
                            className="group relative border-2 border-gray-200 hover:border-meu-primary/70 hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white"
                          >
                            {/* Badge de disponibilidade flutuante */}
                            {(() => {
                              // CORREÇÃO: Usar a mesma lógica do endpoint bookings-by-date
                              // Só mostrar tag se houver verificação de disponibilidade E houver horários realmente disponíveis
                              // O endpoint já filtra horários ocupados (com student_id não nulo)
                              const hasAvailableSlots = availableTeacherIds.size > 0 
                                ? availableTeacherIds.has(teacher.id)
                                : false // Não mostrar tag se ainda não foi feita a verificação
                              
                              // Mostrar badge apenas se realmente há horários disponíveis na data selecionada
                              if (!hasAvailableSlots) return null
                              
                              return (
                                <div id={`aluno-professores-teacher-badge-${teacher.id}`} className="absolute top-4 right-4 z-10">
                                  <Badge className="bg-green-500 text-white border-0 text-xs font-semibold shadow-lg px-3 py-1">
                                    ✓ Disponível
                                  </Badge>
                                </div>
                              )
                            })()}

                            <CardContent id={`aluno-professores-teacher-card-content-${teacher.id}`} className="p-0">
                              <div className="flex flex-col h-full">
                                {/* Header com Avatar - Design mais compacto */}
                                <div id={`aluno-professores-teacher-header-${teacher.id}`} className="relative bg-gradient-to-br from-meu-primary/5 via-meu-primary/3 to-transparent p-6 pb-8">
                                  <div className="flex flex-col items-center text-center gap-3">
                                    <Avatar id={`aluno-professores-teacher-avatar-${teacher.id}`} className="h-24 w-24 border-4 border-white shadow-xl ring-4 ring-meu-primary/10 group-hover:ring-meu-primary/30 transition-all">
                                      {teacher.avatar_url && (
                                        <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white font-bold text-2xl">
                                        {teacher.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div id={`aluno-professores-teacher-info-${teacher.id}`} className="w-full">
                                      <h3 id={`aluno-professores-teacher-name-${teacher.id}`} className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{teacher.name}</h3>
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo - Mais espaçado */}
                                <div id={`aluno-professores-teacher-body-${teacher.id}`} className="p-5 flex-1 flex flex-col gap-5">
                                  {/* Especialidades */}
                                  {teacher.teacher_profiles?.[0]?.specialties && teacher.teacher_profiles[0].specialties.length > 0 && (
                                    <div id={`aluno-professores-teacher-specialties-${teacher.id}`} className="space-y-2">
                                      <p id={`aluno-professores-teacher-specialties-label-${teacher.id}`} className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-1 h-4 bg-meu-primary rounded-full"></span>
                                        Especialidades
                                      </p>
                                      <div id={`aluno-professores-teacher-specialties-list-${teacher.id}`} className="flex flex-wrap gap-2">
                                        {teacher.teacher_profiles[0].specialties.slice(0, 3).map((specialty: string, idx: number) => (
                                          <Badge 
                                            key={idx}
                                            id={`aluno-professores-teacher-specialty-${teacher.id}-${idx}`}
                                            variant="outline" 
                                            className="text-xs font-medium border-meu-primary/40 text-gray-700 bg-meu-primary/5 hover:bg-meu-primary/10 transition-colors px-3 py-1"
                                          >
                                            {specialty}
                                          </Badge>
                                        ))}
                                        {teacher.teacher_profiles[0].specialties.length > 3 && (
                                          <Badge id={`aluno-professores-teacher-specialties-more-${teacher.id}`} variant="outline" className="text-xs text-gray-500 border-gray-300">
                                            +{teacher.teacher_profiles[0].specialties.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Botões de ação - Melhor hierarquia */}
                                  <div id={`aluno-professores-teacher-actions-${teacher.id}`} className="flex flex-col gap-2.5 mt-auto pt-4 border-t border-gray-100">
                                      {teacherBookings[teacher.id]?.length ? (
                                        <p className="text-xs text-gray-500">
                                          {teacherBookings[teacher.id].length}{' '}
                                          {teacherBookings[teacher.id].length === 1
                                            ? 'horário disponível'
                                            : 'horários disponíveis'}{' '}
                                          para esta data.
                                        </p>
                                      ) : null}
                                    <Button
                                      id={`aluno-professores-teacher-book-btn-${teacher.id}`}
                                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-meu-primary to-meu-primary-dark text-white hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      disabled={balanceAvailable !== null && balanceAvailable <= 0}
                                      title={balanceAvailable !== null && balanceAvailable <= 0 ? 'Sem créditos suficientes' : 'Agendar aula'}
                                      onClick={() => router.push(`/aluno/agendar?teacher_id=${teacher.id}&academy_id=${selectedAcademyId}${selectedDate ? `&date=${selectedDate}` : ''}`)}
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      Agendar Aula
                                    </Button>
                                    {balanceAvailable !== null && balanceAvailable <= 0 && (
                                      <Button
                                        id={`aluno-professores-teacher-buy-credits-btn-${teacher.id}`}
                                        variant="outline"
                                        onClick={() => router.push('/aluno/comprar')}
                                        className="w-full h-10 text-xs font-semibold border-2 border-meu-primary/30 text-meu-primary hover:bg-meu-primary/5"
                                      >
                                        💳 Comprar Créditos
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()
              )}
              </CardContent>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
