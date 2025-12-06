'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Loader2, MapPin, Search, ChevronRight, CheckCircle2, ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentUnitsStore } from '@/lib/stores/student-units-store'
import type { Teacher } from '@/lib/stores/student-store'
import WizardStepper from '@/components/franchise-form/WizardStepper'
import { teachersAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

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
        // Usar available_classes da API (fonte única de verdade)
        // Se não estiver disponível, calcular como fallback
        const balance = data?.balance
        const available = Number(
          balance?.available_classes ?? (
            balance
              ? (balance.total_purchased - balance.total_consumed - balance.locked_qty)
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
    () => teachers,
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
          const filtered = list.filter((teacher: Teacher) => teacher.is_active)
          setTeachers(filtered)
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
    return () => { cancelled = true }
  }, [selectedAcademyId])

  if (!user || !isAuthenticated) {
    return null
  }

  const checkAvailability = async () => {
    if (!selectedAcademyId || !selectedDate) return
    try {
      setAvailabilityError(null)
      setCheckingAvailability(true)
      const results = await Promise.all(
        activeTeachers.map(async (t) => {
          try {
            const bookings = await teachersAPI.getBookingsByDate(t.id, selectedDate)
            const bookingsList = Array.isArray(bookings) ? bookings : []
            const anyFree = bookingsList.length > 0
            return { id: t.id, available: anyFree, bookings: bookingsList }
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
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      {/* Top Decoration */}
      <div className="fixed top-0 left-0 w-full h-[30vh] bg-gradient-to-br from-blue-600 to-meu-primary -z-10 opacity-10 rounded-b-[40px]" />

      <div className="max-w-4xl mx-auto flex flex-col gap-6 p-4 md:p-6">

        {/* Header Compacto Mobile */}
        <div className="flex flex-col gap-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 text-gray-500 hover:text-meu-primary pl-1 sm:hidden"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Voltar
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {currentStep === 0 && "Escolha a Unidade"}
            {currentStep === 1 && "Escolha a Data"}
            {currentStep === 2 && "Escolha o Professor"}
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            {currentStep === 0 && "Para começar, onde você quer treinar?"}
            {currentStep === 1 && "Qual o melhor dia para o seu treino?"}
            {currentStep === 2 && "Encontramos estes profissionais para você."}
          </p>
        </div>

        {/* Stepper Minimalista */}
        <div className="flex items-center gap-2 mb-2">
          {[0, 1, 2].map((step) => (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                step <= currentStep ? "bg-meu-primary" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Dynamic Content */}
        <div className="relative">

          {/* Step 1: Unidade */}
          {currentStep === 0 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <Card className="border-0 shadow-lg overflow-hidden backdrop-blur-sm bg-white/90">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-8">

                  <div className="relative w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center animate-pulse-slow">
                    <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 opacity-50 blur-xl" />
                    <MapPin className="h-12 w-12 text-blue-600 relative z-10" />
                  </div>

                  {isUnitsLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
                      <p className="text-sm text-gray-400">Carregando unidades...</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      <div className="relative">
                        <Select value={selectedAcademyId} onValueChange={(value) => {
                          setSelectedAcademyId(value)
                        }}>
                          <SelectTrigger className="h-14 w-full text-base border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 rounded-xl px-4 bg-white">
                            <SelectValue placeholder="Toque para selecionar..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[60vh]">
                            {(allLocations || []).map((u) => (
                              <SelectItem key={u.id} value={u.id} className="py-4 px-4 border-b border-gray-50 last:border-0">
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-gray-900 text-base">{u.label}</span>
                                  {(u.city || u.state) && (
                                    <span className="text-xs text-gray-500 mt-0.5">
                                      {u.city}{u.state ? `, ${u.state}` : ''}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        disabled={!selectedAcademyId}
                        onClick={() => setCurrentStep(1)}
                        className="w-full h-14 text-lg font-bold bg-meu-primary hover:bg-meu-primary-dark shadow-lg shadow-blue-500/20 rounded-xl transition-all active:scale-95"
                      >
                        Continuar
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Data */}
          {selectedAcademyId && currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <Card className="border-0 shadow-lg overflow-hidden backdrop-blur-sm bg-white/90">
                <CardContent className="p-6 sm:p-8 flex flex-col gap-6">

                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Unidade Selecionada</p>
                      <p className="font-bold text-gray-900 truncate">{selectedLocation?.label}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => setCurrentStep(0)}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-900 ml-1">Selecione a Data</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={today}
                      className="h-16 w-full text-lg font-medium border-gray-200 shadow-sm rounded-xl px-4 cursor-pointer bg-white"
                    />
                  </div>

                  {/* Balance Info */}
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all",
                    balanceLoading ? "bg-gray-50 border-gray-100" :
                      (balanceAvailable !== null && balanceAvailable > 0)
                        ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 shadow-inner"
                        : "bg-gradient-to-br from-red-50 to-orange-50 border-red-100 shadow-inner"
                  )}>
                    {balanceLoading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">Verificando créditos...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            balanceAvailable && balanceAvailable > 0 ? "text-green-700" : "text-red-700"
                          )}>
                            Saldo da Carteira
                          </span>
                          {balanceAvailable !== null && balanceAvailable > 0 &&
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          }
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-3xl font-black",
                            balanceAvailable && balanceAvailable > 0 ? "text-green-800" : "text-red-800"
                          )}>
                            {balanceAvailable ?? 0}
                          </span>
                          <span className={cn(
                            "text-sm font-medium",
                            balanceAvailable && balanceAvailable > 0 ? "text-green-700" : "text-red-700"
                          )}>
                            aulas disponíveis
                          </span>
                        </div>

                        {balanceAvailable !== null && balanceAvailable <= 0 && (
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-red-100 hover:bg-red-200 text-red-700 border-0 shadow-none"
                            onClick={() => router.push('/aluno/comprar')}
                          >
                            Comprar Pacote de Aulas
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {availabilityError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-shake">
                      {availabilityError}
                    </div>
                  )}

                  <Button
                    disabled={!selectedDate || activeTeachers.length === 0 || checkingAvailability}
                    onClick={checkAvailability}
                    className="w-full h-14 mt-4 text-lg font-bold bg-meu-primary hover:bg-meu-primary-dark shadow-lg shadow-blue-500/20 rounded-xl transition-all active:scale-95"
                  >
                    {checkingAvailability ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Buscando Horários...
                      </>
                    ) : (
                      <>
                        Buscar Professores
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Lista de Professores */}
          {selectedAcademyId && currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-4">

              {/* Summary Bar */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-meu-primary" />
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-xs text-blue-600 font-medium h-8 hover:bg-blue-50 px-2">
                  Alterar
                </Button>
              </div>

              {activeTeachers.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Nenhum professor cadastrado.</p>
                </div>
              ) : (() => {
                const teachersList = activeTeachers.filter(t => availableTeacherIds.has(t.id))

                if (teachersList.length === 0) {
                  return (
                    <div className="text-center py-16 px-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Sem horários livres</h3>
                      <p className="text-gray-500 mb-8">
                        Não encontramos vagas para esta data.
                      </p>
                      <Button onClick={() => setCurrentStep(1)} className="w-full max-w-xs rounded-full">
                        Tentar outra data
                      </Button>
                    </div>
                  )
                }

                return (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 pb-24">
                    {teachersList.map((teacher) => (
                      <Card key={teacher.id} className="group overflow-visible border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white rounded-[24px]">
                        <div className="relative">
                          {/* Header Background */}
                          <div className="h-28 bg-gradient-to-r from-blue-600 to-meu-primary rounded-t-[24px] relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                          </div>

                          {/* Avatar - FIXED: Centered, overlapping, full visibility */}
                          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-blue-50">
                              {teacher.avatar_url && <AvatarImage src={teacher.avatar_url} className="object-cover" />}
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                                {teacher.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Availability Badge */}
                          <div className="absolute top-4 right-4">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 text-xs font-semibold shadow-sm">
                              {teacherBookings[teacher.id]?.length || 0} vagas
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="pt-16 pb-6 px-5 flex flex-col items-center text-center">
                          <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                            {teacher.name}
                          </h3>

                          <p className="text-sm text-gray-500 line-clamp-2 mb-5 px-2 min-h-[40px]">
                            {teacher.teacher_profiles?.[0]?.bio || 'Especialista em transformação física e saúde.'}
                          </p>

                          <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {teacher.teacher_profiles?.[0]?.specialties?.slice(0, 3).map((spec: string, i: number) => (
                              <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 border-0 rounded-lg text-xs font-medium px-2.5 py-1">
                                {spec}
                              </Badge>
                            ))}
                          </div>

                          <Button
                            className="w-full h-12 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all active:scale-95"
                            disabled={balanceAvailable !== null && balanceAvailable <= 0}
                            onClick={() => router.push(`/aluno/agendar?teacher_id=${teacher.id}&academy_id=${selectedAcademyId}${selectedDate ? `&date=${selectedDate}` : ''}`)}
                          >
                            Agendar Aula
                          </Button>

                          {balanceAvailable !== null && balanceAvailable <= 0 && (
                            <p className="text-xs text-red-500 font-semibold mt-2 animate-pulse">
                              Saldo insuficiente
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
