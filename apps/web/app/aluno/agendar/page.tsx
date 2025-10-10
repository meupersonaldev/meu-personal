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
  const unitId = searchParams.get('unit_id') || ''
  const { token, isAuthenticated } = useAuthStore()

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [date, setDate] = useState<string>(today)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!unitId || !date) return
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const resp: any = await academiesAPI.getAvailableSlots(unitId, date, teacherId || undefined)
        const list: Slot[] = Array.isArray(resp?.slots)
          ? resp.slots
          : Array.isArray(resp)
            ? (resp as any[]).map((t: any) => ({
                time: String(t),
                max_capacity: 1,
                current_occupancy: 0,
                remaining: 1,
                is_free: true,
                slot_duration: 60,
                slot_cost: 1,
              }))
            : []
        setSlots(list)
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar horários disponíveis')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [unitId, date, teacherId])

  async function handleBook(slot: string) {
    try {
      if (!isAuthenticated || !token) {
        setError('Você precisa estar autenticado para agendar.')
        return
      }
      if (!teacherId || !unitId) {
        setError('Parâmetros inválidos para agendamento.')
        return
      }

      // Montar datas ISO em UTC (duração padrão 60 min)
      const start = new Date(`${date}T${slot}:00Z`)
      const end = new Date(start)
      end.setUTCMinutes(end.getUTCMinutes() + 60)

      const resp = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: 'ALUNO',
          professorId: teacherId,
          unitId: unitId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(json?.error || json?.message || 'Erro ao criar agendamento')
      }

      setSuccess('Agendamento criado com sucesso!')
      // Pequeno delay para feedback antes de redirecionar
      setTimeout(() => router.push('/aluno/inicio'), 900)
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar agendamento')
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-meu-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Agendar Aula</h1>
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
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
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
              {slots.map((s, i) => (
              <Button
                key={`${s.time}-${i}`}
                variant={s.is_free ? 'outline' : 'secondary'}
                disabled={!s.is_free || s.remaining <= 0}
                onClick={() => handleBook(s.time)}
                className="justify-center"
                title={s.is_free ? `${s.remaining}/${s.max_capacity} vagas` : 'Indisponível'}
              >
                {s.time} {s.remaining > 0 ? `(${s.remaining}/${s.max_capacity})` : '(lotado)'}
              </Button>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
