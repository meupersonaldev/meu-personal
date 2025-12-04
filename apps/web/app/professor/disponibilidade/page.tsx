'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import {
  Calendar,
  MapPin,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  // chave pode ser um dateKey no formato yyyy-MM-dd
  [key: string]: string[]
}

export default function DisponibilidadePage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const { academies: teacherAcademies, loading: loadingAcademies } = useTeacherAcademies()
  
  const [selectedAcademy, setSelectedAcademy] = useState<string>('')
  const [academyTimeSlots, setAcademyTimeSlots] = useState<AcademyTimeSlot[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({})
  const [savedSchedule, setSavedSchedule] = useState<WeeklySchedule>({}) // Horários já salvos
  const [bookingIdByDateTime, setBookingIdByDateTime] = useState<Record<string, Record<string, string>>>({})
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Bloqueios
  const [newBlockStart, setNewBlockStart] = useState('')
  const [newBlockEnd, setNewBlockEnd] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  
  // Modal de confirmação para limpar um dia (por data)
  const [clearDayModal, setClearDayModal] = useState<{ open: boolean; dateKey: string | null }>({
    open: false,
    dateKey: null
  })

  const [slotRemovalModal, setSlotRemovalModal] = useState<{
    open: boolean
    dateKey: string | null
    time: string | null
  }>({
    open: false,
    dateKey: null,
    time: null
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
        
        // Agrupar por DATA (yyyy-MM-dd) e horário local
        const saved: WeeklySchedule = {}
        const bookingMap: Record<string, Record<string, string>> = {}

        availableBookings.forEach((b: Record<string, unknown>) => {
          const dateField = (b.date || b.start_at) as string
          if (!dateField) return

          const date = new Date(dateField)
          const dateKey = getLocalDateKey(date)
          // Formato HH:mm:ss para bater com os slots da academia
          const time = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })

          if (!saved[dateKey]) {
            saved[dateKey] = []
          }
          if (!saved[dateKey].includes(time)) {
            saved[dateKey].push(time)
          }

          const id = (b as any).id as string | undefined
          if (id) {
            if (!bookingMap[dateKey]) {
              bookingMap[dateKey] = {}
            }
            if (!bookingMap[dateKey][time]) {
              bookingMap[dateKey][time] = id
            }
          }
        })

        setSavedSchedule(saved)
        setBookingIdByDateTime(bookingMap)
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

  // Util para chave de data em horário local (yyyy-MM-dd)
  const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateShort = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const weekday = DIAS_SEMANA.find(d => d.value === date.getDay())?.short || ''
    return `${weekday} ${day}/${month}`
  }

  const formatDateLongFromKey = (dateKey: string) => {
    const [yearStr, monthStr, dayStr] = dateKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const day = Number(dayStr)
    if (!year || !month || !day) return dateKey
    const date = new Date(year, month - 1, day)
    const weekday = DIAS_SEMANA.find(d => d.value === date.getDay())?.label || ''
    const dayDisp = String(day).padStart(2, '0')
    const monthDisp = String(month).padStart(2, '0')
    return `${weekday}, ${dayDisp}/${monthDisp}/${year}`
  }

  // Janela de 7 dias visíveis
  const visibleDays = useMemo(() => {
    const days: { date: Date; dateKey: string; dayOfWeek: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dayOfWeek = d.getDay()
      const dateKey = getLocalDateKey(d)
      days.push({ date: d, dateKey, dayOfWeek })
    }
    return days
  }, [startDate])

  // Agrupar slots por dia da semana (configuração fixa da unidade)
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

  // Toggle horário para uma data específica
  const toggleHorario = (dateKey: string, dayOfWeek: number, horario: string) => {
    if (!isSlotAvailable(dayOfWeek, horario)) return
    
    setWeeklySchedule(prev => {
      const daySchedule = prev[dateKey] || []
      if (daySchedule.includes(horario)) {
        return {
          ...prev,
          [dateKey]: daySchedule.filter(h => h !== horario)
        }
      } else {
        return {
          ...prev,
          [dateKey]: [...daySchedule, horario].sort()
        }
      }
    })
  }

  // Selecionar todos os horários disponíveis de uma DATA específica
  const selectAllDate = (dateKey: string, dayOfWeek: number) => {
    const availableSlots = slotsByDay[dayOfWeek] || []
    setWeeklySchedule(prev => ({
      ...prev,
      [dateKey]: [...availableSlots]
    }))
  }

  // Abre modal de confirmação para limpar dia
  const openClearDayModal = (dateKey: string) => {
    setClearDayModal({ open: true, dateKey })
  }

  const executeClearDay = async () => {
    const dateKey = clearDayModal.dateKey
    if (!dateKey) return

    setClearDayModal({ open: false, dateKey: null })
    setLoading(true)

    try {
      const bookingsForDate = bookingIdByDateTime[dateKey] || {}
      const ids = Object.values(bookingsForDate)

      if (ids.length === 0) {
        toast.info('Nenhum horário disponível para remover')
        return
      }

      let deleted = 0
      let errors = 0

      for (const id of ids) {
        const deleteRes = await authFetch(`/api/bookings/${id}`, {
          method: 'DELETE'
        })
        if (deleteRes.ok) {
          deleted++
        } else {
          errors++
        }
      }

      if (deleted > 0) {
        toast.success(`${deleted} horário(s) removido(s) de ${formatDateLongFromKey(dateKey)}!`)
      }
      if (errors > 0) {
        toast.error(`${errors} horário(s) não puderam ser removidos`)
      }

      // Pequeno delay para garantir que o banco processou as deleções
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchData()
    } catch {
      toast.error('Erro ao remover horários do dia')
    } finally {
      setLoading(false)
    }
  }

  const openSlotRemovalModal = (dateKey: string, time: string) => {
    setSlotRemovalModal({ open: true, dateKey, time })
  }

  const executeSlotRemoval = async () => {
    const { dateKey, time } = slotRemovalModal
    if (!dateKey || !time) return

    const bookingId = bookingIdByDateTime[dateKey]?.[time]
    if (!bookingId) {
      toast.error('Horário não encontrado para remoção')
      return
    }

    setSlotRemovalModal({ open: false, dateKey: null, time: null })
    setLoading(true)

    try {
      const deleteRes = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (!deleteRes.ok) {
        throw new Error('Falha ao remover horário')
      }

      toast.success('Disponibilidade removida!')

      // Pequeno delay para garantir que o banco processou a deleção
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchData()
    } catch {
      toast.error('Erro ao remover horário')
    } finally {
      setLoading(false)
    }
  }

  // Selecionar horário em todos os dias (apenas onde disponível)
  const handleSlotClick = (dateKey: string, dayOfWeek: number, horario: string, isSaved: boolean, isSelected: boolean) => {
    if (isSaved && !isSelected) {
      openSlotRemovalModal(dateKey, horario)
      return
    }
    toggleHorario(dateKey, dayOfWeek, horario)
  }

  const selectHorarioAllDays = (horario: string) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev }
      visibleDays.forEach(dia => {
        if (isSlotAvailable(dia.dayOfWeek, horario)) {
          const daySchedule = newSchedule[dia.dateKey] || []
          if (!daySchedule.includes(horario)) {
            newSchedule[dia.dateKey] = [...daySchedule, horario].sort()
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
      let totalCreated = 0
      let errors = 0

      // Para cada data com horários selecionados
      for (const [dateKey, horarios] of Object.entries(weeklySchedule)) {
        if (horarios.length === 0) continue

        for (const hora of horarios) {
          const bookingDateUtc = createUtcFromLocal(dateKey, hora)
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
            <p className="text-sm text-gray-500">Configure seus horários disponíveis por data</p>
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

        {/* Grade de 7 dias (agenda por data) */}
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
                
                <div className="flex justify-between items-center mb-4 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prev = new Date(startDate)
                      prev.setDate(prev.getDate() - 7)
                      setStartDate(prev)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Semana anterior
                  </Button>
                  <span className="text-gray-600 font-medium">
                    {formatDateShort(visibleDays[0].date)} 
                    {' '}até{' '} 
                    {formatDateShort(visibleDays[visibleDays.length - 1].date)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Date(startDate)
                      next.setDate(next.getDate() + 7)
                      setStartDate(next)
                    }}
                  >
                    Próxima semana
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-sm font-medium text-gray-500 w-20">
                        <Clock className="h-4 w-4" />
                      </th>
                      {visibleDays.map(dia => {
                        const daySlots = slotsByDay[dia.dayOfWeek] || []
                        const hasSlots = daySlots.length > 0
                        return (
                          <th key={dia.dateKey} className={`p-2 text-center ${!hasSlots ? 'opacity-40' : ''}`}>
                            <div className="text-sm font-medium">{formatDateShort(dia.date)}</div>
                            {hasSlots ? (
                              <div className="flex gap-1 justify-center mt-1">
                                <button
                                  onClick={() => selectAllDate(dia.dateKey, dia.dayOfWeek)}
                                  className="text-[10px] text-green-600 hover:underline"
                                >
                                  Todos
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => openClearDayModal(dia.dateKey)}
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
                        {visibleDays.map(dia => {
                          const isAvailable = isSlotAvailable(dia.dayOfWeek, horario)
                          const isSelected = (weeklySchedule[dia.dateKey] || []).includes(horario)
                          const isSaved = (savedSchedule[dia.dateKey] || []).includes(horario)
                          
                          if (!isAvailable) {
                            return (
                              <td key={dia.dateKey} className="p-1 text-center">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border-2 border-gray-100" />
                              </td>
                            )
                          }
                          
                          return (
                            <td key={dia.dateKey} className="p-1 text-center">
                              <button
                                onClick={() => handleSlotClick(dia.dateKey, dia.dayOfWeek, horario, isSaved, isSelected)}
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

      {/* Modal de confirmação para limpar todos os horários de uma data */}
      <ConfirmDialog
        isOpen={clearDayModal.open}
        onClose={() => setClearDayModal({ open: false, dateKey: null })}
        onConfirm={executeClearDay}
        title="Remover Disponibilidade"
        description={clearDayModal.dateKey
          ? `Deseja remover TODOS os horários disponíveis em ${formatDateLongFromKey(clearDayModal.dateKey)}? Atenção: Aulas já marcadas/reservadas não serão afetadas.`
          : 'Deseja remover todos os horários disponíveis deste dia? Aulas já marcadas/reservadas não serão afetadas.'}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        type="danger"
        loading={loading}
      />

      {/* Modal de confirmação para um horário específico (data + horário) */}
      <ConfirmDialog
        isOpen={slotRemovalModal.open}
        onClose={() => setSlotRemovalModal({ open: false, dateKey: null, time: null })}
        onConfirm={executeSlotRemoval}
        title="Remover horário"
        description={slotRemovalModal.dateKey && slotRemovalModal.time
          ? `Deseja remover sua disponibilidade em ${formatDateLongFromKey(slotRemovalModal.dateKey)} às ${formatTimeLabel(slotRemovalModal.time)}?`
          : 'Deseja remover este horário de disponibilidade?'}
        confirmText="Remover"
        cancelText="Cancelar"
        type="warning"
        loading={loading}
      />
    </ProfessorLayout>
  )
}
