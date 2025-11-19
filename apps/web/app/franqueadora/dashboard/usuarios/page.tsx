'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Search,
  Filter,
  Users,
  UserCheck,
  BookOpen,
  Calendar,
  MapPin,
  Mail,
  Phone,
  ChevronDown,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useFranqueadoraStore, User, UsersResponse } from '@/lib/stores/franqueadora-store'
import { toast } from 'sonner'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { ImageModal, ApprovalModal } from '@/components/franqueadora/approval-modals'

function UsuariosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { franqueadora, isAuthenticated, isLoading, fetchUsers, token, ensureFranqueadoraId, academies, fetchAcademies } =
    useFranqueadoraStore()

  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [academyFilter, setAcademyFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [approvalLoading, setApprovalLoading] = useState(false)
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

  const fetchUsuarios = useCallback(async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const data = await fetchUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        ...(roleFilter === 'teacher'
          ? {
              assigned:
                assignmentFilter === 'assigned'
                  ? 'assigned'
                  : assignmentFilter === 'unassigned'
                  ? 'unassigned'
                  : undefined,
              academy_id: academyFilter !== 'all' ? academyFilter : undefined,
            }
          : {})
      })

      if (data) {
        setUsersData({
          users: data.data,
          pagination: data.pagination
        })
        setPagination(data.pagination)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, fetchUsers, pagination.page, pagination.limit, search, roleFilter, statusFilter, assignmentFilter, academyFilter])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchUsuarios()
    }
  }, [hydrated, isAuthenticated, fetchUsuarios])

  // Deep-link: abrir detalhes do usuário via ?user_id=
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    const userId = searchParams?.get('user_id')
    if (!userId) return
    // se já temos a lista carregada, tentar abrir o modal
    const tryOpen = () => {
      const u = usersData.users.find(u => u.id === userId)
      if (u) {
        setSelectedUser(u)
        setShowUserDetails(true)
      }
    }
    tryOpen()
  }, [hydrated, isAuthenticated, searchParams, usersData.users])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    if (!academies || academies.length === 0) {
      fetchAcademies()
    }
  }, [hydrated, isAuthenticated, academies, fetchAcademies])

  const handleApproveUser = async () => {
    if (!selectedUser) return
    
    setApprovalLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao aprovar usuário')
      }

      toast.success('Profissional aprovado com sucesso!')
      setShowApprovalModal(false)
      await fetchUsuarios() // Recarregar lista
    } catch {
      toast.error('Erro ao aprovar profissional')
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleRejectUser = async () => {
    if (!selectedUser) return
    
    setApprovalLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao reprovar usuário')
      }

      toast.success('Profissional reprovado')
      setShowApprovalModal(false)
      await fetchUsuarios() // Recarregar lista
    } catch {
      toast.error('Erro ao reprovar profissional')
    } finally {
      setApprovalLoading(false)
    }
  }

  const getApprovalStatusBadge = (status?: string, role?: string) => {
    // Alunos não precisam de aprovação - status sempre é aprovado
    const isStudent = role === 'STUDENT' || role === 'ALUNO'
    if (isStudent) {
      return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
    }

    // Professores precisam de aprovação
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Reprovado</Badge>
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
    }
  }

  const formatarCPF = (cpf?: string) => {
    if (!cpf) return '—'
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
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

  const hasEmailInfo = (user: User) => {
    return Boolean(user.email && user.email.trim().length > 0)
  }

  const hasPhoneInfo = (user: User) => {
    return Boolean(user.phone && user.phone.trim().length > 0)
  }

  const getEmailStatusValue = (user: User) => {
    if (user.email_verified) return 'Sim (verificado)'
    return hasEmailInfo(user) ? 'Sim' : 'Não'
  }

  const getPhoneStatusValue = (user: User) => {
    if (user.phone_verified) return 'Sim (verificado)'
    return hasPhoneInfo(user) ? 'Sim' : 'Não'
  }

  const handleExportUsuarios = async () => {
    if (exporting) return
    if (!usersData.pagination.total) {
      toast.info('Nenhum usuário para exportar.')
      return
    }

    setExporting(true)

    try {
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule.default || xlsxModule
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      let franqueadoraId: string | null = franqueadora?.id ?? null
      if (!franqueadoraId) {
        franqueadoraId = await ensureFranqueadoraId()
      }

      if (!franqueadoraId) {
        toast.error('Não foi possível identificar a franqueadora.')
        return
      }

      const limit = pagination.limit || 20
      let totalPages = pagination.totalPages || 1
      let totalExpected = usersData.pagination.total || 0
      const resolvedFranqueadoraId = franqueadoraId as string
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

      const fetchPage = async (page: number): Promise<UsersResponse> => {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('limit', limit.toString())
        params.set('franqueadora_id', resolvedFranqueadoraId)
        if (search) params.set('search', search)
        if (roleFilter !== 'all') params.set('role', roleFilter)
        if (roleFilter === 'teacher') {
          if (assignmentFilter === 'assigned') params.set('assigned', 'true')
          if (assignmentFilter === 'unassigned') params.set('assigned', 'false')
          if (academyFilter !== 'all') params.set('academy_id', academyFilter)
        }

        if (statusFilter === 'active') params.set('user_active', 'true')
        if (statusFilter === 'inactive') params.set('user_active', 'false')

        const response = await fetch(`${API_URL}/api/franqueadora/contacts?${params.toString()}`, {
          credentials: 'include',
          headers: authHeaders
        })

        if (!response.ok) {
          throw new Error('Falha ao buscar usuários para exportação.')
        }

        const payload = await response.json()
        const contacts: any[] = Array.isArray(payload.data) ? payload.data : []
        const mappedUsers: User[] = contacts.map((c) => ({
          id: c.user?.id || c.id,
          name: c.user?.name || '',
          email: c.user?.email || '',
          phone: c.user?.phone || '',
          cpf: c.user?.cpf || '',
          cref: c.user?.cref || '',
          role: c.user?.role || 'STUDENT',
          avatar_url: c.user?.avatar_url,
          cref_card_url: c.user?.cref_card_url,
          approval_status: c.user?.approval_status || 'pending',
          approved_at: c.user?.approved_at,
          approved_by: c.user?.approved_by,
          created_at: c.user?.created_at || new Date().toISOString(),
          updated_at: c.user?.updated_at || new Date().toISOString(),
          last_login_at: c.user?.last_login_at,
          active: c.user?.is_active ?? true,
          email_verified: c.user?.email_verified ?? false,
          phone_verified: c.user?.phone_verified ?? false,
          franchisor_id: c.user?.franchisor_id,
          franchise_id: c.user?.franchise_id,
          teacher_profiles: c.user?.teacher_profiles || [],
          student_profiles: c.user?.student_profiles || [],
          operational_links: c.user?.operational_links || undefined,
          booking_stats: c.user?.booking_stats || undefined,
          balance_info: c.user?.balance_info || undefined,
          hours_info: c.user?.hours_info || undefined,
        }))

        return {
          data: mappedUsers,
          pagination: payload.pagination || { page, limit, total: mappedUsers.length, totalPages: 1 }
        }
      }

      const allUsers: User[] = []

      for (let page = 1; page <= totalPages; page++) {
        const pageResult = await fetchPage(page)
        if (page === 1) {
          totalPages = pageResult.pagination.totalPages
          totalExpected = pageResult.pagination.total
        }

        if (pageResult.data?.length) {
          allUsers.push(...pageResult.data)
        }

        if (!pageResult.data?.length || (totalExpected && allUsers.length >= totalExpected)) {
          break
        }
      }

      if (!allUsers.length) {
        toast.info('Nenhum usuário encontrado para exportar.')
        return
      }

      const headers = [
        'Nome',
        'Email',
        'Telefone',
        'CPF',
        'Tipo',
        'Status',
        'Email cadastrado',
        'Telefone cadastrado',
        'Último Acesso',
        'Criado em'
      ]

      const rows = [
        headers,
        ...allUsers.map((usuario) => [
          usuario.name || '',
          usuario.email || '',
          usuario.phone ? formatarTelefone(usuario.phone) : '',
          usuario.cpf ? formatarCPF(usuario.cpf) : '',
          getRoleLabel(usuario.role),
          usuario.active ? 'Ativo' : 'Inativo',
          getEmailStatusValue(usuario),
          getPhoneStatusValue(usuario),
          usuario.last_login_at ? formatarData(usuario.last_login_at) : 'Nunca',
          formatarData(usuario.created_at)
        ])
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários')

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Usuários exportados com sucesso!')
    } catch {
      toast.error('Erro ao exportar usuários.')
    } finally {
      setExporting(false)
    }
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 lg:mt-0">
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

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportUsuarios}
              disabled={!usersData.pagination.total || exporting}
            >
              <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                  <p className="text-2xl font-bold text-gray-900">{usersData.users.filter(u => u.active).length}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{usersData.users.filter(u => u.role === 'TEACHER' || u.role === 'PROFESSOR').length}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{usersData.users.filter(u => u.role === 'STUDENT' || u.role === 'ALUNO').length}</p>
                </div>
              </div>
            </Card>
          </div>

          {showFilters && (
            <Card className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </span>
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                      placeholder="Nome ou email..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuário</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => { const v = e.target.value; setRoleFilter(v); setPagination(prev => ({ ...prev, page: 1 })); if (v !== 'teacher') { setAssignmentFilter('all'); setAcademyFilter('all') } }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="teacher">Professores</option>
                    <option value="student">Alunos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Atribuição (apenas Professor)</label>
                  <select
                    value={assignmentFilter}
                    onChange={(e) => { setAssignmentFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                    disabled={roleFilter !== 'teacher'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent disabled:opacity-50"
                  >
                    <option value="all">Todos</option>
                    <option value="assigned">Atribuídos</option>
                    <option value="unassigned">Não atribuídos</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academia (apenas Professor)</label>
                  <select
                    value={academyFilter}
                    onChange={(e) => { setAcademyFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                    disabled={roleFilter !== 'teacher'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent disabled:opacity-50"
                  >
                    <option value="all">Todas</option>
                    {academies?.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}

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
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CREF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-meu-primary mr-2" />
                          <span className="text-gray-600">Carregando usuários...</span>
                        </div>
                      </td>
                    </tr>
                  ) : usersData.users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhum usuário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10">
                              {usuario.avatar_url ? (
                                <Image
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={usuario.avatar_url}
                                  alt={usuario.name}
                                  width={40}
                                  height={40}
                                  unoptimized
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {usuario.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {usuario.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatarCPF(usuario.cpf)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usuario.cref || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getRoleColor(usuario.role)}>
                            {getRoleLabel(usuario.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getApprovalStatusBadge(usuario.approval_status, usuario.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => {
                                if (!usuario.cref_card_url) return
                                setSelectedUser(usuario)
                                setShowImageModal(true)
                              }}
                              disabled={!usuario.cref_card_url}
                              className={`transition-colors ${
                                usuario.cref_card_url
                                  ? 'text-blue-600 hover:text-blue-800 cursor-pointer'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={usuario.cref_card_url ? 'Ver carteirinha CREF' : 'Sem carteirinha CREF'}
                            >
                              <ImageIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                const isTeacher = usuario.role === 'TEACHER' || usuario.role === 'PROFESSOR'
                                const canApprove = isTeacher && (usuario.approval_status === 'pending' || usuario.approval_status === 'rejected')
                                if (!canApprove) return
                                setSelectedUser(usuario)
                                setApprovalAction('approve')
                                setShowApprovalModal(true)
                              }}
                              disabled={
                                (usuario.role !== 'TEACHER' && usuario.role !== 'PROFESSOR') || 
                                (usuario.approval_status !== 'pending' && usuario.approval_status !== 'rejected')
                              }
                              className={`transition-colors ${
                                (usuario.role === 'TEACHER' || usuario.role === 'PROFESSOR') && 
                                (usuario.approval_status === 'pending' || usuario.approval_status === 'rejected')
                                  ? 'text-green-600 hover:text-green-800 cursor-pointer'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={
                                usuario.role === 'STUDENT' || usuario.role === 'ALUNO'
                                  ? 'Alunos não precisam de aprovação'
                                  : usuario.role !== 'TEACHER' && usuario.role !== 'PROFESSOR'
                                  ? 'Aprovação apenas para professores'
                                  : usuario.approval_status === 'approved'
                                  ? 'Já aprovado'
                                  : 'Aprovar profissional'
                              }
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                const isTeacher = usuario.role === 'TEACHER' || usuario.role === 'PROFESSOR'
                                const canReject = isTeacher && usuario.approval_status === 'pending'
                                if (!canReject) return
                                setSelectedUser(usuario)
                                setApprovalAction('reject')
                                setShowApprovalModal(true)
                              }}
                              disabled={
                                (usuario.role !== 'TEACHER' && usuario.role !== 'PROFESSOR') || 
                                usuario.approval_status !== 'pending'
                              }
                              className={`transition-colors ${
                                (usuario.role === 'TEACHER' || usuario.role === 'PROFESSOR') && 
                                usuario.approval_status === 'pending'
                                  ? 'text-red-600 hover:text-red-800 cursor-pointer'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={
                                usuario.role === 'STUDENT' || usuario.role === 'ALUNO'
                                  ? 'Alunos não precisam de aprovação'
                                  : usuario.role !== 'TEACHER' && usuario.role !== 'PROFESSOR'
                                  ? 'Reprovação apenas para professores'
                                  : usuario.approval_status === 'pending'
                                  ? 'Reprovar profissional'
                                  : 'Apenas professores pendentes podem ser reprovados'
                              }
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(usuario)
                                setShowUserDetails(true)
                              }}
                              className="text-gray-600 hover:text-gray-800 transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </div>
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
                  {/* Ficha do Usuário - Cabeçalho compacto */}
                  <div className="flex items-center gap-4 p-4 border rounded bg-gray-50">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {selectedUser.avatar_url ? (
                        <Image src={selectedUser.avatar_url} alt={selectedUser.name} width={48} height={48} className="h-12 w-12 object-cover" />
                      ) : (
                        <span className="text-gray-700 font-semibold">
                          {(selectedUser.name || '').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-gray-900">{selectedUser.name}</span>
                        <Badge className={getRoleColor(selectedUser.role)}>
                          {getRoleLabel(selectedUser.role)}
                        </Badge>
                        <Badge className={getStatusColor(selectedUser.active)}>
                          {getStatusLabel(selectedUser.active)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{selectedUser.email}</span>
                        <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{formatarTelefone(selectedUser.phone)}</span>
                        {selectedUser.cpf && (
                          <span className="flex items-center gap-1">CPF: <span title={selectedUser.cpf}>{formatarCPF(selectedUser.cpf)}</span></span>
                        )}
                        {selectedUser.cref && (
                          <span className="flex items-center gap-1">CREF: {selectedUser.cref}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informações Básicas */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Informações Básicas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-500">CPF</label>
                        <p className="text-sm font-medium text-gray-900" title={selectedUser.cpf || ''}>{selectedUser.cpf ? formatarCPF(selectedUser.cpf) : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500">CREF</label>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.cref || '—'}</p>
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
                      {selectedUser.cref_card_url && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedUser.cref_card_url!, '_blank')}
                          >
                            Ver carteirinha CREF
                          </Button>
                        </div>
                      )}
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

          {/* Modal de Imagem CREF */}
          {selectedUser && (
            <ImageModal
              isOpen={showImageModal}
              onClose={() => setShowImageModal(false)}
              imageUrl={selectedUser.cref_card_url || ''}
              userName={selectedUser.name}
            />
          )}

          {/* Modal de Aprovação/Reprovação */}
          {selectedUser && (
            <ApprovalModal
              isOpen={showApprovalModal}
              onClose={() => setShowApprovalModal(false)}
              onConfirm={approvalAction === 'approve' ? handleApproveUser : handleRejectUser}
              user={selectedUser}
              action={approvalAction}
              loading={approvalLoading}
            />
          )}
      </div>
    </FranqueadoraGuard>
  )
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <UsuariosPageContent />
    </Suspense>
  )
}
