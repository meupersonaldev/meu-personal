'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Calendar,
  DollarSign,
  User,
  FileText,
  CreditCard,
  Gift,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Globe
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { useTeacherApproval } from '@/hooks/use-teacher-approval'
import { ApprovalBanner } from '@/components/teacher/approval-banner'
import { ApprovalBlock } from '@/components/teacher/approval-block'
import { formatCpfCnpj, unformatCpfCnpj, validateCpfCnpj } from '@/lib/utils'

type GenderType = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY' | ''

interface Student {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  hourly_rate?: number
  cpf?: string
  gender?: GenderType
  birth_date?: string
  source?: 'MANUAL' | 'PLATFORM'
  is_portfolio?: boolean
  created_at: string
  connection_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  user_photo?: string
  hide_free_class?: boolean
}

export default function AlunosPage() {
  const { user, token } = useAuthStore()
  const { isNotApproved, approvalStatus } = useTeacherApproval()
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
    notes: '',
    hourly_rate: '',
    cpf: '',
    gender: '' as GenderType,
    birth_date: '',
    hide_free_class: false
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

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
        notes: student.notes || '',
        hourly_rate: student.hourly_rate?.toString() || '',
        cpf: student.cpf || '',
        gender: student.gender || '',
        birth_date: student.birth_date || '',
        hide_free_class: student.hide_free_class || false
      })
    } else {
      setEditingStudent(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        hourly_rate: '',
        cpf: '',
        gender: '',
        birth_date: '',
        hide_free_class: false
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
      notes: '',
      hourly_rate: '',
      cpf: '',
      gender: '',
      birth_date: '',
      hide_free_class: false
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }

    // Validar gênero se fornecido
    if (formData.gender && !['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(formData.gender)) {
      toast.error('Gênero inválido')
      return
    }

    // Validar CPF se fornecido
    if (formData.cpf) {
      const cleanCpf = unformatCpfCnpj(formData.cpf)
      if (cleanCpf.length !== 11) {
        toast.error('CPF inválido. Deve conter 11 dígitos.')
        return
      }
      if (!validateCpfCnpj(cleanCpf)) {
        toast.error('CPF inválido.')
        return
      }
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
        notes: formData.notes,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        cpf: formData.cpf ? unformatCpfCnpj(formData.cpf) : null,
        gender: formData.gender || null,
        birth_date: formData.birth_date || null,
        hide_free_class: formData.hide_free_class
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

      const data = await response.json()

      if (response.ok) {
        if (response.status === 200 && data.status === 'PENDING') {
          toast.success('Solicitação de vínculo enviada! Aguardando aprovação do aluno.')
        } else {
          toast.success(editingStudent ? 'Aluno atualizado!' : 'Aluno cadastrado!')
        }
        fetchStudents()
        handleCloseModal()
      } else {
        if (response.status === 409) {
          if (data.code === 'CONNECTION_PENDING') {
            toast.info('Solicitação já enviada e pendente. Aguarde o aluno aprovar.', { duration: 5000 })
          } else if (data.code === 'ALREADY_LINKED') {
            toast.error('Este aluno já está na sua carteira!')
          } else {
            toast.error(data.error || 'Conflito ao cadastrar aluno')
          }
        } else {
          toast.error(data.error || 'Erro ao salvar aluno')
        }
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

  const handleTogglePortfolio = async (studentId: string, currentStatus: boolean) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      const response = await fetch(
        `${API_URL}/api/teachers/${user?.id}/students/${studentId}/portfolio`,
        {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({ is_portfolio: !currentStatus })
        }
      )

      if (response.ok) {
        toast.success(!currentStatus ? 'Aluno adicionado à carteira!' : 'Aluno removido da carteira')
        fetchStudents()
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      toast.error('Erro ao processar requisição')
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const paginatedStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
        <ApprovalBanner approvalStatus={approvalStatus} userName={user?.name} />

        {isNotApproved ? (
          <ApprovalBlock
            title={approvalStatus === 'rejected' ? 'Acesso Negado' : 'Cadastro de Alunos Bloqueado'}
            message={approvalStatus === 'rejected'
              ? 'Seu cadastro foi reprovado. Entre em contato com a administração para mais informações.'
              : 'Você poderá cadastrar e gerenciar seus alunos após a aprovação do seu cadastro pela administração.'}
            fullPage
            approvalStatus={approvalStatus}
          />
        ) : (
          <>
            {/* Header Unificado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[#002C4E] tracking-tight">Meus Alunos</h1>
                <p className="text-gray-500 text-lg mt-2">
                  Gerencie sua carteira de alunos e acompanhe o desenvolvimento.
                </p>
              </div>
              <Button
                onClick={() => handleOpenModal()}
                className="bg-[#002C4E] hover:bg-[#003f70] text-white rounded-lg px-6 h-12 shadow-lg shadow-blue-900/10 font-medium transition-all active:scale-95"
              >
                <Plus className="h-5 w-5 mr-2" />
                Novo Aluno
              </Button>
            </div>

            {/* Stats e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card Carteira */}
              <Card className="bg-[#002C4E] text-white border-none shadow-meu relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 bg-[#27DFFF]/10 rounded-full -mr-8 -mt-8 blur-xl transition-all group-hover:bg-[#27DFFF]/20"></div>
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <Users className="h-4 w-4 text-[#27DFFF]" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 bg-white/10 px-2 py-0.5 rounded-full">Carteira</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-0.5">{students.filter(s => s.is_portfolio).length}</h2>
                    <p className="text-white/60 text-xs font-medium">Alunos Fidelizados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card Plataforma */}
              <Card className="bg-white border-none shadow-meu relative overflow-hidden group">
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Globe className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Plataforma</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-0.5">{students.filter(s => s.source === 'PLATFORM' && !s.is_portfolio).length}</h2>
                    <p className="text-gray-500 text-xs font-medium">Aguardando Fidelização</p>
                  </div>
                </CardContent>
              </Card>

              {/* Search Bar Container */}
              <div className="md:col-span-2">
                <Card className="h-full border-none shadow-meu bg-white flex flex-col justify-center">
                  <CardContent className="p-6">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#002C4E] transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#002C4E]/10 focus:border-[#002C4E] transition-all outline-none placeholder:text-gray-400 font-medium"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-xs text-gray-400 font-medium bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                          {filteredStudents.length} resultados
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabela de Alunos */}
            <Card className="border-none shadow-meu bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Aluno</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Hora</th>
                        <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500">
                            {searchTerm ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedStudent(student)
                              setShowDetailModal(true)
                            }}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-[#002C4E]/5 text-[#002C4E] flex items-center justify-center text-sm font-bold border border-[#002C4E]/10 group-hover:bg-[#002C4E] group-hover:text-white transition-colors duration-300">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-[#002C4E] group-hover:text-blue-700 transition-colors">{student.name}</div>
                                  <div className="text-xs text-gray-400">Desde {new Date(student.created_at).toLocaleDateString('pt-BR')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  {student.email}
                                </span>
                                {student.phone && (
                                  <span className="text-sm text-gray-600 flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    {student.phone}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                {student.connection_status === 'PENDING' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 w-fit">
                                    Pendente
                                  </span>
                                ) : student.is_portfolio ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 w-fit">
                                    Na Carteira
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Plataforma
                                  </span>
                                )}
                                {student.source === 'PLATFORM' && !student.is_portfolio && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTogglePortfolio(student.id, false)
                                    }}
                                    className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                    Fidelizar
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {student.hourly_rate ? (
                                <span className="text-sm font-medium text-gray-700">
                                  R$ {student.hourly_rate.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">
                                  Não definido
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-[#002C4E] hover:bg-white border border-transparent hover:border-gray-200"
                                  onClick={() => handleOpenModal(student)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100"
                                  onClick={() => handleDelete(student.id, student.name)}
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredStudents.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                    <span className="text-sm text-gray-500">
                      Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredStudents.length)} de {filteredStudents.length} alunos
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 border-gray-200"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 border-gray-200"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal de Cadastro/Edição - Premium Design */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-white rounded-xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-5 bg-[#002C4E] text-white relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-24 bg-[#27DFFF]/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <User className="h-5 w-5 text-[#27DFFF]" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-white">
                        {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                      </DialogTitle>
                      <p className="text-white/70 text-xs mt-0.5">
                        {editingStudent ? 'Atualize as informações' : 'Cadastre um novo aluno'}
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-5">
                    <form onSubmit={handleSubmit} className="space-y-5" id="student-form">

                      {/* Seção: Dados Pessoais */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                          <div className="p-1 bg-blue-50 rounded-md">
                            <User className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Dados Pessoais</h3>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                            placeholder="Ex: João Silva"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              CPF
                            </label>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                value={formatCpfCnpj(formData.cpf)}
                                onChange={(e) => {
                                  const raw = unformatCpfCnpj(e.target.value).slice(0, 11)
                                  setFormData({ ...formData, cpf: raw })
                                }}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                placeholder="000.000.000-00"
                                maxLength={14}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              Data de Nascimento
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                            Gênero
                          </label>
                          <Select
                            value={formData.gender}
                            onValueChange={(value: GenderType) => setFormData({ ...formData, gender: value })}
                          >
                            <SelectTrigger className="w-full h-10 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] text-sm">
                              <SelectValue placeholder="Selecione o gênero" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Masculino</SelectItem>
                              <SelectItem value="FEMALE">Feminino</SelectItem>
                              <SelectItem value="NON_BINARY">Não-Binário</SelectItem>
                              <SelectItem value="OTHER">Outro</SelectItem>
                              <SelectItem value="PREFER_NOT_TO_SAY">Prefiro não dizer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Seção: Contato */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                          <div className="p-1 bg-green-50 rounded-md">
                            <Mail className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Contato</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              Email *
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                placeholder="email@exemplo.com"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              Telefone/WhatsApp
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, '')
                                  if (value.length <= 11) {
                                    if (value.length <= 2) value = value
                                    else if (value.length <= 6) value = value.replace(/(\d{2})(\d+)/, '($1) $2')
                                    else if (value.length <= 10) value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                                    else value = value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
                                  }
                                  setFormData({ ...formData, phone: value })
                                }}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                maxLength={15}
                                placeholder="(99) 99999-9999"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Seção: Dados Profissionais */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                          <div className="p-1 bg-amber-50 rounded-md">
                            <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Detalhes Profissionais</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                          <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              Valor Hora (R$)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.hourly_rate}
                                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium text-[#002C4E]"
                                placeholder="0,00"
                              />
                            </div>
                          </div>

                          <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                              Primeira Aula
                            </label>
                            <div className="flex items-center justify-between px-3 py-2 bg-green-50/50 border border-green-100 rounded-lg h-[42px]">
                              <span className="text-xs font-medium text-gray-700">Ocultar Grátis</span>
                              <Switch
                                checked={formData.hide_free_class}
                                onCheckedChange={(checked) => setFormData({ ...formData, hide_free_class: checked })}
                                className="scale-75 origin-right"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                            Observações
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none resize-none text-sm"
                            rows={2}
                            placeholder="Anotações gerais do aluno..."
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Footer com botões - Fixo */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleCloseModal}
                      variant="ghost"
                      className="flex-1 rounded-lg h-10 hover:bg-gray-100 text-gray-600 font-medium text-sm"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      form="student-form"
                      className="flex-1 bg-[#002C4E] hover:bg-[#003f70] text-white rounded-lg h-10 font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98] text-sm"
                    >
                      {editingStudent ? 'Salvar' : 'Cadastrar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de Detalhes do Aluno */}
            {showDetailModal && selectedStudent && (
              <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 bg-[#002C4E]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
                <Card className="max-w-2xl w-full border-none shadow-2xl overflow-hidden bg-white rounded-2xl">
                  {/* Banner Premium */}
                  <div className="bg-[#002C4E] h-40 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-[#27DFFF]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 p-24 bg-[#FFF373]/5 rounded-full -ml-8 -mb-8 blur-2xl"></div>

                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        setSelectedStudent(null)
                      }}
                      className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all backdrop-blur-sm"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="absolute -bottom-14 left-8">
                      <div className="h-28 w-28 rounded-2xl bg-white p-1.5 shadow-xl rotate-3">
                        <div className="h-full w-full rounded-xl bg-[#002C4E] flex items-center justify-center text-white text-4xl font-bold border border-[#002C4E]/10">
                          {selectedStudent.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="pt-20 pb-8 px-8">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-[#002C4E] tracking-tight">{selectedStudent.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-500 font-medium">Aluno desde {new Date(selectedStudent.created_at).getFullYear()}</p>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="text-green-600 font-medium text-sm flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                            Ativo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Dados Pessoais */}
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-[#002C4E]/5 rounded-md">
                            <Users className="h-4 w-4 text-[#002C4E]" />
                          </div>
                          <h3 className="text-xs font-bold text-[#002C4E] uppercase tracking-wider">
                            Dados Pessoais
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {selectedStudent.cpf && (
                            <div className="group flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                                <CreditCard className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">CPF</p>
                                <p className="text-sm font-semibold text-gray-900">{formatCpfCnpj(selectedStudent.cpf)}</p>
                              </div>
                            </div>
                          )}

                          {selectedStudent.gender && (
                            <div className="group flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                              <div className="p-2 bg-pink-50 text-pink-600 rounded-lg group-hover:bg-pink-100 transition-colors">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Gênero</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {selectedStudent.gender === 'MALE' ? 'Masculino' :
                                    selectedStudent.gender === 'FEMALE' ? 'Feminino' :
                                      selectedStudent.gender === 'NON_BINARY' ? 'Não-Binário' :
                                        selectedStudent.gender === 'OTHER' ? 'Outro' :
                                          selectedStudent.gender === 'PREFER_NOT_TO_SAY' ? 'Prefiro não dizer' :
                                            selectedStudent.gender}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedStudent.birth_date && (
                            <div className="group flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Data de Nascimento</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(selectedStudent.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contato e Financeiro */}
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-[#002C4E]/5 rounded-md">
                            <Mail className="h-4 w-4 text-[#002C4E]" />
                          </div>
                          <h3 className="text-xs font-bold text-[#002C4E] uppercase tracking-wider">
                            Contato
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div className="group flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email</p>
                              <p className="text-sm font-semibold text-gray-900 break-all">{selectedStudent.email}</p>
                            </div>
                          </div>

                          <div className="group flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                              <Phone className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Telefone</p>
                              <p className="text-sm font-semibold text-gray-900">{selectedStudent.phone || 'Não informado'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Valor Hora */}
                        <div className="p-5 bg-gradient-to-br from-[#002C4E] to-[#004f8c] rounded-2xl text-white shadow-meu relative overflow-hidden group mt-4">
                          <div className="absolute top-0 right-0 p-12 bg-white/5 rounded-full -mr-6 -mt-6 blur-xl group-hover:bg-white/10 transition-all"></div>
                          <div className="relative z-10">
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Valor Hora/Aula</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold tracking-tight">R$ {selectedStudent.hourly_rate ? selectedStudent.hourly_rate.toFixed(2) : '0,00'}</span>
                              <span className="text-sm text-blue-200">/h</span>
                            </div>
                          </div>
                        </div>

                        {selectedStudent.notes && (
                          <div className="p-5 bg-yellow-50/50 border border-yellow-100 rounded-2xl">
                            <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider mb-2">Observações</p>
                            <p className="text-sm text-gray-700 leading-relaxed italic">
                              "{selectedStudent.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-8 mt-6 border-t border-gray-100">
                      <Button
                        onClick={() => {
                          setShowDetailModal(false)
                          handleOpenModal(selectedStudent)
                        }}
                        className="flex-1 bg-white border-2 border-gray-100 text-gray-700 hover:border-[#002C4E] hover:text-[#002C4E] transition-all h-12 rounded-xl font-bold"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDetailModal(false)
                          handleDelete(selectedStudent.id, selectedStudent.name)
                        }}
                        variant="ghost"
                        className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all h-12 rounded-xl font-bold"
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
              confirmText="Sim, excluir aluno"
              cancelText="Manter aluno"
              type="danger"
            />
          </>
        )}
      </div>
    </ProfessorLayout>
  )
}

