'use client'

import { useEffect } from 'react'
import { Clock, Check, X, GraduationCap, Users, Eye, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore, ApprovalRequest } from '@/lib/stores/franquia-supabase-store'
import { toast } from 'sonner'

export default function ApprovalsPage() {
  const {
    approvalRequests,
    fetchApprovalRequests,
    approveRequest,
    rejectRequest,
    franquiaUser
  } = useFranquiaStore()

  useEffect(() => {
    fetchApprovalRequests()
  }, [fetchApprovalRequests])

  const handleApprove = async (id: string) => {
    if (!franquiaUser) return

    const success = await approveRequest(id, franquiaUser.id)
    if (success) {
      toast.success('Solicitação aprovada com sucesso!')
    } else {
      toast.error('Erro ao aprovar solicitação')
    }
  }

  const handleReject = async (id: string) => {
    if (!franquiaUser) return

    const reason = prompt('Motivo da rejeição:')
    if (!reason || reason.trim() === '') {
      toast.error('É necessário informar um motivo para a rejeição')
      return
    }

    const success = await rejectRequest(id, franquiaUser.id, reason)
    if (success) {
      toast.success('Solicitação rejeitada')
    } else {
      toast.error('Erro ao rejeitar solicitação')
    }
  }

  const getRequestIcon = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'teacher_registration':
        return <GraduationCap className="h-5 w-5 text-blue-600" />
      case 'student_registration':
        return <Users className="h-5 w-5 text-green-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getRequestTitle = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'teacher_registration':
        return 'Cadastro de Professor'
      case 'student_registration':
        return 'Cadastro de Aluno'
      default:
        return 'Solicitação'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      return `${diffInMinutes} min atrás`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} h atrás`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} dias atrás`
    }
  }

  const teacherRequests = approvalRequests.filter(r => r.type === 'teacher_registration')
  const studentRequests = approvalRequests.filter(r => r.type === 'student_registration')

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Aprovações Pendentes</h1>
            <p className="text-gray-600">
              Analise e aprove solicitações de cadastro de professores e alunos
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-orange-100 text-orange-800">
              {approvalRequests.length} pendentes
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Professores Pendentes</div>
              <div className="text-2xl font-bold text-blue-600">{teacherRequests.length}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Alunos Pendentes</div>
              <div className="text-2xl font-bold text-green-600">{studentRequests.length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {approvalRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma aprovação pendente
            </h3>
            <p className="text-gray-600">
              Todas as solicitações foram processadas. Você está em dia!
            </p>
          </Card>
        ) : (
          approvalRequests.map((request) => (
            <Card key={request.id} className="p-6 border-l-4 border-l-orange-500">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getRequestIcon(request.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getRequestTitle(request.type)}
                        </h3>
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                          PENDENTE
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700 font-medium">
                          {request.user?.name || 'Nome não disponível'}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {request.user?.email || 'Email não disponível'}
                        </p>
                        {request.academy && (
                          <p className="text-gray-600 text-sm">
                            Academia: {request.academy.name}
                          </p>
                        )}
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Dados da Solicitação:
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                          {request.type === 'teacher_registration' && (
                            <div className="space-y-1">
                              {request.requested_data.specialties && (
                                <div>
                                  <span className="font-medium">Especialidades:</span>{' '}
                                  {Array.isArray(request.requested_data.specialties)
                                    ? request.requested_data.specialties.join(', ')
                                    : request.requested_data.specialties
                                  }
                                </div>
                              )}
                              {request.requested_data.hourly_rate && (
                                <div>
                                  <span className="font-medium">Valor/hora:</span>{' '}
                                  R$ {request.requested_data.hourly_rate}
                                </div>
                              )}
                              {request.requested_data.experience && (
                                <div>
                                  <span className="font-medium">Experiência:</span>{' '}
                                  {request.requested_data.experience}
                                </div>
                              )}
                            </div>
                          )}
                          {request.type === 'student_registration' && (
                            <div className="space-y-1">
                              {request.requested_data.goals && (
                                <div>
                                  <span className="font-medium">Objetivos:</span>{' '}
                                  {request.requested_data.goals}
                                </div>
                              )}
                              {request.requested_data.preferred_schedule && (
                                <div>
                                  <span className="font-medium">Horário preferido:</span>{' '}
                                  {request.requested_data.preferred_schedule}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <span>Solicitado {formatTimeAgo(request.created_at)}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info Section */}
      {approvalRequests.length > 0 && (
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Importante sobre Aprovações
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Professores aprovados poderão oferecer aulas na plataforma</p>
                <p>• Alunos aprovados serão vinculados à academia selecionada</p>
                <p>• Rejeições devem ser justificadas para transparência</p>
                <p>• Notificações são enviadas automaticamente após cada decisão</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}