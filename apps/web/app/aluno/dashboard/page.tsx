"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Calendar,
  Loader2,
  User as UserIcon,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  Star
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/lib/stores/auth-store"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface StudentStats {
  totalBookings: number
  completed: number
  pending: number
  cancelled: number
}

export default function StudentDashboardPage() {
  const searchParams = useSearchParams()
  const section = useMemo(() => searchParams.get("section"), [searchParams])
  const { user, isAuthenticated, token, updateUser } = useAuthStore()
  const [confirm, setConfirm] = useState<{ open: boolean; bookingId: string | null }>({ open: false, bookingId: null })

  // Dashboard state
  const [stats, setStats] = useState<StudentStats>({
    totalBookings: 0,
    completed: 0,
    pending: 0,
    cancelled: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Settings state
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    gender: (user as any)?.gender || "PREFER_NOT_TO_SAY"
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Aulas state
  type BookingItem = { id: string; date: string; startAt?: string; endAt?: string; duration: number; status: string; teacherName?: string; franchiseName?: string; cancellableUntil?: string }
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [balanceAvailable, setBalanceAvailable] = useState<number | null>(null)
  const [nextBooking, setNextBooking] = useState<BookingItem | null>(null)

  // Função auxiliar para obter o tempo do booking (startAt ou date)
  const getBookingTime = (booking: BookingItem): Date => {
    if (!booking.date && !booking.startAt) {
      return new Date(0) // Data inválida
    }
    return booking.startAt ? new Date(booking.startAt) : new Date(booking.date)
  }

  // Função auxiliar para verificar se um booking é futuro
  // Compara considerando o timezone local do usuário (America/Sao_Paulo)
  // O backend retorna datas em UTC, mas precisamos comparar no timezone local
  const isBookingUpcoming = (booking: BookingItem): boolean => {
    const bookingTime = getBookingTime(booking)
    const now = new Date()
    
    // Obter a data/hora do booking no timezone de São Paulo
    // Formato: "11/22/2025, 09:00:00 AM" ou "11/22/2025, 09:00:00"
    const bookingBRParts = bookingTime.toLocaleString('en-US', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).split(', ')
    
    // Obter a data/hora atual no timezone de São Paulo
    const nowBRParts = now.toLocaleString('en-US', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).split(', ')
    
    // Comparar: se a string completa do booking for maior que a atual, é futuro
    // Isso funciona porque o formato é consistente: "MM/DD/YYYY, HH:MM:SS AM/PM"
    const bookingBRStr = bookingBRParts.join(', ')
    const nowBRStr = nowBRParts.join(', ')
    
    return bookingBRStr > nowBRStr
  }

  const [ratingsMap, setRatingsMap] = useState<Record<string, { rating: number; comment?: string }>>({})
  const [ratingModal, setRatingModal] = useState<{ open: boolean; bookingId: string | null }>({ open: false, bookingId: null })
  const [ratingValue, setRatingValue] = useState<number>(0)
  const [ratingComment, setRatingComment] = useState<string>("")
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/students/${user.id}/stats`
        )
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalBookings: data.total_bookings || 0,
            completed: data.completed_bookings || 0,
            pending: data.pending_bookings || 0,
            cancelled: data.cancelled_bookings || 0
          })
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    if (section !== "config") {
      fetchStats()
    }
  }, [user?.id, section])

  useEffect(() => {
    setProfileData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || ""
    })
    setAvatarPreview(user?.avatar_url || null)
  }, [user?.name, user?.email, user?.phone, user?.avatar_url])

  useEffect(() => {
    if (!user?.id || !token) return
    if (section === 'aulas') {
      void fetchBookings()
    }
    if (!section || (section !== 'config' && section !== 'aulas')) {
      void fetchBalance()
      void fetchNext()
      void fetchBookings()
    }
  }, [user?.id, token, section])

  useEffect(() => {
    if (!token) return
    const past = bookings.filter(b => !isBookingUpcoming(b)).slice(0, 3)
    past.forEach(async (b) => {
      if (ratingsMap[b.id] !== undefined) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings/${b.id}/rating`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const json = await res.json().catch(() => null)
          if (json?.rating) {
            setRatingsMap(prev => ({ ...prev, [b.id]: { rating: Number(json.rating.rating) || 0, comment: json.rating.comment || undefined } }))
          }
        }
      } catch {}
    })
  }, [bookings, token])

  const fetchBookings = async () => {
    if (!user?.id || !token) return
    try {
      setBookingsLoading(true)
      const params = new URLSearchParams({ student_id: user.id })
      const res = await fetch(`${API_BASE_URL}/api/bookings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Erro ao buscar bookings:', res.status, errorText)
        throw new Error('Erro ao carregar suas aulas')
      }
      const json = await res.json()
      console.log('Bookings recebidos do backend:', json)
      console.log('Número de bookings:', json.bookings?.length || 0)
      
      if (!json.bookings || json.bookings.length === 0) {
        console.warn('Nenhum booking retornado do backend')
        setBookings([])
        return
      }
      
      const items: BookingItem[] = (json.bookings || []).map((b: any) => {
        const item = {
          id: b.id,
          date: b.date,
          startAt: b.startAt,
          endAt: b.endAt,
          duration: b.duration ?? 60,
          status: String(b.status),
          teacherName: b.teacherName,
          franchiseName: b.franchiseName,
          cancellableUntil: b.cancellableUntil
        }
        console.log('Mapeando booking:', b, '->', item)
        return item
      })
      
      console.log('Bookings mapeados:', items)
      console.log('Bookings futuros:', items.filter(b => isBookingUpcoming(b)))
      setBookings(items)
    } catch (e) {
      console.error('Erro ao buscar bookings:', e)
      // ignore error here, handled via UI state
      setBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }

  const fetchBalance = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/packages/student/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      const available = Number(data?.balance?.available_classes ?? (data?.balance ? (data.balance.total_purchased - data.balance.total_consumed - data.balance.locked_qty) : 0))
      setBalanceAvailable(Number.isFinite(available) ? available : 0)
    } catch {}
  }

  const fetchNext = async () => {
    if (!user?.id || !token) return
    try {
      const params = new URLSearchParams({ student_id: user.id })
      const res = await fetch(`${API_BASE_URL}/api/bookings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const json = await res.json()
      const items: BookingItem[] = (json.bookings || []).map((b: any) => ({
        id: b.id, date: b.date, duration: b.duration ?? 60, status: String(b.status), teacherName: b.teacherName, franchiseName: b.franchiseName, cancellableUntil: b.cancellableUntil
      }))
      const upcoming = items.filter(b => isBookingUpcoming(b))
      upcoming.sort((a, b) => getBookingTime(a).getTime() - getBookingTime(b).getTime())
      setNextBooking(upcoming[0] || null)
    } catch {}
  }

  const cutoffLabel = (b: BookingItem) => {
    const bookingTime = getBookingTime(b)
    const cutoffIso = b.cancellableUntil || new Date(bookingTime.getTime() - 4 * 60 * 60 * 1000).toISOString()
    const cutoff = new Date(cutoffIso)
    const d = cutoff.toLocaleDateString('pt-BR')
    const t = cutoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${d} ${t}`
  }

  const cancelBooking = async (id: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || data?.message || 'Erro ao cancelar')
        return
      }
      toast.success('Agendamento cancelado com sucesso')
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, status: 'CANCELLED' } : b)))
    } catch {
      toast.error('Erro ao cancelar')
    } finally {
      setConfirm({ open: false, bookingId: null })
    }
  }

  const openRating = async (bookingId: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/rating`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json().catch(() => null)
        if (json?.rating) {
          setRatingValue(Number(json.rating.rating) || 0)
          setRatingComment(json.rating.comment || "")
        } else {
          setRatingValue(0)
          setRatingComment("")
        }
      }
    } catch {
      setRatingValue(0)
      setRatingComment("")
    }
    setRatingModal({ open: true, bookingId })
  }

  const submitRating = async () => {
    if (!token || !ratingModal.bookingId || ratingValue < 1) return
    try {
      setRatingSubmitting(true)
      const res = await fetch(`${API_BASE_URL}/api/bookings/${ratingModal.bookingId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment?.trim() || undefined })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || data?.message || 'Erro ao salvar avaliação')
        return
      }
      const json = await res.json().catch(() => null)
      setRatingsMap(prev => ({ ...prev, [ratingModal.bookingId!]: { rating: Number(json?.rating?.rating) || ratingValue, comment: ratingComment?.trim() || undefined } }))
      setRatingModal({ open: false, bookingId: null })
      toast.success('Avaliação registrada!')
    } catch {
      toast.error('Erro ao salvar avaliação')
    } finally {
      setRatingSubmitting(false)
    }
  }

  if (!user || !isAuthenticated) {
    return null
  }

  const firstName = user?.name?.split(" ")[0] || "Aluno"

  const authorizedFetch = async (path: string, init: RequestInit = {}) => {
    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.")
    }
    let headers: Record<string, string> = {}
    if (init.headers instanceof Headers) {
      headers = Object.fromEntries(init.headers.entries())
    } else if (Array.isArray(init.headers)) {
      headers = Object.fromEntries(init.headers)
    } else if (init.headers) {
      headers = { ...(init.headers as Record<string, string>) }
    }
    const endpoint = path.startsWith("/") ? path : `/${path}`
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`
      },
      credentials: "include"
    })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("avatar", avatarFile)
      formData.append("userId", user.id)
      const response = await authorizedFetch(`/api/users/${user.id}/avatar`, {
        method: "POST",
        body: formData
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao fazer upload")
      }
      const data = await response.json()
      updateUser({ ...user, avatar_url: data.avatar_url })
      toast.success("Foto atualizada com sucesso!")
      setAvatarFile(null)
      setAvatarPreview(data.avatar_url)
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload da foto")
    } finally {
      setSaving(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await authorizedFetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      })
      if (response.ok) {
        const data = await response.json()
        updateUser(data.user)
        toast.success("Perfil atualizado com sucesso!")
      } else {
        toast.error("Erro ao atualizar perfil")
      }
    } catch (error) {
      toast.error("Erro ao processar requisição")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres")
      return
    }
    setSaving(true)
    try {
      const response = await authorizedFetch(`/api/users/${user?.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      if (response.ok) {
        toast.success("Senha alterada com sucesso!")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Senha atual incorreta")
      }
    } catch (error) {
      toast.error("Erro ao processar requisição")
    } finally {
      setSaving(false)
    }
  }

  if (section === "config") {
    return (
      <div className="w-full flex flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-600">Atualize seu perfil, foto e senha</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-meu-primary" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gênero</Label>
                      <Select value={profileData.gender} onValueChange={(v) => setProfileData((p) => ({ ...p, gender: v }))}>
                        <SelectTrigger id="gender" className="w-full">
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Masculino</SelectItem>
                          <SelectItem value="FEMALE">Feminino</SelectItem>
                          <SelectItem value="NON_BINARY">Não-binário</SelectItem>
                          <SelectItem value="OTHER">Outro</SelectItem>
                          <SelectItem value="PREFER_NOT_TO_SAY">Prefiro não dizer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData((p) => ({ ...p, email: e.target.value }))}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-meu-primary text-white hover:bg-meu-primary-dark">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Salvar alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-meu-primary" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha atual</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))
                          }
                          placeholder="••••••"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowPassword((s) => !s)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova senha</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, newPassword: e.target.value }))
                          }
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowNewPassword((s) => !s)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                          }
                          placeholder="Repita a nova senha"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-meu-primary text-white hover:bg-meu-primary-dark">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Alterar senha
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-meu-primary" />
                  Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-meu-primary/20">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt={user.name || "Avatar"} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-meu-primary/10 text-meu-primary font-bold">
                        {user?.name?.charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar">Atualizar foto</Label>
                    <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG ou WEBP até 5MB</p>
                  </div>
                </div>
                {avatarFile && (
                  <Button onClick={handleAvatarUpload} disabled={saving} className="bg-meu-primary text-white hover:bg-meu-primary-dark">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Salvar nova foto
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (section === 'aulas') {
    const upcoming = bookings.filter(b => isBookingUpcoming(b))
    const past = bookings.filter(b => !isBookingUpcoming(b))
    return (
      <div className="w-full flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Minhas Aulas</h1>
          <p className="text-xs sm:text-sm text-gray-600">Gerencie suas aulas e cancelamentos</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4 text-xs sm:text-sm text-amber-900">
          <strong className="block sm:inline">Cancelamento gratuito</strong> até 4 horas antes do horário agendado. Após esse prazo, 1 crédito será consumido.
        </div>

        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Próximas aulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingsLoading ? (
              <div className="text-gray-600">Carregando suas aulas...</div>
            ) : upcoming.length === 0 ? (
              <div className="text-gray-600">Você não tem aulas futuras.</div>
            ) : (
              upcoming.map((b) => (
                <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 p-3 sm:p-4 gap-3 sm:gap-4 hover:border-meu-primary/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{b.teacherName || 'Professor'}</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {getBookingTime(b).toLocaleDateString('pt-BR')} • {getBookingTime(b).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {b.duration} min
                    </div>
                    {b.franchiseName && (
                      <div className="text-xs text-gray-500">{b.franchiseName}</div>
                    )}
                    <div className="text-[10px] sm:text-[11px] text-amber-700 font-medium">Cancelamento gratuito até {cutoffLabel(b)}</div>
                  </div>
                  <div className="flex sm:block">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto h-10 sm:h-9 text-sm text-red-600 border-red-200 hover:bg-red-50" 
                      onClick={() => setConfirm({ open: true, bookingId: b.id })}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Aulas passadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookingsLoading ? (
              <div className="text-gray-600">Carregando...</div>
            ) : past.length === 0 ? (
              <div className="text-gray-600">Nenhuma aula no histórico recente.</div>
            ) : (
              past.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{b.teacherName || 'Professor'}</div>
                    <div className="text-xs text-gray-600">{getBookingTime(b).toLocaleDateString('pt-BR')} • {getBookingTime(b).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {b.duration} min</div>
                  </div>
                  <div className="text-xs text-gray-500">{b.status}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {(() => {
          const b = bookings.find(x => x.id === confirm.bookingId)
          const text = b ? cutoffLabel(b) : '4 horas antes do horário agendado'
          const desc = `Cancelamento gratuito até ${text}. Após esse prazo, 1 crédito será consumido. Confirmar cancelamento?`
          return (
            <div>
              {/* Lightweight inline confirm dialog - reuse existing dialog if available */}
              {confirm.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Cancelar aula</h3>
                    <p className="text-xs sm:text-sm text-gray-700 mb-5 sm:mb-6 leading-relaxed">{desc}</p>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto h-11 sm:h-10 order-2 sm:order-1" 
                        onClick={() => setConfirm({ open: false, bookingId: null })}
                      >
                        Voltar
                      </Button>
                      <Button 
                        className="w-full sm:w-auto h-11 sm:h-10 bg-red-600 hover:bg-red-700 text-white order-1 sm:order-2" 
                        onClick={() => confirm.bookingId && cancelBooking(confirm.bookingId)}
                      >
                        Confirmar Cancelamento
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Olá, {firstName}!</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {bookings.filter(b => isBookingUpcoming(b)).length} aulas agendadas • {balanceAvailable ?? 0} créditos disponíveis
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto h-11 sm:h-10 bg-[#002C4E] hover:bg-[#003d6b] text-sm sm:text-base font-semibold"
          onClick={() => { window.location.href = '/aluno/professores' }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Aula
        </Button>
      </div>

      {/* Stats em grid responsivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalBookings}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Total de aulas</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{balanceAvailable ?? 0}</div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Créditos</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Próximas Aulas</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          ) : (() => {
            const upcomingBookings = bookings.filter(b => {
              const isUpcoming = isBookingUpcoming(b)
              const bookingTime = getBookingTime(b)
              const now = new Date()
              console.log('Booking:', b.id, 'Date:', b.date, 'StartAt:', b.startAt, 'Time:', bookingTime.toISOString(), 'Now:', now.toISOString(), 'IsUpcoming:', isUpcoming, 'Diff:', bookingTime.getTime() - now.getTime(), 'ms')
              return isUpcoming
            })
            console.log('Total bookings:', bookings.length, 'Upcoming:', upcomingBookings.length)
            console.log('All bookings:', bookings.map(b => ({ 
              id: b.id, 
              date: b.date, 
              startAt: b.startAt, 
              time: getBookingTime(b).toISOString(),
              isUpcoming: isBookingUpcoming(b)
            })))
            
            if (upcomingBookings.length === 0) {
              // Se não há bookings futuros, mas há bookings, mostrar mensagem diferente
              if (bookings.length > 0) {
                return (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-4">Nenhuma aula futura agendada</p>
                    <p className="text-xs text-gray-500 mb-4">Você tem {bookings.length} aula(s) no histórico</p>
                    <Button onClick={() => { window.location.href = '/aluno/professores' }}>
                      Agendar Nova Aula
                    </Button>
                  </div>
                )
              }
              return (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">Nenhuma aula agendada</p>
                  <Button onClick={() => { window.location.href = '/aluno/professores' }}>
                    Encontrar Professor
                  </Button>
                </div>
              )
            }
            
            return (
              <div className="space-y-3">
                {upcomingBookings
                  .sort((a, b) => getBookingTime(a).getTime() - getBookingTime(b).getTime())
                  .slice(0, 4)
                  .map((booking) => {
                    const displayDate = booking.startAt || booking.date
                    console.log('Rendering booking:', booking.id, booking.teacherName, displayDate)
                    return (
                      <div 
                        key={booking.id} 
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-sm">
                            {(booking.teacherName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{booking.teacherName || 'Professor'}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(displayDate).toLocaleDateString('pt-BR', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.franchiseName || '—'}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setConfirm({ open: true, bookingId: booking.id })}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )
                  })}
              
                {upcomingBookings.length > 4 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => { const url = new URL(window.location.href); url.searchParams.set('section','aulas'); window.location.href = url.toString() }}
                  >
                    Ver todas ({upcomingBookings.length})
                  </Button>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {bookings.filter(b => !isBookingUpcoming(b)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Histórico Recente</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Últimas aulas realizadas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookings
                .filter(b => !isBookingUpcoming(b))
                .sort((a, b) => getBookingTime(b).getTime() - getBookingTime(a).getTime()) // Mais recentes primeiro
                .slice(0, 3)
                .map((booking) => {
                  const displayDate = booking.startAt || booking.date
                  return (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-600 font-medium text-xs">
                        {(booking.teacherName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{booking.teacherName || 'Professor'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(displayDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {ratingsMap[booking.id]?.rating ? (
                        <div className="flex items-center gap-1">
                          {(() => {
                            const r = Number(ratingsMap[booking.id]?.rating ?? 0)
                            return (
                              <>
                                {[1,2,3,4,5].map((i) => (
                                  <Star key={i} className={`h-4 w-4 ${i <= r ? 'text-amber-500 fill-current' : 'text-gray-300'}`} />
                                ))}
                                <span className="text-xs text-gray-600 ml-1">{r.toFixed(0)}/5</span>
                              </>
                            )
                          })()}
                        </div>
                      ) : booking.status === 'COMPLETED' ? (
                        <Button variant="outline" size="sm" onClick={() => openRating(booking.id)}>
                          Avaliar
                        </Button>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Cancelada</span>
                      )}
                    </div>
                  </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline confirm dialog for cancel */}
      {confirm.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar aula</h3>
            <p className="text-sm text-gray-700 mb-6">
              {(() => {
                const txt = nextBooking ? `Cancelamento gratuito até ${cutoffLabel(nextBooking)}.` : 'Cancelamento gratuito até 4 horas antes do horário agendado.'
                return `Tem certeza que deseja cancelar? ${txt}`
              })()}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirm({ open: false, bookingId: null })}>Voltar</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => confirm.bookingId && cancelBooking(confirm.bookingId!)}>Cancelar Aula</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação */}
      {ratingModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Avaliar aula</h3>
            <div className="flex items-center gap-2 mb-4">
              {[1,2,3,4,5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="focus:outline-none"
                  onClick={() => setRatingValue(i)}
                >
                  <Star className={`h-6 w-6 ${i <= ratingValue ? 'text-amber-500 fill-current' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <div className="mb-6">
              <label className="text-sm text-gray-700 mb-1 block">Comentário (opcional)</label>
              <textarea
                className="w-full border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                rows={4}
                maxLength={1000}
                placeholder="Como foi a aula?"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
              <div className="text-xs text-gray-400 mt-1">{ratingComment.length}/1000</div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRatingModal({ open: false, bookingId: null })}>Cancelar</Button>
              <Button
                className="bg-[#002C4E] hover:bg-[#003d6b] text-white"
                disabled={ratingValue < 1 || ratingSubmitting}
                onClick={submitRating}
              >
                {ratingSubmitting ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</span>
                ) : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
