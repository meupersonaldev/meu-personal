'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Subscription {
  id: string
  plan: {
    name: string
    price: number
    credits_included: number
  }
  status: 'pending' | 'active' | 'cancelled' | 'overdue'
  asaas_payment_id: string
  created_at: string
}

export default function MyPlansPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    try {
      // TODO: Pegar student_id do contexto/auth
      const student_id = 'student-id-aqui'

      const response = await fetch(`http://localhost:3001/api/plans/students/subscriptions?student_id=${student_id}`)
      const data = await response.json()
      setSubscriptions(data || [])
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error)
      toast.error('Erro ao carregar assinaturas')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/checkout/status/${paymentId}`)
      const data = await response.json()

      toast.success(`Status: ${data.status}`)
      await loadSubscriptions()
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      toast.error('Erro ao verificar status')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Aguardando Pagamento</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
      case 'overdue':
        return <Badge className="bg-orange-100 text-orange-800">Vencido</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'pending':
        return <Clock className="h-8 w-8 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-8 w-8 text-red-600" />
      case 'overdue':
        return <AlertCircle className="h-8 w-8 text-orange-600" />
      default:
        return <Clock className="h-8 w-8 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando suas compras...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Planos</h1>
          <p className="text-gray-600">Acompanhe suas compras e pagamentos</p>
        </div>

        {subscriptions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Clock className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Você ainda não tem planos
            </h3>
            <p className="text-gray-600 mb-6">
              Compre créditos para começar a agendar suas aulas
            </p>
            <Button
              onClick={() => window.location.href = '/student/plans'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ver Planos Disponíveis
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">
                      {getStatusIcon(sub.status)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {sub.plan.name}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {sub.plan.credits_included} créditos • R$ {sub.plan.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Comprado em {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(sub.status)}
                  </div>
                </div>

                {/* Ações */}
                {sub.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Aguardando confirmação de pagamento
                      </p>
                      <Button
                        onClick={() => checkPaymentStatus(sub.asaas_payment_id)}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar Status
                      </Button>
                    </div>
                  </div>
                )}

                {sub.status === 'active' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ Créditos liberados! Você já pode agendar suas aulas.
                      </p>
                    </div>
                  </div>
                )}

                {sub.status === 'overdue' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800 font-medium">
                        Pagamento vencido. Entre em contato com o suporte.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}