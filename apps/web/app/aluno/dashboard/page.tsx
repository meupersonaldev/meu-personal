'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Repeat,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  History,
  User,
  Mail,
  Phone,
  Settings,
  LogOut,
  Shield,
  Info,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores/auth-store'
import { usersAPI, packagesAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Booking {
  id: string
  start_at?: string
  date?: string
  end_at?: string
  status: string
  status_canonical?: string
  is_reserved: boolean
  series_id: string | null
  teacher_id: string
  teacherName?: string
  teacher_name?: string
  avatar_url?: string
  academy_id?: string
  franchiseName?: string
  franchise_name?: string
  unit_id?: string
  cancellableUntil?: string
}

interface BookingSeries {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurrence_type: string
  start_date: string
  end_date: string
  status: string
  teacher: {
    id: string
    name: string
  }
  academy: {
    id: string
    name: string
  }
}

interface ClassHistory {
  id: string
  date: string
  time: string
  teacher_name: string
  teacher_avatar?: string
  unit_name: string
  unit_name: string
  status: 'completed' | 'cancelled' | 'no_show'
}

interface Transaction {
  id: string
  amount?: number
  qty?: number
  type: string
  description?: string
  created_at: string
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const RECURRENCE_LABELS: Record<string, string> = {
  '15_DAYS': '15 dias',
  'MONTH': '1 mês',
  'QUARTER': '3 meses',
  'SEMESTER': '6 meses',
  'YEAR': '1 ano'
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Data não disponível'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Data inválida'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Hora não disponível'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Hora inválida'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Função para obter o tempo do booking (start_at ou date)
function getBookingTime(booking: Booking): Date {
  const timeString = booking.start_at || booking.date
  if (!timeString) {
    return new Date(0) // Data inválida
  }

  // Se a string já tem Z (timezone UTC), usar diretamente
  if (timeString.endsWith('Z')) {
    return new Date(timeString)
  }

  // Se tem timezone offset (+03:00, -03:00), usar diretamente
  if (timeString.includes('+') || (timeString.includes('-') && timeString.length > 19 && timeString[10] === 'T' && (timeString[19] === '-' || timeString[19] === '+'))) {
    return new Date(timeString)
  }

  // Se não tem timezone, assumir que é UTC e adicionar Z
  const isoString = `${timeString}Z`
  return new Date(isoString)
}

// Função para formatar o prazo de cancelamento gratuito
function cutoffLabel(booking: Booking): string {
  const bookingTime = getBookingTime(booking)
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
  const cutoffIso = booking.cancellableUntil || new Date(bookingTime.getTime() - FOUR_HOURS_MS).toISOString()
  const cutoff = new Date(cutoffIso)

  if (isNaN(cutoff.getTime())) return 'Data inválida'

  const hour = String(cutoff.getHours()).padStart(2, '0')
  const minute = String(cutoff.getMinutes()).padStart(2, '0')
  const d = cutoff.toLocaleDateString('pt-BR')
  return `${d} ${hour}:${minute}`
}

export default function AulasPage() {
  const router = useRouter()
  const { user, token, logout, isAuthenticated } = useAuthStore()

  // Estados para Agendamentos
  const [bookings, setBookings] = useState<Booking[]>([])
  const [series, setSeries] = useState<BookingSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para Histórico
  const [historyClasses, setHistoryClasses] = useState<ClassHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Modal de cancelamento
  const [confirm, setConfirm] = useState<{ open: boolean; bookingId: string | null }>({ open: false, bookingId: null })
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)

  // Modal de informação sobre aulas reservadas
  const [showReservedInfo, setShowReservedInfo] = useState(false)

  // Modal de cancelamento de série
  const [showSeriesCancelModal, setShowSeriesCancelModal] = useState(false)
  const [cancellingSeries, setCancellingSeries] = useState<BookingSeries | null>(null)
  const [seriesCancelType, setSeriesCancelType] = useState<'single' | 'all'>('single')
  const [seriesBookings, setSeriesBookings] = useState<Booking[]>([])
  const [isCancellingSeries, setIsCancellingSeries] = useState(false)
  const [seriesCancelError, setSeriesCancelError] = useState<string | null>(null)

  // Estado para carrossel de séries
  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(0)

  // Estados para modais de perfil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Estados para formulário de editar perfil
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })

  // Estados para formulário de alterar senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Estados para saldo de créditos
  const [creditsBalance, setCreditsBalance] = useState<{
    total_purchased: number
    total_consumed: number
    locked_qty: number
    available_classes: number
  } | null>(null)

  const [creditsLoading, setCreditsLoading] = useState(false)

  // Estados para transações
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  // Paginação Demais Agendamentos
  const [itemsPerPage, setItemsPerPage] = useState<string>("4")
  const [currentPage, setCurrentPage] = useState(1)

  // Paginação Extrato
  const [txItemsPerPage, setTxItemsPerPage] = useState<string>("5")
  const [txCurrentPage, setTxCurrentPage] = useState(1)

  const fetchBookings = useCallback(async () => {
    if (!token || !user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Buscar bookings do aluno
      const bookingsResp = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (bookingsResp.ok) {
        const data = await bookingsResp.json()
        const allBookings = Array.isArray(data) ? data : data.bookings || []

        const mappedBookings: Booking[] = allBookings.map((b: any) => ({
          id: b.id,
          start_at: b.startAt || b.start_at,
          date: b.date,
          end_at: b.endAt || b.end_at,
          status: b.status,
          status_canonical: b.status_canonical || b.status,
          is_reserved: b.is_reserved ?? b.isReserved ?? false,
          series_id: b.series_id ?? b.seriesId ?? null,
          teacher_id: b.teacherId || b.teacher_id,
          teacherName: b.teacherName,
          teacher_name: b.teacher_name,
          avatar_url: b.avatar_url,
          academy_id: b.franchiseId || b.academy_id || b.franchise_id,
          franchiseName: b.franchiseName,
          franchise_name: b.franchise_name,
          unit_id: b.unit_id,
          cancellableUntil: b.cancellableUntil || b.cancellable_until
        }))

        const now = new Date()
        const futureBookings = mappedBookings.filter((b: Booking) => {
          if ((b.status_canonical || b.status) === 'CANCELED' || (b.status_canonical || b.status) === 'CANCELLED') {
            return false
          }
          const bookingTime = b.start_at || b.date
          if (!bookingTime) return false
          const bookingDate = getBookingTime(b)
          if (isNaN(bookingDate.getTime())) return false
          return bookingDate.getTime() > now.getTime()
        })

        // Ordenar por data
        futureBookings.sort((a, b) => {
          const aTime = (a.start_at || a.date || '').toString()
          const bTime = (b.start_at || b.date || '').toString()
          if (!aTime || !bTime) return 0
          return new Date(aTime).getTime() - new Date(bTime).getTime()
        })

        setBookings(futureBookings)
      }

      // Buscar séries do aluno
      const seriesResp = await fetch(`${API_BASE_URL}/api/booking-series/student/my-series`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (seriesResp.ok) {
        const data = await seriesResp.json()
        setSeries(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError('Erro ao carregar aulas')
      console.error('Erro ao buscar aulas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, user?.id])

  const fetchHistory = useCallback(async () => {
    if (!token || !user?.id) return

    setIsHistoryLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Buscar todas as aulas do aluno
      const response = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const allBookings = Array.isArray(data) ? data : data.bookings || []

        const now = new Date()

        // Filtrar APENAS aulas passadas (data/hora já passou)
        const pastBookings = allBookings.filter((b: any) => {
          const bookingTime = b.startAt || b.start_at || b.date
          if (!bookingTime) return false

          // Usar getBookingTime para parsear corretamente
          const bookingDate = getBookingTime({
            start_at: b.startAt || b.start_at,
            date: b.date
          } as Booking)

          if (isNaN(bookingDate.getTime())) return false

          // Apenas aulas passadas (data/hora < agora)
          return bookingDate.getTime() < now.getTime()
        })

        // Mapear para o formato esperado pelo histórico
        const historyData: ClassHistory[] = pastBookings.map((b: any) => {
          const bookingTime = b.startAt || b.start_at || b.date
          const bookingDate = getBookingTime({
            start_at: b.startAt || b.start_at,
            date: b.date
          } as Booking)

          // Determinar status baseado no status_canonical
          const status = (b.status_canonical || b.status || '').toUpperCase()
          let historyStatus: 'completed' | 'cancelled' | 'no_show' = 'completed'

          if (status === 'CANCELED' || status === 'CANCELLED') {
            historyStatus = 'cancelled'
          } else if (status === 'DONE') {
            historyStatus = 'completed'
          } else if (status === 'PAID') {
            // Se está PAID e já passou, consideramos como concluída
            historyStatus = 'completed'
          } else {
            // Se passou mas não está marcada como concluída/cancelada, pode ser no_show
            historyStatus = 'no_show'
          }

          return {
            id: b.id,
            date: bookingTime,
            time: bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            teacher_name: b.teacherName || b.teacher_name || 'Professor',
            teacher_avatar: b.avatar_url,
            unit_name: b.franchiseName || b.franchise_name || 'Academia',
            status: historyStatus
          }
        })

        // Ordenar por data (mais recentes primeiro)
        historyData.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA // Descendente (mais recente primeiro)
        })

        setHistoryClasses(historyData)
      }
    } catch (error) {
      console.error('Erro ao buscar histórico', error)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [token, user?.id])

  // Buscar saldo de créditos
  const fetchCreditsBalance = useCallback(async () => {
    if (!token || !user?.id) return

    setCreditsLoading(true)
    try {
      // Usar a mesma API helper para garantir consistência com o header
      // A API já calcula e retorna available_classes corretamente
      const data = await packagesAPI.getStudentBalance()

      // A API retorna { balance: { available_classes: number, ... } }
      // Usar diretamente o valor calculado pela API (fonte única de verdade)
      if (data?.balance) {
        setCreditsBalance(data.balance)
      } else {
        setCreditsBalance(null)
      }
    } catch (error) {
      console.error('Erro ao buscar saldo de créditos:', error)
      setCreditsBalance(null)
    } finally {
      setCreditsLoading(false)
    }
  }, [token, user?.id])

  const fetchTransactions = useCallback(async () => {
    if (!token || !user?.id) return
    setTransactionsLoading(true)
    try {
      const data = await packagesAPI.getTransactions({ limit: 50 })
      if (data?.transactions) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }, [token, user?.id])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBookings()
      fetchHistory()
      fetchCreditsBalance()
      fetchTransactions()
    }
  }, [isAuthenticated, token, fetchBookings, fetchHistory, fetchCreditsBalance, fetchTransactions])

  // Ouvir atualizações de crédito em tempo real
  useEffect(() => {
    const handleCreditsUpdate = () => {
      fetchCreditsBalance()
      fetchTransactions()
    }
    window.addEventListener('student-credits-updated', handleCreditsUpdate)
    return () => window.removeEventListener('student-credits-updated', handleCreditsUpdate)
  }, [fetchCreditsBalance, fetchTransactions])

  // Resetar índice do carrossel quando as séries mudarem
  useEffect(() => {
    const activeSeries = series.filter(s => s.status === 'ACTIVE')
    if (currentSeriesIndex >= activeSeries.length && activeSeries.length > 0) {
      setCurrentSeriesIndex(0)
    }
  }, [series, currentSeriesIndex])

  // Atualizar formulário quando usuário mudar
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      })
    }
  }, [user])

  // Função para lidar com seleção de avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB')
      return
    }

    setAvatarFile(file)

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Função para fazer upload do avatar
  const handleUploadAvatar = async () => {
    if (!user?.id || !token || !avatarFile) return

    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', avatarFile)

      const response = await usersAPI.uploadAvatar(user.id, formData)

      // Atualizar usuário no store
      const { updateUser } = useAuthStore.getState()
      await updateUser({
        avatar_url: response.avatar_url
      } as any)

      toast.success('Avatar atualizado com sucesso!')
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || 'Erro ao atualizar avatar'
      toast.error(errorMessage)
      console.error('Erro ao atualizar avatar:', error)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Função para atualizar perfil
  const handleUpdateProfile = async () => {
    if (!user?.id || !token) return

    // Validações básicas
    if (!profileForm.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!profileForm.email.trim()) {
      toast.error('E-mail é obrigatório')
      return
    }

    setIsUpdatingProfile(true)
    try {
      // Se houver avatar para upload, fazer upload primeiro
      if (avatarFile) {
        await handleUploadAvatar()
      }

      await usersAPI.update(user.id, {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone?.trim() || null
      })

      // Atualizar usuário no store usando a função updateUser
      const { updateUser } = useAuthStore.getState()
      await updateUser({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone?.trim() || undefined
      })

      toast.success('Perfil atualizado com sucesso!')
      setShowEditProfileModal(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || 'Erro ao atualizar perfil'
      toast.error(errorMessage)
      console.error('Erro ao atualizar perfil:', error)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // Função para alterar senha
  const handleChangePassword = async () => {
    if (!user?.id || !token) return

    // Validações
    if (!passwordForm.currentPassword) {
      toast.error('Senha atual é obrigatória')
      return
    }

    if (!passwordForm.newPassword) {
      toast.error('Nova senha é obrigatória')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setIsChangingPassword(true)
    try {
      await usersAPI.updatePassword(user.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      toast.success('Senha alterada com sucesso!')
      setShowChangePasswordModal(false)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao alterar senha')
      console.error('Erro ao alterar senha:', error)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const cancelBooking = async (id: string) => {
    if (!token || cancellingBookingId) return // Prevenir múltiplos cliques

    setCancellingBookingId(id)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || data?.message || 'Erro ao cancelar')
      }
      // Recarregar dados
      await fetchBookings()
      await fetchCreditsBalance() // Atualizar saldo local
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('student-credits-updated'))
      }
      setConfirm({ open: false, bookingId: null })
    } catch (err: any) {
      console.error('Erro ao cancelar:', err)
      alert(err?.message || 'Erro ao cancelar')
    } finally {
      setCancellingBookingId(null)
    }
  }

  const handleCancelSeriesClick = async (seriesItem: BookingSeries) => {
    if (!token) return

    setCancellingSeries(seriesItem)
    setSeriesCancelType('all') // Por padrão, cancelar toda a série
    setSeriesCancelError(null)

    // Primeiro, tentar usar os bookings já carregados no estado
    // Isso evita uma requisição adicional se os dados já estão disponíveis
    const existingSeriesBookings = bookings.filter(b => b.series_id === seriesItem.id)

    console.log('handleCancelSeriesClick - série:', seriesItem.id)
    console.log('handleCancelSeriesClick - bookings no estado:', bookings.length)
    console.log('handleCancelSeriesClick - bookings com series_id:', bookings.filter(b => b.series_id).map(b => ({ id: b.id, series_id: b.series_id })))

    if (existingSeriesBookings.length > 0) {
      console.log('Usando bookings já carregados para série:', seriesItem.id)
      console.log('Bookings da série encontrados no estado:', existingSeriesBookings.length)
      setSeriesBookings(existingSeriesBookings)
      setShowSeriesCancelModal(true)
      return
    }

    // Se não encontrou no estado, buscar da API usando o endpoint de séries
    // que retorna os bookings da série específica
    console.log('Bookings não encontrados no estado, buscando da API...')
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Primeiro tentar buscar os bookings da série específica
      const seriesRes = await fetch(`${API_BASE_URL}/api/booking-series/${seriesItem.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (seriesRes.ok) {
        const seriesData = await seriesRes.json()
        console.log('Dados da série:', seriesData)

        // Se a série tem bookings associados, usar eles
        // O endpoint retorna: id, start_at, end_at, status_canonical, is_reserved
        if (seriesData.bookings && seriesData.bookings.length > 0) {
          console.log('Bookings da série encontrados via endpoint de série:', seriesData.bookings.length)

          // Extrair informações do professor e academia da série
          const teacherName = seriesData.series?.teacher?.name || seriesItem.teacher?.name
          const academyName = seriesData.series?.academy?.name || seriesItem.academy?.name
          const teacherId = seriesData.series?.teacher?.id || seriesItem.teacher?.id
          const academyId = seriesData.series?.academy?.id || seriesItem.academy?.id

          setSeriesBookings(seriesData.bookings.map((b: any) => ({
            id: b.id,
            start_at: b.start_at,
            date: b.start_at ? b.start_at.split('T')[0] : undefined,
            end_at: b.end_at,
            status: b.status_canonical,
            status_canonical: b.status_canonical,
            is_reserved: b.is_reserved || false,
            series_id: seriesItem.id, // Usar o ID da série que estamos buscando
            teacher_id: teacherId,
            teacherName: teacherName,
            teacher_name: teacherName,
            avatar_url: undefined,
            academy_id: academyId,
            franchiseName: academyName,
            franchise_name: academyName,
            unit_id: undefined,
            cancellableUntil: undefined
          })))
          setShowSeriesCancelModal(true)
          return
        }
      }

      // Fallback: buscar todos os bookings do aluno
      const res = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        const allBookings = Array.isArray(data) ? data : data.bookings || []
        console.log('Todos os bookings do aluno:', allBookings.length)
        console.log('Buscando série ID:', seriesItem.id)
        console.log('Bookings com series_id:', allBookings.filter((b: any) => b.series_id || b.seriesId).map((b: any) => ({ id: b.id, series_id: b.series_id || b.seriesId })))

        const seriesBookingsList = allBookings.filter((b: any) => {
          const bookingSeriesId = b.series_id || b.seriesId
          const matches = bookingSeriesId === seriesItem.id
          if (matches) {
            console.log('Booking encontrado da série:', { id: b.id, status: b.status_canonical || b.status, series_id: bookingSeriesId, start_at: b.start_at || b.startAt })
          }
          return matches
        })

        console.log('Bookings da série encontrados:', seriesBookingsList.length)
        setSeriesBookings(seriesBookingsList.map((b: any) => ({
          id: b.id,
          start_at: b.startAt || b.start_at,
          date: b.date,
          end_at: b.endAt || b.end_at,
          status: b.status,
          status_canonical: b.status_canonical || b.status,
          is_reserved: b.is_reserved || b.isReserved || false,
          series_id: b.series_id || b.seriesId || null,
          teacher_id: b.teacherId || b.teacher_id,
          teacherName: b.teacherName,
          teacher_name: b.teacher_name,
          avatar_url: b.avatar_url,
          academy_id: b.franchiseId || b.academy_id || b.franchise_id,
          franchiseName: b.franchiseName,
          franchise_name: b.franchise_name,
          unit_id: b.unit_id,
          cancellableUntil: b.cancellableUntil || b.cancellable_until
        })))
      } else {
        console.error('Erro ao buscar bookings:', res.status, await res.text())
      }
    } catch (error) {
      console.error('Erro ao buscar bookings da série:', error)
    }

    setShowSeriesCancelModal(true)
  }

  const handleCancelSeriesConfirm = async () => {
    if (!token || !cancellingSeries) {
      console.error('Faltando token ou série:', { token: !!token, cancellingSeries: !!cancellingSeries })
      return
    }

    setIsCancellingSeries(true)
    setSeriesCancelError(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Usar bookings já carregados no estado seriesBookings (definido em handleCancelSeriesClick)
      // Se não tiver, tentar usar os bookings do estado principal filtrados pela série
      let bookingsToUse = seriesBookings.length > 0
        ? seriesBookings
        : bookings.filter(b => b.series_id === cancellingSeries.id)

      console.log('handleCancelSeriesConfirm - Bookings disponíveis para cancelamento:', bookingsToUse.length)
      console.log('handleCancelSeriesConfirm - seriesBookings:', seriesBookings.length)
      console.log('handleCancelSeriesConfirm - bookings filtrados:', bookings.filter(b => b.series_id === cancellingSeries.id).length)

      // Se ainda não há bookings, buscar diretamente do endpoint de série
      if (!bookingsToUse.length) {
        console.log('Buscando bookings diretamente do endpoint de série...')
        const seriesRes = await fetch(`${API_BASE_URL}/api/booking-series/${cancellingSeries.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (seriesRes.ok) {
          const seriesData = await seriesRes.json()
          console.log('Dados da série:', seriesData)

          if (seriesData.bookings && seriesData.bookings.length > 0) {
            bookingsToUse = seriesData.bookings.map((b: any) => ({
              id: b.id,
              start_at: b.start_at,
              date: b.start_at ? b.start_at.split('T')[0] : undefined,
              end_at: b.end_at,
              status: b.status_canonical,
              status_canonical: b.status_canonical,
              is_reserved: b.is_reserved || false,
              series_id: cancellingSeries.id,
              teacher_id: seriesData.series?.teacher?.id,
              teacherName: seriesData.series?.teacher?.name,
              teacher_name: seriesData.series?.teacher?.name,
              avatar_url: undefined,
              academy_id: seriesData.series?.academy?.id,
              franchiseName: seriesData.series?.academy?.name,
              franchise_name: seriesData.series?.academy?.name,
              unit_id: undefined,
              cancellableUntil: undefined
            }))
            console.log('Bookings encontrados via endpoint de série:', bookingsToUse.length)
          }
        }
      }

      // Se ainda não há bookings, buscar da API de bookings como último recurso
      if (!bookingsToUse.length) {
        console.log('Buscando bookings do aluno da API...')
        const res = await fetch(`${API_BASE_URL}/api/bookings?student_id=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const allBookings = Array.isArray(data) ? data : data.bookings || []
          console.log('Total de bookings do aluno:', allBookings.length)
          console.log('Série ID procurada:', cancellingSeries.id)

          bookingsToUse = allBookings.filter((b: any) => {
            const bookingSeriesId = b.series_id || b.seriesId
            const matches = bookingSeriesId === cancellingSeries.id
            if (matches) {
              console.log('Booking da série encontrado:', {
                id: b.id,
                status: b.status_canonical || b.status,
                series_id: bookingSeriesId,
                is_reserved: b.is_reserved || b.isReserved,
                start_at: b.start_at || b.startAt
              })
            }
            return matches
          }).map((b: any) => ({
            id: b.id,
            start_at: b.startAt || b.start_at,
            date: b.date,
            end_at: b.endAt || b.end_at,
            status: b.status,
            status_canonical: b.status_canonical || b.status,
            is_reserved: b.is_reserved || b.isReserved || false,
            series_id: b.series_id || b.seriesId || null,
            teacher_id: b.teacherId || b.teacher_id,
            teacherName: b.teacherName,
            teacher_name: b.teacher_name,
            avatar_url: b.avatar_url,
            academy_id: b.franchiseId || b.academy_id || b.franchise_id,
            franchiseName: b.franchiseName,
            franchise_name: b.franchise_name,
            unit_id: b.unit_id,
            cancellableUntil: b.cancellableUntil || b.cancellable_until
          }))
          console.log('Bookings da série encontrados:', bookingsToUse.length)
        } else {
          console.error('Erro ao buscar bookings:', res.status)
        }
      }

      // Se for cancelar toda a série, usar o endpoint simples sem precisar buscar bookings
      // Isso funciona mesmo quando não há bookings encontráveis
      if (seriesCancelType === 'all') {
        console.log('Deletando série inteira:', cancellingSeries.id)

        const url = `${API_BASE_URL}/api/booking-series/${cancellingSeries.id}`

        const res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()

        if (!res.ok) {
          console.error('Erro na API:', data)
          throw new Error(data?.error || data?.message || 'Erro ao deletar série')
        }

        console.log('Série deletada com sucesso:', data)
      } else {
        // Para cancelar apenas um booking ou futuros, precisamos verificar bookings
        if (!bookingsToUse.length) {
          console.log('Nenhum booking encontrado para a série')
          throw new Error('Não foi possível encontrar aulas agendadas para esta série. Por favor, tente novamente ou entre em contato com o suporte.')
        }

        // Encontrar o primeiro booking futuro para usar no cancelamento
        let firstBooking = bookingsToUse.find((b: Booking) => {
          const bookingTime = b.start_at || b.date
          if (!bookingTime) return false
          const bookingDate = getBookingTime(b)
          return bookingDate.getTime() > new Date().getTime()
        })

        // Se não encontrou futuro, pega qualquer um (incluindo reservados)
        if (!firstBooking && bookingsToUse.length > 0) {
          firstBooking = bookingsToUse[0]
          console.log('Usando primeiro booking disponível (não futuro):', firstBooking.id)
        }

        if (!firstBooking) {
          throw new Error('Nenhum agendamento encontrado nesta série.')
        }

        // Garantir que usamos o series_id do booking selecionado (não da série do estado)
        const seriesIdToUse = firstBooking.series_id || cancellingSeries.id

        console.log('Cancelando booking(s) da série:', {
          seriesId: seriesIdToUse,
          bookingId: firstBooking.id,
          cancelType: seriesCancelType,
          bookingStatus: firstBooking.status_canonical,
          bookingSeriesId: firstBooking.series_id
        })

        const url = `${API_BASE_URL}/api/booking-series/${seriesIdToUse}/bookings/${firstBooking.id}?cancelType=${seriesCancelType}`

        const res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()

        if (!res.ok) {
          console.error('Erro na API:', data)
          throw new Error(data?.error || data?.message || 'Erro ao cancelar série')
        }

        console.log('Série cancelada com sucesso:', data)
      }

      // Recarregar dados
      await fetchBookings()
      await fetchCreditsBalance() // Atualizar saldo local
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('student-credits-updated'))
      }
      const seriesResp = await fetch(`${API_BASE_URL}/api/booking-series/student/my-series`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (seriesResp.ok) {
        const seriesData = await seriesResp.json()
        setSeries(Array.isArray(seriesData) ? seriesData : [])
      }

      setShowSeriesCancelModal(false)
      setCancellingSeries(null)
      setSeriesBookings([])
    } catch (err: any) {
      console.error('Erro ao cancelar série:', err)
      setSeriesCancelError(err?.message || 'Erro ao cancelar série')
    } finally {
      setIsCancellingSeries(false)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    const status = booking.status_canonical || booking.status
    if (status === 'CANCELED' || status === 'CANCELLED') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
    }

    if (booking.is_reserved) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Reservada
        </Badge>
      )
    }

    if (booking.series_id) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Repeat className="h-3 w-3 mr-1" />
          Série
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Confirmada
      </Badge>
    )
  }

  const getHistoryStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Concluída</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
      case 'no_show':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">Falta</Badge>
      default:
        return null
    }
  }

  // Separar a próxima aula (primeira da lista ordenada) das demais
  const nextClass = bookings[0]
  const allOtherClasses = bookings.slice(1)

  const limit = itemsPerPage === "all" ? allOtherClasses.length : parseInt(itemsPerPage)
  const totalPages = Math.ceil(allOtherClasses.length / limit) || 1

  // Reset pagination if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  const currentClasses = itemsPerPage === "all"
    ? allOtherClasses
    : allOtherClasses.slice((currentPage - 1) * limit, currentPage * limit)

  // Lógica de Paginação de Transações
  const txLimit = txItemsPerPage === "all" ? transactions.length : parseInt(txItemsPerPage)
  const txTotalPages = Math.ceil(transactions.length / txLimit) || 1

  useEffect(() => {
    if (txCurrentPage > txTotalPages) setTxCurrentPage(1)
  }, [txTotalPages, txCurrentPage])

  const currentTransactions = txItemsPerPage === "all"
    ? transactions
    : transactions.slice((txCurrentPage - 1) * txLimit, txCurrentPage * txLimit)


  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Unificado */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
          Olá, <span className="text-blue-600">{user.name?.split(' ')[0] || 'Aluno'}</span>!
        </h1>
        <p className="text-gray-500 text-lg">
          Bem-vindo ao seu painel principal.
        </p>
      </div>

      <Tabs defaultValue="aulas" className="w-full space-y-6">
        <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex h-auto p-1 bg-gray-100/80 rounded-xl">
          <TabsTrigger value="aulas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Aulas e Agenda</TabsTrigger>
          <TabsTrigger value="historico" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Histórico</TabsTrigger>
          <TabsTrigger value="extrato" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Extrato</TabsTrigger>
          <TabsTrigger value="perfil" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700">Meu Perfil</TabsTrigger>
        </TabsList>

        {/* TAB 1: AULAS (Dashboard Principal Atual) */}
        <TabsContent value="aulas" className="space-y-8 focus-visible:outline-none ring-0">
          {/* Stats Premium */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                    Confirmadas
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {bookings.filter(b => !b.is_reserved && (b.status !== 'CANCELED')).length}
                  </p>
                  <p className="text-blue-100 text-sm font-medium">Aulas futuras</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                      Aulas Reservadas
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-white hover:text-white hover:bg-white/30 bg-white/15 border-2 border-white/40 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all"
                      onClick={() => setShowReservedInfo(true)}
                    >
                      <Info className="h-3.5 w-3.5 mr-1.5" />
                      Saiba mais
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {bookings.filter(b => b.is_reserved && (b.status_canonical || b.status) !== 'CANCELED' && (b.status_canonical || b.status) !== 'CANCELLED').length}
                  </p>
                  <p className="text-amber-100 text-sm font-medium">Aguardando crédito</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 transition-all group-hover:scale-105" />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Repeat className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                    Recorrentes
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {series.filter(s => s.status === 'ACTIVE').length}
                  </p>
                  <p className="text-emerald-100 text-sm font-medium">Séries ativas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Coluna da Esquerda (2/3) - Aulas */}
            <div className="lg:col-span-2 space-y-8">

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Loader2 className="h-10 w-10 animate-spin text-meu-primary mb-4" />
                  <p className="text-gray-500 animate-pulse">Carregando suas aulas...</p>
                </div>
              ) : error ? (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 text-red-700">
                  <AlertCircle className="h-6 w-6" />
                  <p>{error}</p>
                </div>
              ) : bookings.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-gray-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                      <Calendar className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma aula agendada</h3>
                    <p className="text-gray-500 max-w-sm mb-8">
                      Você ainda não tem treinos marcados. Que tal começar sua jornada agora?
                    </p>
                    <Button
                      size="lg"
                      className="bg-meu-primary hover:bg-meu-primary-dark text-white rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => router.push('/aluno/professores')}
                    >
                      Agendar Primeira Aula
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Hero Card - Próxima Aula */}
                  {nextClass && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          Sua Próxima Aula
                        </h2>
                      </div>

                      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-blue-100 transition-all hover:shadow-2xl group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Dumbbell className="h-64 w-64 transform rotate-12" />
                        </div>

                        <div className="p-6 md:p-8 relative z-10">
                          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
                            {/* Data Box */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-2xl p-4 w-20 md:w-24 border border-blue-100">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {new Date(nextClass.start_at || nextClass.date || '').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                              </span>
                              <span className="text-3xl md:text-4xl font-black">
                                {new Date(nextClass.start_at || nextClass.date || '').getDate()}
                              </span>
                              <span className="text-xs font-medium text-blue-600/80">
                                {new Date(nextClass.start_at || nextClass.date || '').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                              </span>
                            </div>

                            {/* Detalhes */}
                            <div className="flex-1 space-y-4">
                              <div className="flex flex-wrap gap-2 items-start">
                                {getStatusBadge(nextClass)}
                                <Badge variant="outline" className="text-gray-500 border-gray-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(nextClass.start_at || nextClass.date)}
                                </Badge>
                              </div>

                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                  {nextClass.teacherName || nextClass.teacher_name || 'Personal Trainer'}
                                </h3>
                                <div className="flex items-center gap-2 text-gray-500 mt-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{nextClass.franchiseName || nextClass.franchise_name || 'Unidade Principal'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-2">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarImage src={nextClass.avatar_url} />
                                  <AvatarFallback className="bg-blue-100 text-blue-700">
                                    {(nextClass.teacherName || nextClass.teacher_name || 'P').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm text-gray-500">
                                  Com <strong>{nextClass.teacherName || nextClass.teacher_name || 'Professor'}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Ação */}
                            <div className="w-full md:w-auto mt-4 md:mt-0">
                              <Button
                                variant="outline"
                                className="w-full md:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                                onClick={() => setConfirm({ open: true, bookingId: nextClass.id })}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Progresso / Status Visual */}
                        <div className="h-1.5 w-full bg-gray-100">
                          <div className="h-full bg-blue-500 w-full origin-left transform transition-transform duration-1000 ease-out" style={{ transform: 'scaleX(1)' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista Próximas Aulas */}
                  {allOtherClasses.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          Demais Agendamentos
                        </h3>

                        {/* Seletor de Itens por Página */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 hidden sm:inline">Exibir:</span>
                          <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px] text-xs">
                              <SelectValue placeholder="4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="all">Todos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                        {currentClasses.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50 transition-colors group"
                          >
                            {/* Data Mini */}
                            <div className="flex sm:flex-col items-center gap-2 sm:gap-0 min-w-[60px] text-gray-500">
                              <span className="text-sm font-bold text-gray-900">
                                {new Date(booking.start_at || booking.date || '').getDate()}
                              </span>
                              <span className="text-xs uppercase">
                                {new Date(booking.start_at || booking.date || '').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {booking.teacherName || booking.teacher_name || 'Personal'}
                                </span>
                                {getStatusBadge(booking)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(booking.start_at || booking.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.franchiseName || booking.franchise_name || 'Academia'}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => setConfirm({ open: true, bookingId: booking.id })}
                              title="Cancelar aula"
                            >
                              <XCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Controles de Paginação */}
                      {itemsPerPage !== "all" && allOtherClasses.length > limit && (
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-2 text-xs"
                          >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Anterior
                          </Button>
                          <span className="text-xs text-gray-500">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 px-2 text-xs"
                          >
                            Próximo
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Aviso sobre reservas */}
              {bookings.some(b => b.is_reserved) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Atenção às reservas</p>
                    <p className="leading-relaxed opacity-90">
                      Aulas reservadas precisam de crédito até 7 dias antes. Sem crédito, elas serão canceladas automaticamente pelo sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna da Direita (1/3) - Séries e Info */}
            <div className="space-y-8">
              {/* Séries Sidebar */}
              {(() => {
                const activeSeries = series.filter(s => s.status === 'ACTIVE')
                const hasMultipleSeries = activeSeries.length > 1

                if (activeSeries.length === 0) return null

                return (
                  <Card className="border-0 shadow-md bg-gradient-to-b from-white to-gray-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <Repeat className="h-4 w-4 text-blue-700" />
                        </div>
                        Séries Ativas
                        {hasMultipleSeries && (
                          <span className="text-xs font-normal text-gray-500 ml-auto">
                            {currentSeriesIndex + 1} / {activeSeries.length}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {hasMultipleSeries ? (
                        <div className="relative">
                          {/* Carrossel com múltiplas séries */}
                          <div className="relative overflow-hidden">
                            <div
                              className="flex transition-transform duration-300 ease-in-out"
                              style={{ transform: `translateX(-${currentSeriesIndex * 100}%)` }}
                            >
                              {activeSeries.map((s) => (
                                <div key={s.id} className="min-w-full flex-shrink-0 px-1">
                                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-semibold text-gray-900">{s.teacher?.name}</span>
                                      <Badge variant="secondary" className="text-[10px] h-5 bg-blue-50 text-blue-700">
                                        {RECURRENCE_LABELS[s.recurrence_type] || s.recurrence_type}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1 text-gray-500 text-xs mb-3">
                                      <p className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" />
                                        Todo(a) {DAY_NAMES[s.day_of_week]}
                                      </p>
                                      <p className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        {s.start_time}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                                      onClick={() => handleCancelSeriesClick(s)}
                                    >
                                      <XCircle className="h-3 w-3 mr-1.5" />
                                      Cancelar Série
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Botões de navegação */}
                          <div className="flex items-center justify-between mt-4 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => setCurrentSeriesIndex((prev) => (prev > 0 ? prev - 1 : activeSeries.length - 1))}
                              disabled={activeSeries.length <= 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {/* Indicadores */}
                            <div className="flex items-center gap-1.5 flex-1 justify-center">
                              {activeSeries.map((_, index) => (
                                <button
                                  key={index}
                                  className={cn(
                                    "h-2 rounded-full transition-all",
                                    index === currentSeriesIndex
                                      ? "w-6 bg-blue-600"
                                      : "w-2 bg-gray-300 hover:bg-gray-400"
                                  )}
                                  onClick={() => setCurrentSeriesIndex(index)}
                                  aria-label={`Ir para série ${index + 1}`}
                                />
                              ))}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => setCurrentSeriesIndex((prev) => (prev < activeSeries.length - 1 ? prev + 1 : 0))}
                              disabled={activeSeries.length <= 1}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Exibição normal quando há apenas uma série
                        activeSeries.map((s) => (
                          <div key={s.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-gray-900">{s.teacher?.name}</span>
                              <Badge variant="secondary" className="text-[10px] h-5 bg-blue-50 text-blue-700">
                                {RECURRENCE_LABELS[s.recurrence_type] || s.recurrence_type}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-gray-500 text-xs mb-3">
                              <p className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                Todo(a) {DAY_NAMES[s.day_of_week]}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {s.start_time}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                              onClick={() => handleCancelSeriesClick(s)}
                            >
                              <XCircle className="h-3 w-3 mr-1.5" />
                              Cancelar Série
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )
              })()}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: HISTÓRICO */}
        <TabsContent value="historico" className="space-y-6 focus-visible:outline-none ring-0">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b border-gray-100/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5 text-meu-primary" />
                Histórico Completo
              </CardTitle>
              <CardDescription>
                Visualize todas as aulas que você já realizou ou agendadas anteriormente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-meu-primary mb-2" />
                  <p>Carregando histórico...</p>
                </div>
              ) : historyClasses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">Nenhuma aula no histórico</p>
                  <p className="text-sm mt-1">Conclua sua primeira aula para vê-la aqui!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyClasses.map((item) => (
                    <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border border-gray-100">
                          {item.teacher_avatar && <AvatarImage src={item.teacher_avatar} />}
                          <AvatarFallback>{item.teacher_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{item.teacher_name}</p>
                            {getHistoryStatusBadge(item.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(item.date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.unit_name}
                          </p>
                        </div>
                      </div>
                      {/* Future actions like "Ver Detalhes" could go here */}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: EXTRATO */}
        <TabsContent value="extrato" className="space-y-6 focus-visible:outline-none ring-0">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b border-gray-100/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Wallet className="h-5 w-5 text-meu-primary" />
                    Extrato de Créditos
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o uso e compra de seus créditos.
                  </CardDescription>
                </div>

                {/* Seletor de Paginação Extrato */}
                {!transactionsLoading && transactions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 hidden sm:inline">Exibir:</span>
                    <Select value={txItemsPerPage} onValueChange={(v) => { setTxItemsPerPage(v); setTxCurrentPage(1); }}>
                      <SelectTrigger className="h-8 w-[70px] text-xs">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {transactionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-meu-primary mb-2" />
                  <p>Carregando extrato...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">Nenhuma movimentação</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentTransactions.map((tx) => {
                    let isCredit = false
                    let label = `Desconhecido (${tx.type})`
                    let icon = <Info className="h-4 w-4" />
                    let actionText = ''
                    // Usar qty preferencialmente, fallback para amount
                    const amount = tx.qty ?? tx.amount ?? 0

                    switch (tx.type) {
                      case 'PURCHASE':
                        isCredit = true
                        label = 'Compra de Créditos'
                        icon = <CreditCard className="h-4 w-4 text-green-600" />
                        actionText = `Comprou ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'USAGE':
                      case 'CONSUME':
                        isCredit = false
                        label = 'Agendamento de Aula'
                        icon = <Dumbbell className="h-4 w-4 text-blue-600" />
                        actionText = `Gastou ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'REFUND':
                        isCredit = true
                        label = 'Reembolso de Aula'
                        icon = <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        actionText = `Reembolso de ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'EXPIRED':
                        isCredit = false
                        label = 'Expiração de Créditos'
                        icon = <AlertCircle className="h-4 w-4 text-red-600" />
                        actionText = `Expirou ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'MANUAL_ADD':
                      case 'BONUS':
                        isCredit = true
                        label = 'Bônus / Ajuste'
                        icon = <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        actionText = `Recebeu ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'MANUAL_REMOVE':
                      case 'REVOKE':
                        isCredit = false
                        label = 'Ajuste Manual'
                        icon = <ArrowUpRight className="h-4 w-4 text-red-600" />
                        actionText = `Removeu ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'LOCK':
                        isCredit = false
                        label = 'Reserva de Aula'
                        icon = <Clock className="h-4 w-4 text-orange-600" />
                        actionText = `Reservou ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      case 'UNLOCK':
                      case 'BONUS_UNLOCK':
                        isCredit = true
                        label = 'Reserva Cancelada'
                        icon = <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        actionText = `Estorno de ${amount} crédito${amount !== 1 ? 's' : ''}`
                        break
                      default:
                        // Fallback generic
                        if (isCredit) {
                          actionText = `Recebeu ${amount} crédito${amount !== 1 ? 's' : ''}`
                        } else {
                          actionText = `Gastou ${amount} crédito${amount !== 1 ? 's' : ''}`
                        }
                    }

                    return (
                      <div key={tx.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-100' : 'bg-red-50'}`}>
                            {icon}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm md:text-base">{tx.description || label}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('pt-BR')} às {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className={`font-bold text-sm md:text-base ${isCredit ? 'text-green-600' : 'text-gray-900'} ml-14 md:ml-0`}>
                          {actionText}
                        </div>
                      </div>
                    )
                  })}

                  {/* Controles de Paginação Extrato */}
                  {txItemsPerPage !== "all" && transactions.length > txLimit && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTxCurrentPage(p => Math.max(1, p - 1))}
                        disabled={txCurrentPage === 1}
                        className="h-8 px-2 text-xs"
                      >
                        <ChevronLeft className="h-3 w-3 mr-1" />
                        Anterior
                      </Button>
                      <span className="text-xs text-gray-500">
                        Página {txCurrentPage} de {txTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTxCurrentPage(p => Math.min(txTotalPages, p + 1))}
                        disabled={txCurrentPage === txTotalPages}
                        className="h-8 px-2 text-xs"
                      >
                        Próximo
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PERFIL */}
        <TabsContent value="perfil" className="space-y-6 focus-visible:outline-none ring-0">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Cartão de Perfil Principal */}
            <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-meu-primary to-blue-600 relative">
                <div className="absolute -bottom-12 left-6">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                      {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="mt-14 px-6 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-gray-500">Aluno</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setShowEditProfileModal(true)}
                  >
                    <Settings className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Editar Perfil</span>
                    <span className="md:hidden">Editar</span>
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mt-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Informações de Contato</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Phone className="h-4 w-4" />
                          </div>
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Segurança</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-gray-600"
                        onClick={() => setShowChangePasswordModal(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => logout()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair da Conta
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Cartão Lateral de Créditos */}
            <Card className="border-none shadow-md bg-gradient-to-b from-gray-900 to-meu-primary text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Meus Créditos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {creditsLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
                    <p className="text-sm text-blue-200">Carregando...</p>
                  </div>
                ) : creditsBalance ? (
                  <>
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                        <span className="text-3xl font-bold text-white">
                          {creditsBalance.available_classes}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold">Créditos Disponíveis</h3>
                      <p className="text-blue-200 text-sm">Para agendar aulas</p>
                    </div>

                    <div className="space-y-2 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-100">Total Comprado</span>
                        <span className="font-semibold">{creditsBalance.total_purchased}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-100">Utilizados</span>
                        <span className="font-semibold">{creditsBalance.total_consumed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-100">Reservados</span>
                        <span className="font-semibold">{creditsBalance.locked_qty}</span>
                      </div>
                      <div className="h-px bg-white/20 my-2" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-white">Disponíveis</span>
                        <span className="text-green-300">{creditsBalance.available_classes}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-white text-meu-primary hover:bg-blue-50"
                      onClick={() => router.push('/aluno/comprar')}
                    >
                      Comprar Créditos
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                      <Dumbbell className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Nenhum crédito</h3>
                    <p className="text-blue-200 text-sm mb-4">Compre créditos para agendar aulas</p>
                    <Button
                      className="w-full bg-white text-meu-primary hover:bg-blue-50"
                      onClick={() => router.push('/aluno/comprar')}
                    >
                      Comprar Créditos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Informação sobre Aulas Reservadas */}
      <Dialog open={showReservedInfo} onOpenChange={setShowReservedInfo}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />

          <DialogHeader className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Aulas Reservadas
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Entenda como funcionam as aulas reservadas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-700" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Débito Automático</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      As aulas reservadas serão <strong className="text-amber-900">debitadas 1 semana antes</strong> da data agendada se você tiver crédito disponível.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-amber-200" />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Sem Crédito</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Caso você <strong className="text-amber-900">não tenha crédito</strong> no momento do débito, a aula será <strong className="text-red-600">cancelada automaticamente</strong> pelo sistema.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-amber-200" />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Dica Importante</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Mantenha créditos disponíveis para garantir que suas aulas reservadas sejam confirmadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 pb-2">
            <Button
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all"
              onClick={() => setShowReservedInfo(false)}
            >
              Entendi, obrigado!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Série */}
      <Dialog open={showSeriesCancelModal} onOpenChange={setShowSeriesCancelModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] border-0 shadow-2xl flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600" />

          <DialogHeader className="pt-4 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Cancelar Série
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Escolha a opção de cancelamento
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 px-1">
            {cancellingSeries && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{cancellingSeries.teacher?.name}</p>
                    <p className="text-xs text-gray-600">
                      {DAY_NAMES[cancellingSeries.day_of_week]}s às {cancellingSeries.start_time}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <RadioGroup value={seriesCancelType} onValueChange={(v) => setSeriesCancelType(v as any)}>
              <div className="space-y-3">
                <div className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${seriesCancelType === 'single'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                  }`}>
                  <Label htmlFor="single-series" className="flex items-start gap-3 p-3 cursor-pointer">
                    <RadioGroupItem value="single" id="single-series" className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className={`h-4 w-4 flex-shrink-0 ${seriesCancelType === 'single' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        <p className={`font-semibold text-sm ${seriesCancelType === 'single' ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                          Cancelar apenas a próxima aula
                        </p>
                      </div>
                      <p className={`text-xs leading-relaxed ${seriesCancelType === 'single' ? 'text-blue-800' : 'text-gray-600'
                        }`}>
                        Cancela somente a próxima aula. As demais continuam agendadas.
                      </p>
                    </div>
                  </Label>
                </div>

                <div className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${seriesCancelType === 'all'
                  ? 'border-red-500 bg-red-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/30'
                  }`}>
                  <Label htmlFor="all-series" className="flex items-start gap-3 p-3 cursor-pointer">
                    <RadioGroupItem value="all" id="all-series" className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className={`h-4 w-4 flex-shrink-0 ${seriesCancelType === 'all' ? 'text-red-600' : 'text-gray-500'
                          }`} />
                        <p className={`font-semibold text-sm ${seriesCancelType === 'all' ? 'text-red-900' : 'text-gray-900'
                          }`}>
                          Cancelar toda a série
                        </p>
                      </div>
                      <p className={`text-xs leading-relaxed ${seriesCancelType === 'all' ? 'text-red-800' : 'text-gray-600'
                        }`}>
                        Cancela todas as aulas futuras. O histórico é preservado.
                      </p>
                      <p className={`text-xs font-medium mt-1 ${seriesCancelType === 'all' ? 'text-red-700' : 'text-red-600'
                        }`}>
                        ⚠️ Ação irreversível
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {seriesCancelError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">{seriesCancelError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 pb-2 flex-shrink-0 border-t border-gray-100">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-gray-600 text-sm h-9"
              onClick={() => {
                setShowSeriesCancelModal(false)
                setCancellingSeries(null)
                setSeriesCancelError(null)
              }}
              disabled={isCancellingSeries}
            >
              Voltar
            </Button>
            <Button
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm hover:shadow-md transition-all text-sm h-9"
              onClick={handleCancelSeriesConfirm}
              disabled={isCancellingSeries}
            >
              {isCancellingSeries ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Perfil */}
      <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />

          <DialogHeader className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Editar Perfil
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Atualize suas informações pessoais
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Upload de Avatar */}
            <div className="space-y-2">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-gray-200">
                    <AvatarImage src={avatarPreview || user?.avatar_url} />
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {avatarPreview && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isUploadingAvatar || isUpdatingProfile}
                  />
                  <Label
                    htmlFor="avatar-upload"
                    className={cn(
                      "cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50",
                      (isUploadingAvatar || isUpdatingProfile) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {avatarFile ? 'Trocar Foto' : 'Escolher Foto'}
                  </Label>
                  {avatarFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(null)
                        const input = document.getElementById('avatar-upload') as HTMLInputElement
                        if (input) input.value = ''
                      }}
                      disabled={isUploadingAvatar || isUpdatingProfile}
                    >
                      Remover
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG ou GIF. Máximo 5MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome Completo</Label>
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telefone</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '')
                  if (value.length <= 11) {
                    if (value.length <= 2) {
                      value = value
                    } else if (value.length <= 6) {
                      value = value.replace(/(\d{2})(\d+)/, '($1) $2')
                    } else if (value.length <= 10) {
                      value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                    } else {
                      value = value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
                    }
                  }
                  setProfileForm({ ...profileForm, phone: value })
                }}
                placeholder="(11) 91234-5678"
                maxLength={15}
              />
              <p className="text-xs text-gray-500">Celular: (11) 91234-5678 | Fixo: (11) 1234-5678</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 pb-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-gray-600"
              onClick={() => {
                setShowEditProfileModal(false)
                setAvatarFile(null)
                setAvatarPreview(null)
              }}
              disabled={isUpdatingProfile || isUploadingAvatar}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile || isUploadingAvatar}
            >
              {isUpdatingProfile || isUploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingAvatar ? 'Enviando foto...' : 'Salvando...'}
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alterar Senha */}
      <Dialog open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600" />

          <DialogHeader className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Alterar Senha
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Digite sua senha atual e a nova senha
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Digite a nova senha novamente"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 pb-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-gray-600"
              onClick={() => {
                setShowChangePasswordModal(false)
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                })
              }}
              disabled={isChangingPassword}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento - Mantido igual */}
      <Dialog open={confirm.open} onOpenChange={(open) => !open && setConfirm({ open: false, bookingId: null })}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl overflow-hidden">
          {(() => {
            const b = bookings.find(x => x.id === confirm.bookingId)
            if (!b) return null

            const text = cutoffLabel(b)
            const now = new Date()
            const cutoff = b.cancellableUntil
              ? new Date(b.cancellableUntil)
              : new Date(getBookingTime(b).getTime() - 4 * 60 * 60 * 1000)
            const isBeforeCutoff = now <= cutoff

            const isLateCancellation = !b.is_reserved && !isBeforeCutoff;

            return (
              <>
                <div className={`h-2 w-full absolute top-0 left-0 ${isLateCancellation ? 'bg-amber-500' : 'bg-red-500'}`} />

                <DialogHeader className="pt-6">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    {isLateCancellation ? (
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    )}
                    <span className="ml-1">Cancelar Agendamento</span>
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                    {b.series_id
                      ? 'Esta aula faz parte de uma recorrência. O cancelamento afeta apenas esta data.'
                      : 'Você tem certeza que deseja cancelar esta aula?'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-white shadow-sm">
                      <AvatarImage src={b.avatar_url} />
                      <AvatarFallback>{(b.teacherName || 'P').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-900">{b.teacherName || b.teacher_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(b.start_at || b.date)} às {formatTime(b.start_at || b.date)}
                      </p>
                    </div>
                  </div>

                  {!b.is_reserved && (
                    <div className={cn(
                      "rounded-lg p-4 text-sm border",
                      isBeforeCutoff
                        ? "bg-green-50 border-green-100 text-green-800"
                        : "bg-amber-50 border-amber-100 text-amber-800"
                    )}>
                      <p className="font-semibold mb-1 flex items-center gap-2">
                        {isBeforeCutoff ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {isBeforeCutoff ? 'Cancelamento Gratuito' : 'Fora do Prazo Gratuito'}
                      </p>
                      <p className="opacity-90 leading-relaxed">
                        {isBeforeCutoff
                          ? `Seu crédito será devolvido integralmente. Prazo até: ${text}`
                          : `O prazo para cancelamento gratuito encerrou em ${text}. Seu crédito não será estornado.`}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto text-gray-600"
                    onClick={() => setConfirm({ open: false, bookingId: null })}
                    disabled={!!cancellingBookingId}
                  >
                    Manter Aula
                  </Button>
                  <Button
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                    onClick={() => confirm.bookingId && cancelBooking(confirm.bookingId)}
                    disabled={cancellingBookingId === confirm.bookingId}
                  >
                    {cancellingBookingId === confirm.bookingId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
