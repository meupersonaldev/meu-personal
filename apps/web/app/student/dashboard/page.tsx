'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentStore, Teacher } from '@/lib/stores/student-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  MapPin,
  Star,
  Calendar,
  DollarSign,
  Filter,
  User,
  LogOut,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function StudentDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const {
    teachers,
    bookings,
    loading,
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
      router.push('/login')
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

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
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
        {status}
      </Badge>
    )
  }

  if (loading && teachers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard do Aluno</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Créditos */}
            <Card className="px-4 py-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Créditos</p>
                <p className="text-lg font-bold text-gray-900">{user?.credits || 0}</p>
              </div>
            </Card>

            {/* Comprar Créditos */}
            <Button
              onClick={() => router.push('/student/plans')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Comprar Créditos
            </Button>

            {/* Perfil */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-red-100 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Busca e Filtros */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Buscar Professores</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Cidade..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Estado (ex: SP)..."
              value={searchState}
              onChange={(e) => setSearchState(e.target.value.toUpperCase())}
              maxLength={2}
              className="flex-1"
            />
            <Input
              placeholder="Especialidade..."
              value={searchSpecialty}
              onChange={(e) => setSearchSpecialty(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpar
              </Button>
            </div>
          </div>

          {(cityFilter || stateFilter || specialtyFilter) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Filtros ativos:</span>
              {cityFilter && (
                <Badge variant="secondary">
                  Cidade: {cityFilter}
                </Badge>
              )}
              {stateFilter && (
                <Badge variant="secondary">
                  Estado: {stateFilter}
                </Badge>
              )}
              {specialtyFilter && (
                <Badge variant="secondary">
                  Especialidade: {specialtyFilter}
                </Badge>
              )}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Professores */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Professores Disponíveis ({teachers.length})
            </h2>

            {teachers.length === 0 ? (
              <Card className="p-12 text-center">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum professor encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Tente ajustar os filtros de busca
                </p>
                <Button onClick={handleClearFilters}>
                  Limpar Filtros
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {teachers.map((teacher) => {
                  const profile = teacher.teacher_profiles?.[0]
                  const academy = teacher.academy_teachers?.[0]?.academies

                  return (
                    <Card key={teacher.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {teacher.avatar_url ? (
                              <img
                                src={teacher.avatar_url}
                                alt={teacher.name}
                                className="h-16 w-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-8 w-8 text-blue-600" />
                              </div>
                            )}
                          </div>

                          {/* Informações */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {teacher.name}
                              </h3>
                              {profile?.is_available && (
                                <Badge className="bg-green-100 text-green-800">
                                  Disponível
                                </Badge>
                              )}
                            </div>

                            {profile?.bio && (
                              <p className="text-gray-600 mb-3">{profile.bio}</p>
                            )}

                            {/* Especialidades */}
                            {profile?.specialties && profile.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {profile.specialties.map((specialty, index) => (
                                  <Badge key={index} variant="secondary">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Localização */}
                            {academy && (
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {academy.city}, {academy.state}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  {profile?.rating?.toFixed(1) || 'N/A'} ({profile?.total_reviews || 0} avaliações)
                                </div>
                              </div>
                            )}

                            {/* Preço */}
                            <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              R$ {profile?.hourly_rate?.toFixed(2) || '0.00'}/hora
                            </div>
                          </div>
                        </div>

                        {/* Botão Agendar */}
                        <Button
                          onClick={() => handleSelectTeacher(teacher)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar Aula
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Meus Agendamentos */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Meus Agendamentos
            </h2>

            {bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Você ainda não tem agendamentos
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {booking.teacher?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Duração: {booking.duration} min</p>
                      <p>Créditos: {booking.credits_cost}</p>
                    </div>
                  </Card>
                ))}

                {bookings.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/student/bookings')}
                  >
                    Ver Todos os Agendamentos
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Agendamento (simplificado) */}
      {showBookingModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Agendar Aula</h3>
            <p className="text-gray-600 mb-4">
              Professor: {selectedTeacher.name}
            </p>
            <p className="text-sm text-gray-500 mb-6">
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
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}