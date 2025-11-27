'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'
import { academiesAPI, API_BASE_URL } from '@/lib/api'

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

export default function AgendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get('teacher_id') || ''
  const academyId = searchParams.get('academy_id') || ''
  const { token, isAuthenticated } = useAuthStore()

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const initialDate = useMemo(() => searchParams.get('date') || today, [searchParams, today])
  const [date, setDate] = useState<string>(initialDate)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState<boolean>(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!teacherId || !date || !token) return
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        // Buscar bookings disponíveis do professor para a data (NOT IN ('RESERVED', 'PAID', 'DONE'))
        const bookingsResponse = await fetch(
          `${API_BASE_URL}/api/teachers/${teacherId}/bookings-by-date?date=${date}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
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

      // Bloquear todos os botões e marcar o slot sendo processado
      setIsBooking(true)
      setBookingSlot(slot.time)
      setError(null)
      setSuccess(null)

      const resp = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: 'ALUNO',
          bookingId: slot.booking_id, // Enviar o ID do booking que foi clicado
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
      // Pequeno delay para feedback antes de redirecionar
      setTimeout(() => router.push('/aluno/inicio'), 900)
      // Liberar os botões após um tempo maior, caso o redirecionamento não aconteça
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
      // Liberar os botões em caso de erro
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

      {/* Aviso regra de cancelamento (4h) */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <strong className="block sm:inline">Cancelamento gratuito</strong> até 4 horas antes do horário agendado. Se cancelar antes desse prazo, o crédito será estornado. Após esse prazo, o crédito não será estornado.
      </div>

      {/* Filtros básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Escolha a data</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
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
    </div>
  )
}
