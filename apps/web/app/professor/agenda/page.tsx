'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Plus,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { utcToLocal, hasPassedLocal, getLocalTimeFromUtc, getLocalDateFromUtc } from '@/lib/timezone-utils'

interface Booking {
  id: string
  studentId?: string
  studentName?: string
  teacherId: string
  franchiseId?: string
  date: string
  duration: number
  status: 'AVAILABLE' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED'
  notes?: string
  creditsCost: number
}

interface Academy {
  id: string
  name: string
}

export default function ProfessorAgendaPage() {
  const { user, token } = useAuthStore()
  const { academies: teacherAcademies, loading: loadingAcademies } = useTeacherAcademies()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  interface Slot { time: string; is_free: boolean; remaining?: number; max_capacity?: number }
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [blocks, setBlocks] = useState<{ id: string; date: string; franchise_id: string; notes?: string }[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [existingBookingInSlot, setExistingBookingInSlot] = useState<Booking | null>(null)
  const [selectedHoursToBlock, setSelectedHoursToBlock] = useState<string[]>([])
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([])

  const horariosDisponiveis = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ]
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const authFetch = async (url: string, init: RequestInit = {}) => {
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
  }

  useEffect(() => {
    if (!user?.id || !token) return
    fetchData()
  }, [user?.id, token])
  const fetchSlots = async () => {
    if (!user?.id || !token || !selectedDate || selectedFranchise === 'todas') {
      setAvailableSlots([])
      return
    }
    try {
      setLoadingSlots(true)
      const res = await authFetch(`${API_URL}/api/academies/${selectedFranchise}/available-slots?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        const mapped: Slot[] = (data.slots || []).map((s: { time: string; is_free: boolean; remaining?: number; max_capacity?: number }) => ({ time: s.time, is_free: s.is_free, remaining: s.remaining, max_capacity: s.max_capacity }))
        setAvailableSlots(mapped)
      } else {
        setAvailableSlots([])
      }
    } finally {
      setLoadingSlots(false)
    }
  }

  // Carrega horários livres quando tiver unidade e data
  useEffect(() => {
    fetchSlots()
  }, [user?.id, token, selectedFranchise, selectedDate])

  const fetchBlocks = async () => {
    if (!user?.id || !token || !selectedDate) {
      setBlocks([])
      return
    }
    try {
      setLoadingBlocks(true)

      if (selectedFranchise === 'todas') {
        // Buscar bloqueios de todas as unidades
        const allBlocks: any[] = []
        for (const academy of teacherAcademies) {
          const url = `${API_URL}/api/teachers/${user.id}/blocks?academy_id=${academy.id}&date=${selectedDate}`
          const res = await authFetch(url)
          if (res.ok) {
            const data = await res.json()
            allBlocks.push(...(data.blocks || []))
          }
        }
        setBlocks(allBlocks)
      } else {
        // Buscar bloqueios de uma unidade específica
        const url = `${API_URL}/api/teachers/${user.id}/blocks?academy_id=${selectedFranchise}&date=${selectedDate}`
        const res = await authFetch(url)
        if (res.ok) {
          const data = await res.json()
          setBlocks(data.blocks || [])
        } else {
          setBlocks([])
        }
      }
    } finally {
      setLoadingBlocks(false)
    }
  }

  // Carrega bloqueios do dia
  useEffect(() => {
    fetchBlocks()
  }, [user?.id, token, selectedFranchise, selectedDate])

  const fetchData = async () => {
    if (!user?.id || !token) return

    try {
      setLoading(true)

      const bookingsRes = await authFetch(`${API_URL}/api/bookings?teacher_id=${user.id}`)

      if (bookingsRes.ok) {
        try {
          const data = await bookingsRes.json()
          const allBookings = data.bookings || []
          const now = new Date()
          
          // Marcar como COMPLETED automaticamente se passou o horário (usando timezone local)
          const updatedBookings = await Promise.all(allBookings.map(async (b: Booking) => {
            if ((b.status === 'CONFIRMED' || b.status === 'PENDING') && b.studentId) {
              // Verificar se a aula já passou usando horário local
              const bookingLocalDate = utcToLocal(b.date)
              const bookingEnd = new Date(bookingLocalDate.getTime() + b.duration * 60000)
              
              if (bookingEnd < now) {
                // Aula já passou no horário local, marcar como COMPLETED
                try {
                  await authFetch(`${API_URL}/api/bookings/${b.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'COMPLETED' })
                  })
                  return { ...b, status: 'COMPLETED' }
                } catch (err) {
                  console.error('Erro ao atualizar status:', err)
                  return b
                }
              }
            }
            return b
          }))
          
          // Separar ativos e cancelados
          const activeBookings = updatedBookings.filter((b: Booking) => b.status !== 'CANCELLED')
          const cancelled = updatedBookings.filter((b: Booking) => b.status === 'CANCELLED')
          
          
          setBookings(activeBookings)
          setCancelledBookings(cancelled)
        } catch (err) {
          console.error('Erro ao parsear bookings:', err)
          setBookings([])
          setCancelledBookings([])
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })
  }

  const weekDays = getWeekDays()

  const getBookingForSlot = (date: Date, time: string) => {
    // Usar data local para comparação
    const dateStr = date.toISOString().split('T')[0]
    
    const found = bookings.find(booking => {
      // Converter booking UTC para local para comparação
      const bookingLocalDate = utcToLocal(booking.date)
      const bookingDateStr = getLocalDateFromUtc(booking.date)
      const bookingTime = getLocalTimeFromUtc(booking.date)
      
      const matchDate = bookingDateStr === dateStr
      const matchTime = bookingTime === time
      const matchFranchise = selectedFranchise === 'todas' || booking.franchiseId === selectedFranchise
      
      return matchDate && matchTime && matchFranchise
    })
    
    return found
  }

  const getAllBookingsForSlot = (date: Date, time: string) => {
    // Usar data local para comparação
    const dateStr = date.toISOString().split('T')[0]
    
    const filtered = bookings.filter(booking => {
      // Converter booking UTC para local para comparação
      const bookingDateStr = getLocalDateFromUtc(booking.date)
      const bookingTime = getLocalTimeFromUtc(booking.date)
      
      const matchDate = bookingDateStr === dateStr
      const matchTime = bookingTime === time
      
      return matchDate && matchTime
    })
    
    return filtered
  }

  const getAcademyName = (franchiseId?: string) => {
    if (!franchiseId) return null
    const academy = teacherAcademies.find(a => a.id === franchiseId)
    return academy?.name || 'Unidade'
  }

  const getCancelledCountForSlot = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    
    const filtered = cancelledBookings.filter(booking => {
      // Converter booking UTC para local para comparação
      const bookingDateStr = getLocalDateFromUtc(booking.date)
      const bookingTime = getLocalTimeFromUtc(booking.date)
      
      const matchDate = bookingDateStr === dateStr
      const matchTime = bookingTime === time
      const matchFranchise = selectedFranchise === 'todas' || booking.franchiseId === selectedFranchise
      
      return matchDate && matchTime && matchFranchise
    })
    
    return filtered.length
  }

  const handleSlotClick = (date: Date, time: string) => {
    // Buscar TODOS os bookings nesse slot
    const allBookingsInSlot = getAllBookingsForSlot(date, time)
    
    // Se filtro por unidade específica, priorizar booking dessa unidade COM priorização de status
    let mainBooking = null
    if (selectedFranchise !== 'todas') {
      // Buscar bookings da unidade filtrada e priorizar por status
      const bookingsInUnit = allBookingsInSlot.filter(b => b.franchiseId === selectedFranchise)
      mainBooking = bookingsInUnit.find(b => b.status === 'PENDING') ||
                    bookingsInUnit.find(b => b.status === 'CONFIRMED') ||
                    bookingsInUnit.find(b => b.status === 'COMPLETED') ||
                    bookingsInUnit.find(b => b.status === 'AVAILABLE') ||
                    bookingsInUnit.find(b => b.status === 'BLOCKED') ||
                    null
    }
    
    // Se não encontrou ou está em "todas", usar priorização normal
    if (!mainBooking) {
      mainBooking = allBookingsInSlot.find(b => b.status === 'PENDING') ||
                    allBookingsInSlot.find(b => b.status === 'CONFIRMED') ||
                    allBookingsInSlot.find(b => b.status === 'COMPLETED') ||
                    allBookingsInSlot.find(b => b.status === 'AVAILABLE') ||
                    allBookingsInSlot.find(b => b.status === 'BLOCKED')
    }
    
    if (mainBooking) {
      setSelectedBooking(mainBooking)
      setSelectedSlot(null)
      // Armazenar outros bookings (bloqueios) para mostrar no modal
      setExistingBookingInSlot(allBookingsInSlot.length > 1 ? { otherBookings: allBookingsInSlot.filter(b => b.id !== mainBooking.id) } as any : null)
    } else {
      // Slot vazio - modo criação
      setSelectedSlot({
        date: date.toISOString().split('T')[0],
        time
      })
      setSelectedBooking(null)
      setExistingBookingInSlot(null)
    }
    
    setShowModal(true)
  }

  const handleCreateAvailability = async (franchiseId: string) => {
    if (!selectedSlot || !user?.id) return

    try {
      const [hours, minutes] = selectedSlot.time.split(':')
      const bookingDate = new Date(selectedSlot.date + 'T' + selectedSlot.time + ':00Z')

      const response = await authFetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: user.id,
          student_id: null,
          franchise_id: franchiseId,
          date: bookingDate.toISOString(),
          duration: 60,
          credits_cost: 1,
          notes: 'Horário disponível',
          status: 'AVAILABLE'
        })
      })

      if (response.ok) {
        toast.success('Horário disponibilizado!')
        fetchData()
        setShowModal(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Erro ao criar disponibilidade')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao processar requisição')
    }
  }

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' })
      })

      if (response.ok) {
        toast.success('Aula confirmada!')
        fetchData()
        setShowModal(false)
      }
    } catch (error) {
      toast.error('Erro ao confirmar')
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await authFetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Mensagem de sucesso com informação de reembolso
        if (data.refund?.refunded) {
          const recipient = data.refund.recipient === 'professor' ? 'professor' : 'aluno'
          toast.success(`Cancelado com sucesso! ${data.refund.credits} crédito(s) restituído(s) ao ${recipient}.`)
        } else {
          toast.success('Cancelado com sucesso!')
        }
        
        // Recarregar dados (incluindo créditos)
        fetchData()
        
        // Recarregar créditos do usuário
        if (user?.id) {
          const userRes = await authFetch(`${API_URL}/api/users/${user.id}`)
          if (userRes.ok) {
            const userData = await userRes.json()
            // Atualizar o store com os novos créditos
            useAuthStore.setState({ user: { ...user, credits: userData.credits } })
          }
        }
        
        setShowModal(false)
      }
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Se filtro está em "todas as unidades" E status é AVAILABLE, remover de todas
      if (selectedFranchise === 'todas' && selectedBooking && selectedBooking.status === 'AVAILABLE') {
        const bookingDate = new Date(selectedBooking.date)
        const bookingDateStr = bookingDate.toISOString().split('T')[0]
        const bookingTime = bookingDate.getUTCHours().toString().padStart(2, '0') + ':' + bookingDate.getUTCMinutes().toString().padStart(2, '0')
        
        // Buscar todas as disponibilidades no mesmo horário
        const allBookingsInSlot = bookings.filter(b => {
          const bDate = new Date(b.date)
          const bDateStr = bDate.toISOString().split('T')[0]
          const bTime = bDate.getUTCHours().toString().padStart(2, '0') + ':' + bDate.getUTCMinutes().toString().padStart(2, '0')
          return bDateStr === bookingDateStr && bTime === bookingTime && b.status === 'AVAILABLE'
        })

        let removed = 0
        for (const booking of allBookingsInSlot) {
          const response = await authFetch(`${API_URL}/api/bookings/${booking.id}`, {
            method: 'DELETE'
          })
          if (response.ok) removed++
        }

        if (removed > 0) {
          toast.success(`${removed} disponibilidade(s) removida(s) de todas as unidades!`)
        } else {
          toast.error('Erro ao remover disponibilidades')
        }
      } else {
        // Remover apenas o booking específico (CANCELLED ou unidade específica)
        console.log('🗑️ Removendo booking:', bookingId, 'Status:', selectedBooking?.status)
        const response = await authFetch(`${API_URL}/api/bookings/${bookingId}`, {
          method: 'DELETE'
        })

        console.log('📡 Resposta DELETE:', response.status, response.ok)
        
        if (response.ok) {
          toast.success(selectedBooking?.status === 'CANCELLED' ? 'Cancelado removido!' : 'Disponibilidade removida!')
        } else {
          const errorData = await response.json()
          console.error('❌ Erro ao remover:', errorData)
          toast.error('Erro ao remover: ' + (errorData.message || 'Erro desconhecido'))
        }
      }

      setShowModal(false)
      setLoading(true)
      await fetchData()
      await fetchBlocks()
      await fetchSlots()
      setLoading(false)
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'CONFIRMED': return 'bg-blue-500'
      case 'COMPLETED': return 'bg-gray-500'
      case 'CANCELLED': return 'bg-red-500'
      case 'BLOCKED': return 'bg-orange-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Disponível'
      case 'PENDING': return 'Pendente'
      case 'CONFIRMED': return 'Confirmada'
      case 'COMPLETED': return 'Concluída'
      case 'CANCELLED': return 'Cancelada'
      case 'BLOCKED': return 'Bloqueado'
      default: return status
    }
  }

  if (!user || loadingAcademies) {
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
      <div className="px-4 py-6 space-y-6 md:px-6">
        {/* Controles de Bloqueio */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-end lg:grid-cols-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <select
                  value={selectedFranchise}
                  onChange={(e) => setSelectedFranchise(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-meu-primary md:w-auto"
                >
                  <option value="todas">Todas as Unidades</option>
                  {teacherAcademies.map(franchise => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:max-w-sm">
                <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-meu-primary"
                />
              </div>
            </div>

            {/* Seleção de horários para bloquear */}
            {selectedDate && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Selecione os horários para bloquear
                  {selectedFranchise === 'todas' ? ' em todas as unidades' : ` na ${teacherAcademies.find(a => a.id === selectedFranchise)?.name}`}:
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {horariosDisponiveis.map((hora) => {
                    // Verificar se já está bloqueado
                    const isBlocked = blocks.some(b => {
                      const t = new Date(b.date)
                      const hhmm = t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0')
                      return hhmm === hora
                    })
                    
                    return (
                      <button
                        key={hora}
                        disabled={isBlocked}
                        onClick={() => {
                          if (selectedHoursToBlock.includes(hora)) {
                            setSelectedHoursToBlock(selectedHoursToBlock.filter(h => h !== hora))
                          } else {
                            setSelectedHoursToBlock([...selectedHoursToBlock, hora])
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isBlocked
                            ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                            : selectedHoursToBlock.includes(hora)
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600'
                        }`}
                      >
                        {hora}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      // Selecionar apenas os não bloqueados
                      const available = horariosDisponiveis.filter(hora => {
                        return !blocks.some(b => {
                          const t = new Date(b.date)
                          const hhmm = t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0')
                          return hhmm === hora
                        })
                      })
                      setSelectedHoursToBlock(available)
                    }}
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setSelectedHoursToBlock([])}
                  >
                    Limpar seleção
                  </Button>
                  <Button
                    disabled={selectedHoursToBlock.length === 0}
                    onClick={async () => {
                      try {
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                        
                        // Se "todas", bloquear em cada unidade
                        if (selectedFranchise === 'todas') {
                          let totalCreated = 0
                          let academiesBlocked = 0
                          for (const academy of teacherAcademies) {
                            const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/custom`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                academy_id: academy.id, 
                                date: selectedDate,
                                hours: selectedHoursToBlock
                              })
                            })
                            if (res.ok) {
                              const result = await res.json()
                              const created = result.created?.length || 0
                              if (created > 0) {
                                totalCreated += created
                                academiesBlocked++
                              }
                            }
                          }
                          toast.success(`${totalCreated} horário(s) bloqueado(s) em ${academiesBlocked} unidade(s)!`)
                          setSelectedHoursToBlock([])
                          await fetchData()
                          await fetchBlocks()
                          await fetchSlots()
                        } else {
                          // Bloquear apenas na unidade selecionada
                          const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/custom`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              academy_id: selectedFranchise, 
                              date: selectedDate,
                              hours: selectedHoursToBlock
                            })
                          })
                          if (res.ok) {
                            const result = await res.json()
                            const count = result.created?.length || 0
                            toast.success(`${count} horário(s) bloqueado(s)!`)
                            setSelectedHoursToBlock([])
                            await fetchData()
                            await fetchBlocks()
                            await fetchSlots()
                          } else {
                            const errorData = await res.json()
                            toast.error(errorData.error || 'Erro ao bloquear horários')
                          }
                        }
                      } catch {
                        toast.error('Erro ao bloquear horários')
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {selectedFranchise === 'todas' 
                      ? `Bloquear ${selectedHoursToBlock.length} horário(s) em todas as unidades`
                      : `Bloquear ${selectedHoursToBlock.length} horário(s)`
                    }
                  </Button>
                </div>
              </div>
            )}


            {/* Bloqueios do dia */}
            {selectedDate && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Bloqueios do dia {selectedFranchise === 'todas' ? '(todas as unidades)' : ''}
                </p>
                {loadingBlocks ? (
                  <div className="text-sm text-gray-500">Carregando bloqueios...</div>
                ) : blocks.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhum bloqueio para esta data.</div>
                ) : selectedFranchise === 'todas' ? (
                  // Agrupar por horário quando "todas" estiver selecionado
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(() => {
                      // Agrupar bloqueios por horário
                      const groupedByTime: Record<string, any[]> = {}
                      blocks.forEach(b => {
                        const t = new Date(b.date)
                        const hhmm = t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0')
                        if (!groupedByTime[hhmm]) groupedByTime[hhmm] = []
                        groupedByTime[hhmm].push(b)
                      })
                      
                      return Object.entries(groupedByTime).sort().map(([hhmm, blocksAtTime]) => (
                        <div key={hhmm} className="flex items-center justify-between p-2 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{hhmm}</p>
                            <p className="text-xs text-gray-500">
                              🔒 {blocksAtTime.length} unidade(s)
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                // Desbloquear todos os bloqueios desse horário
                                let removed = 0
                                for (const b of blocksAtTime) {
                                  const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/${b.id}`, { method: 'DELETE' })
                                  if (res.ok) removed++
                                }
                                toast.success(`${removed} bloqueio(s) removido(s)!`)
                                // Recarregar tudo
                                await fetchData()
                                await fetchBlocks()
                                await fetchSlots()
                              } catch {
                                toast.error('Erro ao remover bloqueios')
                              }
                            }}
                          >
                            Desbloquear todas
                          </Button>
                        </div>
                      ))
                    })()}
                  </div>
                ) : (
                  // Mostrar lista normal quando unidade específica estiver selecionada
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {blocks.map((b) => {
                      const t = new Date(b.date)
                      const hhmm = t.getUTCHours().toString().padStart(2, '0') + ':' + t.getUTCMinutes().toString().padStart(2, '0')
                      return (
                        <div key={b.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{hhmm}</p>
                            {b.notes && <p className="text-xs text-gray-500">{b.notes}</p>}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/${b.id}`, { method: 'DELETE' })
                                if (res.ok) {
                                  toast.success('Bloqueio removido!')
                                  // Recarregar tudo
                                  await fetchData()
                                  await fetchBlocks()
                                  await fetchSlots()
                                } else {
                                  toast.error('Erro ao remover bloqueio')
                                }
                              } catch {
                                toast.error('Erro ao remover bloqueio')
                              }
                            }}
                          >
                            Desbloquear
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl md:mb-2">Minha Agenda</h1>
            <p className="text-gray-600">Gerencie sua disponibilidade e aulas</p>
          </div>
          
          <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
            <MapPin className="h-5 w-5 text-gray-500" />
            <select
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-meu-primary md:w-auto"
            >
              <option value="todas">Todas as Unidades</option>
              {teacherAcademies.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legenda */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-500"></div>
                <span className="font-medium">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-yellow-500"></div>
                <span className="font-medium">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-blue-500"></div>
                <span className="font-medium">Confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-500"></div>
                <span className="font-medium">Concluída</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-orange-500"></div>
                <span className="font-medium">Bloqueado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  1
                </div>
                <span className="font-medium">Cancelamento(s) no horário</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navegação da Semana */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="w-full sm:w-auto">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - 
                  {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="w-full sm:w-auto">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grade de Horários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-meu-primary" />
              Grade Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[720px] md:min-w-full">
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-8 gap-2 md:gap-3 mb-4">
                  <div className="rounded-lg bg-gray-50 p-2 text-center text-xs font-medium text-gray-500 sm:text-sm">
                    Horário
                  </div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="rounded-lg bg-gray-50 p-2 text-center">
                      <div className="text-xs font-medium text-gray-900 sm:text-sm">{diasSemana[day.getDay()]}</div>
                      <div className="text-xs text-gray-500 sm:text-sm">{day.getDate()}</div>
                    </div>
                  ))}
                </div>

                {/* Grade de horários */}
                <div className="space-y-2">
                  {horariosDisponiveis.map(time => (
                    <div key={time} className="grid grid-cols-8 gap-2 md:gap-3">
                      <div className="rounded-lg bg-gray-50 p-2 text-center text-xs font-medium text-gray-700 sm:text-sm">
                        {time}
                      </div>
                      {weekDays.map(day => {
                        const isPast = day < new Date() && day.toDateString() !== new Date().toDateString()
                        
                        // Buscar TODOS os bookings nesse slot
                        const allBookingsInSlot = getAllBookingsForSlot(day, time)
                        
                        
                        // Contar por status
                        const blockedAcademiesCount = allBookingsInSlot.filter(b => b.status === 'BLOCKED').length
                        const availableAcademiesCount = allBookingsInSlot.filter(b => b.status === 'AVAILABLE').length
                        const pendingCount = allBookingsInSlot.filter(b => b.status === 'PENDING').length
                        const confirmedCount = allBookingsInSlot.filter(b => b.status === 'CONFIRMED').length
                        const completedCount = allBookingsInSlot.filter(b => b.status === 'COMPLETED').length
                        
                        // Determinar qual booking mostrar (prioridade: PENDING > CONFIRMED > COMPLETED > AVAILABLE > BLOCKED)
                        let displayBooking = null
                        if (pendingCount > 0) {
                          displayBooking = allBookingsInSlot.find(b => b.status === 'PENDING')
                        } else if (confirmedCount > 0) {
                          displayBooking = allBookingsInSlot.find(b => b.status === 'CONFIRMED')
                        } else if (completedCount > 0) {
                          displayBooking = allBookingsInSlot.find(b => b.status === 'COMPLETED')
                        } else if (availableAcademiesCount > 0) {
                          displayBooking = allBookingsInSlot.find(b => b.status === 'AVAILABLE')
                        } else if (blockedAcademiesCount > 0) {
                          displayBooking = allBookingsInSlot.find(b => b.status === 'BLOCKED')
                        }
                        
                        // Filtrar por unidade se não for "todas"
                        let booking = null
                        if (selectedFranchise === 'todas') {
                          booking = displayBooking
                        } else {
                          // Priorizar por status quando filtrado por unidade
                          const bookingsInUnit = allBookingsInSlot.filter(b => b.franchiseId === selectedFranchise)
                          booking = bookingsInUnit.find(b => b.status === 'PENDING') ||
                                    bookingsInUnit.find(b => b.status === 'CONFIRMED') ||
                                    bookingsInUnit.find(b => b.status === 'COMPLETED') ||
                                    bookingsInUnit.find(b => b.status === 'AVAILABLE') ||
                                    bookingsInUnit.find(b => b.status === 'BLOCKED') ||
                                    null
                        }
                        
                        const blockedInAllAcademies = blockedAcademiesCount === teacherAcademies.length && teacherAcademies.length > 1
                        const availableInMultiple = availableAcademiesCount > 1
                        
                        const cancelledCount = getCancelledCountForSlot(day, time)
                        
                        return (
                          <div key={`${day.toISOString()}-${time}`} className="p-1 relative">
                            {/* Badge de cancelamentos */}
                            {cancelledCount > 0 && (
                              <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md pointer-events-none">
                                {cancelledCount}
                              </div>
                            )}
                            <button
                              onClick={() => handleSlotClick(day, time)}
                              disabled={isPast}
                              className={`h-14 w-full rounded-lg text-[11px] font-medium transition-all sm:text-xs md:h-16 ${
                                booking
                                  ? `${getStatusColor(booking.status)} text-white hover:opacity-80`
                                  : isPast
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-2 border-dashed border-gray-300 hover:border-meu-primary hover:bg-meu-primary/5'
                              }`}
                            >
                              {booking ? (
                                <div className="flex flex-col items-center justify-center h-full p-1">
                                  <span className="text-xs font-semibold">
                                    {booking.studentName || getStatusText(booking.status)}
                                  </span>
                                  
                                  {/* Mostrar unidade quando filtro específico OU quando única unidade */}
                                  {booking.franchiseId && (
                                    selectedFranchise !== 'todas' ? (
                                      // Filtro específico: sempre mostra o nome
                                      <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                        📍 {getAcademyName(booking.franchiseId)}
                                      </span>
                                    ) : (
                                      // "Todas as unidades": só mostra se for única
                                      !(booking.status === 'BLOCKED' && blockedAcademiesCount > 1) && 
                                      !(booking.status === 'AVAILABLE' && availableAcademiesCount > 1) && (
                                        <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                          📍 {getAcademyName(booking.franchiseId)}
                                        </span>
                                      )
                                    )
                                  )}
                                  
                                  {/* Indicadores apenas quando "Todas as unidades" */}
                                  {selectedFranchise === 'todas' && (
                                    <>
                                      {/* Indicador de bloqueios em outras unidades (quando há reserva/disponibilidade) */}
                                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && blockedAcademiesCount > 0 && (
                                        <span className="text-[10px] opacity-75 mt-0.5 truncate w-full text-center">
                                          🔒 +{blockedAcademiesCount} bloqueada(s)
                                        </span>
                                      )}
                                      
                                      {/* Indicador quando TUDO está bloqueado */}
                                      {booking.status === 'BLOCKED' && blockedAcademiesCount > 1 && (
                                        <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                          🔒 {blockedAcademiesCount} unidade(s)
                                        </span>
                                      )}
                                      
                                      {/* Indicador de múltiplas disponibilidades */}
                                      {booking.status === 'AVAILABLE' && availableAcademiesCount > 1 && (
                                        <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                          ✓ {availableAcademiesCount} unidade(s)
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : isPast ? (
                                '-'
                              ) : (
                                <Plus className="h-4 w-4 mx-auto text-gray-400" />
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal (com Portal) */}
        {showModal && createPortal(
          <div className="fixed inset-0 z-[9999] m-0 p-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedBooking ? 'Detalhes' : 'Novo Horário'}</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBooking ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Status:</p>
                      <Badge className={getStatusColor(selectedBooking.status)}>
                        {getStatusText(selectedBooking.status)}
                      </Badge>
                    </div>

                    {selectedBooking.studentName && (
                      <div>
                        <p className="text-sm text-gray-600">Aluno:</p>
                        <p className="font-medium">{selectedBooking.studentName}</p>
                      </div>
                    )}

                    {/* Se BLOCKED em múltiplas unidades, mostrar lista de todas */}
                    {selectedFranchise === 'todas' && selectedBooking.status === 'BLOCKED' && existingBookingInSlot?.otherBookings && existingBookingInSlot.otherBookings.length > 0 ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-orange-900 mb-2">
                          🔒 Unidades bloqueadas neste horário:
                        </p>
                        <div className="space-y-1">
                          {/* Incluir o booking principal na lista */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-orange-800">
                              📍 {getAcademyName(selectedBooking.franchiseId)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                              onClick={async () => {
                                try {
                                  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                  const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/${selectedBooking.id}`, { method: 'DELETE' })
                                  if (res.ok) {
                                    toast.success('Bloqueio removido!')
                                    await fetchData()
                                    await fetchBlocks()
                                    setShowModal(false)
                                  }
                                } catch {
                                  toast.error('Erro ao remover bloqueio')
                                }
                              }}
                            >
                              Desbloquear
                            </Button>
                          </div>
                          {/* Outras unidades */}
                          {existingBookingInSlot.otherBookings.map((otherBooking: any) => (
                            <div key={otherBooking.id} className="flex items-center justify-between text-xs">
                              <span className="text-orange-800">
                                📍 {getAcademyName(otherBooking.franchiseId)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                onClick={async () => {
                                  try {
                                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                    const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/${otherBooking.id}`, { method: 'DELETE' })
                                    if (res.ok) {
                                      toast.success('Bloqueio removido!')
                                      await fetchData()
                                      await fetchBlocks()
                                      setShowModal(false)
                                    }
                                  } catch {
                                    toast.error('Erro ao remover bloqueio')
                                  }
                                }}
                              >
                                Desbloquear
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Exibição normal de unidade */}
                        {selectedBooking.franchiseId && (
                          <div>
                            <p className="text-sm text-gray-600">
                              {selectedFranchise === 'todas' && selectedBooking.status === 'AVAILABLE' ? 'Disponível em:' : 'Unidade:'}
                            </p>
                            <p className="font-medium">
                              {selectedFranchise === 'todas' && selectedBooking.status === 'AVAILABLE' ? (
                                `📍 ${(() => {
                                  const bookingDate = new Date(selectedBooking.date)
                                  const bookingDateStr = bookingDate.toISOString().split('T')[0]
                                  const bookingTime = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                  return bookings.filter(b => {
                                    const bDate = new Date(b.date)
                                    const bDateStr = bDate.toISOString().split('T')[0]
                                    const bTime = bDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    return bDateStr === bookingDateStr && bTime === bookingTime && b.status === 'AVAILABLE'
                                  }).length
                                })()} unidade(s)`
                              ) : (
                                `📍 ${getAcademyName(selectedBooking.franchiseId)}`
                              )}
                            </p>
                          </div>
                        )}

                        {/* Mostrar bloqueios em outras unidades (quando há reserva/disponibilidade) */}
                        {selectedFranchise === 'todas' && existingBookingInSlot?.otherBookings && existingBookingInSlot.otherBookings.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-orange-900 mb-2">
                              🔒 Outras unidades neste horário:
                            </p>
                            <div className="space-y-1">
                              {existingBookingInSlot.otherBookings.map((otherBooking: any) => (
                                <div key={otherBooking.id} className="flex items-center justify-between text-xs">
                                  <span className="text-orange-800">
                                    📍 {getAcademyName(otherBooking.franchiseId)} - {getStatusText(otherBooking.status)}
                                  </span>
                                  {otherBooking.status === 'BLOCKED' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                      onClick={async () => {
                                        try {
                                          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                          const res = await authFetch(`${API_URL}/api/teachers/${user?.id}/blocks/${otherBooking.id}`, { method: 'DELETE' })
                                          if (res.ok) {
                                            toast.success('Bloqueio removido!')
                                            await fetchData()
                                            await fetchBlocks()
                                            setShowModal(false)
                                          }
                                        } catch {
                                          toast.error('Erro ao remover bloqueio')
                                        }
                                      }}
                                    >
                                      Desbloquear
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Informações adicionais para COMPLETED */}
                    {selectedBooking.status === 'COMPLETED' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Check className="h-4 w-4 text-gray-600" />
                          <p className="text-sm font-medium text-gray-900">Aula Concluída</p>
                        </div>
                        <p className="text-xs text-gray-600">
                          Esta aula foi automaticamente marcada como concluída após o horário agendado.
                        </p>
                        {selectedBooking.franchiseId && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <strong>Unidade:</strong> {getAcademyName(selectedBooking.franchiseId)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col space-y-2">
                      {/* Botões para BLOCKED */}
                      {selectedBooking.status === 'BLOCKED' && (
                        <Button
                          onClick={() => handleDeleteBooking(selectedBooking.id)}
                          variant="destructive"
                          className="w-full text-white"
                        >
                          🔓 Desbloquear
                        </Button>
                      )}
                      
                      {/* Botões para PENDING/CONFIRMED */}
                      {(selectedBooking.status === 'PENDING' || selectedBooking.status === 'CONFIRMED') && (
                        <div className="flex space-x-2">
                          {selectedBooking.status === 'PENDING' && (
                            <Button
                              onClick={() => handleConfirmBooking(selectedBooking.id)}
                              className="flex-1 bg-green-600"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Confirmar
                            </Button>
                          )}
                          <Button
                            onClick={() => handleCancelBooking(selectedBooking.id)}
                            variant="outline"
                            className="flex-1 text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                      
                      {/* Botão para AVAILABLE */}
                      {selectedBooking.status === 'AVAILABLE' && (
                        <Button
                          onClick={() => handleDeleteBooking(selectedBooking.id)}
                          variant="destructive"
                          className="w-full text-white"
                        >
                          🗑️ Remover Disponibilidade
                        </Button>
                      )}
                      
                      {/* Para COMPLETED, não mostrar botões de ação */}
                      {selectedBooking.status === 'COMPLETED' && (
                        <div className="text-center py-2">
                          <p className="text-sm text-gray-500">
                            ✅ Aula finalizada - Nenhuma ação necessária
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : selectedSlot ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Horário:</p>
                      <p className="font-medium">
                        {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedSlot.time}
                      </p>
                    </div>

                    {existingBookingInSlot && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ <strong>Atenção:</strong> Você já tem uma disponibilidade neste horário na{' '}
                          <strong>{getAcademyName(existingBookingInSlot.franchiseId)}</strong>.
                          <br />
                          Ao criar em outra unidade, a anterior será <strong>substituída</strong>.
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Disponibilizar em:</p>
                      <div className="space-y-2">
                        {/* Opção: Todas as unidades */}
                        {teacherAcademies.length > 1 && (
                          <Button
                            onClick={async () => {
                              if (!selectedSlot || !user?.id) return
                              try {
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                                const bookingDate = new Date(selectedSlot.date + 'T' + selectedSlot.time + ':00Z')

                                // Primeiro, remover qualquer disponibilidade existente neste horário
                                const existingBookings = bookings.filter(b => {
                                  const bDate = new Date(b.date)
                                  const bDateStr = bDate.toISOString().split('T')[0]
                                  const bTime = bDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                  return bDateStr === selectedSlot.date && bTime === selectedSlot.time && b.status === 'AVAILABLE'
                                })

                                for (const booking of existingBookings) {
                                  await authFetch(`${API_URL}/api/bookings/${booking.id}`, { method: 'DELETE' })
                                }

                                let created = 0
                                let errors = 0
                                
                                // Criar disponibilidade em cada unidade sequencialmente
                                
                                for (let i = 0; i < teacherAcademies.length; i++) {
                                  const academy = teacherAcademies[i]
                                  try {
                                    const payload = {
                                      teacher_id: user.id,
                                      student_id: null,
                                      franchise_id: academy.id,
                                      date: bookingDate.toISOString(),
                                      duration: 60,
                                      credits_cost: 1,
                                      notes: 'Horário disponível',
                                      status: 'AVAILABLE'
                                    }
                                    
                                    const response = await authFetch(`${API_URL}/api/bookings`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(payload)
                                    })
                                    
                                    if (response.ok) {
                                      created++
                                    } else {
                                      errors++
                                    }
                                  } catch (err) {
                                    errors++
                                  }
                                }
                                
                                if (created > 0) {
                                  toast.success(`Horário disponibilizado em ${created} unidade(s)!`)
                                }
                                if (errors > 0) {
                                  toast.error(`${errors} erro(s) ao criar disponibilidades`)
                                }
                                
                                await fetchData()
                                setShowModal(false)
                              } catch (error) {
                                console.error('Erro geral:', error)
                                toast.error('Erro ao processar requisição')
                              }
                            }}
                            className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            🔓 Todas as unidades ({teacherAcademies.length})
                          </Button>
                        )}
                        
                        {/* Opções individuais */}
                        {teacherAcademies.map((franchise) => (
                          <Button
                            key={franchise.id}
                            onClick={() => handleCreateAvailability(franchise.id)}
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <Plus className="h-4 w-4 mr-2 text-green-600" />
                            {franchise.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>,
          document.body
        )}
      </div>
    </ProfessorLayout>
  )
}
