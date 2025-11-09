'use client'

import { useEffect } from 'react'
import { Bell, Check, CheckCircle, Users, GraduationCap, CreditCard, Clock, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore, Notification } from '@/lib/stores/franquia-store'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const {
    notifications,
    unreadNotifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    approveRequest,
    rejectRequest,
    franquiaUser
  } = useFranquiaStore()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    const success = await markNotificationAsRead(id)
    if (success) {
      toast.success('Notificação marcada como lida')
    }
  }

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead()
    if (success) {
      toast.success('Todas as notificações foram marcadas como lidas')
    }
  }

  const handleApprove = async (approvalRequestId: string) => {
    if (!franquiaUser) return

    const success = await approveRequest(approvalRequestId, franquiaUser.id)
    if (success) {
      toast.success('Solicitação aprovada!')
      fetchNotifications()
    } else {
      toast.error('Erro ao aprovar solicitação')
    }
  }

  const handleReject = async (approvalRequestId: string) => {
    if (!franquiaUser) return

    const reason = prompt('Motivo da rejeição:')
    if (!reason) return

    const success = await rejectRequest(approvalRequestId, franquiaUser.id, reason)
    if (success) {
      toast.success('Solicitação rejeitada')
      fetchNotifications()
    } else {
      toast.error('Erro ao rejeitar solicitação')
    }
  }

  const handleOpenCrefCard = async (userId?: string) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('users')
        .select('cref_card_url, name')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      const url = data?.cref_card_url
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        toast.info('Este professor ainda não enviou a carteirinha.')
      }
    } catch {
      toast.error('Não foi possível abrir a carteirinha')
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_teacher':
        return <GraduationCap className="h-5 w-5 text-blue-600" />
      case 'new_student':
        return <Users className="h-5 w-5 text-green-600" />
      case 'payment_received':
        return <CreditCard className="h-5 w-5 text-emerald-600" />
      case 'plan_purchased':
        return <CreditCard className="h-5 w-5 text-purple-600" />
      case 'teacher_approval_needed':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'student_approval_needed':
        return <Clock className="h-5 w-5 text-amber-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: Notification['type'], isRead: boolean) => {
    if (isRead) return 'bg-gray-50 border-gray-200'

    switch (type) {
      case 'new_teacher':
        return 'bg-blue-50 border-blue-200'
      case 'new_student':
        return 'bg-green-50 border-green-200'
      case 'payment_received':
        return 'bg-emerald-50 border-emerald-200'
      case 'plan_purchased':
        return 'bg-purple-50 border-purple-200'
      case 'teacher_approval_needed':
        return 'bg-orange-50 border-orange-200'
      case 'student_approval_needed':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-gray-50 border-gray-200'
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notificações</h1>
            <p className="text-gray-600">
              Acompanhe as atividades da plataforma em tempo real
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {unreadNotifications > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {unreadNotifications} não lidas
              </Badge>
            )}
            {unreadNotifications > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notificações */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma notificação
            </h3>
            <p className="text-gray-600">
              Você está em dia! Não há novas notificações no momento.
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 border-2 transition-all ${getNotificationColor(notification.type, notification.is_read)}`}
            >
              <div className="flex items-start space-x-4">
                {/* Ícone */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`text-sm font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className={`text-sm mb-3 ${notification.is_read ? 'text-gray-600' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        <Badge variant="outline" className="text-xs">
                          {notification.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Tempo */}
                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Ações para aprovações */}
                  {(notification.type === 'teacher_approval_needed' || notification.type === 'student_approval_needed') && (
                    <div className="mt-4 flex items-center space-x-3">
                      <Button
                        onClick={() => handleApprove(notification.data.approval_request_id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => handleReject(notification.data.approval_request_id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                      {notification.type === 'teacher_approval_needed' && (
                        <>
                          <Button
                            onClick={() => handleOpenCrefCard(notification.data.user_id)}
                            size="sm"
                            variant="outline"
                            className="hover:bg-gray-50"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver carteirinha
                          </Button>
                          <Button
                            onClick={() => {
                              const userId = notification.data.user_id
                              if (userId) {
                                window.open(`/franqueadora/dashboard/usuarios?user_id=${userId}`, '_blank')
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                          >
                            Abrir no painel (franqueadora)
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Ação para marcar como lida */}
                  {!notification.is_read && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handleMarkAsRead(notification.id)}
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Marcar como lida
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
