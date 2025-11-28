'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Star,
  DollarSign,
  Users,
  GraduationCap,
  X
} from 'lucide-react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  status?: string
  teacher_profiles?: Array<{
    id: string
    bio: string
    specialties: string[]
    hourly_rate: number
    availability: object
    is_available: boolean
    rating_avg?: number
    rating_count?: number
  }>
  academy_teachers?: Array<{
    id: string
    academy_id: string
    status: string
    commission_rate: number
    academies?: {
      name: string
      city: string
      state: string
    }
  }>
  teacher_subscriptions?: Array<{
    id: string
    status: string
    start_date: string
    end_date: string
    teacher_plans?: {
      name: string
      price: number
      commission_rate: number
      features: string[]
    }
  }>
}

export default function ProfessoresPage() {
  const { teachers, fetchTeachers, franquiaUser } = useFranquiaStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Carregar dados ao montar
  useEffect(() => {
    fetchTeachers().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Paginação
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex)

  const handleViewDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowDetailsModal(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRating = (teacher: Teacher) => {
    const profile = teacher.teacher_profiles?.[0]
    return {
      avg: profile?.rating_avg || 0,
      count: profile?.rating_count || 0
    }
  }

  const getStatusBadge = (teacher: Teacher) => {
    const profile = teacher.teacher_profiles?.[0]
    if (profile?.is_available) {
      return <Badge className="bg-green-100 text-green-800">Disponível</Badge>
    }
    return <Badge variant="outline">Indisponível</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Carregando professores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Professores</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredTeachers.length} professor{filteredTeachers.length !== 1 ? 'es' : ''} com disponibilidade para a unidade
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{teachers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Avaliação Média</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {teachers.length > 0
                      ? (teachers.reduce((sum, t) => sum + getRating(t).avg, 0) / teachers.length).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Taxa Média</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    R$ {teachers.length > 0
                      ? (teachers.reduce((sum, t) => sum + (t.teacher_profiles?.[0]?.hourly_rate || 0), 0) / teachers.length).toFixed(0)
                      : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Lista de Professores</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum professor encontrado</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Professor</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Taxa/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTeachers.map((teacher) => {
                        const profile = teacher.teacher_profiles?.[0]
                        const rating = getRating(teacher)
                        const hourlyRate = profile?.hourly_rate || 0

                        return (
                          <TableRow key={teacher.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {getInitials(teacher.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-900">{teacher.name}</p>
                                  {profile?.specialties && profile.specialties.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                      {profile.specialties.slice(0, 2).join(', ')}
                                      {profile.specialties.length > 2 && '...'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-3 w-3 mr-2" />
                                  <span className="truncate max-w-[200px]">{teacher.email}</span>
                                </div>
                                {teacher.phone && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="h-3 w-3 mr-2" />
                                    <span>{teacher.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{rating.avg.toFixed(1)}</span>
                                <span className="text-xs text-gray-500">
                                  ({rating.count})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-gray-900">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span className="font-medium">R$ {hourlyRate.toFixed(2)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(teacher)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(teacher)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredTeachers.length)} de {filteredTeachers.length} professores
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="min-w-[40px]"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <CardTitle className="text-2xl">Detalhes do Professor</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedTeacher(null)
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Profile Section */}
              <div className="flex items-start space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {getInitials(selectedTeacher.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedTeacher.name}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    {getStatusBadge(selectedTeacher)}
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{getRating(selectedTeacher).avg.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">
                        ({getRating(selectedTeacher).count} avaliações)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedTeacher.email}</p>
                  </div>
                </div>
                {selectedTeacher.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Telefone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedTeacher.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              {selectedTeacher.teacher_profiles?.[0] && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Informações Profissionais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Taxa por Hora</p>
                          <p className="text-sm font-medium text-gray-900">
                            R$ {selectedTeacher.teacher_profiles[0].hourly_rate.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Disponibilidade</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedTeacher.teacher_profiles[0].is_available ? 'Disponível' : 'Indisponível'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  {selectedTeacher.teacher_profiles[0].specialties && 
                   selectedTeacher.teacher_profiles[0].specialties.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Especialidades</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeacher.teacher_profiles[0].specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {selectedTeacher.teacher_profiles[0].bio && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Biografia</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedTeacher.teacher_profiles[0].bio}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Academy Link */}
              {selectedTeacher.academy_teachers && selectedTeacher.academy_teachers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Vínculo com Academia</h4>
                  <div className="space-y-2">
                    {selectedTeacher.academy_teachers.map((at) => (
                      <div key={at.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {at.academies?.name || 'Academia'}
                          </p>
                          {at.academies && (
                            <p className="text-xs text-gray-500">
                              {at.academies.city}, {at.academies.state}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={at.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {at.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {at.commission_rate > 0 && (
                              <span className="text-xs text-gray-500">
                                Comissão: {at.commission_rate}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscriptions */}
              {selectedTeacher.teacher_subscriptions && 
               selectedTeacher.teacher_subscriptions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Planos Ativos</h4>
                  <div className="space-y-2">
                    {selectedTeacher.teacher_subscriptions
                      .filter((sub: any) => sub.status === 'active')
                      .map((sub: any) => (
                        <div key={sub.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {sub.teacher_plans?.name || 'Plano'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(sub.start_date).toLocaleDateString('pt-BR')} - {new Date(sub.end_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
