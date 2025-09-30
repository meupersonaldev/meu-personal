'use client'

import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock, Zap, QrCode, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  credits_included: number
  duration_days: number
  features: string[]
  is_active: boolean
}

interface CheckoutResponse {
  subscription_id: string
  payment_id: string
  payment_url: string
  pix_code?: string
  pix_copy_paste?: string
  bank_slip_url?: string
  status: string
  value: number
}

export default function StudentPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX')
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Buscar planos disponíveis
  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/plans/student')
      const data = await response.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setCheckoutData(null)
  }

  const handleCheckout = async () => {
    if (!selectedPlan) return

    setProcessingPayment(true)
    try {
      // Implementação futura com dados reais do usuário autenticado
      toast.info('Funcionalidade de pagamento em desenvolvimento')

      // Exemplo de implementação futura:
      // const { user } = useAuthStore.getState()
      // const response = await fetch('http://localhost:3001/api/checkout/student', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     student_id: user.id,
      //     plan_id: selectedPlan.id,
      //     academy_id: academy_id,
      //     payment_method: paymentMethod
      //   })
      // })
    } catch (error) {
      console.error('Erro no checkout:', error)
      toast.error('Erro ao processar pagamento')
    } finally {
      setProcessingPayment(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para área de transferência!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-gray-600">
            Compre créditos e agende suas aulas
          </p>
        </div>

        {!checkoutData ? (
          <>
            {/* Planos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
                    selectedPlan?.id === plan.id
                      ? 'ring-4 ring-blue-500 shadow-xl'
                      : 'hover:ring-2 hover:ring-blue-300'
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {/* Badge Destaque */}
                  {plan.credits_included >= 8 && (
                    <Badge className="mb-4 bg-green-100 text-green-800">
                      Mais Popular
                    </Badge>
                  )}

                  {/* Preço */}
                  <div className="mb-6">
                    <div className="text-4xl font-bold text-gray-900">
                      R$ {plan.price.toFixed(2)}
                    </div>
                    <div className="text-gray-600 mt-2">
                      {plan.credits_included} créditos
                    </div>
                  </div>

                  {/* Nome e Descrição */}
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-start">
                      <Clock className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Válido por {plan.duration_days} dias
                      </span>
                    </li>
                  </ul>

                  {/* Botão */}
                  <Button
                    className={`w-full ${
                      selectedPlan?.id === plan.id
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {selectedPlan?.id === plan.id ? 'Selecionado' : 'Selecionar'}
                  </Button>
                </Card>
              ))}
            </div>

            {/* Métodos de Pagamento */}
            {selectedPlan && (
              <Card className="p-8 max-w-2xl mx-auto">
                <h3 className="text-2xl font-semibold mb-6">
                  Escolha a forma de pagamento
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <button
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      paymentMethod === 'PIX'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">PIX</div>
                    <div className="text-sm text-gray-600">Instantâneo</div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">Cartão</div>
                    <div className="text-sm text-gray-600">Crédito</div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('BOLETO')}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      paymentMethod === 'BOLETO'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">Boleto</div>
                    <div className="text-sm text-gray-600">3 dias úteis</div>
                  </button>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={processingPayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                >
                  {processingPayment ? (
                    <>
                      <Clock className="h-5 w-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Finalizar Compra - R$ {selectedPlan.price.toFixed(2)}
                    </>
                  )}
                </Button>
              </Card>
            )}
          </>
        ) : (
          /* Tela de Pagamento */
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Gerado!
              </h2>
              <p className="text-gray-600">
                Complete o pagamento para receber seus créditos
              </p>
            </div>

            {/* PIX */}
            {paymentMethod === 'PIX' && checkoutData.pix_copy_paste && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Pagar com PIX</h3>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-2">Código PIX:</p>
                  <code className="text-xs break-all">{checkoutData.pix_copy_paste}</code>
                </div>
                <Button
                  onClick={() => copyToClipboard(checkoutData.pix_copy_paste!)}
                  className="w-full"
                >
                  Copiar Código PIX
                </Button>
              </div>
            )}

            {/* Boleto */}
            {paymentMethod === 'BOLETO' && checkoutData.bank_slip_url && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Pagar com Boleto</h3>
                <Button
                  onClick={() => window.open(checkoutData.bank_slip_url, '_blank')}
                  className="w-full"
                >
                  Baixar Boleto
                </Button>
              </div>
            )}

            {/* Link Geral */}
            {checkoutData.payment_url && (
              <div className="text-center">
                <Button
                  onClick={() => window.open(checkoutData.payment_url, '_blank')}
                  variant="outline"
                  className="w-full"
                >
                  Abrir Página de Pagamento
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Seus créditos serão liberados automaticamente após a confirmação do pagamento</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}