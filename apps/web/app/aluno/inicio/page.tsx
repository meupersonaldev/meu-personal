'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentStore, Teacher } from '@/lib/stores/student-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MobileNav } from '@/components/layout/mobile-nav'
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
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

export default function AlunoInicioPage() {
  const router = useRouter()
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/aluno/login')
      return
    }

    if (user?.role !== 'STUDENT') {
      router.push('/')
      return
    }

    // Carregar dados iniciais
    loadTeachers()
    if (user?.id) {
      loadBookings(user.id)
    }
  }, [isAuthenticated, user, router])

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
    const styles = {
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
        <Icon className="h-3 w-3 mr-1" />
        {status === 'PENDING' ? 'Pendente' : status === 'CONFIRMED' ? 'Confirmada' : status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
      </Badge>
    )
  }

  if (!user) {
    return null
  }

  // Loading state
  if (loading && teachers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </div>
    )
  }

  // Error state
  if (error && teachers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => loadTeachers()}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date)
    const today = new Date()
    return bookingDate.toDateString() === today.toDateString()
  })

  const activeBookings = bookings.filter(b =>
    b.status === 'PENDING' || b.status === 'CONFIRMED'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20 md:pb-0">
        <div className="p-6 space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Olá, {user.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-600 text-lg">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Créditos */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-primary to-meu-primary-dark text-white">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Créditos Disponíveis</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{user?.credits || 0}</p>
                  <Button
                    size="sm"
                    onClick={() => router.push('/aluno/comprar')}
                    className="bg-green-600 hover:bg-green-700 text-xs"
                  >
                    Comprar Créditos
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Aulas Agendadas */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-accent to-yellow-400 text-meu-primary-dark">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Aulas Agendadas</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{activeBookings.length}</p>
                  <p className="text-sm text-gray-600">
                    {todayBookings.length} aula(s) hoje
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total de Aulas */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-meu-cyan to-cyan-400 text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Aulas Realizadas</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {bookings.filter(b => b.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-gray-600">{bookings.length} no total</p>
                </div>
              </CardContent>
            </Card>

            {/* Professores Disponíveis */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Professores Disponíveis</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{teachers.length}</p>
                  <p className="text-sm text-gray-600">Na sua região</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca e Filtros */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-meu-primary" />
                <CardTitle className="text-xl">Buscar Professores</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Cidade..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
                <Input
                  placeholder="Estado (ex: SP)..."
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value.toUpperCase())}
                  maxLength={2}
                />
                <Input
                  placeholder="Especialidade..."
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1 bg-meu-primary hover:bg-meu-primary-dark">
                    <Search className="h-4 w-4 mr-2" />
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

          {/* Professores Disponíveis */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                  Professores Disponíveis
                </CardTitle>
                <p className="text-sm text-gray-500">{teachers.length} professor(es) encontrado(s)</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teachers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum professor encontrado</p>
                  <p className="text-sm text-gray-400 mt-2">Tente ajustar os filtros de busca</p>
                  <Button onClick={handleClearFilters} className="mt-4">
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                teachers.map((teacher) => {
                  const profile = teacher.teacher_profiles?.[0]
                  const academy = teacher.academy_teachers?.[0]?.academies

                  return (
                    <div
                      key={teacher.id}
                      className="p-5 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-meu-primary/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="relative flex-shrink-0">
                            {teacher.avatar_url ? (
                              <img
                                src={teacher.avatar_url}
                                alt={teacher.name}
                                className="w-14 h-14 rounded-2xl object-cover shadow-lg"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {teacher.name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            {profile?.is_available && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-green-500" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-bold text-gray-900 text-lg">
                                {teacher.name}
                              </h4>
                              {profile?.is_available && (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  Disponível
                                </Badge>
                              )}
                            </div>

                            {profile?.bio && (
                              <p className="text-gray-600 mb-3 text-sm">{profile.bio}</p>
                            )}

                            {/* Especialidades */}
                            {profile?.specialties && profile.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {profile.specialties.map((specialty, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                              {academy && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-meu-primary" />
                                  <span>{academy.city}, {academy.state}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-bold text-gray-900">
                                  R$ {profile?.hourly_rate?.toFixed(2) || '0.00'}/hora
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleSelectTeacher(teacher)}
                          className="bg-meu-primary hover:bg-meu-primary-dark text-white"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Próximas Aulas */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                  Minhas Próximas Aulas
                </CardTitle>
                <p className="text-sm text-gray-500">{todayBookings.length} aula(s) hoje</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma aula agendada</p>
                  <p className="text-sm text-gray-400 mt-2">Agende sua primeira aula com um professor</p>
                </div>
              ) : (
                activeBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-5 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-meu-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="font-bold text-gray-900 text-lg">
                            {booking.teacher?.name || 'Professor'}
                          </h4>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-meu-primary" />
                            <span className="font-medium">
                              {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-meu-primary" />
                            <span>
                              {new Date(booking.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-meu-primary" />
                            <span>{booking.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-meu-primary" />
                            <span>{booking.credits_cost} créditos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Modal de Agendamento */}
      {showBookingModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Agendar Aula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Professor</p>
                <p className="font-semibold text-gray-900">{selectedTeacher.name}</p>
              </div>
              <p className="text-sm text-gray-500">
                Funcionalidade de agendamento em desenvolvimento.
                Entre em contato diretamente com o professor.
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
                  className="flex-1 bg-meu-primary hover:bg-meu-primary-dark"
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
