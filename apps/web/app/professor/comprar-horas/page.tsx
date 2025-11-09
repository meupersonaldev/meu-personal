'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Barcode, QrCode, Check, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { API_BASE_URL } from '@/lib/api'

interface HoursPackage {
  id: string
  name: string
  description: string
  price: number
  hours_included: number
  validity_days: number
  features: string[]
}

export default function ComprarHorasPage() {
  const { user } = useAuthStore()
  const { academies, loading: loadingAcademies } = useTeacherAcademies()
  const [packages, setPackages] = useState<HoursPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<HoursPackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [step, setStep] = useState<'select-package' | 'payment' | 'success'>('select-package')
  const [showCpfModal, setShowCpfModal] = useState(false)
  const [cpfInput, setCpfInput] = useState('')
  const [cpfSaving, setCpfSaving] = useState(false)

  // Carregar pacotes de horas disponíveis para o professor
  useEffect(() => {
    if (!user?.id) return
    fetch(`${API_BASE_URL}/api/packages/professor`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.json()
      })
      .then(data => {
        const pkgs = data?.packages || []
        const mapped = pkgs.map((p: any) => ({
          id: p.id,
          name: p.title ?? 'Pacote',
          description: p.metadata_json?.description ?? '',
          price: (p.price_cents ?? 0) / 100,
          hours_included: p.hours_qty ?? 0,
          validity_days: p.metadata_json?.validity_days ?? 90,
          features: Array.isArray(p.metadata_json?.features) ? p.metadata_json.features : [],
        }))
        setPackages(mapped)
      })
      .catch(() => {
        toast.error('Erro ao carregar pacotes de horas')
        setPackages([])
      })
  }, [user?.id])

  const handlePurchase = async () => {
    if (!selectedPackage || !user?.id) return

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/professor/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({
          package_id: selectedPackage.id,
          payment_method: paymentMethod,
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const checkoutUrl = data?.payment_intent?.checkout_url
        if (checkoutUrl) window.open(checkoutUrl, '_blank')
        setPaymentData(data.payment_intent)
        setStep('success')
      } else {
        const errMsg = (data?.error || data?.message || '').toString()
        if (response.status === 400 && errMsg.toLowerCase().includes('cpf')) {
          setShowCpfModal(true)
          return
        }
        toast.error('Erro ao processar pagamento: ' + errMsg)
      }
    } catch {
      toast.error('Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  const saveCpfAndRetry = async () => {
    if (!user?.id) return
    const token = useAuthStore.getState().token
    try {
      setCpfSaving(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      // Atualizar CPF
      const patchResp = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cpf: cpfInput })
      })
      const patchData = await patchResp.json().catch(() => ({}))
      if (!patchResp.ok) {
        const msg = (patchData?.error || patchData?.message || 'Falha ao salvar CPF').toString()
        toast.error(msg)
        return
      }

      // Retry checkout
      const response = await fetch(`${API_BASE_URL}/api/packages/professor/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          package_id: selectedPackage?.id,
          payment_method: paymentMethod,
        })
      })

      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const checkoutUrl = data?.payment_intent?.checkout_url
        if (checkoutUrl) window.open(checkoutUrl, '_blank')
        setPaymentData(data.payment_intent)
        setStep('success')
        setShowCpfModal(false)
      } else {
        const errMsg = (data?.error || data?.message || 'Erro ao processar pagamento').toString()
        toast.error(errMsg)
      }
    } catch {
      toast.error('Falha ao salvar CPF ou processar pagamento')
    } finally {
      setCpfSaving(false)
    }
  }

  if (!user || loadingAcademies) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProfessorLayout>
    )
  }

  if (academies.length === 0) {
    return (
      <ProfessorLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Configure suas unidades primeiro</h2>
            <p className="text-gray-600 mb-6">
              Para comprar pacotes de horas, você precisa configurar em quais unidades irá trabalhar.
            </p>
            <Button onClick={() => window.location.href = '/professor/configuracoes'}>
              Ir para Configurações
            </Button>
          </div>
        </div>
      </ProfessorLayout>
    )
  }

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Comprar Banco de Horas
          </h1>
          <p className="text-lg text-gray-600">
            Adquira horas para dar aulas e expandir seu negócio
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'select-package' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-package' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Escolher Pacote</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'payment' || step === 'success' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' || step === 'success' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Pagamento</span>
            </div>
          </div>
        </div>

        {/* Step 1: Selecionar Pacote */}
        {step === 'select-package' && (
          <>
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Como funciona o Banco de Horas?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Compre horas e use quando quiser dar aulas</li>
                    <li>• Suas horas são debitadas quando as aulas são concluídas</li>
                    <li>• Suas horas não expiram durante o período de validade</li>
                    <li>• Quanto mais horas, melhor o custo-benefício</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg, index) => (
                <Card
                  key={pkg.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-xl relative ${
                    selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-600 shadow-xl' : ''
                  } ${index === 1 ? 'md:scale-105 border-2 border-blue-600' : ''}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                      Mais Popular
                    </Badge>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                    
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        R$ {pkg.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        R$ {(pkg.price / pkg.hours_included).toFixed(2)}/hora
                      </div>
                    </div>

                    <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                      {pkg.hours_included} horas
                    </Badge>
                    <div className="text-xs text-gray-500 mt-2">
                      Válido por {pkg.validity_days} dias
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {selectedPackage?.id === pkg.id && (
                    <Badge className="w-full bg-blue-600 text-white justify-center py-2">
                      Selecionado
                    </Badge>
                  )}
                </Card>
              ))}
            </div>

            {selectedPackage && (
              <div className="mt-8 text-center">
                <Button
                  onClick={() => setStep('payment')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
                >
                  Continuar para Pagamento
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 2: Pagamento */}
        {step === 'payment' && selectedPackage && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumo da Compra</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pacote:</span>
                  <span className="font-semibold">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Horas:</span>
                  <span className="font-semibold">{selectedPackage.hours_included}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Validade:</span>
                  <span className="font-semibold">{selectedPackage.validity_days} dias</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Custo por hora:</span>
                  <span className="font-semibold">R$ {(selectedPackage.price / selectedPackage.hours_included).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-4 border-t">
                  <span>Total:</span>
                  <span className="text-blue-600">R$ {selectedPackage.price.toFixed(2)}</span>
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
                    <span className="text-xs text-green-600">Instantâneo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('BOLETO')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'BOLETO' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <Barcode className="h-8 w-8" />
                    <span className="font-medium">Boleto</span>
                    <span className="text-xs text-gray-500">1-3 dias</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'CREDIT_CARD' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <CreditCard className="h-8 w-8" />
                    <span className="font-medium">Cartão</span>
                    <span className="text-xs text-blue-600">Parcelado</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep('select-package')}
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

        {/* Step 3: Sucesso */}
        {step === 'success' && paymentData && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Pagamento Criado com Sucesso!
              </h2>

              {paymentMethod === 'PIX' && (
                <div className="mb-6">
                  {paymentData.pix_qr_code && (
                    <>
                      <p className="text-gray-600 mb-4">Escaneie o QR Code para pagar:</p>
                      <img
                        src={`data:image/png;base64,${paymentData.pix_qr_code}`}
                        alt="QR Code PIX"
                        className="mx-auto w-64 h-64"
                      />
                    </>
                  )}
                  {paymentData.pix_copy_paste && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Ou copie o código:</p>
                      <div className="bg-gray-100 p-3 rounded text-xs break-all">
                        {paymentData.pix_copy_paste}
                      </div>
                      <Button
                        onClick={() => navigator.clipboard.writeText(paymentData.pix_copy_paste)}
                        variant="outline"
                        className="mt-2"
                      >
                        Copiar Código
                      </Button>
                    </div>
                  )}
                  {!paymentData.pix_copy_paste && paymentData.checkout_url && (
                    <div className="mt-4">
                      <Button
                        onClick={() => window.open(paymentData.checkout_url, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Abrir Checkout
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'BOLETO' && (paymentData.invoice_url || paymentData.payment_url || paymentData.checkout_url) && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">Seu boleto foi gerado!</p>
                  <Button
                    onClick={() => window.open(paymentData.invoice_url || paymentData.payment_url || paymentData.checkout_url, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Barcode className="h-4 w-4 mr-2" />
                    Visualizar Boleto
                  </Button>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Após a confirmação do pagamento, suas {selectedPackage?.hours_included} horas 
                  serão creditadas automaticamente no seu banco de horas!
                </p>
              </div>

              <Button
                onClick={() => window.location.href = '/professor/dashboard'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para o Dashboard
              </Button>
            </Card>
          </div>
        )}
      </div>
      </div>
    {showCpfModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">CPF obrigatório</h3>
          <p className="text-sm text-gray-600 mb-4">Digite seu CPF para continuar com o pagamento.</p>
          <input
            type="text"
            value={cpfInput}
            onChange={(e) => setCpfInput(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCpfModal(false)} disabled={cpfSaving}>Cancelar</Button>
            <Button onClick={saveCpfAndRetry} disabled={cpfSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {cpfSaving ? 'Salvando...' : 'Salvar CPF e tentar novamente'}
            </Button>
          </div>
        </div>
      </div>
    )}
    </ProfessorLayout>
  )
}
