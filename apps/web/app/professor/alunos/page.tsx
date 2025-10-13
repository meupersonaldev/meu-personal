'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  Phone,
  Mail,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/confirm-dialog'

interface Student {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  created_at: string
}

export default function AlunosPage() {
  const { user, token } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [teacherBio, setTeacherBio] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    studentId: string | null
    studentName: string
  }>({
    isOpen: false,
    studentId: null,
    studentName: ''
  })

  useEffect(() => {
    if (user?.id) {
      fetchStudents()
      fetchTeacherPreferences()
    }
  }, [user?.id, token])

  const fetchStudents = async () => {
    if (!user?.id || !token) {
      setStudents([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch(`${API_URL}/api/teachers/${user.id}/students`, {
        headers,
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar alunos')
    } finally {
      setLoading(false)
    }
  }

  // Carrega as preferências do professor (inclui bio)
  const fetchTeacherPreferences = async () => {
    if (!user?.id || !token) return
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_URL}/api/teachers/${user.id}/preferences`, {
        headers,
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setTeacherBio(data.bio || '')
      }
    } catch (err) {
    }
  }

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student)
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        notes: student.notes || ''
      })
    } else {
      setEditingStudent(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingStudent(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      notes: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const url = editingStudent
        ? `${API_URL}/api/teachers/${user?.id}/students/${editingStudent.id}`
        : `${API_URL}/api/teachers/${user?.id}/students`

      const method = editingStudent ? 'PUT' : 'POST'

      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editingStudent ? 'Aluno atualizado!' : 'Aluno cadastrado!')
        fetchStudents()
        handleCloseModal()
      } else {
        toast.error('Erro ao salvar aluno')
      }
    } catch (error) {
      toast.error('Erro ao processar requisição')
    }
  }

  const handleDelete = (studentId: string, studentName: string) => {
    setDeleteConfirm({
      isOpen: true,
      studentId,
      studentName
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.studentId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch(
        `${API_URL}/api/teachers/${user?.id}/students/${deleteConfirm.studentId}`,
        { method: 'DELETE', headers, credentials: 'include' }
      )

      if (response.ok) {
        toast.success('Aluno excluído!')
        fetchStudents()
      } else {
        toast.error('Erro ao excluir aluno')
      }
    } catch (error) {
      toast.error('Erro ao processar requisição')
    } finally {
      setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' })
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </ProfessorLayout>
    )
  }

  return (
    <ProfessorLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Alunos</h1>
            {teacherBio ? (
              <p className="text-gray-700 max-w-2xl">
                {teacherBio}
              </p>
            ) : (
              <p className="text-gray-600">Gerencie as informações dos seus alunos</p>
            )}
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-meu-primary hover:bg-meu-primary-dark text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Aluno
          </Button>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-meu-primary mb-1">
                {students.length}
              </div>
              <div className="text-sm text-gray-600">Total de Alunos</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alunos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-meu-primary" />
              Lista de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? 'Tente buscar por outro termo'
                    : 'Comece cadastrando seu primeiro aluno'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => handleOpenModal()}
                    className="bg-meu-primary hover:bg-meu-primary-dark text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Aluno
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student)
                          setShowDetailModal(true)
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-meu-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(student)
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(student.id, student.name)
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseModal}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Ex: Objetivo, restrições, etc..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      onClick={handleCloseModal}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-meu-primary hover:bg-meu-primary-dark text-white"
                    >
                      {editingStudent ? 'Salvar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Detalhes do Aluno */}
        {showDetailModal && selectedStudent && (
          <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-meu-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {selectedStudent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span>{selectedStudent.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedStudent(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações de Contato */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Informações de Contato
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">{selectedStudent.email}</p>
                      </div>
                    </div>
                    {selectedStudent.phone && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Telefone</p>
                          <p className="text-sm font-medium text-gray-900">{selectedStudent.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Cadastrado em</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedStudent.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedStudent.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                      Observações
                    </h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedStudent.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setShowDetailModal(false)
                      handleOpenModal(selectedStudent)
                    }}
                    className="flex-1 bg-meu-primary hover:bg-meu-primary-dark text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailModal(false)
                      handleDelete(selectedStudent.id, selectedStudent.name)
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, studentId: null, studentName: '' })}
          onConfirm={confirmDelete}
          title="Excluir Aluno"
          description={`Tem certeza que deseja excluir o aluno "${deleteConfirm.studentName}"? Esta ação não poderá ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />
      </div>
    </ProfessorLayout>
  )
}
