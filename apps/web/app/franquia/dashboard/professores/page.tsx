'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Plus,
  Trash2,
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Activity,
  X,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  teacher_profiles: Array<{
    id: string
    bio: string
    specialties: string[]
    hourly_rate: number
    availability: object
    is_available: boolean
  }>
  academy_teachers: Array<{
    id: string
    academy_id: string
    status: string
    commission_rate: number
    academies: {
      name: string
      city: string
      state: string
    }
  }>
  teacher_subscriptions: Array<{
    id: string
    status: string
    start_date: string
    end_date: string
    teacher_plans: {
      name: string
      price: number
      commission_rate: number
      features: string[]
    }
  }>
}

export default function ProfessoresPage() {
  const { teachers, fetchTeachers, addTeacher, updateTeacher, deleteTeacher } = useFranquiaStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)

  // Carregar dados ao montar
  useEffect(() => {
    // Academy já vem do login via store - não precisa setar manualmente
    fetchTeachers().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    specialties: '',
    hourly_rate: '',
    avatar_url: ''
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Removido: função fetchTeachers local - agora usa do store

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && teacher.status === 'active') ||
                         (statusFilter === 'inactive' && teacher.status === 'inactive')

    return matchesSearch && matchesStatus
  })

  const activeTeachers = teachers.filter(t => t.status === 'active').length
  const inactiveTeachers = teachers.filter(t => t.status === 'inactive').length
  const totalSubscriptions = teachers.filter(t =>
    t.teacher_subscriptions?.some(sub => sub.status === 'active')
  ).length

  const getStatusBadge = (teacher: any) => {
    if (teacher.status === 'inactive') {
      return <Badge variant="destructive">Inativo</Badge>
    }

    return <Badge className="bg-green-100 text-green-800">Ativo</Badge>
  }

  const handleDeleteTeacher = async (teacherId: string) => {
    toast('Tem certeza que deseja excluir este professor?', {
      description: 'Esta ação não pode ser desfeita.',
      action: {
        label: 'Excluir',
        onClick: async () => {
          const success = await deleteTeacher(teacherId)
          if (success) {
            toast.success('Professor excluído com sucesso!')
          } else {
            toast.error('Erro ao excluir professor')
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    })
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const teacherData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : [],
        status: 'active' as const,
        rating: 0,
        total_reviews: 0,
        created_at: new Date().toISOString()
      }

      const success = await addTeacher(teacherData)

      if (success) {
        setShowCreateModal(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          bio: '',
          specialties: '',
          hourly_rate: '',
          avatar_url: ''
        })
        toast.success('Professor criado com sucesso!')
      } else {
        toast.error('Erro ao criar professor')
      }
    } catch (error) {
      console.error('Erro ao criar professor:', error)
      toast.error('Erro ao criar professor')
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando professores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="content-with-sidebar min-h-screen bg-gray-50 p-6 ml-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Professores</h1>
            <p className="text-gray-600">Gerencie os professores da sua academia</p>
          </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-meu-primary hover:bg-meu-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-meu-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Professores</p>
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Professores Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-meu-cyan" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Com Assinatura</p>
                <p className="text-2xl font-bold text-gray-900">{totalSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inativos</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveTeachers}</p>
              </div>
            </div>
          </CardContent>
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

      {/* Teachers List */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Lista de Professores ({filteredTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum professor encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTeachers.map((teacher) => {
                const profile = teacher.teacher_profiles?.[0]

                return (
                  <div key={teacher.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-meu-cyan text-meu-primary font-semibold">
                          {teacher.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                        <p className="text-sm text-gray-600">{teacher.email}</p>
                        {teacher.phone && (
                          <p className="text-sm text-gray-500">{teacher.phone}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(teacher)}
                          {profile?.hourly_rate && (
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              R$ {profile.hourly_rate}/hora
                            </Badge>
                          )}
                        </div>
                        {profile?.specialties && profile.specialties.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {profile.specialties.slice(0, 3).map((specialty, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {profile.specialties.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{profile.specialties.length - 3} mais
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTeacher(teacher)
                          setShowViewModal(true)
                        }}
                        title="Ver detalhes"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newStatus = teacher.status === 'active' ? 'inactive' : 'active'
                          updateTeacher(teacher.id, { status: newStatus })
                          toast.success(`Professor ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`)
                        }}
                        title={teacher.status === 'active' ? 'Desativar professor' : 'Ativar professor'}
                        className={teacher.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir professor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Novo Professor</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="specialties">Especialidades (separadas por vírgula)</Label>
                <Input
                  id="specialties"
                  value={formData.specialties}
                  onChange={(e) => setFormData({...formData, specialties: e.target.value})}
                  placeholder="Ex: Musculação, Crossfit, Personal Training"
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Valor por Hora (R$)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                />
              </div>

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
                  {createLoading ? 'Criando...' : 'Criar Professor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Detalhes do Professor</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedTeacher(null)
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header com Avatar */}
              <div className="flex items-center space-x-4 pb-6 border-b">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-meu-cyan text-meu-primary text-2xl font-bold">
                    {selectedTeacher.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTeacher.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedTeacher)}
                    {selectedTeacher.teacher_profiles?.[0]?.hourly_rate && (
                      <Badge variant="outline">
                        <DollarSign className="h-3 w-3 mr-1" />
                        R$ {selectedTeacher.teacher_profiles[0].hourly_rate}/hora
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações de Contato */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Informações de Contato</h4>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedTeacher.email}</p>
                    </div>
                  </div>
                  {selectedTeacher.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Telefone</p>
                        <p className="text-sm font-medium text-gray-900">{selectedTeacher.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Cadastrado em</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedTeacher.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Especialidades */}
              {selectedTeacher.teacher_profiles?.[0]?.specialties && 
               selectedTeacher.teacher_profiles[0].specialties.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeacher.teacher_profiles[0].specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selectedTeacher.teacher_profiles?.[0]?.bio && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Sobre</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedTeacher.teacher_profiles[0].bio}
                  </p>
                </div>
              )}

              {/* Academias Vinculadas */}
              {selectedTeacher.academy_teachers && selectedTeacher.academy_teachers.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Academias Vinculadas</h4>
                  <div className="space-y-2">
                    {selectedTeacher.academy_teachers.map((at: any) => (
                      <div key={at.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {at.academies?.name || 'Academia'}
                            </span>
                            {at.academies?.city && (
                              <p className="text-xs text-gray-500">
                                {at.academies.city} - {at.academies.state}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={at.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {at.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planos/Assinaturas */}
              {selectedTeacher.teacher_subscriptions && selectedTeacher.teacher_subscriptions.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Planos Ativos</h4>
                  <div className="space-y-2">
                    {selectedTeacher.teacher_subscriptions
                      .filter((sub: any) => sub.status === 'active')
                      .map((sub: any) => (
                        <div key={sub.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{sub.teacher_plans?.name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                R$ {sub.teacher_plans?.price}/mês
                              </p>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800">Ativo</Badge>
                          </div>
                          {sub.teacher_plans?.features && sub.teacher_plans.features.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <ul className="text-sm text-gray-700 space-y-1">
                                {sub.teacher_plans.features.map((feature: string, idx: number) => (
                                  <li key={idx}>• {feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer com ações */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  const newStatus = selectedTeacher.status === 'active' ? 'inactive' : 'active'
                  updateTeacher(selectedTeacher.id, { status: newStatus })
                  toast.success(`Professor ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`)
                  setShowViewModal(false)
                  setSelectedTeacher(null)
                }}
                className={selectedTeacher.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
              >
                <Activity className="h-4 w-4 mr-2" />
                {selectedTeacher.status === 'active' ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedTeacher(null)
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}