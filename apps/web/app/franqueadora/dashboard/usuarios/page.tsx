'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Award,
  Clock,
  DollarSign,
  ChevronDown,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useFranqueadoraStore, User } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

export default function UsuariosPage() {
  const router = useRouter()
  const { user, franqueadora, isAuthenticated, isLoading, users, fetchUsers } = useFranqueadoraStore()

  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [usersData, setUsersData] = useState<{ users: User[], pagination: any }>({
    users: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
  })

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/franqueadora')
    }
  }, [router, isAuthenticated, hydrated])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchUsuarios()
    }
  }, [hydrated, isAuthenticated, search, roleFilter, statusFilter, pagination.page])

  const fetchUsuarios = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const data = await fetchUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })

      if (data) {
        setUsersData({
          users: data.data,
          pagination: data.pagination
        })
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatarCPF = (cpf?: string) => {
    if (!cpf) return 'Não informado'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatarTelefone = (phone?: string) => {
    if (!phone) return 'Não informado'
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const formatarData = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'TEACHER':
      case 'PROFESSOR':
        return 'Professor'
      case 'STUDENT':
      case 'ALUNO':
        return 'Aluno'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEACHER':
      case 'PROFESSOR':
        return 'bg-blue-100 text-blue-800'
      case 'STUDENT':
      case 'ALUNO':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getStatusLabel = (active: boolean) => {
    return active ? 'Ativo' : 'Inativo'
  }

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Usuários</p>
              <h1 className="text-3xl font-bold text-gray-900">
                Usuários Cadastrados — {franqueadora?.name || 'Franqueadora'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Total de {usersData.pagination.total} usuários encontrados
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsuarios}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <Card className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome, email ou telefone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Usuário
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="teacher">Professores</option>
                    <option value="student">Alunos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{usersData.pagination.total}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usersData.users.filter(u => u.active).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Professores</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usersData.users.filter(u => u.role === 'TEACHER' || u.role === 'PROFESSOR').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alunos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usersData.users.filter(u => u.role === 'STUDENT' || u.role === 'ALUNO').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabela de Usuários */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agendamentos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Acesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-meu-primary mr-2" />
                          <span className="text-gray-600">Carregando usuários...</span>
                        </div>
                      </td>
                    </tr>
                  ) : usersData.users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Nenhum usuário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {usuario.avatar_url ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={usuario.avatar_url}
                                  alt={usuario.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {usuario.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                CPF: {formatarCPF(usuario.cpf)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getRoleColor(usuario.role)}>
                            {getRoleLabel(usuario.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center mb-1">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              {usuario.email}
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {formatarTelefone(usuario.phone)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(usuario.active)}>
                            {getStatusLabel(usuario.active)}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {usuario.email_verified ? '✓ Email' : '✗ Email'}
                            {usuario.phone_verified ? ' / ✓ Telefone' : ' / ✗ Telefone'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center justify-between mb-1">
                              <span>Total:</span>
                              <span className="font-medium">{usuario.booking_stats?.total || 0}</span>
                            </div>
                            <div className="flex space-x-2 text-xs">
                              <span className="text-green-600">
                                ✓ {usuario.booking_stats?.completed || 0}
                              </span>
                              <span className="text-yellow-600">
                                ⏳ {usuario.booking_stats?.pending || 0}
                              </span>
                              <span className="text-red-600">
                                ✗ {usuario.booking_stats?.cancelled || 0}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarData(usuario.last_login_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(usuario)
                              setShowUserDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {usersData.pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próximo
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, usersData.pagination.total)}
                      </span>{' '}
                      de <span className="font-medium">{usersData.pagination.total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-l-md"
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                      >
                        Anterior
                      </Button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Página {pagination.page} de {usersData.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-r-md"
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Próximo
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Modal de Detalhes do Usuário */}
          {showUserDetails && selectedUser && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalhes do Usuário
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserDetails(false)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Informações Básicas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-500">Nome</label>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Email</label>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Telefone</label>
                        <p className="text-sm font-medium text-gray-900">{formatarTelefone(selectedUser.phone)}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">CPF</label>
                        <p className="text-sm font-medium text-gray-900">{formatarCPF(selectedUser.cpf)}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Tipo</label>
                        <Badge className={getRoleColor(selectedUser.role)}>
                          {getRoleLabel(selectedUser.role)}
                        </Badge>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Status</label>
                        <Badge className={getStatusColor(selectedUser.active)}>
                          {getStatusLabel(selectedUser.active)}
                        </Badge>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Data de Cadastro</label>
                        <p className="text-sm font-medium text-gray-900">{formatarData(selectedUser.created_at)}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">Último Acesso</label>
                        <p className="text-sm font-medium text-gray-900">{formatarData(selectedUser.last_login_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Perfil do Professor */}
                  {selectedUser.teacher_profiles && selectedUser.teacher_profiles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Perfil do Professor</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.teacher_profiles.map((profile) => (
                          <div key={profile.id} className="space-y-2">
                            {profile.specialization && (
                              <div>
                                <label className="block text-sm text-gray-500">Especialização</label>
                                <p className="text-sm font-medium text-gray-900">{profile.specialization}</p>
                              </div>
                            )}
                            {profile.graduation && (
                              <div>
                                <label className="block text-sm text-gray-500">Formação</label>
                                <p className="text-sm font-medium text-gray-900">{profile.graduation}</p>
                              </div>
                            )}
                            {profile.cref && (
                              <div>
                                <label className="block text-sm text-gray-500">CREF</label>
                                <p className="text-sm font-medium text-gray-900">{profile.cref}</p>
                              </div>
                            )}
                            {profile.hourly_rate && (
                              <div>
                                <label className="block text-sm text-gray-500">Valor Hora</label>
                                <p className="text-sm font-medium text-gray-900">
                                  R$ {profile.hourly_rate.toFixed(2)}
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="block text-sm text-gray-500">Disponibilidade</label>
                              <div className="flex space-x-2">
                                {profile.available_online && (
                                  <Badge className="bg-blue-100 text-blue-800">Online</Badge>
                                )}
                                {profile.available_in_person && (
                                  <Badge className="bg-green-100 text-green-800">Presencial</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Perfil do Aluno */}
                  {selectedUser.student_profiles && selectedUser.student_profiles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Perfil do Aluno</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUser.student_profiles.map((profile) => (
                          <div key={profile.id} className="space-y-2">
                            {profile.goal && (
                              <div>
                                <label className="block text-sm text-gray-500">Objetivo</label>
                                <p className="text-sm font-medium text-gray-900">{profile.goal}</p>
                              </div>
                            )}
                            {profile.fitness_level && (
                              <div>
                                <label className="block text-sm text-gray-500">Nível de Fitness</label>
                                <p className="text-sm font-medium text-gray-900">{profile.fitness_level}</p>
                              </div>
                            )}
                            {profile.emergency_contact && (
                              <div>
                                <label className="block text-sm text-gray-500">Contato de Emergência</label>
                                <p className="text-sm font-medium text-gray-900">
                                  {profile.emergency_contact} - {profile.emergency_phone}
                                </p>
                              </div>
                            )}
                            {profile.health_conditions && (
                              <div>
                                <label className="block text-sm text-gray-500">Condições de Saúde</label>
                                <p className="text-sm font-medium text-gray-900">{profile.health_conditions}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vínculos Operacionais */}
                  {selectedUser.operational_links && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Vínculos Operacionais</h4>
                      <div className="space-y-3">
                        {selectedUser.operational_links.professor_units &&
                         selectedUser.operational_links.professor_units.length > 0 && (
                          <div>
                            <label className="block text-sm text-gray-500 mb-2">Unidades como Professor</label>
                            <div className="space-y-1">
                              {selectedUser.operational_links.professor_units.map((unit) => (
                                <div key={unit.unit_id} className="flex items-center text-sm">
                                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                  {unit.units.name} - {unit.units.city}/{unit.units.state}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedUser.operational_links.student_units &&
                         selectedUser.operational_links.student_units.length > 0 && (
                          <div>
                            <label className="block text-sm text-gray-500 mb-2">Unidades como Aluno</label>
                            <div className="space-y-1">
                              {selectedUser.operational_links.student_units.map((unit) => (
                                <div key={unit.unit_id} className="text-sm">
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                    {unit.units.name} - {unit.units.city}/{unit.units.state}
                                  </div>
                                  <div className="ml-4 text-xs text-gray-500">
                                    {unit.total_bookings} agendamentos •
                                    Último: {formatarData(unit.last_booking_date)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Estatísticas de Agendamentos */}
                  {selectedUser.booking_stats && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Estatísticas de Agendamentos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-2xl font-bold text-gray-900">{selectedUser.booking_stats.total}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded">
                          <p className="text-2xl font-bold text-green-600">{selectedUser.booking_stats.completed}</p>
                          <p className="text-xs text-green-600">Concluídos</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded">
                          <p className="text-2xl font-bold text-yellow-600">{selectedUser.booking_stats.pending}</p>
                          <p className="text-xs text-yellow-600">Pendentes</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded">
                          <p className="text-2xl font-bold text-red-600">{selectedUser.booking_stats.cancelled}</p>
                          <p className="text-xs text-red-600">Cancelados</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações de Saldo (Alunos) */}
                  {selectedUser.balance_info && selectedUser.balance_info.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Saldo de Aulas</h4>
                      <div className="space-y-3">
                        {selectedUser.balance_info.map((balance) => (
                          <div key={balance.unit_id} className="border rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{balance.units.name}</span>
                              <span className="text-xs text-gray-500">
                                {balance.units.city}/{balance.units.state}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="block text-xs text-gray-500">Compradas</label>
                                <p className="font-medium">{balance.total_purchased}</p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Consumidas</label>
                                <p className="font-medium">{balance.total_consumed}</p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Disponíveis</label>
                                <p className="font-medium text-green-600">
                                  {balance.total_purchased - balance.total_consumed - balance.locked_qty}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informações de Horas (Professores) */}
                  {selectedUser.hours_info && selectedUser.hours_info.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Saldo de Horas</h4>
                      <div className="space-y-3">
                        {selectedUser.hours_info.map((hours) => (
                          <div key={hours.unit_id} className="border rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{hours.units.name}</span>
                              <span className="text-xs text-gray-500">
                                {hours.units.city}/{hours.units.state}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="block text-xs text-gray-500">Total</label>
                                <p className="font-medium">{hours.total_hours}</p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Disponíveis</label>
                                <p className="font-medium text-green-600">{hours.available_hours}</p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Bloqueadas</label>
                                <p className="font-medium text-yellow-600">{hours.locked_hours}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <Button variant="outline" onClick={() => setShowUserDetails(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>
    </FranqueadoraGuard>
  )
}
