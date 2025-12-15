'use client'

import { useEffect, useState } from 'react'
import { Calendar, User, GraduationCap, AlertCircle, Eye, X, CheckCircle, XCircle, Clock, Edit, Trash2, Save, ChevronLeft, ChevronRight, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatLocalTime, getLocalDateFromUtc, getLocalTimeFromUtc } from '@/lib/timezone-utils'

interface Booking {
  id: string
  student_id: string
  teacher_id: string
  date: string
  duration: number
  notes?: string
  credits_cost: number
  status: string
  created_at: string
  studentName?: string
  teacherName?: string
}

export default function AgendamentosGestaoPage() {
  const { teachers, students, fetchTeachers, fetchStudents, franquiaUser } = useFranquiaStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [cancelConfirm, setCancelConfirm] = useState<{
    isOpen: boolean
    bookingId: string | null
  }>({
    isOpen: false,
    bookingId: null
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    bookingId: string | null
  }>({
    isOpen: false,
    bookingId: null
  })
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const cancelFreeUntilLabel = (() => {
    if (!cancelConfirm.bookingId) return null
    const b = bookings.find(bk => bk.id === cancelConfirm.bookingId)
    if (!b) return null
    const cutoffIso = (b as any).cancellableUntil || new Date(new Date(b.date).getTime() - 4 * 60 * 60 * 1000).toISOString()
    const cutoff = new Date(cutoffIso)
    const date = cutoff.toLocaleDateString('pt-BR')
    const time = cutoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${date} ${time}`
  })()

  // Aguardar hidratação do estado
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && franquiaUser?.academyId) {
      loadData()
    }
  }, [isHydrated, franquiaUser?.academyId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchTeachers(), fetchStudents()])
      await fetchBookings()
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }


  const fetchBookings = async () => {
    if (!franquiaUser?.academyId) {
      console.error('[fetchBookings] academyId não encontrado')
      return
    }

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      console.log('[fetchBookings] Buscando agendamentos para academia:', franquiaUser.academyId)

      const url = `/api/bookings?franchise_id=${franquiaUser.academyId}`
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, { headers })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[fetchBookings] Erro na resposta:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch bookings')
      }

      const data = await response.json()
      console.log('[fetchBookings] Dados recebidos:', data)

      // Enriquecer com nomes e filtrar apenas bookings com alunos (não disponibilidades vazias)
      const enrichedBookings = data.bookings
        ?.filter((b: any) => {
          const hasStudent = b.student_id || b.studentId
          return hasStudent
        })
        .map((booking: any) => ({
          ...booking,
          student_id: booking.student_id || booking.studentId,
          teacher_id: booking.teacher_id || booking.teacherId,
          studentName: booking.studentName || booking.student?.name || students.find(s => s.id === booking.studentId || s.id === booking.student_id)?.name || 'Aluno não encontrado',
          teacherName: booking.teacherName || booking.teacher?.name || teachers.find(t => t.id === booking.teacherId || t.id === booking.teacher_id)?.name || 'Professor não encontrado',
          created_at: booking.created_at || booking.createdAt || new Date().toISOString()
        })) || []

      console.log('[fetchBookings] Agendamentos enriquecidos:', enrichedBookings.length)
      setBookings(enrichedBookings)
    } catch (error: any) {
      console.error('[fetchBookings] Erro:', error)
      toast.error(error.message || 'Erro ao carregar agendamentos')
      setBookings([])
    }
  }

  const handleCancel = (bookingId: string) => {
    setCancelConfirm({
      isOpen: true,
      bookingId
    })
  }

  const confirmCancel = async () => {
    if (!cancelConfirm.bookingId) return

    const reason = prompt('Motivo do cancelamento (opcional):')

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const response = await fetch(`/api/bookings/${cancelConfirm.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: reason ? `Cancelado pela academia: ${reason}` : 'Cancelado pela academia'
        })
      })

      if (!response.ok) throw new Error('Failed to cancel booking')

      toast.success('Agendamento cancelado com sucesso')
      await fetchBookings()
    } catch (error) {
      toast.error('Erro ao cancelar agendamento')
    } finally {
      setCancelConfirm({ isOpen: false, bookingId: null })
    }
  }

  const handleComplete = async (bookingId: string) => {
    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to complete booking')
      }

      toast.success('Aula marcada como concluída')
      await fetchBookings()
      setSelectedBooking(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar como concluída')
    }
  }

  const handleEdit = (booking: Booking) => {
    setEditingBooking({ ...booking })
    setSelectedBooking(null)
  }

  const handleSaveEdit = async () => {
    if (!editingBooking) return

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const updates: any = {}
      if (editingBooking.notes !== undefined) updates.notes = editingBooking.notes
      if (editingBooking.status) updates.status = editingBooking.status

      const response = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update booking')
      }

      toast.success('Agendamento atualizado com sucesso')
      setEditingBooking(null)
      await fetchBookings()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar agendamento')
    }
  }

  const handleDelete = (bookingId: string) => {
    setDeleteConfirm({
      isOpen: true,
      bookingId
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.bookingId) return

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const response = await fetch(`/api/bookings/${deleteConfirm.bookingId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete booking')
      }

      toast.success('Agendamento excluído com sucesso')
      setDeleteConfirm({ isOpen: false, bookingId: null })
      await fetchBookings()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir agendamento')
      setDeleteConfirm({ isOpen: false, bookingId: null })
    }
  }

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedBookings.size === paginatedBookings.length) {
      setSelectedBookings(new Set())
    } else {
      setSelectedBookings(new Set(paginatedBookings.map(b => b.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedBookings.size === 0) {
      toast.error('Selecione pelo menos um agendamento para excluir')
      return
    }
    setBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    if (selectedBookings.size === 0) return

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const deletePromises = Array.from(selectedBookings).map(bookingId =>
        fetch(`/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
      )

      const results = await Promise.allSettled(deletePromises)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
      const failed = results.length - successful

      if (successful > 0) {
        toast.success(`${successful} agendamento(s) excluído(s) com sucesso${failed > 0 ? ` (${failed} falharam)` : ''}`)
      } else {
        toast.error('Erro ao excluir agendamentos')
      }

      setSelectedBookings(new Set())
      setBulkDeleteConfirm(false)
      await fetchBookings()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir agendamentos')
      setBulkDeleteConfirm(false)
    }
  }

  const formatDate = (dateString: string) => {
    // Usar timezone local correto
    const localDate = new Date(getLocalDateFromUtc(dateString) + 'T12:00:00')
    return localDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    // Usar timezone local correto
    return getLocalTimeFromUtc(dateString)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter)

  // Paginação
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  // Resetar página quando o filtro mudar
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando agendamentos...</div>
        </div>
      </div>
    )
  }

  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto space-y-6 sm:space-y-8 mb-20">
      {/* Header Section - Premium Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-meu-primary/5 text-meu-primary text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
              Histórico
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Histórico de Agendamentos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Visualize e gerencie o histórico completo de todas as aulas agendadas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {selectedBookings.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="sm"
              className="text-xs border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash className="h-4 w-4 mr-2" />
              Excluir ({selectedBookings.size})
            </Button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
          >
            <option value="all">Todos</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {!isHydrated || (!franquiaUser?.academyId && loading) ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meu-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados da academia...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats - Premium KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
              <div className="p-4 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total</h3>
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">{bookings.length}</span>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Agendamentos registrados</p>
              </div>
            </Card>

            <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all duration-300" />
              <div className="p-4 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Confirmados</h3>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{confirmedBookings}</span>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas agendadas</p>
              </div>
            </Card>

            <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all duration-300" />
              <div className="p-4 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Concluídos</h3>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500/40 group-hover:text-blue-500 transition-colors" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">{completedBookings}</span>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas realizadas</p>
              </div>
            </Card>

            <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-2 transition-all duration-300" />
              <div className="p-4 sm:p-6 pl-6 sm:pl-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Cancelados</h3>
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">{cancelledBookings}</span>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Aulas canceladas</p>
              </div>
            </Card>
          </div>

          {/* Bookings Table */}
          <Card>
            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-gray-600">
                  {statusFilter === 'all'
                    ? 'Ainda não há aulas agendadas na academia'
                    : `Nenhum agendamento com status "${statusFilter}"`
                  }
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedBookings.size === paginatedBookings.length && paginatedBookings.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.map((booking) => (
                      <TableRow key={booking.id} className={`hover:bg-gray-50 ${selectedBookings.has(booking.id) ? 'bg-blue-50' : ''}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedBookings.has(booking.id)}
                            onChange={() => handleSelectBooking(booking.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(booking.date)}
                        </TableCell>
                        <TableCell>
                          {formatTime(booking.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{booking.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4 text-gray-400" />
                            <span>{booking.teacherName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{booking.duration} min</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(booking.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              onClick={() => setSelectedBooking(booking)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(booking)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {booking.status === 'CONFIRMED' && (
                              <>
                                <Button
                                  onClick={() => handleComplete(booking.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  title="Marcar como concluída"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleCancel(booking.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() => handleDelete(booking.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <div className="text-sm text-gray-600">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredBookings.length)} de {filteredBookings.length} agendamentos
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Info Section */}
          {bookings.length > 0 && (
            <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Sobre a Gestão de Agendamentos
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Aulas podem ser agendadas diretamente pelos alunos nos horários disponíveis dos professores</p>
                    <p>• Aulas podem ser agendadas diretamente pelo professor nos horários disponíveis da academia</p>
                    <p>• Você pode cancelar aulas confirmadas se necessário</p>
                    <p>• Regra de cancelamento: gratuito até 4 horas antes; dentro das 4 horas, 1 crédito do aluno é consumido</p>
                    <p>• Marque aulas como concluídas após a realização se necessário</p>
                    <p>• Use os filtros para visualizar agendamentos por status</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Details Modal */}
          {selectedBooking && (
            <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Detalhes do Agendamento</h2>
                    <Button
                      onClick={() => setSelectedBooking(null)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Status</div>
                        {getStatusBadge(selectedBooking.status)}
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Custo</div>
                        <div className="font-medium text-gray-900">{selectedBooking.credits_cost} créditos</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Aluno</div>
                        <div className="font-medium text-gray-900">{selectedBooking.studentName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Professor</div>
                        <div className="font-medium text-gray-900">{selectedBooking.teacherName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Data</div>
                        <div className="font-medium text-gray-900">{formatDate(selectedBooking.date)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Horário</div>
                        <div className="font-medium text-gray-900">{formatTime(selectedBooking.date)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Duração</div>
                        <div className="font-medium text-gray-900">{selectedBooking.duration} minutos</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Criado em</div>
                        <div className="font-medium text-gray-900">
                          {new Date(selectedBooking.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    {selectedBooking.notes && (
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Observações</div>
                        <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                          {selectedBooking.notes}
                        </div>
                      </div>
                    )}

                    {selectedBooking.status === 'CONFIRMED' && (
                      <div className="flex items-center space-x-3 pt-4">
                        <Button
                          onClick={() => {
                            handleComplete(selectedBooking.id)
                            setSelectedBooking(null)
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Concluída
                        </Button>
                        <Button
                          onClick={() => {
                            handleCancel(selectedBooking.id)
                            setSelectedBooking(null)
                          }}
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Modal de Confirmação de Cancelamento */}
          <ConfirmDialog
            isOpen={cancelConfirm.isOpen}
            onClose={() => setCancelConfirm({ isOpen: false, bookingId: null })}
            onConfirm={confirmCancel}
            title="Cancelar Agendamento"
            description={`Cancelamento gratuito até ${cancelFreeUntilLabel || '4 horas antes do horário agendado'}. Após esse prazo, 1 crédito do aluno será consumido. Tem certeza que deseja cancelar?`}
            confirmText="Cancelar Agendamento"
            cancelText="Voltar"
            type="warning"
          />

          {/* Modal de Confirmação de Exclusão */}
          <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, bookingId: null })}
            onConfirm={confirmDelete}
            title="Excluir Agendamento"
            description="Tem certeza que deseja excluir permanentemente este agendamento? Esta ação não pode ser desfeita."
            confirmText="Excluir"
            cancelText="Cancelar"
            type="danger"
          />

          {/* Modal de Confirmação de Exclusão em Massa */}
          <ConfirmDialog
            isOpen={bulkDeleteConfirm}
            onClose={() => setBulkDeleteConfirm(false)}
            onConfirm={confirmBulkDelete}
            title="Excluir Agendamentos Selecionados"
            description={`Tem certeza que deseja excluir permanentemente ${selectedBookings.size} agendamento(s)? Esta ação não pode ser desfeita.`}
            confirmText="Excluir Todos"
            cancelText="Cancelar"
            type="danger"
          />

          {/* Modal de Edição */}
          {editingBooking && (
            <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Editar Agendamento</h2>
                    <Button
                      onClick={() => setEditingBooking(null)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={editingBooking.status}
                        onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="COMPLETED">Concluído</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações
                      </label>
                      <textarea
                        value={editingBooking.notes || ''}
                        onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Adicione observações sobre o agendamento..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Aluno</div>
                        <div className="font-medium text-gray-900">{editingBooking.studentName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Professor</div>
                        <div className="font-medium text-gray-900">{editingBooking.teacherName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Data</div>
                        <div className="font-medium text-gray-900">{formatDate(editingBooking.date)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Horário</div>
                        <div className="font-medium text-gray-900">{formatTime(editingBooking.date)}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-4">
                      <Button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </Button>
                      <Button
                        onClick={() => setEditingBooking(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
