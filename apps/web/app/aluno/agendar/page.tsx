'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, Loader2, AlertCircle, CheckCircle2, Repeat, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/stores/auth-store'

type Slot = {
  time: string
  booking_id: string | null
  max_capacity: number
  current_occupancy: number
  remaining: number
  is_free: boolean
  slot_duration: number
  slot_cost: number
}

// Tipos de recorrência
// IMPORTANTE: o backend limita a série a no máximo 6 meses a partir da data inicial.
// Por isso, não oferecemos mais a opção "YEAR" aqui para evitar erro 400.
const RECURRENCE_OPTIONS = [
  { value: '15_DAYS', label: 'Por 15 dias', description: '~2 aulas' },
  { value: 'MONTH', label: 'Por 1 mês', description: '~4 aulas' },
  { value: 'QUARTER', label: 'Por 3 meses', description: '~12 aulas' },
  { value: 'SEMESTER', label: 'Por 6 meses', description: '~24 aulas' },
]

// Helper para obter dia da semana
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00')
  return date.getDay()
}

function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return days[dayOfWeek]
}

export default function AgendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get('teacher') || searchParams.get('teacher_id') || ''
  const academyId = searchParams.get('academy_id') || ''
  const { token, isAuthenticated, user } = useAuthStore()

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  // Limite máximo de agendamento: 6 meses à frente
  const maxDate = useMemo(() => {
    const d = new Date()
    // adicionar 6 meses mantendo o dia
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  }, [])
  const initialDate = useMemo(() => searchParams.get('date') || today, [searchParams, today])
  const [date, setDate] = useState<string>(initialDate)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState<boolean>(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)

  // Estado para professor vinculado (particular)
  const [isLinkedTeacher, setIsLinkedTeacher] = useState<boolean>(false)

  // Estado para primeira aula grátis
  const [isFirstClassEligible, setIsFirstClassEligible] = useState<boolean>(false)

  // Estados de recorrência
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurrenceType, setRecurrenceType] = useState<string>('MONTH')
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [recurringPreview, setRecurringPreview] = useState<{
    confirmedCount: number
    reservedCount: number
    totalCredits: number
    studentCredits: number
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Verificar se é professor vinculado (particular) e se é elegível para primeira aula grátis
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.id || !token) return
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        // Verificar professor vinculado
        if (teacherId) {
          const response = await fetch(`${API_URL}/api/students/${user.id}/teachers`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            const linkedTeachers = data.teachers || []
            const isLinked = linkedTeachers.some((t: any) => t.id === teacherId)
            setIsLinkedTeacher(isLinked)
          }
        }
        
        // Verificar elegibilidade para primeira aula grátis
        const userResponse = await fetch(`${API_URL}/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          // Elegível se first_class_used é false
          setIsFirstClassEligible(userData.user?.first_class_used === false)
        }
      } catch (err) {
        // Silently fail
        setIsLinkedTeacher(false)
        setIsFirstClassEligible(false)
      }
    }
    checkEligibility()
  }, [user?.id, token, teacherId])

  useEffect(() => {
    const load = async () => {
      if (!teacherId || !date || !token) return
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        // Buscar bookings disponíveis do professor para a data (usando proxy do Next.js)
        const bookingsResponse = await fetch(
          `/api/teachers/${teacherId}/bookings-by-date?date=${date}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!bookingsResponse.ok) {
          throw new Error('Erro ao buscar horários disponíveis')
        }

        const availableBookings: any[] = await bookingsResponse.json()

        // CORREÇÃO: O endpoint já filtra horários ocupados, então todos os bookings retornados são disponíveis
        // Converter bookings disponíveis para slots - apenas os que realmente estão disponíveis
        const slotsList: Slot[] = availableBookings
          .filter((booking: any) => {
            // Garantir que só incluímos bookings realmente disponíveis
            // O endpoint já filtra, mas vamos garantir aqui também
            return booking && (booking.start_time || booking.date)
          })
          .map((booking: any) => {
            let timeStr = '00:00'
            if (booking.start_time) {
              const startDate = new Date(booking.start_time)
              const hours = startDate.getHours()
              const minutes = startDate.getMinutes()
              timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
            } else if (booking.date) {
              const dateObj = new Date(booking.date)
              const hours = dateObj.getHours()
              const minutes = dateObj.getMinutes()
              timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
            }

            return {
              time: timeStr,
              booking_id: booking.id || null,
              max_capacity: 1,
              current_occupancy: 0,
              remaining: 1,
              is_free: true, // Todos os slots retornados pelo endpoint são livres (já filtrados)
              slot_duration: booking.duration || 60,
              slot_cost: 1,
            }
          })

        // Ordenar por horário
        slotsList.sort((a, b) => a.time.localeCompare(b.time))

        setSlots(slotsList)
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar horários disponíveis')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [teacherId, date, token])

  // Função para buscar preview da série recorrente
  async function fetchRecurringPreview(_slot: Slot) {
    if (!token || !teacherId || !academyId) return

    setLoadingPreview(true)
    try {
      // Buscar saldo do aluno - endpoint retorna { balance: { available_classes: X } }
      const balanceResp = await fetch('/api/packages/student/balance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const balanceData = await balanceResp.json()
      // Extrair available_classes do objeto balance
      const studentCredits = balanceData?.balance?.available_classes ?? 0

      // Calcular número aproximado de aulas baseado no tipo de recorrência
      const recurrenceWeeks: Record<string, number> = {
        '15_DAYS': 2,
        'MONTH': 4,
        'QUARTER': 12,
        'SEMESTER': 24,
        'YEAR': 52
      }
      const totalWeeks = recurrenceWeeks[recurrenceType] || 4
      const creditsNum = Math.max(0, Number(studentCredits) || 0)
      const confirmedCount = Math.min(creditsNum, totalWeeks)
      const reservedCount = Math.max(0, totalWeeks - confirmedCount)

      setRecurringPreview({
        confirmedCount,
        reservedCount,
        totalCredits: confirmedCount,
        studentCredits: creditsNum
      })
    } catch (err) {
      console.error('Erro ao buscar preview:', err)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Função para criar série recorrente
  async function handleRecurringBook() {
    if (!selectedSlot || !token || !teacherId || !academyId) return

    setIsBooking(true)
    setModalError(null)

    try {
      const dayOfWeek = getDayOfWeek(date)

      const resp = await fetch('/api/booking-series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId,
          academyId,
          dayOfWeek,
          startTime: selectedSlot.time,
          endTime: `${(parseInt(selectedSlot.time.split(':')[0]) + 1).toString().padStart(2, '0')}:${selectedSlot.time.split(':')[1]}`,
          recurrenceType,
          startDate: date
        }),
      })

      const json = await resp.json()

      if (!resp.ok) {
        // Mostrar erro dentro do modal
        setModalError(json.error || 'Erro ao criar série de agendamentos')
        return
      }

      setShowConfirmModal(false)
      setModalError(null)
      setSuccess(`Série criada! ${json.confirmedCount} aulas confirmadas${json.reservedCount > 0 ? ` e ${json.reservedCount} reservadas` : ''}.`)

      // Atualizar créditos no header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('student-credits-updated'))
      }

      setTimeout(() => router.push('/aluno/dashboard'), 1500)
    } catch (e: any) {
      setModalError(e?.message || 'Erro ao criar série de agendamentos')
    } finally {
      setIsBooking(false)
    }
  }

  async function handleBook(slot: Slot) {
    // Prevenir múltiplos cliques
    if (isBooking) return

    try {
      if (!isAuthenticated || !token) {
        setError('Você precisa estar autenticado para agendar.')
        return
      }
      if (!slot.booking_id) {
        setError('Erro: booking_id não encontrado. Por favor, recarregue a página.')
        return
      }

      // Se for recorrente, abrir modal de confirmação
      if (isRecurring) {
        setSelectedSlot(slot)
        setModalError(null) // Limpar erro anterior
        await fetchRecurringPreview(slot)
        setShowConfirmModal(true)
        return
      }

      // Booking simples (não recorrente)
      setIsBooking(true)
      setBookingSlot(slot.time)
      setError(null)
      setSuccess(null)

      const resp = await fetch(`/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: 'ALUNO',
          bookingId: slot.booking_id,
          isLinkedTeacher, // Professor vinculado - não debita crédito
          isFirstClass: isFirstClassEligible, // Primeira aula grátis - independente de professor vinculado
        }),
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const serverMsg = typeof json?.message === 'string' ? json.message : null
        const serverErr = typeof json?.error === 'string' ? json.error : null
        const msg = serverMsg || serverErr || 'Erro ao criar agendamento'
        throw new Error(msg)
      }

      setSuccess('Agendamento criado com sucesso!')

      // Atualizar créditos no header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('student-credits-updated'))
      }

      setTimeout(() => router.push('/aluno/inicio'), 900)
      setTimeout(() => {
        setIsBooking(false)
        setBookingSlot(null)
      }, 2000)
    } catch (e: any) {
      const msg: string = e?.message || 'Erro ao criar agendamento'
      setErrorCode(/saldo insuficiente/i.test(msg) ? 'INSUFFICIENT_CREDITS' : null)
      setError(/saldo insuficiente/i.test(msg)
        ? 'Você não possui créditos suficientes para agendar esta aula.'
        : msg
      )
      setIsBooking(false)
      setBookingSlot(null)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-meu-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Agendar Aula</h1>
      </div>

      {/* Banner Primeira Aula Grátis */}
      {isFirstClassEligible && (
        <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <strong className="block text-green-900">Sua primeira aula é grátis!</strong>
              <span className="text-green-700">Agende agora sem precisar de créditos.</span>
            </div>
          </div>
        </div>
      )}

      {/* Aviso regra de cancelamento (4h) */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <strong className="block sm:inline">Cancelamento gratuito</strong> até 4 horas antes do horário agendado. Se cancelar antes desse prazo, o crédito será estornado. Após esse prazo, o crédito não será estornado.
      </div>

      {/* Filtros básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Escolha a data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2 w-fit"
            min={today}
            max={maxDate}
          />

          {/* Opção de Recorrência */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-meu-primary" />
                <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">
                  Repetir semanalmente
                </Label>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-64 pointer-events-none z-10">
                    Agende aulas no mesmo horário toda semana. Créditos serão debitados automaticamente quando disponíveis.
                  </div>
                </div>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1.5 block">Período de recorrência</Label>
                    <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.label} <span className="text-gray-400 text-xs">({opt.description})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                    <strong>Como funciona:</strong> Ao selecionar um horário, serão agendadas aulas toda <strong>{getDayName(getDayOfWeek(date))}</strong> no mesmo horário.
                    Aulas sem crédito ficam como <em>reserva</em> e são confirmadas automaticamente 7 dias antes, se houver crédito.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de horários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-meu-primary" /> Horários disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
            </div>
          ) : error ? (
            <div>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
              {errorCode === 'INSUFFICIENT_CREDITS' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => router.push('/aluno/comprar')}>
                    Comprar créditos
                  </Button>
                  <Button variant="ghost" onClick={() => router.back()}>
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          ) : success ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>{success}</span>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-gray-600">Nenhum horário disponível para esta data.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {slots
                .filter((s) => s.is_free && s.remaining > 0) // CORREÇÃO: Filtrar apenas slots realmente disponíveis
                .map((s, i) => {
                  const isCurrentSlotBooking = bookingSlot === s.time && isBooking
                  return (
                    <Button
                      key={`${s.time}-${i}`}
                      variant="outline"
                      disabled={isBooking || !s.booking_id} // Desabilitar se não tiver booking_id
                      onClick={() => handleBook(s)}
                      className="justify-center hover:bg-meu-primary hover:text-white hover:border-meu-primary"
                      title={`${s.remaining}/${s.max_capacity} vagas disponíveis`}
                    >
                      {isCurrentSlotBooking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {s.time}
                        </>
                      ) : (
                        s.time
                      )}
                    </Button>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Agendamento Recorrente */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-meu-primary" />
              Confirmar Agendamento Recorrente
            </DialogTitle>
            <DialogDescription>
              Revise os detalhes da série de aulas antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Detalhes da série */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dia da semana:</span>
                <span className="font-medium">{getDayName(getDayOfWeek(date))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Horário:</span>
                <span className="font-medium">{selectedSlot?.time || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Período:</span>
                <span className="font-medium">
                  {RECURRENCE_OPTIONS.find(o => o.value === recurrenceType)?.label || recurrenceType}
                </span>
              </div>
            </div>

            {/* Preview de créditos */}
            {loadingPreview ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-meu-primary" />
              </div>
            ) : recurringPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>{recurringPreview.confirmedCount}</strong> aula(s) serão confirmadas imediatamente
                  </span>
                </div>

                {recurringPreview.reservedCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                    <Clock className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>{recurringPreview.reservedCount}</strong> aula(s) ficarão como reserva
                    </span>
                  </div>
                )}

                {recurringPreview.reservedCount > 0 && (
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    <strong>Atenção:</strong> Reservas precisam de crédito até 7 dias antes da aula.
                    Sem crédito, a reserva será cancelada automaticamente.
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-3">
                  Seu saldo atual: <strong>{recurringPreview.studentCredits}</strong> crédito(s)
                </div>
              </div>
            )}
          </div>

          {/* Erro dentro do modal */}
          {modalError && (
            <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="block">Não foi possível criar a série</strong>
                {modalError}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false)
                setSelectedSlot(null)
                setModalError(null)
              }}
              disabled={isBooking}
            >
              {modalError ? 'Fechar' : 'Cancelar'}
            </Button>
            {!modalError && (
              <Button
                onClick={handleRecurringBook}
                disabled={isBooking || loadingPreview}
                className="bg-meu-primary hover:bg-meu-primary/90"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  'Confirmar Série'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
