'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentStore, Teacher } from '@/lib/stores/student-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Filter,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  CreditCard,
  Users,
  TrendingUp,
  CalendarPlus,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

export default function AlunoInicioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()
  const {
    teachers,
    bookings,
    loading,
    error,
    cityFilter,
    stateFilter,
    specialtyFilter,
    loadTeachers,
    loadBookings,
    setCityFilter,
    setStateFilter,
    setSpecialtyFilter,
    clearFilters
  } = useStudentStore()

  const [searchCity, setSearchCity] = useState('')
  const [searchState, setSearchState] = useState('')
  const [searchSpecialty, setSearchSpecialty] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  const teachersSectionRef = useRef<HTMLDivElement | null>(null)
  const bookingsSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/aluno/login')
      return
    }

    if (user?.role !== 'STUDENT') {
      router.push('/')
      return
    }

    loadTeachers()
    if (user?.id) {
      loadBookings(user.id)
    }
  }, [isAuthenticated, user, loadTeachers, loadBookings, router])

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED'),
    [bookings]
  )

  const todayBookings = useMemo(() => {
    const today = new Date().toDateString()
    return bookings.filter((b) => new Date(b.date).toDateString() === today)
  }, [bookings])

  const completedBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'COMPLETED').length,
    [bookings]
  )

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }),
    []
  )

  const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'Aluno', [user?.name])

  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'professores' && teachersSectionRef.current) {
      teachersSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (section === 'agendamentos' && bookingsSectionRef.current) {
      bookingsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams, teachers.length, activeBookings.length])

  const handleSearch = () => {
    if (searchCity) setCityFilter(searchCity)
    if (searchState) setStateFilter(searchState)
    if (searchSpecialty) setSpecialtyFilter(searchSpecialty)
  }

  const handleClearFilters = () => {
    setSearchCity('')
    setSearchState('')
    setSearchSpecialty('')
    clearFilters()
  }

  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowBookingModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
      COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200'
    }

    const icons = {
      PENDING: Clock,
      CONFIRMED: CheckCircle,
      COMPLETED: CheckCircle,
      CANCELLED: XCircle
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}>
        <Icon className="mr-1 h-3 w-3" />
        {status === 'PENDING'
          ? 'Pendente'
          : status === 'CONFIRMED'
          ? 'Confirmada'
          : status === 'COMPLETED'
          ? 'Concluída'
          : 'Cancelada'}
      </Badge>
    )
  }

  if (!user) {
    return null
  }

  if (loading && teachers.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    )
  }

  if (error && teachers.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={() => loadTeachers()}>Tentar novamente</Button>
      </div>
    )
  }

  const quickActions = [
    {
      title: 'Comprar créditos',
      description: 'Garanta saldo para agendar suas aulas quando quiser.',
      icon: CreditCard,
      cta: 'Ir para carteira',
      onClick: () => router.push('/aluno/comprar'),
      tone: 'bg-green-50 text-green-800 border-green-200'
    },
    {
      title: 'Encontrar professor',
      description: 'Busque profissionais por cidade, estado ou especialidade.',
      icon: Users,
      cta: 'Ver professores',
      onClick: () => router.push('/aluno/inicio?section=professores'),
      tone: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
      title: 'Agendar aula',
      description: 'Confira sua agenda e organize os próximos treinos.',
      icon: CalendarPlus,
      cta: 'Ver agenda',
      onClick: () => router.push('/aluno/inicio?section=agendamentos'),
      tone: 'bg-purple-50 text-purple-800 border-purple-200'
    }
  ]

  return (
    <>
      <div className="space-y-6 px-4 py-6 md:px-6 md:space-y-8">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 md:text-4xl">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-600 capitalize md:text-lg">{formattedDate}</p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card
                key={action.title}
                className={}
              >
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white/70 p-2 text-meu-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{action.title}</h3>
                      <p className="text-sm opacity-80">{action.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-meu-primary text-white hover:bg-meu-primary-dark md:w-auto"
                    onClick={action.onClick}
                  >
                    {action.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Créditos disponíveis
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user?.credits ?? 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Use créditos para confirmar suas aulas.</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Aulas agendadas
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{activeBookings.length}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{todayBookings.length} aula(s) marcada(s) para hoje.</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-meu-cyan to-cyan-400 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Aulas concluídas
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{completedBookingsCount}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{bookings.length} aulas agendadas no total.</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Professores disponíveis
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Profissionais com agenda aberta na sua região.</p>
            </CardContent>
          </Card>
        </section>

        <section ref={teachersSectionRef} className="space-y-6">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-meu-primary" />
                <CardTitle className="text-lg font-semibold md:text-xl">Buscar professores</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input
                  placeholder="Cidade"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
                <Input
                  placeholder="Estado (ex: SP)"
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value.toUpperCase())}
                  maxLength={2}
                />
                <Input
                  placeholder="Especialidade"
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1 bg-meu-primary text-white hover:bg-meu-primary-dark">
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Limpar
                  </Button>
                </div>
              </div>

              {(cityFilter || stateFilter || specialtyFilter) && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Filtros ativos:</span>
                  {cityFilter && <Badge variant="secondary">Cidade: {cityFilter}</Badge>}
                  {stateFilter && <Badge variant="secondary">Estado: {stateFilter}</Badge>}
                  {specialtyFilter && <Badge variant="secondary">Especialidade: {specialtyFilter}</Badge>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 md:text-xl">
                  Professores disponíveis
                </CardTitle>
                <p className="text-xs text-gray-500 md:text-sm">
                  {teachers.length} professor(es) encontrado(s)
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teachers.length === 0 ? (
                <div className="py-12 text-center">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Nenhum professor encontrado</p>
                  <p className="mt-2 text-sm text-gray-400">Tente ajustar os filtros de busca</p>
                  <Button onClick={handleClearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                teachers.map((teacher) => {
                  const profile = teacher.teacher_profiles?.[0]
                  const academy = teacher.academy_teachers?.[0]?.academies

                  return (
                    <div
                      key={teacher.id}
                      className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/60 p-5 transition-all hover:border-meu-primary/20 hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                          <div className="relative flex-shrink-0">
                            {teacher.avatar_url ? (
                              <img
                                src={teacher.avatar_url}
                                alt={teacher.name}
                                className="h-16 w-16 rounded-2xl object-cover shadow-lg"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-lg font-bold text-white shadow-lg">
                                {teacher.name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            {profile?.is_available && (
                              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {teacher.name}
                              </h4>
                              {profile?.is_available && (
                                <Badge className="bg-green-100 text-green-700">Disponível</Badge>
                              )}
                            </div>

                            {profile?.bio && (
                              <p className="text-sm text-gray-600">{profile.bio}</p>
                            )}

                            {profile?.specialties && profile.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {profile.specialties.map((specialty, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
                              {academy && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-meu-primary" />
                                  <span>
                                    {academy.city}, {academy.state}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-gray-900">
                                  R$ {profile?.hourly_rate?.toFixed(2) || '0,00'}/hora
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleSelectTeacher(teacher)}
                          className="bg-meu-primary text-white hover:bg-meu-primary-dark"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>

        <section ref={bookingsSectionRef} className="space-y-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 md:text-xl">
                  Minhas próximas aulas
                </CardTitle>
                <p className="text-xs text-gray-500 md:text-sm">
                  {todayBookings.length} aula(s) marcada(s) para hoje
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Nenhuma aula agendada</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Agende sua primeira aula com um professor
                  </p>
                </div>
              ) : (
                activeBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50 p-5 transition-all hover:border-meu-primary/20 hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {booking.teacher?.name || 'Professor'}
                          </h4>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-meu-primary" />
                            <span className="font-medium">
                              {new Date(booking.date).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-meu-primary" />
                            <span>{new Date(booking.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-meu-primary" />
                            <span>{booking.duration} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-meu-primary" />
                            <span>{booking.credits_cost} crédito(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {showBookingModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Agendar aula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Professor
                </p>
                <p className="font-semibold text-gray-900">{selectedTeacher.name}</p>
              </div>
              <p className="text-sm text-gray-500">
                Funcionalidade de agendamento em desenvolvimento. Entre em contato diretamente com o professor.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBookingModal(false)
                    setSelectedTeacher(null)
                  }}
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    toast.info('Funcionalidade em desenvolvimento')
                  }}
                  className="flex-1 bg-meu-primary text-white hover:bg-meu-primary-dark"
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
