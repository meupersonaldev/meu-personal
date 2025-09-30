
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Shield,
  BarChart3,
  Bell
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

// Tipos locais para compatibilidade com os Modais (que usam o store legado)
type ModalTeacher = {
  id: string
  name: string
  email: string
  phone: string
  specialty: string
  status: 'active' | 'inactive' | 'pending'
  studentsCount: number
  rating: number
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
    fetchAnalytics,
    setAcademy
  } = useFranquiaStore()
  const [activeTab] = useState<'overview' | 'teachers' | 'students' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar dados ao montar
  useEffect(() => {
    console.log('Dashboard useEffect executado')
    console.log('fetchTeachers:', fetchTeachers)
    console.log('fetchStudents:', fetchStudents)
    
    // Configurar academia (hardcoded por enquanto - depois pegar do auth)
    setAcademy({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Academia FitLife - Centro',
      email: 'admin@fitlife.com',
      is_active: true
    })

    // Buscar dados
    console.log('Chamando fetchTeachers...')
    fetchTeachers()
    console.log('Chamando fetchStudents...')
    fetchStudents()
    console.log('Chamando fetchAnalytics...')
    fetchAnalytics()
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


  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Alunos</p>
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                    <p className="text-sm text-green-600">+{analytics?.monthlyGrowth ?? 0}% este mês</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <GraduationCap className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Professores</p>
                    <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                    <p className="text-sm text-emerald-600">{teachers.filter(t => t.status === 'active').length} ativos, {teachers.filter(t => t.status === 'pending').length} pendente</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Aulas Este Mês</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalClasses || 0}</p>
                    <p className="text-sm text-purple-600">+{analytics?.monthlyGrowth ?? 0}% vs mês anterior</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Estimada</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {analytics ? ((analytics.totalRevenue || 0) / 1000).toFixed(1) : '0'}k</p>
                    <p className="text-sm text-amber-600">+{analytics?.monthlyGrowth ?? 0}% este mês</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aulas por Dia</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Gráfico de Aulas Diárias</p>
                  </div>
                </div>
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
                          <p className="text-sm text-gray-600">⭐ {typeof teacher.rating === 'number' ? teacher.rating : 'N/A'}</p>
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
                          <p>⭐ {typeof teacher.rating === 'number' ? teacher.rating : 'N/A'}</p>
                          {typeof teacher.commission_rate === 'number' && (
                            <p>Comissão {teacher.commission_rate}%</p>
                          )}
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
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                          <span>📅 Membro desde {new Date(student.join_date ?? Date.now()).toLocaleDateString()}</span>
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
                          <p>💳 {student.credits} créditos</p>
                          <p>🕒 Última atividade: {student.last_activity ? new Date(student.last_activity).toLocaleDateString() : 'N/A'}</p>
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

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/franquia')
    }
  }, [router, isAuthenticated, hydrated])


  // Mapeadores para modais
  const mapTeacherToModal = (t: Teacher): ModalTeacher => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone || '',
    specialty: Array.isArray(t.specialties) ? (t.specialties[0] || '') : '',
    status: t.status,
    studentsCount: 0,
    rating: typeof t.rating === 'number' ? t.rating : 0,
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
    if (confirm(`Tem certeza que deseja excluir o professor ${teacher.name}?`)) {
      deleteTeacher(teacher.id)
      toast.success('Professor excluído com sucesso!')
    }
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
    if (confirm(`Tem certeza que deseja excluir o aluno ${student.name}?`)) {
      deleteStudent(student.id)
      toast.success('Aluno excluído com sucesso!')
    }
  }

  if (!hydrated) {
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
    console.error('No franquia user found in store')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8">
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard da Franquia</h1>
                <p className="text-sm text-gray-600">Bem-vindo, Admin Meu Personal</p>
              </div>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Painel</p>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard da Franquia</h1>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>

        <div className="space-y-6">
          {renderTabContent()}
        </div>
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
    </div>
  )
}
