'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
      description: 'Adicione saldo para suas aulas',
      icon: CreditCard,
      onClick: () => router.push('/aluno/comprar'),
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconBg: 'bg-green-500',
      stats: `${user?.credits ?? 0} disponíveis`
    },
    {
      title: 'Ver professores',
      description: 'Encontre seu professor ideal',
      icon: Users,
      onClick: () => router.push('/aluno/inicio?section=professores'),
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-500',
      stats: `${teachers.length} disponíveis`
    },
    {
      title: 'Minhas aulas',
      description: 'Gerencie seus agendamentos',
      icon: CalendarPlus,
      onClick: () => router.push('/aluno/inicio?section=agendamentos'),
      bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
      iconBg: 'bg-purple-500',
      stats: `${activeBookings.length} agendadas`
    }
  ]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-meu-primary/5 via-white to-meu-accent/5">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Welcome Section - Simplified */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-meu-primary mb-2">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-gray-600">{formattedDate}</p>
          </motion.div>

          {/* Main Actions - Integrated Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={action.onClick}
                >
                  <div className={`${action.bg} rounded-2xl p-8 text-center border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <div className={`${action.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{action.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{action.description}</p>
                    <div className="text-2xl font-bold text-meu-primary">{action.stats}</div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Quick Summary Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-8 border border-gray-100"
          >
            <div className="flex flex-col md:flex-row justify-around items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Aulas hoje</div>
                <div className="text-2xl font-bold text-meu-accent">{todayBookings.length}</div>
              </div>
              <div className="hidden md:block w-px h-12 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Concluídas</div>
                <div className="text-2xl font-bold text-green-600">{completedBookingsCount}</div>
              </div>
              <div className="hidden md:block w-px h-12 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Status atual</div>
                <div className="text-lg font-semibold text-meu-primary">Pronto para treinar</div>
              </div>
            </div>
          </motion.div>

        {/* Teachers Section - Simplified */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          ref={teachersSectionRef} className="space-y-6"
        >
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-meu-primary" />
                <CardTitle className="text-lg font-semibold">Encontrar professores</CardTitle>
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
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {teachers.length} professor(es) encontrado(s)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teachers.length === 0 ? (
                <div className="py-12 text-center">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Nenhum professor encontrado</p>
                  <Button onClick={handleClearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.slice(0, 6).map((teacher) => {
                    const profile = teacher.teacher_profiles?.[0]
                    const academy = teacher.academy_teachers?.[0]?.academies

                    return (
                      <div
                        key={teacher.id}
                        className="rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/60 p-4 transition-all hover:border-meu-primary/20 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            {teacher.avatar_url ? (
                              <img
                                src={teacher.avatar_url}
                                alt={teacher.name}
                                className="h-12 w-12 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-sm font-bold text-white">
                                {teacher.name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            {profile?.is_available && (
                              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                            )}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{teacher.name}</h4>
                              {profile?.is_available && (
                                <Badge className="bg-green-100 text-green-700 text-xs">Disponível</Badge>
                              )}
                            </div>

                            <div className="text-sm text-gray-600">
                              {academy && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-meu-primary" />
                                  <span>{academy.city}, {academy.state}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span>R$ {profile?.hourly_rate?.toFixed(2) || '0,00'}/hora</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleSelectTeacher(teacher)}
                              className="bg-meu-primary text-white hover:bg-meu-primary-dark w-full"
                            >
                              <Calendar className="mr-1 h-3 w-3" />
                              Agendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* Bookings Section - Simplified */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          ref={bookingsSectionRef} className="space-y-4"
        >
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-meu-primary" />
                <CardTitle className="text-lg font-semibold">
                  Minhas aulas ({activeBookings.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  <p className="text-gray-500">Nenhuma aula agendada</p>
                  <Button onClick={() => router.push('/aluno/inicio?section=professores')} className="mt-3">
                    Encontrar professor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-all hover:border-meu-primary/20 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-meu-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-meu-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{booking.teacher?.name || 'Professor'}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              {new Date(booking.date).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              <span className="text-gray-400">•</span>
                              <span>{booking.duration} min</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
        </div>
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
