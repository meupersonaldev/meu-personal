'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Star, Loader2, MapPin } from 'lucide-react'
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
import { academiesAPI, API_BASE_URL, teachersAPI } from '@/lib/api'


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
        const res = await fetch(`${API_BASE_URL}/api/packages/student/balance`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
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
    () => allLocations.find((loc) => loc.id === selectedAcademyId),
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
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-meu-primary/5">
      <div className="max-w-6xl mx-auto flex flex-col gap-5 p-4 sm:gap-7 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Encontre seu Professor
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Siga os passos abaixo para agendar sua aula personalizada
          </p>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
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
        <Card className="border-2 border-meu-primary/30 shadow-lg">
          {/* Step 1: Seletor de Unidade */}
          {currentStep === 0 && (
            <div className="animate-in fade-in duration-300">
              <CardHeader className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                  <div className="p-2 bg-meu-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <span className="font-bold">Passo 1: Selecione sua Unidade</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
                {isUnitsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-meu-primary" />
                    <p className="text-sm text-gray-500">Carregando unidades...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select value={selectedAcademyId} onValueChange={(value) => {
                      setSelectedAcademyId(value)
                      setCurrentStep(1)
                    }}>
                      <SelectTrigger className="w-full h-12 sm:h-14 text-sm sm:text-base border-2 hover:border-meu-primary/50 transition-colors">
                        <SelectValue placeholder={allLocations.length ? 'Escolha a unidade onde deseja treinar...' : 'Nenhuma unidade disponível'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 sm:max-h-80">
                        {allLocations.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-sm sm:text-base py-3">
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
                    <div className="flex justify-end mt-6">
                      <Button
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
            <div className="animate-in fade-in duration-300">
              <CardHeader className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                  <div className="p-2 bg-meu-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Passo 2: Escolha o Dia</span>
                    {selectedLocation?.label && (
                      <span className="text-xs sm:text-sm font-normal text-gray-500">para {selectedLocation.label}</span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-semibold text-gray-700">Selecione a data da aula</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={today}
                      className="border-2 rounded-lg px-4 py-3 w-full sm:w-auto text-sm sm:text-base hover:border-meu-primary/50 focus:border-meu-primary focus:ring-2 focus:ring-meu-primary/20 transition-all"
                    />
                    <div className="text-xs sm:text-sm text-gray-600">
                      {balanceLoading ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando créditos...</span>
                      ) : balanceAvailable != null ? (
                        balanceAvailable > 0 ? (
                          <span className="text-green-700">Créditos disponíveis: {balanceAvailable}</span>
                        ) : (
                          <span className="text-red-600">Você não possui créditos suficientes</span>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-4 border-t">
                    <Button
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
                      onClick={async () => {
                        if (!selectedAcademyId || !selectedDate) return
                        try {
                          setAvailabilityError(null)
                          setCheckingAvailability(true)
                          // Para cada professor, verificar se há ao menos um horário livre neste dia
                          const results = await Promise.all(
                            activeTeachers.map(async (t) => {
                              try {
                                const resp = await academiesAPI.getAvailableSlots(
                                  selectedAcademyId,
                                  selectedDate,
                                  t.id,
                                )
                                const slots = Array.isArray(resp?.slots) ? resp.slots : []
                                const dayBookings = Array.isArray(resp?.bookings) ? resp.bookings : []
                                const anyFree = slots.some((s: any) => s?.is_free)
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
                        variant="outline"
                        onClick={() => router.push('/aluno/comprar')}
                        className="h-11 sm:h-12 px-6 text-sm sm:text-base"
                      >
                        Comprar créditos
                      </Button>
                    )}
                  </div>
                  {availabilityError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <p className="text-sm text-red-700 font-medium">{availabilityError}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          )}

          {/* Step 3: Lista de Professores Disponíveis */}
          {selectedAcademyId && currentStep === 2 && (
            <div className="animate-in fade-in duration-300">
              <CardHeader className="border-b-2 border-meu-primary/10 bg-gradient-to-r from-meu-primary/10 via-meu-primary/5 to-transparent py-4 px-4 sm:py-5 sm:px-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                  <div className="p-2 bg-meu-primary/10 rounded-lg">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-meu-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Passo 3: Professores Disponíveis</span>
                    {selectedLocation?.label && (
                      <span className="text-xs sm:text-sm font-normal text-gray-500">
                        em {selectedLocation.label} {selectedDate ? `• ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
              {isTeachersLoading || checkingAvailability ? (
                <div className="flex items-center justify-center py-10 sm:py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-meu-primary" />
                </div>
              ) : activeTeachers.length === 0 ? (
                <div className="text-center py-10 sm:py-12 text-gray-500">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-medium">Nenhum professor disponível</p>
                  <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 px-4">
                    Não há professores cadastrados nesta unidade no momento.
                  </p>
                </div>
              ) : (
                (() => {
                  const availableList = teachers.filter((t) => availableTeacherIds.has(t.id))
                  if (availableList.length === 0) {
                    return (
                      <div className="text-center py-10 sm:py-12 text-gray-500">
                        <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                        <p className="text-base sm:text-lg font-medium">Nenhum professor com horário livre nesta data</p>
                        <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 px-4">
                          Tente escolher outro dia ou unidade.
                        </p>
                      </div>
                    )
                  }
                  return (
                    <>
                      <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-meu-primary">{availableList.length}</span> {availableList.length === 1 ? 'professor disponível' : 'professores disponíveis'}
                        </p>
                        <Button
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
                      <div className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {availableList.map((teacher) => (
                          <Card
                            key={teacher.id}
                            className="group relative border-2 border-gray-200 hover:border-meu-primary/70 hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white"
                          >
                            {/* Badge de disponibilidade flutuante */}
                            {teacher.teacher_profiles?.[0]?.is_available && (
                              <div className="absolute top-4 right-4 z-10">
                                <Badge className="bg-green-500 text-white border-0 text-xs font-semibold shadow-lg px-3 py-1">
                                  ✓ Disponível
                                </Badge>
                              </div>
                            )}

                            <CardContent className="p-0">
                              <div className="flex flex-col h-full">
                                {/* Header com Avatar - Design mais compacto */}
                                <div className="relative bg-gradient-to-br from-meu-primary/5 via-meu-primary/3 to-transparent p-6 pb-8">
                                  <div className="flex flex-col items-center text-center gap-3">
                                    <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-4 ring-meu-primary/10 group-hover:ring-meu-primary/30 transition-all">
                                      {teacher.avatar_url && (
                                        <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white font-bold text-2xl">
                                        {teacher.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="w-full">
                                      <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{teacher.name}</h3>
                                      {/* Avaliação logo abaixo do nome */}
                                      <div className="flex items-center justify-center gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                          {Array.from({ length: 5 }).map((_, i) => {
                                            const idx = i + 1
                                            const filled = idx <= Math.round(teacher.rating_avg || 0)
                                            return (
                                              <Star key={idx} className={`h-4 w-4 ${filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                                            )
                                          })}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">
                                          {typeof teacher.rating_avg === 'number' ? teacher.rating_avg.toFixed(1) : '0.0'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({teacher.rating_count || 0})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo - Mais espaçado */}
                                <div className="p-5 flex-1 flex flex-col gap-5">
                                  {/* Especialidades */}
                                  {teacher.teacher_profiles?.[0]?.specialties && teacher.teacher_profiles[0].specialties.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-1 h-4 bg-meu-primary rounded-full"></span>
                                        Especialidades
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {teacher.teacher_profiles[0].specialties.slice(0, 3).map((specialty, idx) => (
                                          <Badge 
                                            key={idx} 
                                            variant="outline" 
                                            className="text-xs font-medium border-meu-primary/40 text-gray-700 bg-meu-primary/5 hover:bg-meu-primary/10 transition-colors px-3 py-1"
                                          >
                                            {specialty}
                                          </Badge>
                                        ))}
                                        {teacher.teacher_profiles[0].specialties.length > 3 && (
                                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                                            +{teacher.teacher_profiles[0].specialties.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Botões de ação - Melhor hierarquia */}
                                  <div className="flex flex-col gap-2.5 mt-auto pt-4 border-t border-gray-100">
                                      {teacherBookings[teacher.id]?.length ? (
                                        <p className="text-xs text-gray-500">
                                          {teacherBookings[teacher.id].length}{' '}
                                          {teacherBookings[teacher.id].length === 1
                                            ? 'agendamento'
                                            : 'agendamentos'}{' '}
                                          já marcados nesta data.
                                        </p>
                                      ) : null}
                                    <Button
                                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-meu-primary to-meu-primary-dark text-white hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      disabled={balanceAvailable !== null && balanceAvailable <= 0}
                                      title={balanceAvailable !== null && balanceAvailable <= 0 ? 'Sem créditos suficientes' : 'Agendar aula'}
                                      onClick={() =>
                                        router.push(
                                          `/aluno/agendar?teacher_id=${teacher.id}&academy_id=${selectedAcademyId}${
                                            selectedDate ? `&date=${selectedDate}` : ''
                                          }`,
                                        )
                                      }
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      Agendar Aula
                                    </Button>
                                    {balanceAvailable !== null && balanceAvailable <= 0 && (
                                      <Button
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
