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
  Gift
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
        birth_date: ''
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              {/* Card Total */}
              <Card className="bg-[#002C4E] text-white border-none shadow-meu relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 bg-[#27DFFF]/10 rounded-full -mr-8 -mt-8 blur-xl transition-all group-hover:bg-[#27DFFF]/20"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <Users className="h-5 w-5 text-[#27DFFF]" />
                    </div>
                    <span className="text-xs font-medium text-white/60 bg-white/10 px-2 py-1 rounded-full">Total</span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-1">{students.length}</h2>
                    <p className="text-white/60 text-sm font-medium">Alunos Cadastrados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Search Bar Container - Agora ocupa mais espaço e tem design clean */}
              <div className="lg:col-span-3">
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

            {/* Lista de Alunos em Cards */}
            {filteredStudents.length === 0 ? (
              <Card className="border-dashed bg-gray-50/50 border-gray-200">
                <CardContent className="py-20 text-center">
                  <div className="bg-white p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                    <Users className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {searchTerm ? 'Nenhum aluno encontrado' : 'Vamos começar?'}
                  </h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    {searchTerm
                      ? `Não encontramos alunos com o termo "${searchTerm}". Verifique a grafia ou tente outro termo.`
                      : 'Você ainda não tem alunos cadastrados. Adicione seu primeiro aluno para começar a gerenciar seus treinos e aulas.'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => handleOpenModal()}
                      className="bg-[#002C4E] hover:bg-[#003f70] text-white rounded-lg px-8 h-12 font-medium"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Cadastrar Primeiro Aluno
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStudents.map((student) => (
                  <Card
                    key={student.id}
                    className="group border border-gray-100 shadow-sm hover:shadow-meu-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white overflow-hidden"
                    onClick={() => {
                      setSelectedStudent(student)
                      setShowDetailModal(true)
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-[#002C4E]/5 text-[#002C4E] flex items-center justify-center text-xl font-bold border border-[#002C4E]/10 group-hover:bg-[#002C4E] group-hover:text-white transition-colors duration-300">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-[#002C4E] group-hover:text-[#27DFFF] transition-colors line-clamp-1">
                                {student.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {student.connection_status === 'PENDING' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                                    Pendente
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                    Ativo
                                  </span>
                                )}
                                {student.hourly_rate ? (
                                  <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                    R$ {student.hourly_rate.toFixed(2)}/h
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    Valor n/d
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-[#002C4E] hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(student)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                              <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <span className="truncate">{student.email}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                              <Phone className="h-4 w-4 text-gray-400" />
                            </div>
                            <span className="truncate">{student.phone || 'Sem telefone'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 group-hover:bg-[#002C4E]/5 transition-colors flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-400 group-hover:text-[#002C4E] uppercase tracking-wider">
                          Ver Detalhes
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                          <Plus className="h-4 w-4 text-[#002C4E]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Modal de Cadastro/Edição - Premium Design */}
            {showModal && (
              <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 bg-[#002C4E]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <Card className="max-w-xl w-full shadow-2xl border-none rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                  {/* Header Premium */}
                  <div className="bg-[#002C4E] text-white p-6 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-24 bg-[#27DFFF]/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                          <User className="h-6 w-6 text-[#27DFFF]" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h2>
                          <p className="text-white/70 text-sm">
                            {editingStudent ? 'Atualize as informações do aluno' : 'Cadastre um novo aluno na sua carteira'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        onClick={handleCloseModal}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Form Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto">
                    <CardContent className="p-6">
                      <form onSubmit={handleSubmit} className="space-y-6" id="student-form">

                        {/* Seção: Dados Pessoais */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <div className="p-1.5 bg-blue-50 rounded-md">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Dados Pessoais</h3>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                              placeholder="Ex: João Silva"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                CPF
                              </label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={formatCpfCnpj(formData.cpf)}
                                  onChange={(e) => {
                                    const raw = unformatCpfCnpj(e.target.value).slice(0, 11)
                                    setFormData({ ...formData, cpf: raw })
                                  }}
                                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                  placeholder="000.000.000-00"
                                  maxLength={14}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Data de Nascimento
                              </label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                <input
                                  type="date"
                                  value={formData.birth_date}
                                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Gênero
                            </label>
                            <Select
                              value={formData.gender}
                              onValueChange={(value: GenderType) => setFormData({ ...formData, gender: value })}
                            >
                              <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E]">
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
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <div className="p-1.5 bg-green-50 rounded-md">
                              <Mail className="h-4 w-4 text-green-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Contato</h3>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Email *
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                placeholder="aluno@email.com"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Telefone / WhatsApp
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                              <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, '') // Remove não-números
                                  if (value.length <= 11) {
                                    if (value.length <= 2) {
                                      value = value
                                    } else if (value.length <= 6) {
                                      // (11) 1234
                                      value = value.replace(/(\d{2})(\d+)/, '($1) $2')
                                    } else if (value.length <= 10) {
                                      // (11) 1234-5678 (fixo)
                                      value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                                    } else {
                                      // (11) 91234-5678 (celular com 9º dígito)
                                      value = value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
                                    }
                                  }
                                  setFormData({ ...formData, phone: value })
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium"
                                maxLength={15}
                                placeholder="(99) 99999-9999"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção: Dados Profissionais */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <div className="p-1.5 bg-amber-50 rounded-md">
                              <DollarSign className="h-4 w-4 text-amber-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Valor & Observações</h3>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Valor Hora/Aula (R$)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.hourly_rate}
                                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none text-sm font-medium text-[#002C4E]"
                                placeholder="0,00"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Valor cobrado por hora de aula particular</p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                              Observações
                            </label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                              <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002C4E]/20 focus:border-[#002C4E] focus:bg-white transition-all outline-none resize-none text-sm"
                                rows={3}
                                placeholder="Objetivos, limitações físicas, preferências de treino..."
                              />
                            </div>
                          </div>

                          {/* Toggle Primeira Aula Gratuita */}
                          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Gift className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">Ocultar "Primeira Aula Gratuita"</p>
                                <p className="text-xs text-gray-500">O aluno não verá o badge de aula grátis disponível</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.hide_free_class}
                              onCheckedChange={(checked) => setFormData({ ...formData, hide_free_class: checked })}
                            />
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </div>

                  {/* Footer com botões - Fixo */}
                  <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={handleCloseModal}
                        variant="ghost"
                        className="flex-1 rounded-xl h-12 hover:bg-gray-100 text-gray-600 font-medium"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        form="student-form"
                        className="flex-1 bg-[#002C4E] hover:bg-[#003f70] text-white rounded-xl h-12 font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98]"
                      >
                        {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

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

