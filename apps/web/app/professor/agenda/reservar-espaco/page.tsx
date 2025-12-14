'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  ChevronDown,
  Edit2,
  ChevronLeft,
  User,
  Mail,
  Phone,
  DollarSign,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCpfCnpj, unformatCpfCnpj, validateCpfCnpj } from '@/lib/utils'

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

type GenderType = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY' | ''

interface Student {
  id: string
  name: string
  email: string
  phone?: string
  user_id?: string
  hourly_rate?: number
  notes?: string
  cpf?: string
  gender?: GenderType
  birth_date?: string
  hide_free_class?: boolean
}

export default function ReservarHorarioPage() {
  const router = useRouter()
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    hourly_rate: '',
    cpf: '',
    gender: '' as GenderType,
    birth_date: '',
    hide_free_class: false
  })
  const [selectedHorario, setSelectedHorario] = useState<string>('')
  const [expandedStep, setExpandedStep] = useState<number>(1) // Controla qual step está expandido

  // Estado para saldo de horas do professor
  const [professorHours, setProfessorHours] = useState<number | null>(null)
  const [loadingHours, setLoadingHours] = useState(true)

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

  // Função para buscar alunos
  const fetchStudents = useCallback(async () => {
    if (!user?.id || !token) return

    try {
      const studentsRes = await authFetch(`${API_URL}/api/teachers/${user.id}/students`)
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(studentsData.students || [])
      }
    } catch (error) {
      // Silenciar erro, apenas não atualizar a lista
    }
  }, [user?.id, token, authFetch])

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
        await fetchStudents()

        // Buscar saldo de horas do professor
        try {
          const hoursRes = await authFetch(`${API_URL}/api/teachers/${user.id}/hours`)
          if (hoursRes.ok) {
            const hoursData = await hoursRes.json()
            setProfessorHours(hoursData?.available_hours ?? 0)
          } else {
            setProfessorHours(0)
          }
        } catch {
          setProfessorHours(0)
        } finally {
          setLoadingHours(false)
        }
      } catch (error) {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token, authFetch, fetchStudents])

  // Filtrar franquias pelas preferências do professor
  const franchisesFiltradas = useMemo(() => {
    if (!academyIds?.length) return franchises
    return franchises.filter(f => academyIds.includes(f.id))
  }, [franchises, academyIds])

  const franchiseSelecionada = franchisesFiltradas.find(f => f.id === selectedFranchise)

  // Verificação local opcional (não usada mais pois backend informa disponibilidade)

  const handleCreateStudent = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    if (!selectedFranchise) {
      toast.error('Selecione uma unidade primeiro')
      return
    }

    // Validar gênero se fornecido
    if (formData.gender && !['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(formData.gender)) {
      toast.error('Gênero inválido')
      return
    }

    // Validar CPF se fornecido
    if (formData.cpf) {
      const cleanCpf = unformatCpfCnpj(formData.cpf)
      if (cleanCpf.length !== 11) {
        toast.error('CPF inválido. Deve conter 11 dígitos.')
        return
      }
      if (!validateCpfCnpj(cleanCpf)) {
        toast.error('CPF inválido.')
        return
      }
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        cpf: formData.cpf ? unformatCpfCnpj(formData.cpf) : null,
        gender: formData.gender || null,
        birth_date: formData.birth_date || null,
        hide_free_class: formData.hide_free_class,
        academy_id: selectedFranchise
      }

      const response = await authFetch(`${API_URL}/api/teachers/${user?.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        if (response.status === 200 && data.status === 'PENDING') {
          toast.success('Solicitação de vínculo enviada! Aguardando aprovação do aluno.')
        } else {
          toast.success('Aluno cadastrado com sucesso!')
        }
        // Recarregar lista de alunos
        await fetchStudents()
        // Selecionar o aluno recém-cadastrado se disponível
        if (data.student?.id) {
          setSelectedStudent(data.student.id)
        }
        setShowNewStudentForm(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          notes: '',
          hourly_rate: '',
          cpf: '',
          gender: '',
          birth_date: '',
          hide_free_class: false
        })
      } else {
        if (response.status === 409) {
          if (data.code === 'CONNECTION_PENDING') {
            toast.info('Solicitação já enviada e pendente. Aguarde o aluno aprovar.', { duration: 5000 })
          } else if (data.code === 'ALREADY_LINKED') {
            toast.error('Este aluno já está na sua carteira!')
          } else {
            toast.error(data.error || 'Conflito ao cadastrar aluno')
          }
        } else {
          toast.error(data.error || 'Erro ao salvar aluno')
        }
      }
    } catch (error) {
      toast.error('Erro ao processar requisição')
    }
  }

  const handleCloseModal = () => {
    setShowNewStudentForm(false)
    setFormData({
      name: '',
      email: '',
      phone: '',
      notes: '',
      hourly_rate: '',
      cpf: '',
      gender: '',
      birth_date: '',
      hide_free_class: false
    })
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
      // Criar data no fuso horário de São Paulo (não UTC)
      // selectedData é YYYY-MM-DD, horario é HH:MM
      // Criar como horário local de São Paulo
      const [year, month, day] = selectedData.split('-').map(Number)
      const [hours, minutes] = horario.split(':').map(Number)

      // Criar data local (o navegador vai usar o fuso local)
      const bookingDate = new Date(year, month - 1, day, hours, minutes, 0)

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

      // Debug: mostrar o que está sendo enviado
      console.log('[DEBUG] Dados do agendamento:', {
        selectedData,
        horario,
        bookingDateLocal: bookingDate.toString(),
        bookingDateISO: bookingDate.toISOString(),
        endTimeISO: endTime.toISOString()
      })

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
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto font-sans">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-[#002C4E] rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-blue-900/20 mb-8">
          <div className="absolute top-0 right-0 p-32 bg-[#27DFFF]/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 p-24 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>

          <div className="relative z-10">
            {/* Back button - Alinhado parecido com o breadcrumb visual */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/professor/agenda')}
              className="text-white/60 hover:text-white hover:bg-white/10 mb-6 pl-0 hover:pl-2 transition-all"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar à Agenda
            </Button>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
                    <Calendar className="h-6 w-6 text-[#27DFFF]" />
                  </div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                    Reservar Horário
                  </h1>
                </div>
                <p className="text-blue-100/80 text-base md:text-lg font-light max-w-xl leading-relaxed pl-1">
                  Reserve horários para seus alunos de forma rápida e fácil.
                </p>
              </div>

              {/* Stats Badge - Estilo KPI Mini Card da Agenda mas único */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3 w-3 text-[#27DFFF]" />
                  <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Seus Alunos</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {students.length}
                </p>
              </div>
            </div>

            {/* Progress Steps (Compacto e integrado ao fundo) */}
            <div className="hidden md:grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
              {['Unidade', 'Aluno', 'Data', 'Horário'].map((label, i) => {
                const step = i + 1
                const isActive = (step === 1 && selectedFranchise) ||
                  (step === 2 && selectedStudent) ||
                  (step === 3 && selectedData) ||
                  (step === 4 && selectedHorario)

                // Logic to determine if "current" step
                let isCurrent = false
                if (step === 1 && !selectedFranchise) isCurrent = true
                else if (step === 2 && selectedFranchise && !selectedStudent) isCurrent = true
                else if (step === 3 && selectedStudent && !selectedData) isCurrent = true
                else if (step === 4 && selectedData && !selectedHorario) isCurrent = true

                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                      ${isActive ? 'bg-[#27DFFF] text-[#002C4E] shadow-[0_0_15px_rgba(39,223,255,0.4)]' :
                        isCurrent ? 'bg-white text-[#002C4E] scale-110 shadow-lg' : 'bg-white/10 text-white/40 border border-white/10'}
                    `}>
                      {i + 1}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${isActive || isCurrent ? 'text-white' : 'text-white/40'}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-0 max-w-full pb-12">
          {/* Aviso de saldo insuficiente */}
          {!loadingHours && professorHours !== null && professorHours <= 0 && (
            <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-1">Saldo de Horas Insuficiente</h3>
                    <p className="text-red-700 mb-4">
                      Você não possui horas disponíveis para agendar aulas para seus alunos.
                      Compre um pacote de horas para continuar.
                    </p>
                    <Button
                      onClick={() => router.push('/professor/carteira')}
                      className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/10"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Comprar Horas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saldo de horas disponível */}
          {!loadingHours && professorHours !== null && professorHours > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="p-1 bg-green-100 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-green-800 font-medium">
                Você tem <strong>{professorHours}</strong> hora(s) disponível(is) para agendar
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Conteúdo Principal */}
            <div className="xl:col-span-2 space-y-6">

              {/* Passo 1: Seleção de Unidade */}
              <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in">
                <CardHeader
                  className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-4 md:p-6"
                >
                  <CardTitle className="flex items-center justify-between text-base md:text-lg">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`p-2 md:p-2.5 rounded-xl bg-[#002C4E]/10`}>
                        <MapPin className={`h-4 w-4 md:h-5 md:w-5 text-[#002C4E]`} />
                      </div>
                      <div>
                        <span className="block text-gray-900 font-bold">Passo 1: Unidade</span>
                        <span className="text-xs md:text-sm font-medium text-gray-500 mt-0.5">Escolha onde será a aula</span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 p-4 md:p-6 bg-white">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 ml-1">
                      Unidade
                    </label>
                    <Select
                      value={selectedFranchise}
                      onValueChange={(value) => {
                        setSelectedFranchise(value)
                        setSelectedData('') // Resetar data ao mudar unidade
                        setSelectedHorario('') // Resetar horário ao mudar unidade
                      }}
                    >
                      <SelectTrigger className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] transition-all">
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {franchisesFiltradas.length === 0 ? (
                          <SelectItem value="no-units" disabled>
                            Nenhuma unidade disponível
                          </SelectItem>
                        ) : (
                          franchisesFiltradas.map((franchise) => (
                            <SelectItem key={franchise.id} value={franchise.id}>
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{franchise.name}</span>
                                {(franchise.city || franchise.state) && (
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    {franchise.city}{franchise.state ? `, ${franchise.state}` : ''}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Passo 2: Seleção de Aluno */}
              {selectedFranchise && (
                <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in">
                  <CardHeader
                    className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-4 md:p-6"
                  >
                    <CardTitle className="flex items-center justify-between text-base md:text-lg">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`p-2 md:p-2.5 rounded-xl bg-[#002C4E]/10`}>
                          <Users className={`h-4 w-4 md:h-5 md:w-5 text-[#002C4E]`} />
                        </div>
                        <div>
                          <span className="block text-gray-900 font-bold">Passo 2: Aluno</span>
                          <span className="text-xs md:text-sm font-medium text-gray-500 mt-0.5">Escolha para quem será a aula</span>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 p-4 md:p-6 bg-white">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 ml-1">
                        Aluno
                      </label>
                      <Select
                        value={selectedStudent}
                        onValueChange={(value) => {
                          setSelectedStudent(value)
                          setSelectedData('') // Resetar data ao mudar aluno
                          setSelectedHorario('') // Resetar horário ao mudar aluno
                        }}
                      >
                        <SelectTrigger className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] transition-all">
                          <SelectValue placeholder="Selecione um aluno" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.length === 0 ? (
                            <SelectItem value="no-students" disabled>
                              Nenhum aluno cadastrado
                            </SelectItem>
                          ) : (
                            students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">{student.name}</span>
                                    {student.email && (
                                      <span className="text-xs text-gray-500 mt-0.5">{student.email}</span>
                                    )}
                                  </div>
                                  {student.hourly_rate && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-semibold border border-green-200 ml-2">
                                      R$ {student.hourly_rate.toFixed(2)}/h
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewStudentForm(true)}
                      className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-[#002C4E] hover:bg-[#002C4E]/5 text-gray-700 hover:text-[#002C4E] rounded-xl transition-all"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Cadastrar Novo Aluno
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Passo 3: Data e Horários Livres */}
              {selectedFranchise && selectedStudent && (
                <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in">
                  <CardHeader
                    className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6"
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-[#002C4E]/10`}>
                          <Calendar className={`h-5 w-5 text-[#002C4E]`} />
                        </div>
                        <div>
                          <span className="block text-gray-900 font-bold">Passo 3: Data e Horário</span>
                          <span className="text-sm font-medium text-gray-500 mt-0.5">Escolha quando será a aula</span>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6 p-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 ml-1">
                          Data
                        </label>
                        <input
                          type="date"
                          value={selectedData}
                          onChange={(e) => {
                            setSelectedData(e.target.value)
                            setSelectedHorario('') // Resetar horário ao mudar data
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] transition-all cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 ml-1">
                          Horários Disponíveis
                        </label>
                        {loadingSlots ? (
                          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Buscando horários...
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
                            Nenhum horário livre para esta data.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2">
                            {availableSlots.map((slot) => (
                              <Button
                                key={slot.time}
                                variant="outline"
                                size="sm"
                                disabled={!slot.is_free || submitting}
                                onClick={() => setSelectedHorario(slot.time)}
                                className={`h-10 rounded-xl border transition-all duration-200 ${selectedHorario === slot.time
                                  ? 'bg-[#002C4E] text-white border-[#002C4E] shadow-md scale-105 font-bold'
                                  : slot.is_free
                                    ? 'bg-white border-gray-200 text-gray-700 hover:border-[#002C4E] hover:text-[#002C4E] hover:bg-[#002C4E]/5'
                                    : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-60'
                                  }`}
                              >
                                {slot.time}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 ml-1">
                        Observações (opcional)
                      </label>
                      <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] transition-all resize-none"
                        rows={3}
                        placeholder="Ex: Foco em membros superiores..."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Informações Laterais */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6 rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-6">
                  <CardTitle className="flex items-center text-lg text-[#002C4E]">
                    <div className="p-2 bg-[#002C4E]/10 rounded-lg mr-3">
                      <CheckCircle className="h-5 w-5 text-[#002C4E]" />
                    </div>
                    Informações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 p-6">
                  {!selectedFranchise ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <MapPin className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium">Selecione uma unidade para ver o resumo</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Unidade</span>
                          <p className="font-bold text-[#002C4E]">{franchiseSelecionada?.name}</p>
                        </div>

                        {selectedData && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Data</span>
                            <p className="font-bold text-gray-900 capitalize">
                              {new Date(selectedData + 'T00:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                              })}
                            </p>
                          </div>
                        )}

                        {selectedStudent && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Aluno</span>
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-gray-900">
                                {students.find(s => s.id === selectedStudent)?.name}
                              </p>
                              {students.find(s => s.id === selectedStudent)?.hourly_rate && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-semibold border border-green-200">
                                  R$ {students.find(s => s.id === selectedStudent)?.hourly_rate?.toFixed(2)}/h
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedHorario && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Horário</span>
                                <p className="font-bold text-[#002C4E] text-lg">{selectedHorario}</p>
                              </div>
                              <div>
                                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Duração</span>
                                <p className="font-medium text-gray-900">
                                  {availableSlots.find(s => s.time === selectedHorario)?.slot_duration || 60} min
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        {/* Aviso de saldo insuficiente no resumo */}
                        {professorHours !== null && professorHours <= 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-semibold text-red-900">Saldo insuficiente</p>
                                <p className="text-red-700">Compre horas para agendar.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedHorario && selectedStudent && selectedData ? (
                          <Button
                            onClick={() => handleReservarHorario(selectedHorario)}
                            disabled={submitting || (professorHours !== null && professorHours <= 0)}
                            className="w-full bg-[#002C4E] hover:bg-[#003d6b] text-white rounded-xl h-12 shadow-lg hover:shadow-xl transition-all text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Confirmando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Confirmar Reserva
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-1.5 bg-blue-100 rounded-full shrink-0">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="text-sm text-blue-900">
                                <p className="font-semibold mb-1">Para concluir</p>
                                <p className="text-blue-700/80 leading-relaxed">
                                  Preencha todos os passos do formulário para habilitar a confirmação de reserva.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro de Aluno */}
      <Dialog open={showNewStudentForm} onOpenChange={setShowNewStudentForm}>
        <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-white rounded-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-5 bg-[#002C4E] text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-24 bg-[#27DFFF]/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <User className="h-5 w-5 text-[#27DFFF]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Novo Aluno
                </DialogTitle>
                <p className="text-white/70 text-xs mt-0.5">
                  Cadastre um novo aluno
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              <form onSubmit={handleCreateStudent} className="space-y-5" id="student-form">

                {/* Seção: Dados Pessoais */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                    <div className="p-1 bg-blue-50 rounded-md">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Dados Pessoais</h3>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        CPF
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={formatCpfCnpj(formData.cpf)}
                          onChange={(e) => {
                            const raw = unformatCpfCnpj(e.target.value).slice(0, 11)
                            setFormData({ ...formData, cpf: raw })
                          }}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Data de Nascimento
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Gênero
                    </label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value: GenderType) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger className="w-full h-10 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] text-sm">
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Masculino</SelectItem>
                        <SelectItem value="FEMALE">Feminino</SelectItem>
                        <SelectItem value="NON_BINARY">Não-Binário</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                        <SelectItem value="PREFER_NOT_TO_SAY">Prefiro não dizer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seção: Contato */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                    <div className="p-1 bg-green-50 rounded-md">
                      <Mail className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Contato</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                          placeholder="email@exemplo.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Telefone/WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '')
                            if (value.length <= 11) {
                              if (value.length <= 2) value = value
                              else if (value.length <= 6) value = value.replace(/(\d{2})(\d+)/, '($1) $2')
                              else if (value.length <= 10) value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                              else value = value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
                            }
                            setFormData({ ...formData, phone: value })
                          }}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                          maxLength={15}
                          placeholder="(99) 99999-9999"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção: Dados Profissionais */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                    <div className="p-1 bg-amber-50 rounded-md">
                      <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Detalhes Profissionais</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Valor Hora (R$)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium text-[#002C4E]"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                        Primeira Aula
                      </label>
                      <div className="flex items-center justify-between px-3 py-2 bg-green-50/50 border border-green-100 rounded-lg h-[42px]">
                        <span className="text-xs font-medium text-gray-700">Ocultar Grátis</span>
                        <Switch
                          checked={formData.hide_free_class}
                          onCheckedChange={(checked) => setFormData({ ...formData, hide_free_class: checked })}
                          className="scale-75 origin-right"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Observações
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none resize-none text-sm"
                      rows={2}
                      placeholder="Anotações gerais do aluno..."
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer com botões - Fixo */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="ghost"
                className="flex-1 rounded-lg h-10 hover:bg-gray-100 text-gray-600 font-medium text-sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="student-form"
                className="flex-1 bg-[#002C4E] hover:bg-[#003f70] text-white rounded-lg h-10 font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98] text-sm"
              >
                Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProfessorLayout>
  )
}

