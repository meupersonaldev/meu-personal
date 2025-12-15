'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Activity,
  X
} from 'lucide-react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

export default function AlunosPage() {
  const { students, fetchStudents, addStudent, updateStudent, deleteStudent } = useFranquiaStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Carregar dados ao montar
  useEffect(() => {
    // Academy já vem do login via store - não precisa setar manualmente
    fetchStudents().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    avatar_url: ''
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Removido: função fetchStudents local - agora usa do store

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && student.status === 'active') ||
      (statusFilter === 'inactive' && student.status === 'inactive')

    return matchesSearch && matchesStatus
  })

  const activeStudents = students.filter(s => s.status === 'active').length
  const inactiveStudents = students.filter(s => s.status === 'inactive').length
  const totalCredits = students.reduce((sum, s) => sum + (s.credits || 0), 0)

  const getStatusBadge = (student: any) => {
    if (student.status === 'inactive') {
      return <Badge variant="destructive">Inativo</Badge>
    }

    if (student.status === 'active') {
      return <Badge variant="default" className="bg-green-500">Ativo</Badge>
    }

    return <Badge variant="outline">Pendente</Badge>
  }

  const handleEditStudent = (student: any) => {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      cpf: student.cpf || '',
      avatar_url: student.avatar_url || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    setCreateLoading(true)
    try {
      const success = await updateStudent(selectedStudent.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: selectedStudent.status
      })

      if (success) {
        setShowEditModal(false)
        setSelectedStudent(null)
        setFormData({ name: '', email: '', phone: '', cpf: '', avatar_url: '' })
        toast.success('Aluno atualizado com sucesso!')
      } else {
        toast.error('Erro ao atualizar aluno')
      }
    } catch (error) {
      toast.error('Erro ao atualizar aluno')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    toast('Tem certeza que deseja excluir este aluno?', {
      description: 'Esta ação não pode ser desfeita.',
      action: {
        label: 'Excluir',
        onClick: async () => {
          const success = await deleteStudent(studentId)
          if (success) {
            toast.success('Aluno excluído com sucesso!')
          } else {
            toast.error('Erro ao excluir aluno')
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { }
      }
    })
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const studentData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        cpf: formData.cpf || '',
        credits: 0,
        status: 'active' as const,
        join_date: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }

      const result = await addStudent(studentData) as any

      if (result?.success || result === true) {
        setShowCreateModal(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          cpf: '',
          avatar_url: ''
        })
        
        // Feedback sobre o email
        if (result?.emailSent) {
          toast.success(`Aluno criado com sucesso! Email enviado para ${formData.email}`)
        } else if (result?.temporaryPassword) {
          toast.warning(`Aluno criado, mas não foi possível enviar o email. Senha temporária: ${result.temporaryPassword}`, {
            duration: 10000
          })
        } else {
          toast.success('Aluno criado com sucesso!')
        }
      } else {
        toast.error(result?.error || 'Erro ao criar aluno')
      }
    } catch (error) {
      toast.error('Erro ao criar aluno')
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando alunos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto space-y-6 sm:space-y-8 mb-20">
      {/* Header Section - Premium Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-meu-primary/5 text-meu-primary text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
              Alunos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-meu-primary tracking-tight">
            Gestão de Alunos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
            Gerencie os alunos da sua academia.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-meu-primary hover:bg-meu-primary/90"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      {/* Stats - Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-meu-primary group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total</h3>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary/40 group-hover:text-meu-primary transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">{students.length}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Alunos cadastrados</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Ativos</h3>
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{activeStudents}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Alunos ativos</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Créditos</h3>
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500/40 group-hover:text-cyan-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-cyan-600 tracking-tight">{totalCredits}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Total de créditos</p>
          </div>
        </Card>

        <Card className="relative overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 group-hover:w-2 transition-all duration-300" />
          <div className="p-4 sm:p-6 pl-6 sm:pl-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Inativos</h3>
              <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-500/40 group-hover:text-red-500 transition-colors" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">{inactiveStudents}</span>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">Alunos inativos</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              >
                Ativos
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                size="sm"
              >
                Inativos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Lista de Alunos ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-meu-cyan text-meu-primary font-semibold">
                        {student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      {student.phone && (
                        <p className="text-sm text-gray-500">{student.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(student)}
                        {student.student_subscriptions?.[0]?.credits_remaining && (
                          <Badge variant="outline" className="text-xs">
                            {student.student_subscriptions[0].credits_remaining} créditos
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStudent(student)}
                      title="Editar aluno"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Excluir aluno"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Novo Aluno</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                📧 O aluno receberá um email com as credenciais de acesso ao sistema.
              </p>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading}
                  className="bg-meu-primary hover:bg-meu-primary/90"
                >
                  {createLoading ? 'Criando...' : 'Criar Aluno'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Aluno</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedStudent(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={selectedStudent?.status || 'active'}
                  onChange={(e) => setSelectedStudent({ ...selectedStudent, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedStudent(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading}
                  className="bg-meu-primary hover:bg-meu-primary/90"
                >
                  {createLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
