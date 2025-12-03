'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import {
  Calendar,
  MapPin,
  Clock,
  Loader2,
  ChevronLeft,
  Save,
  Trash2,
  Plus,
  AlertCircle,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { createUtcFromLocal } from '@/lib/timezone-utils'

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

interface AcademyTimeSlot {
  id: string
  academy_id: string
  day_of_week: number
  time: string
  is_available: boolean
  max_capacity: number
}

interface WeeklySchedule {
  [dayOfWeek: number]: string[] // Array de horários selecionados
}

export default function DisponibilidadePage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const { academies: teacherAcademies, loading: loadingAcademies } = useTeacherAcademies()
  
  const [selectedAcademy, setSelectedAcademy] = useState<string>('')
  const [academyTimeSlots, setAcademyTimeSlots] = useState<AcademyTimeSlot[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({})
  const [savedSchedule, setSavedSchedule] = useState<WeeklySchedule>({}) // Horários já salvos
  const [applyMode, setApplyMode] = useState<'week' | 'month' | 'always'>('week')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Bloqueios
  const [newBlockStart, setNewBlockStart] = useState('')
  const [newBlockEnd, setNewBlockEnd] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  
  // Modal de confirmação para limpar dia
  const [clearDayModal, setClearDayModal] = useState<{ open: boolean; dayOfWeek: number | null }>({
    open: false,
    dayOfWeek: null
  })

  const [slotRemovalModal, setSlotRemovalModal] = useState<{
    open: boolean
    dayOfWeek: number | null
    time: string | null
    removalMode: 'single' | 'allDay' | 'allDays' // single = próxima ocorrência, allDay = todas do dia, allDays = todos os dias
  }>({
    open: false,
    dayOfWeek: null,
    time: null,
    removalMode: 'single'
  })

  // Função auxiliar para fazer fetch autenticado
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    // Adicionar timestamp para evitar cache
    const separator = url.includes('?') ? '&' : '?'
    const urlWithTimestamp = `${url}${separator}_t=${Date.now()}`
    return fetch(urlWithTimestamp, {
      ...options,
      cache: 'no-store',
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    })
  }, [token])

  // Selecionar primeira academia quando carregar
  useEffect(() => {
    if (teacherAcademies.length > 0 && !selectedAcademy) {
      setSelectedAcademy(teacherAcademies[0].id)
    }
  }, [teacherAcademies, selectedAcademy])

  // Função para buscar dados
  const fetchData = useCallback(async () => {
    if (!selectedAcademy || !user?.id) return
    
    setLoadingSlots(true)
    try {
      // Buscar slots da academia
      const slotsRes = await authFetch(`/api/time-slots?academy_id=${selectedAcademy}`)
      if (slotsRes.ok) {
        const data = await slotsRes.json()
        setAcademyTimeSlots(data.slots || [])
      }

      // Buscar bookings disponíveis já criados pelo professor
      const bookingsRes = await authFetch(`/api/bookings?teacher_id=${user.id}`)
      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        const bookings = data.bookings || []
        
        console.log('[fetchData] Total de bookings recebidos:', bookings.length)
        
        // Filtrar bookings disponíveis (sem aluno) da academia selecionada
        // Usar tanto camelCase quanto snake_case para compatibilidade
        const now = new Date()
        const availableBookings = bookings.filter((b: Record<string, unknown>) => {
          const studentId = b.studentId || b.student_id
          const franchiseId = b.franchiseId || b.franchise_id
          const status = b.status || b.status_canonical
          const dateField = (b.date || b.start_at) as string
          const bookingDate = dateField ? new Date(dateField) : null
          
          // Apenas bookings futuros, sem aluno, da academia, com status AVAILABLE
          return !studentId && 
            franchiseId === selectedAcademy &&
            status === 'AVAILABLE' &&
            bookingDate && bookingDate > now
        })
        
        // Agrupar por dia da semana e horário (usar horário local para consistência com UI)
        const saved: WeeklySchedule = {}
        availableBookings.forEach((b: Record<string, unknown>) => {
          const dateField = (b.date || b.start_at) as string
          if (!dateField) return
          
          const date = new Date(dateField)
          // Usar horário local para dia da semana (consistente com a UI)
          const dayOfWeek = date.getDay()
          // Formato HH:mm:ss para bater com os slots da academia
          const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          
          if (!saved[dayOfWeek]) {
            saved[dayOfWeek] = []
          }
          if (!saved[dayOfWeek].includes(time)) {
            saved[dayOfWeek].push(time)
          }
        })
        
        setSavedSchedule(saved)
        // Limpar weeklySchedule - ele é usado apenas para novas seleções
        setWeeklySchedule({})
      }
    } catch {
      toast.error('Erro ao carregar horários da unidade')
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedAcademy, user?.id, authFetch])

  // Buscar horários da academia e disponibilidade já salva
  useEffect(() => {
    fetchData()
    // Limpar seleções ao trocar de academia
    setWeeklySchedule({})
  }, [fetchData])

  // Helper para exibir o horário sem os segundos
  const formatTimeLabel = (time: string) => {
    if (!time) return ''
    const [hour = '00', minute = '00'] = time.split(':')
    return `${hour}:${minute}`
  }

  // Agrupar slots por dia da semana
  const slotsByDay = academyTimeSlots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = []
    }
    acc[slot.day_of_week].push(slot.time)
    return acc
  }, {} as Record<number, string[]>)

  // Obter todos os horários únicos (ordenados)
  const allTimes = [...new Set(academyTimeSlots.map(s => s.time))].sort()

  // Verificar se um horário está disponível na academia para um dia
  const isSlotAvailable = (dayOfWeek: number, time: string) => {
    return academyTimeSlots.some(
      s => s.day_of_week === dayOfWeek && s.time === time && s.is_available
    )
  }

  // Toggle horário
  const toggleHorario = (dayOfWeek: number, horario: string) => {
    if (!isSlotAvailable(dayOfWeek, horario)) return
    
    setWeeklySchedule(prev => {
      const daySchedule = prev[dayOfWeek] || []
      if (daySchedule.includes(horario)) {
        return {
          ...prev,
          [dayOfWeek]: daySchedule.filter(h => h !== horario)
        }
      } else {
        return {
          ...prev,
          [dayOfWeek]: [...daySchedule, horario].sort()
        }
      }
    })
  }

  // Selecionar todos de um dia (apenas os disponíveis)
  const selectAllDay = (dayOfWeek: number) => {
    const availableSlots = slotsByDay[dayOfWeek] || []
    setWeeklySchedule(prev => ({
      ...prev,
      [dayOfWeek]: [...availableSlots]
    }))
  }

  const removeBookings = async (
    predicate: (booking: Record<string, unknown>, referenceDate: Date) => boolean,
    successMessage: string,
    options?: { limit?: number }
  ) => {
    if (!user?.id || !selectedAcademy) return { deleted: 0, errors: 0 }
    const res = await authFetch(`/api/bookings?teacher_id=${user.id}`)
    if (!res.ok) throw new Error('Erro ao buscar bookings')

    const data = await res.json()
    const bookings = (data.bookings || []).sort((a: Record<string, any>, b: Record<string, any>) => {
      const dateA = new Date((a.date || a.start_at) as string).getTime()
      const dateB = new Date((b.date || b.start_at) as string).getTime()
      return dateA - dateB
    })
    const referenceDate = new Date()

    const toDelete: Record<string, unknown>[] = []
    for (const booking of bookings) {
      if (predicate(booking, referenceDate)) {
        toDelete.push(booking)
        if (options?.limit && toDelete.length >= options.limit) {
          break
        }
      }
    }

    if (toDelete.length === 0) {
      toast.info('Nenhum horário disponível para remover')
      return { deleted: 0, errors: 0 }
    }

    let deleted = 0
    let errors = 0
    for (const booking of toDelete) {
      const deleteRes = await authFetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE'
      })
      if (deleteRes.ok) {
        deleted++
      } else {
        errors++
      }
    }

    if (deleted > 0) {
      toast.success(successMessage.replace('{count}', deleted.toString()))
    }
    if (errors > 0) {
      toast.error(`${errors} horário(s) não puderam ser removidos`)
    }

    // Pequeno delay para garantir que o banco processou as deleções
    await new Promise(resolve => setTimeout(resolve, 500))
    await fetchData()
    return { deleted, errors }
  }

  // Abre modal de confirmação para limpar dia
  const openClearDayModal = (dayOfWeek: number) => {
    setClearDayModal({ open: true, dayOfWeek })
  }

  const executeClearDay = async () => {
    const dayOfWeek = clearDayModal.dayOfWeek
    if (dayOfWeek === null) return

    setClearDayModal({ open: false, dayOfWeek: null })
    setLoading(true)

    try {
      const dayName = DIAS_SEMANA.find(d => d.value === dayOfWeek)?.label || ''
      await removeBookings((booking, referenceDate) => {
        const studentId = booking.studentId || booking.student_id
        const franchiseId = booking.franchiseId || booking.franchise_id
        const status = booking.status || booking.status_canonical
        const dateField = (booking.date || booking.start_at) as string
        if (!dateField) return false
        const bookingDate = new Date(dateField)
        return !studentId &&
          franchiseId === selectedAcademy &&
          status === 'AVAILABLE' &&
          bookingDate > referenceDate &&
          bookingDate.getDay() === dayOfWeek
      }, `{count} horário(s) removido(s) de ${dayName}!`)

      setWeeklySchedule(prev => ({
        ...prev,
        [dayOfWeek]: []
      }))
      setSavedSchedule(prev => ({
        ...prev,
        [dayOfWeek]: []
      }))
    } catch {
      toast.error('Erro ao remover horários do dia')
    } finally {
      setLoading(false)
    }
  }

  const openSlotRemovalModal = (dayOfWeek: number, time: string) => {
    setSlotRemovalModal({ open: true, dayOfWeek, time, removalMode: 'single' })
  }

  const executeSlotRemoval = async () => {
    const { dayOfWeek, time, removalMode } = slotRemovalModal
    if (dayOfWeek === null || !time) return

    // Capturar valores antes de fechar o modal
    const targetRemovalMode = removalMode
    const targetDayOfWeek = dayOfWeek
    const targetTime = time

    setSlotRemovalModal({ open: false, dayOfWeek: null, time: null, removalMode: 'single' })
    setLoading(true)

    // Normalizar o horário para comparação (extrair apenas HH:mm)
    const normalizeTime = (t: string) => {
      const parts = t.split(':')
      return `${parts[0]?.padStart(2, '0')}:${parts[1]?.padStart(2, '0')}`
    }
    const targetTimeNormalized = normalizeTime(targetTime)

    try {
      const successMessage = targetRemovalMode === 'single'
        ? 'Próxima ocorrência removida!'
        : targetRemovalMode === 'allDay'
        ? 'Todas as ocorrências futuras deste dia removidas!'
        : 'Horário removido de todos os dias da semana!'

      await removeBookings((booking, referenceDate) => {
        const studentId = booking.studentId || booking.student_id
        const franchiseId = booking.franchiseId || booking.franchise_id
        const status = booking.status || booking.status_canonical
        const dateField = (booking.date || booking.start_at) as string
        if (!dateField) return false
        const bookingDate = new Date(dateField)
        
        // Usar horário local para dia da semana (consistente com a UI)
        const bookingDayLocal = bookingDate.getDay()
        const bookingTime = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const bookingTimeNormalized = normalizeTime(bookingTime)
        
        // Condição base: sem aluno, mesma academia, disponível, futuro, mesmo horário
        const baseMatch = !studentId &&
          franchiseId === selectedAcademy &&
          status === 'AVAILABLE' &&
          bookingDate > referenceDate &&
          bookingTimeNormalized === targetTimeNormalized
        
        // Se allDays, não filtra por dia da semana
        if (targetRemovalMode === 'allDays') {
          return baseMatch
        }
        
        // Se single ou allDay, filtra pelo dia da semana específico
        return baseMatch && bookingDayLocal === targetDayOfWeek
      }, successMessage, targetRemovalMode === 'single' ? { limit: 1 } : undefined)

      // Nota: fetchData() já é chamado dentro de removeBookings, 
      // então savedSchedule e weeklySchedule são atualizados automaticamente
    } catch {
      toast.error('Erro ao remover horário')
    } finally {
      setLoading(false)
    }
  }

  // Selecionar horário em todos os dias (apenas onde disponível)
  const handleSlotClick = (dayOfWeek: number, horario: string, isSaved: boolean, isSelected: boolean) => {
    if (isSaved && !isSelected) {
      openSlotRemovalModal(dayOfWeek, horario)
      return
    }
    toggleHorario(dayOfWeek, horario)
  }

  const selectHorarioAllDays = (horario: string) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev }
      DIAS_SEMANA.forEach(dia => {
        if (isSlotAvailable(dia.value, horario)) {
          const daySchedule = newSchedule[dia.value] || []
          if (!daySchedule.includes(horario)) {
            newSchedule[dia.value] = [...daySchedule, horario].sort()
          }
        }
      })
      return newSchedule
    })
  }

  // Salvar disponibilidade
  const handleSave = async () => {
    if (!selectedAcademy || !user?.id) {
      toast.error('Selecione uma unidade')
      return
    }

    setSaving(true)
    try {
      // Calcular datas baseado no modo
      const today = new Date()
      let endDate: Date
      
      switch (applyMode) {
        case 'week':
          endDate = new Date(today)
          endDate.setDate(today.getDate() + 7)
          break
        case 'month':
          endDate = new Date(today)
          endDate.setMonth(today.getMonth() + 1)
          break
        case 'always':
          endDate = new Date(today)
          endDate.setFullYear(today.getFullYear() + 1) // 1 ano
          break
      }

      let totalCreated = 0
      let errors = 0

      // Para cada dia da semana com horários selecionados
      for (const [dayOfWeek, horarios] of Object.entries(weeklySchedule)) {
        if (horarios.length === 0) continue

        // Encontrar próximas datas desse dia da semana
        const currentDate = new Date(today)
        while (currentDate <= endDate) {
          if (currentDate.getDay() === parseInt(dayOfWeek)) {
            // Criar bookings para cada horário
            for (const hora of horarios) {
              const dateStr = currentDate.toISOString().split('T')[0]
              const bookingDateUtc = createUtcFromLocal(dateStr, hora)
              const endTimeUtc = new Date(bookingDateUtc.getTime() + 60 * 60 * 1000)

              const res = await authFetch('/api/bookings/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source: 'PROFESSOR',
                  professorId: user.id,
                  academyId: selectedAcademy,
                  startAt: bookingDateUtc.toISOString(),
                  endAt: endTimeUtc.toISOString(),
                  professorNotes: 'Horário disponível'
                })
              })

              if (res.ok) {
                totalCreated++
              } else {
                errors++
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      if (totalCreated > 0) {
        toast.success(`${totalCreated} horário(s) disponibilizado(s)!`)
        // Recarregar dados para mostrar horários salvos
        await fetchData()
        // Limpar seleções
        setWeeklySchedule({})
      }
      if (errors > 0) {
        toast.error(`${errors} horário(s) já existiam ou tiveram erro`)
      }
    } catch {
      toast.error('Erro ao salvar disponibilidade')
    } finally {
      setSaving(false)
    }
  }

  // Adicionar bloqueio
  const handleAddBlock = async () => {
    if (!newBlockStart || !newBlockEnd || !selectedAcademy || !user?.id) {
      toast.error('Preencha as datas do bloqueio')
      return
    }

    setLoading(true)
    try {
      // Criar bloqueios para cada dia no período
      const start = new Date(newBlockStart)
      const end = new Date(newBlockEnd)
      let created = 0

      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Bloquear todos os horários do dia (usando os horários da academia)
        const res = await authFetch(`/api/teachers/${user.id}/blocks/custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academy_id: selectedAcademy,
            date: dateStr,
            hours: allTimes,
            notes: newBlockReason || 'Bloqueio'
          })
        })

        if (res.ok) {
          const result = await res.json()
          created += result.created?.length || 0
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      toast.success(`${created} horário(s) bloqueado(s)!`)
      setNewBlockStart('')
      setNewBlockEnd('')
      setNewBlockReason('')
    } catch {
      toast.error('Erro ao criar bloqueio')
    } finally {
      setLoading(false)
    }
  }

  if (!user || loadingAcademies) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  return (
    <ProfessorLayout>
      <div className="px-4 py-6 space-y-6 md:px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/professor/agenda')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Disponibilidade</h1>
            <p className="text-sm text-gray-500">Configure seus horários semanais</p>
          </div>
        </div>

        {/* Seletor de Unidade */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-meu-primary" />
              <Label className="font-medium">Unidade:</Label>
              <select
                value={selectedAcademy}
                onChange={(e) => setSelectedAcademy(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-meu-primary"
              >
                {teacherAcademies.map(academy => (
                  <option key={academy.id} value={academy.id}>
                    {academy.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Grade Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-meu-primary" />
              Horários de Funcionamento da Unidade
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Selecione os horários em que você está disponível para atender
            </p>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
                <span className="ml-2 text-gray-500">Carregando horários...</span>
              </div>
            ) : allTimes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Nenhum horário configurado</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Esta unidade ainda não possui horários de funcionamento configurados. 
                  Entre em contato com a administração da academia.
                </p>
              </div>
            ) : (
              <div>
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-r from-green-500 to-emerald-500"></div>
                    <span className="text-gray-600">Disponibilizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <span className="text-gray-600">Nova seleção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white border-2 border-gray-200"></div>
                    <span className="text-gray-600">Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-100 border-2 border-gray-100"></div>
                    <span className="text-gray-600">Unidade fechada</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-sm font-medium text-gray-500 w-20">
                        <Clock className="h-4 w-4" />
                      </th>
                      {DIAS_SEMANA.map(dia => {
                        const daySlots = slotsByDay[dia.value] || []
                        const hasSlots = daySlots.length > 0
                        return (
                          <th key={dia.value} className={`p-2 text-center ${!hasSlots ? 'opacity-40' : ''}`}>
                            <div className="text-sm font-medium">{dia.short}</div>
                            {hasSlots ? (
                              <div className="flex gap-1 justify-center mt-1">
                                <button
                                  onClick={() => selectAllDay(dia.value)}
                                  className="text-[10px] text-green-600 hover:underline"
                                >
                                  Todos
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => openClearDayModal(dia.value)}
                                  className="text-[10px] text-red-600 hover:underline"
                                >
                                  Limpar
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 mt-1">Fechado</div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((horario: string) => (
                      <tr key={horario} className="border-t">
                        <td className="p-2">
                          <button
                            onClick={() => selectHorarioAllDays(horario)}
                            className="text-sm font-medium text-gray-700 hover:text-meu-primary"
                          >
                            {formatTimeLabel(horario)}
                          </button>
                        </td>
                        {DIAS_SEMANA.map(dia => {
                          const isAvailable = isSlotAvailable(dia.value, horario)
                          const isSelected = (weeklySchedule[dia.value] || []).includes(horario)
                          const isSaved = (savedSchedule[dia.value] || []).includes(horario)
                          
                          if (!isAvailable) {
                            return (
                              <td key={dia.value} className="p-1 text-center">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border-2 border-gray-100" />
                              </td>
                            )
                          }
                          
                          return (
                            <td key={dia.value} className="p-1 text-center">
                              <button
                                onClick={() => handleSlotClick(dia.value, horario, isSaved, isSelected)}
                                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-500 text-white shadow-md'
                                    : isSaved
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white shadow-md'
                                    : 'bg-white border-gray-200 hover:border-green-400 hover:bg-green-50'
                                }`}
                              >
                                {(isSelected || isSaved) && <Check className="h-4 w-4 mx-auto" />}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modo de aplicação */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <Label className="font-medium mb-3 block">Aplicar para:</Label>
              <RadioGroup value={applyMode} onValueChange={(v) => setApplyMode(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="week" id="week" />
                  <Label htmlFor="week" className="cursor-pointer">Esta semana</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month" id="month" />
                  <Label htmlFor="month" className="cursor-pointer">Próximas 4 semanas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="always" id="always" />
                  <Label htmlFor="always" className="cursor-pointer">Próximo ano</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Botão Salvar */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || Object.values(weeklySchedule).every(arr => arr.length === 0)}
                className="bg-meu-primary hover:bg-meu-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Disponibilidade
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bloqueios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Bloqueios (Férias, Compromissos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Formulário de novo bloqueio */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm">Data início</Label>
                    <input
                      type="date"
                      value={newBlockStart}
                      onChange={(e) => setNewBlockStart(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Data fim</Label>
                    <input
                      type="date"
                      value={newBlockEnd}
                      onChange={(e) => setNewBlockEnd(e.target.value)}
                      min={newBlockStart || new Date().toISOString().split('T')[0]}
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Motivo (opcional)</Label>
                    <input
                      type="text"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      placeholder="Ex: Férias"
                      className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddBlock}
                      disabled={loading || !newBlockStart || !newBlockEnd}
                      variant="destructive"
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Bloquear Período
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 text-sm text-gray-500 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                <span>
                  Bloqueios impedem que alunos agendem aulas no período selecionado.
                  Aulas já agendadas não são afetadas automaticamente.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmação para limpar dia */}
      <ConfirmDialog
        isOpen={clearDayModal.open}
        onClose={() => setClearDayModal({ open: false, dayOfWeek: null })}
        onConfirm={executeClearDay}
        title="Remover Disponibilidade"
        description={`Deseja remover TODOS os horários disponíveis de ${DIAS_SEMANA.find(d => d.value === clearDayModal.dayOfWeek)?.label}? Isso vai desalocar os horários futuros deste dia. Horários com aulas marcadas não serão afetados.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        type="danger"
        loading={loading}
      />

      {/* Modal de confirmação para um horário específico */}
      <ConfirmDialog
        isOpen={slotRemovalModal.open}
        onClose={() => setSlotRemovalModal({ open: false, dayOfWeek: null, time: null, removalMode: 'single' })}
        onConfirm={executeSlotRemoval}
        title="Remover horário"
        description={`Deseja remover sua disponibilidade das ${formatTimeLabel(slotRemovalModal.time || '')} em ${DIAS_SEMANA.find(d => d.value === slotRemovalModal.dayOfWeek)?.label}?`}
        confirmText={
          slotRemovalModal.removalMode === 'single' 
            ? 'Remover próxima' 
            : slotRemovalModal.removalMode === 'allDay'
            ? 'Remover do dia'
            : 'Remover de todos os dias'
        }
        cancelText="Cancelar"
        type="warning"
        loading={loading}
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="removal-mode"
              checked={slotRemovalModal.removalMode === 'single'}
              onChange={() => setSlotRemovalModal(prev => ({ ...prev, removalMode: 'single' }))}
              className="text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Remover apenas a próxima ocorrência</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="removal-mode"
              checked={slotRemovalModal.removalMode === 'allDay'}
              onChange={() => setSlotRemovalModal(prev => ({ ...prev, removalMode: 'allDay' }))}
              className="text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">
              Remover todas as {DIAS_SEMANA.find(d => d.value === slotRemovalModal.dayOfWeek)?.label}s às {formatTimeLabel(slotRemovalModal.time || '')}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="removal-mode"
              checked={slotRemovalModal.removalMode === 'allDays'}
              onChange={() => setSlotRemovalModal(prev => ({ ...prev, removalMode: 'allDays' }))}
              className="text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              Remover {formatTimeLabel(slotRemovalModal.time || '')} de <strong>todos os dias</strong> da semana
            </span>
          </label>
        </div>
      </ConfirmDialog>
    </ProfessorLayout>
  )
}
