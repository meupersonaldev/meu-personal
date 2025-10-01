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
  const { user } = useAuthStore()
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

  const horariosDisponiveis = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ]
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  useEffect(() => {
    if (!user?.id) return
    
    const loadData = async () => {
      try {
        setLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        const bookingsRes = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}`)

        if (bookingsRes.ok) {
          const data = await bookingsRes.json()
          setBookings(data.bookings || [])
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        toast.error('Erro ao carregar agenda')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])
  const fetchSlots = async () => {
    if (!user?.id || !selectedDate || selectedFranchise === 'todas') {
      setAvailableSlots([])
      return
    }
    try {
      setLoadingSlots(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/academies/${selectedFranchise}/available-slots?date=${selectedDate}`)
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
  }, [user?.id, selectedFranchise, selectedDate])

  const fetchBlocks = async () => {
    if (!user?.id || !selectedDate) {
      setBlocks([])
      return
    }
    try {
      setLoadingBlocks(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      if (selectedFranchise === 'todas') {
        // Buscar bloqueios de todas as unidades
        const allBlocks: any[] = []
        for (const academy of teacherAcademies) {
          const url = `${API_URL}/api/teachers/${user.id}/blocks?academy_id=${academy.id}&date=${selectedDate}`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            allBlocks.push(...(data.blocks || []))
          }
        }
        setBlocks(allBlocks)
      } else {
        // Buscar bloqueios de uma unidade específica
        const url = `${API_URL}/api/teachers/${user.id}/blocks?academy_id=${selectedFranchise}&date=${selectedDate}`
        const res = await fetch(url)
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
  }, [user?.id, selectedFranchise, selectedDate])

  const fetchData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const bookingsRes = await fetch(`${API_URL}/api/bookings?teacher_id=${user.id}`)

      if (bookingsRes.ok) {
        try {
          const data = await bookingsRes.json()
          setBookings(data.bookings || [])
        } catch (err) {
          console.error('Erro ao parsear bookings:', err)
          setBookings([])
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
    const dateStr = date.toISOString().split('T')[0]
    
    const found = bookings.find(booking => {
      const bookingDate = new Date(booking.date)
      const bookingDateStr = bookingDate.toISOString().split('T')[0]
      const bookingTime = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      
      const matchDate = bookingDateStr === dateStr
      const matchTime = bookingTime === time
      const matchFranchise = selectedFranchise === 'todas' || booking.franchiseId === selectedFranchise
      
      return matchDate && matchTime && matchFranchise
    })
    
    return found
  }

  const getAcademyName = (franchiseId?: string) => {
    if (!franchiseId) return null
    const academy = teacherAcademies.find(a => a.id === franchiseId)
    return academy?.name || 'Unidade'
  }

  const handleSlotClick = (date: Date, time: string) => {
    const booking = getBookingForSlot(date, time)
    
    if (booking) {
      setSelectedBooking(booking)
      setSelectedSlot(null)
      setExistingBookingInSlot(null)
    } else {
      // Verificar se existe agendamento no mesmo horário em OUTRA unidade
      const dateStr = date.toISOString().split('T')[0]
      const existingInOtherUnit = bookings.find(b => {
        const bookingDate = new Date(b.date)
        const bookingDateStr = bookingDate.toISOString().split('T')[0]
        const bookingTime = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        
        return bookingDateStr === dateStr && 
               bookingTime === time && 
               !b.studentId && // Apenas disponibilidades vazias
               b.status === 'AVAILABLE'
      })
      
      setSelectedSlot({
        date: date.toISOString().split('T')[0],
        time
      })
      setSelectedBooking(null)
      setExistingBookingInSlot(existingInOtherUnit || null)
    }
    
    setShowModal(true)
  }

  const handleCreateAvailability = async (franchiseId: string) => {
    if (!selectedSlot || !user?.id) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const [hours, minutes] = selectedSlot.time.split(':')
      const bookingDate = new Date(selectedSlot.date + 'T00:00:00')
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const response = await fetch(`${API_URL}/api/bookings`, {
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (response.ok) {
        toast.success('Cancelado com sucesso!')
        fetchData()
        setShowModal(false)
      }
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Disponibilidade removida!')
        fetchData()
        setShowModal(false)
      } else {
        toast.error('Erro ao remover')
      }
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
      <div className="p-6 space-y-6">
        {/* Controles de Bloqueio */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <select
                  value={selectedFranchise}
                  onChange={(e) => setSelectedFranchise(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-meu-primary w-full"
                >
                  <option value="todas">Todas as Unidades</option>
                  {teacherAcademies.map(franchise => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
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
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                  {horariosDisponiveis.map((hora) => {
                    // Verificar se já está bloqueado
                    const isBlocked = blocks.some(b => {
                      const t = new Date(b.date)
                      const hhmm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
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
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Selecionar apenas os não bloqueados
                      const available = horariosDisponiveis.filter(hora => {
                        return !blocks.some(b => {
                          const t = new Date(b.date)
                          const hhmm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
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
                          for (const academy of teacherAcademies) {
                            const res = await fetch(`${API_URL}/api/teachers/${user?.id}/blocks/custom`, {
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
                              totalCreated += result.created?.length || 0
                            }
                          }
                          toast.success(`${totalCreated} horário(s) bloqueado(s) em ${teacherAcademies.length} unidade(s)!`)
                          setSelectedHoursToBlock([])
                          await fetchData()
                          await fetchBlocks()
                          await fetchSlots()
                        } else {
                          // Bloquear apenas na unidade selecionada
                          const res = await fetch(`${API_URL}/api/teachers/${user?.id}/blocks/custom`, {
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
                    Bloquear {selectedHoursToBlock.length} horário(s) {selectedFranchise === 'todas' ? `em ${teacherAcademies.length} unidade(s)` : ''}
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
                        const hhmm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
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
                                  const res = await fetch(`${API_URL}/api/teachers/${user?.id}/blocks/${b.id}`, { method: 'DELETE' })
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
                      const hhmm = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
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
                                const res = await fetch(`${API_URL}/api/teachers/${user?.id}/blocks/${b.id}`, { method: 'DELETE' })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Minha Agenda</h1>
            <p className="text-gray-600">Gerencie sua disponibilidade e aulas</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-gray-500" />
            <select
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-meu-primary"
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
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Disponível</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Pendente</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Confirmada</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-sm">Concluída</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Bloqueado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navegação da Semana */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
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
              
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
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
              <div className="min-w-full">
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  <div className="p-3 text-center font-medium text-gray-500">Horário</div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="p-3 text-center">
                      <div className="font-medium text-gray-900">{diasSemana[day.getDay()]}</div>
                      <div className="text-sm text-gray-500">{day.getDate()}</div>
                    </div>
                  ))}
                </div>

                {/* Grade de horários */}
                <div className="space-y-2">
                  {horariosDisponiveis.map(time => (
                    <div key={time} className="grid grid-cols-8 gap-2">
                      <div className="p-3 text-center font-medium text-gray-700 bg-gray-50 rounded-lg">
                        {time}
                      </div>
                      {weekDays.map(day => {
                        const booking = getBookingForSlot(day, time)
                        const isPast = day < new Date() && day.toDateString() !== new Date().toDateString()
                        
                        // Contar quantas unidades estão bloqueadas nesse horário
                        const dateStr = day.toISOString().split('T')[0]
                        const blockedAcademiesCount = booking?.status === 'BLOCKED' ? teacherAcademies.filter(academy => {
                          return bookings.some(b => {
                            const bookingDate = new Date(b.date)
                            const bookingDateStr = bookingDate.toISOString().split('T')[0]
                            const bookingTime = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            return bookingDateStr === dateStr && bookingTime === time && b.franchiseId === academy.id && b.status === 'BLOCKED'
                          })
                        }).length : 0
                        
                        const blockedInAllAcademies = blockedAcademiesCount === teacherAcademies.length && teacherAcademies.length > 1
                        
                        return (
                          <div key={`${day.toISOString()}-${time}`} className="p-1">
                            <button
                              onClick={() => handleSlotClick(day, time)}
                              disabled={isPast}
                              className={`w-full h-16 rounded-lg text-xs font-medium transition-all ${
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
                                  {booking.status === 'BLOCKED' && blockedAcademiesCount > 1 && (
                                    <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                      🔒 {blockedAcademiesCount} unidade(s)
                                    </span>
                                  )}
                                  {booking.status === 'BLOCKED' && blockedAcademiesCount === 1 && booking.franchiseId && (
                                    <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                      📍 {getAcademyName(booking.franchiseId)}
                                    </span>
                                  )}
                                  {booking.status !== 'BLOCKED' && booking.franchiseId && (
                                    <span className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                                      📍 {getAcademyName(booking.franchiseId)}
                                    </span>
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

                    {selectedBooking.franchiseId && (
                      <div>
                        <p className="text-sm text-gray-600">Unidade:</p>
                        <p className="font-medium">📍 {getAcademyName(selectedBooking.franchiseId)}</p>
                      </div>
                    )}

                    <div className="flex flex-col space-y-2">
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
                        {selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'COMPLETED' && (
                          <Button
                            onClick={() => handleCancelBooking(selectedBooking.id)}
                            variant="outline"
                            className="flex-1 text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                      
                      {(selectedBooking.status === 'AVAILABLE' || selectedBooking.status === 'CANCELLED') && !selectedBooking.studentId && (
                        <Button
                          onClick={() => handleDeleteBooking(selectedBooking.id)}
                          variant="destructive"
                          className="w-full text-white"
                        >
                          🗑️ Remover {selectedBooking.status === 'CANCELLED' ? 'Cancelado' : 'Disponibilidade'}
                        </Button>
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
