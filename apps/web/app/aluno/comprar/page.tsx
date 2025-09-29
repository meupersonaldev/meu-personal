'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Barcode, QrCode, Check, Loader2, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  credits_included: number
  features: string[]
}

interface Teacher {
  id: string
  name: string
  avatar_url?: string
  specialties: string[]
  rating: number
}

export default function ComprarCreditosPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [step, setStep] = useState<'select-plan' | 'select-teacher' | 'payment' | 'success'>('select-plan')

  // Carregar planos
  useEffect(() => {
    fetch('/api/plans/student')
      .then(res => res.json())
      .then(data => setPlans(data.plans || []))
      .catch(err => console.error('Erro ao carregar planos:', err))
  }, [])

  // Carregar professores
  useEffect(() => {
    if (step === 'select-teacher') {
      fetch('/api/teachers?available=true')
        .then(res => res.json())
        .then(data => setTeachers(data.teachers || []))
        .catch(err => console.error('Erro ao carregar professores:', err))
    }
  }, [step])

  const handlePurchase = async () => {
    if (!selectedPlan || !selectedTeacher) return

    setLoading(true)

    try {
      const response = await fetch('/api/payments/student/purchase-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'USER_ID_AQUI', // TODO: Pegar do contexto de autenticação
          package_id: selectedPlan.id,
          teacher_id: selectedTeacher.id,
          payment_method: paymentMethod
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPaymentData(data.payment)
        setStep('success')
      } else {
        alert('Erro ao processar pagamento: ' + data.error)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Comprar Créditos
          </h1>
          <p className="text-lg text-gray-600">
            Escolha seu plano e comece a treinar com os melhores professores
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'select-plan' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-plan' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Escolher Plano</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'select-teacher' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-teacher' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Escolher Professor</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'payment' || step === 'success' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' || step === 'success' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Pagamento</span>
            </div>
          </div>
        </div>

        {/* Step 1: Selecionar Plano */}
        {step === 'select-plan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-xl ${
                  selectedPlan?.id === plan.id ? 'ring-2 ring-blue-600 shadow-xl' : ''
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    R$ {plan.price.toFixed(2)}
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {plan.credits_included} créditos
                  </Badge>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700">
                      <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {selectedPlan?.id === plan.id && (
                  <Badge className="w-full bg-blue-600 text-white justify-center">
                    Selecionado
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )}

        {step === 'select-plan' && selectedPlan && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => setStep('select-teacher')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2: Selecionar Professor */}
        {step === 'select-teacher' && (
          <>
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <Gift className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Professor ganha 1h de brinde!</h4>
                <p className="text-sm text-amber-800">
                  O professor que você escolher receberá 1 hora grátis como presente da academia. 
                  Ele poderá usar essa hora como quiser!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <Card
                  key={teacher.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-xl ${
                    selectedTeacher?.id === teacher.id ? 'ring-2 ring-blue-600 shadow-xl' : ''
                  }`}
                  onClick={() => setSelectedTeacher(teacher)}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        ⭐ {teacher.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {teacher.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {selectedTeacher?.id === teacher.id && (
                    <Badge className="w-full mt-4 bg-blue-600 text-white justify-center">
                      Selecionado
                    </Badge>
                  )}
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <Button
                onClick={() => setStep('select-plan')}
                variant="outline"
                className="px-8 py-3"
              >
                Voltar
              </Button>
              {selectedTeacher && (
                <Button
                  onClick={() => setStep('payment')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  Continuar para Pagamento
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step 3: Pagamento */}
        {step === 'payment' && selectedPlan && selectedTeacher && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumo da Compra</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plano:</span>
                  <span className="font-semibold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Créditos:</span>
                  <span className="font-semibold">{selectedPlan.credits_included} aulas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Professor escolhido:</span>
                  <span className="font-semibold">{selectedTeacher.name}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-4 border-t">
                  <span>Total:</span>
                  <span className="text-blue-600">R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Forma de Pagamento:</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'PIX' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <QrCode className="h-8 w-8" />
                    <span className="font-medium">PIX</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('BOLETO')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'BOLETO' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <Barcode className="h-8 w-8" />
                    <span className="font-medium">Boleto</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'CREDIT_CARD' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <CreditCard className="h-8 w-8" />
                    <span className="font-medium">Cartão</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep('select-teacher')}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handlePurchase}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Finalizar Compra'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Sucesso */}
        {step === 'success' && paymentData && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Pagamento Criado com Sucesso!
              </h2>

              {paymentMethod === 'PIX' && paymentData.pix_qr_code && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">Escaneie o QR Code para pagar:</p>
                  <img
                    src={`data:image/png;base64,${paymentData.pix_qr_code}`}
                    alt="QR Code PIX"
                    className="mx-auto w-64 h-64"
                  />
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Ou copie o código:</p>
                    <div className="bg-gray-100 p-3 rounded text-xs break-all">
                      {paymentData.pix_copy_paste}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'BOLETO' && paymentData.invoice_url && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">Seu boleto foi gerado!</p>
                  <Button
                    onClick={() => window.open(paymentData.invoice_url, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Barcode className="h-4 w-4 mr-2" />
                    Visualizar Boleto
                  </Button>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-6">
                Após a confirmação do pagamento, seus créditos serão liberados automaticamente
                e o professor receberá 1h de brinde!
              </p>

              <Button
                onClick={() => window.location.href = '/aluno/dashboard'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para o Dashboard
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
