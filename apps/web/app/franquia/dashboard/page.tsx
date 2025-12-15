
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Shield,
  CreditCard,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore, Teacher, Student } from '@/lib/stores/franquia-store'
import TeacherModal from '@/components/modals/teacher-modal'
import StudentModal from '@/components/modals/student-modal'
import type { Teacher as LegacyTeacher, Student as LegacyStudent } from '@/lib/stores/franquia-store'
import NotificationsBell from '@/components/layout/notifications-bell'
import ConfirmDialog from '@/components/ui/confirm-dialog'

// Premium KPI Card Component (seguindo padrão Franqueadora)
const KPICard = ({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
}: {
  title: string
  value: string | number
  trend?: string
  trendLabel?: string
  icon: any
}) => (
  <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
    <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
    <div className="p-4 sm:p-6 pl-6 sm:pl-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-3">
        <span className="text-2xl sm:text-3xl font-bold text-meu-primary font-feature-settings-tnum tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 sm:mt-0 w-fit">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </span>
        )}
      </div>
      {trendLabel && (
        <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">{trendLabel}</p>
      )}
    </div>
  </Card>
)

// Tipos locais para compatibilidade com os Modais (que usam o store legado)
type ModalTeacher = {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  status: 'active' | 'inactive' | 'pending'
  studentsCount: number
  totalClasses: number
  earnings: number
  createdAt: string
}

type ModalStudent = {
  id: string
  name: string
  email: string
  phone: string
  credits: number
  status: 'active' | 'inactive'
  joinDate: string
  lastActivity: string
  planId?: string
}

export default function FranquiaDashboard() {
  const router = useRouter()
  const {
    franquiaUser,
    isAuthenticated,
    teachers,
    students,
    analytics,
    deleteTeacher,
    deleteStudent,
    fetchTeachers,
    fetchStudents,
    fetchAnalytics
  } = useFranquiaStore()
  const [activeTab] = useState<'overview' | 'teachers' | 'students' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar dados ao montar
  useEffect(() => {
    // Academia já vem do login via Supabase - não sobrescrever!

    // Buscar dados
    const loadData = async () => {
      await Promise.all([
        fetchTeachers(),
        fetchStudents()
      ])
      // Analytics depende dos dados de teachers e students
      await fetchAnalytics()
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modal states
  const [teacherModal, setTeacherModal] = useState<{
    isOpen: boolean
    teacher: ModalTeacher | null
    mode: 'add' | 'edit' | 'view'
  }>({ isOpen: false, teacher: null, mode: 'add' })

  const [studentModal, setStudentModal] = useState<{
    isOpen: boolean
    student: ModalStudent | null
    mode: 'add' | 'edit' | 'view'
  }>({ isOpen: false, student: null, mode: 'add' })

  // Confirmation modals state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'teacher' | 'student' | null
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: ''
  })


  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPIs Principais - Linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KPICard
                title="Total Alunos"
                value={students.length}
                trend={`${students.filter(s => s.status === 'active').length} ativos`}
                trendLabel="Alunos cadastrados"
                icon={Users}
              />

              <KPICard
                title="Professores"
                value={teachers.length}
                trend={`${teachers.filter(t => t.status === 'active').length} ativos`}
                trendLabel={teachers.filter(t => t.status === 'pending').length > 0 ? `${teachers.filter(t => t.status === 'pending').length} pendente(s)` : 'Equipe ativa'}
                icon={GraduationCap}
              />

              <KPICard
                title="Aulas Este Mês"
                value={analytics?.totalClasses || 0}
                trendLabel="Agendamentos válidos"
                icon={Calendar}
              />

              <KPICard
                title="Receita Mensal"
                value={`R$ ${analytics ? ((analytics.totalRevenue || 0) / 1000).toFixed(1) : '0'}k`}
                trendLabel="Faturamento estimado"
                icon={DollarSign}
              />
            </div>

            {/* KPIs Secundários - Linha 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KPICard
                title="Créditos Ativos"
                value={students.reduce((sum, s) => sum + s.credits, 0)}
                trendLabel="Em circulação"
                icon={CreditCard}
              />

              <KPICard
                title="Taxa de Ocupação"
                value={`${students.length > 0
                  ? ((students.filter(s => s.status === 'active').length / students.length) * 100).toFixed(0)
                  : '0'}%`}
                trendLabel="Alunos ativos"
                icon={Activity}
              />

              <KPICard
                title="Média Alunos/Prof"
                value={teachers.filter(t => t.status === 'active').length > 0
                  ? (students.filter(s => s.status === 'active').length / teachers.filter(t => t.status === 'active').length).toFixed(1)
                  : '0'}
                trendLabel="Distribuição"
                icon={BarChart3}
              />

              <KPICard
                title="Professores Ativos"
                value={teachers.filter(t => t.status === 'active').length}
                trendLabel={`de ${teachers.length} no total`}
                icon={GraduationCap}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Crescimento de Alunos</h3>
                <p className="text-sm text-gray-500 mb-4">Alunos cadastrados nos últimos 6 meses</p>
                {(() => {
                  const now = new Date()
                  const monthsData = []

                  for (let i = 5; i >= 0; i--) {
                    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

                    const count = students.filter(s => {
                      const joinDate = new Date(s.join_date)
                      return joinDate >= monthDate && joinDate < nextMonthDate
                    }).length

                    monthsData.push({
                      month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
                      count
                    })
                  }

                  const maxCount = Math.max(...monthsData.map(m => m.count), 1)

                  return (
                    <div className="h-56">
                      <div className="flex items-end justify-between h-full space-x-2">
                        {monthsData.map((data, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div className="w-full flex flex-col items-center justify-end h-full pb-8">
                              <span className="text-xs font-semibold text-blue-600 mb-1">
                                {data.count}
                              </span>
                              <div
                                className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500 hover:opacity-80"
                                style={{
                                  height: `${(data.count / maxCount) * 100}%`,
                                  minHeight: data.count > 0 ? '8px' : '0px'
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 capitalize mt-2">
                              {data.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Professores</h3>
                <p className="text-sm text-gray-500 mb-4">Ranking automático dos professores ativos com melhor desempenho.</p>
                <div className="space-y-3">
                  {teachers
                    .filter(t => t.status === 'active')
                    .map((teacher, index) => (
                      <div key={teacher.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{teacher.name}</p>
                            <p className="text-sm text-gray-600">{teacher.specialties?.join(', ') || 'Sem especialidades'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Comissão {typeof teacher.commission_rate === 'number' ? teacher.commission_rate : 0}%</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        )
      case 'teachers':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Professores</h2>
              <Button onClick={() => openTeacherModal('add')}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Professor
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar professores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="grid gap-6">
              {teachers.map((teacher) => (
                <Card key={teacher.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 mr-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                        {teacher.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                        <p className="text-gray-600">{teacher.specialties?.join(', ') || 'Sem especialidades'}</p>
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                          <span>{teacher.email}</span>
                          <span>{teacher.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge
                          variant={teacher.status === 'active' ? 'default' : teacher.status === 'pending' ? 'secondary' : 'destructive'}
                        >
                          {teacher.status === 'active' ? 'Ativo' : teacher.status === 'pending' ? 'Pendente' : 'Inativo'}
                        </Badge>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {typeof teacher.commission_rate === 'number' && (
                            <p>Comissão {teacher.commission_rate}%</p>
                          )}
                          <p>Desde {new Date(teacher.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTeacherModal('view', teacher)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTeacherModal('edit', teacher)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeacher(teacher)}
                          title="Excluir"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      case 'students':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Alunos</h2>
              <Button onClick={() => openStudentModal('add')}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Aluno
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar alunos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="grid gap-6">
              {students.map((student) => (
                <Card key={student.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 mr-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-medium">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                          <span>{student.email}</span>
                          <span>{student.phone}</span>
                        </div>
                        <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span className="whitespace-nowrap">Membro desde {new Date(student.join_date ?? Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge
                          variant={student.status === 'active' ? 'default' : 'secondary'}
                        >
                          {student.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-500" />
                            <span>{student.credits} créditos</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>Última atividade: {student.last_activity ? new Date(student.last_activity).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentModal('view', student)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentModal('edit', student)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student)}
                          title="Excluir"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>

            <div className="grid gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Academia</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Academia</label>
                    <Input value={franquiaUser?.name || ''} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Administrativo</label>
                    <Input value={franquiaUser?.email || ''} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                      <Input placeholder="Rua da Academia, 123" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <Input placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Sistema</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Taxa de Comissão</p>
                      <p className="text-sm text-gray-600">Percentual cobrado por aula</p>
                    </div>
                    <Input className="w-24" placeholder="15%" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Horário de Funcionamento</p>
                      <p className="text-sm text-gray-600">Segunda a Sexta</p>
                    </div>
                    <div className="flex space-x-2">
                      <Input className="w-20" placeholder="06:00" />
                      <span className="flex items-center">às</span>
                      <Input className="w-20" placeholder="22:00" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Administrativas</h3>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Gerenciar Permissões
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Exportar Relatórios
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Configurações Avançadas
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Aguarda montagem para evitar mismatch de hidratação
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  // Aguarda hidratação do store persistido antes de aplicar redirects
  const [storeHydrated, setStoreHydrated] = useState<boolean>(() => (useFranquiaStore as any)?.persist?.hasHydrated?.() ?? false)
  useEffect(() => {
    const p = (useFranquiaStore as any)?.persist
    // Se já estiver hidratado, marca imediatamente
    if (p?.hasHydrated?.()) setStoreHydrated(true)
    const unsub = p?.onFinishHydration?.(() => setStoreHydrated(true))
    return () => unsub?.()
  }, [])

  useEffect(() => {
    console.log('[DASHBOARD] Estado:', { hydrated, storeHydrated, isAuthenticated, franquiaUser: !!franquiaUser })
    if (!hydrated || !storeHydrated) return
    if (!isAuthenticated) {
      console.log('[DASHBOARD] Não autenticado, redirecionando para /franquia')
      router.replace('/franquia')
    } else {
      console.log('[DASHBOARD] Autenticado, permanecendo no dashboard')
    }
  }, [router, isAuthenticated, hydrated, storeHydrated, franquiaUser])


  // Mapeadores para modais
  const mapTeacherToModal = (t: Teacher): ModalTeacher => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone || '',
    specialty: Array.isArray(t.specialties) ? (t.specialties[0] || '') : '',
    status: t.status,
    studentsCount: 0,
    totalClasses: 0,
    earnings: 0,
    createdAt: t.created_at
  })

  const mapStudentToModal = (s: Student): ModalStudent => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone || '',
    credits: s.credits,
    status: s.status,
    joinDate: s.join_date,
    lastActivity: s.last_activity,
    planId: s.plan_id
  })

  // Teacher actions
  const openTeacherModal = (mode: 'add' | 'edit' | 'view', teacher?: Teacher) => {
    setTeacherModal({
      isOpen: true,
      teacher: teacher ? mapTeacherToModal(teacher) : null,
      mode
    })
  }

  const closeTeacherModal = () => {
    setTeacherModal({ isOpen: false, teacher: null, mode: 'add' })
  }

  const handleDeleteTeacher = (teacher: Teacher) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'teacher',
      id: teacher.id,
      name: teacher.name
    })
  }

  // Student actions
  const openStudentModal = (mode: 'add' | 'edit' | 'view', student?: Student) => {
    setStudentModal({
      isOpen: true,
      student: student ? mapStudentToModal(student) : null,
      mode
    })
  }

  const closeStudentModal = () => {
    setStudentModal({ isOpen: false, student: null, mode: 'add' })
  }

  const handleDeleteStudent = (student: Student) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'student',
      id: student.id,
      name: student.name
    })
  }

  const confirmDelete = () => {
    if (!deleteConfirm.type || !deleteConfirm.id) return

    if (deleteConfirm.type === 'teacher') {
      deleteTeacher(deleteConfirm.id)
      toast.success('Professor excluído com sucesso!')
    } else if (deleteConfirm.type === 'student') {
      deleteStudent(deleteConfirm.id)
      toast.success('Aluno excluído com sucesso!')
    }

    setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })
  }

  const handleCleanupOrphans = async () => {
    if (!franquiaUser?.academyId) {
      toast.error('Academia não identificada')
      return
    }

    try {
      // Usar URL relativa para aproveitar o rewrite do Next.js (evita CORS)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      // Primeiro validar
      const validateResp = await fetch(`/api/bookings/validate-orphans?franchise_id=${franquiaUser.academyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!validateResp.ok) {
        throw new Error('Erro ao validar órfãos')
      }

      const { orphans } = await validateResp.json()

      if (orphans.length === 0) {
        toast.success('Nenhum agendamento órfão encontrado')
        return
      }

      // Confirmar antes de deletar
      if (!confirm(`Encontrados ${orphans.length} agendamentos órfãos. Deseja excluí-los?`)) {
        return
      }

      // Deletar órfãos
      const deleteResp = await fetch(`${API_URL}/api/bookings/cleanup-orphans?franchise_id=${franquiaUser.academyId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!deleteResp.ok) {
        throw new Error('Erro ao excluir órfãos')
      }

      const result = await deleteResp.json()
      toast.success(`${result.deleted || orphans.length} agendamentos órfãos excluídos com sucesso`)

      // Recarregar analytics
      await fetchAnalytics()
    } catch (error: any) {
      console.error('[handleCleanupOrphans] Erro:', error)
      toast.error(error.message || 'Erro ao limpar agendamentos órfãos')
    }
  }

  if (!hydrated || !storeHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!franquiaUser) {
    return null
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto space-y-6 sm:space-y-10 mb-20">

      {/* Header Section - Premium Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-meu-primary/5 text-meu-primary text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
              Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Visão Geral
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Bem-vindo, {franquiaUser?.name || 'Admin'}. Acompanhe o desempenho da sua academia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button
            onClick={handleCleanupOrphans}
            variant="outline"
            size="sm"
            className="text-xs border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Órfãos
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 sm:space-y-6">
        {renderTabContent()}
      </div>

      <TeacherModal
        isOpen={teacherModal.isOpen}
        onClose={closeTeacherModal}
        teacher={teacherModal.teacher as unknown as LegacyTeacher}
        mode={teacherModal.mode}
      />

      <StudentModal
        isOpen={studentModal.isOpen}
        onClose={closeStudentModal}
        student={studentModal.student as unknown as LegacyStudent}
        mode={studentModal.mode}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })}
        onConfirm={confirmDelete}
        title={`Excluir ${deleteConfirm.type === 'teacher' ? 'Professor' : 'Aluno'}`}
        description={`Tem certeza que deseja excluir ${deleteConfirm.type === 'teacher' ? 'o professor' : 'o aluno'} "${deleteConfirm.name}"? Esta ação não poderá ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}
