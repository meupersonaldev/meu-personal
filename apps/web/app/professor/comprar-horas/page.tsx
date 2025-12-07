'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Barcode, QrCode, Check, Loader2, History, ShoppingBag, ArrowLeft, ShieldCheck, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTeacherAcademies } from '@/lib/hooks/useTeacherAcademies'
import ProfessorLayout from '@/components/layout/professor-layout'
import { API_BASE_URL } from '@/lib/api'
import { useTeacherApproval } from '@/hooks/use-teacher-approval'
import { ApprovalBanner } from '@/components/teacher/approval-banner'
import { ApprovalBlock } from '@/components/teacher/approval-block'
import { PaymentHistory } from '@/components/payment-history'
import { cn } from '@/lib/utils'

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
  const router = useRouter()
  const { user, token } = useAuthStore()
  const { isNotApproved, approvalStatus } = useTeacherApproval()
  const { academies, loading: loadingAcademies } = useTeacherAcademies()

  const [packages, setPackages] = useState<HoursPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<HoursPackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'comprar' | 'historico'>('comprar')
  const [step, setStep] = useState<'select-package' | 'payment' | 'success'>('select-package')
  const [showCpfModal, setShowCpfModal] = useState(false)
  const [cpfInput, setCpfInput] = useState('')
  const [cpfSaving, setCpfSaving] = useState(false)

  // Carregar pacotes
  useEffect(() => {
    if (!user?.id || !token) return

    fetch(`${API_BASE_URL}/api/packages/professor`, {
      headers: { Authorization: `Bearer ${token}` },
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
        setSelectedPackage(prev => {
          if (!mapped.length) return null
          if (!prev) return mapped[0]
          const exists = mapped.find((pkg: HoursPackage) => pkg.id === prev.id)
          return exists || mapped[0]
        })
      })
      .catch(() => {
        toast.error('Erro ao carregar pacotes de horas')
        setPackages([])
      })
  }, [user?.id, token])

  const handlePurchase = async () => {
    if (!selectedPackage || !user?.id) return

    // Verificar aprovação antes de permitir compra
    if (isNotApproved) {
      toast.error('Seu cadastro precisa ser aprovado antes de comprar horas. Aguarde a análise da administração.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/professor/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: selectedPackage.id,
          payment_method: paymentMethod,
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const paymentIntentId = data?.payment_intent?.id
        const url = data?.payment_intent?.checkout_url

        if (paymentIntentId && url) {
          setCheckoutUrl(url)
          setPaymentData(data.payment_intent)
          setStep('success')
          return
        }

        if (url) {
          setCheckoutUrl(url)
        }

        setPaymentData(data.payment_intent)
        setStep('success')
      } else {
        const errMsg = (data?.error || data?.message || '').toString()
        const errorCode = data?.error || ''

        if (response.status === 400 && errMsg.toLowerCase().includes('cpf')) {
          setShowCpfModal(true)
          return
        }

        // Tratamento específico para erro de criação de conta Asaas
        if (errorCode === 'ASAAS_ACCOUNT_CREATION_FAILED') {
          toast.error('Não foi possível configurar a conta de pagamento da franquia. Por favor, entre em contato com o suporte ou tente novamente mais tarde.')
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
    if (!user?.id || !token) return
    try {
      setCpfSaving(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      // Atualizar CPF
      const patchResp = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: selectedPackage?.id,
          payment_method: paymentMethod,
        })
      })

      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const paymentIntentId = data?.payment_intent?.id
        const url = data?.payment_intent?.checkout_url

        if (paymentIntentId && url) {
          setCheckoutUrl(url)
          setShowCpfModal(false)
          setPaymentData(data.payment_intent)
          setStep('success')
          return
        }

        if (url) {
          setCheckoutUrl(url)
        }

        setPaymentData(data.payment_intent)
        setStep('success')
        setShowCpfModal(false)
      } else {
        const errMsg = (data?.error || data?.message || 'Erro ao processar pagamento').toString()
        const errorCode = data?.error || ''

        if (errorCode === 'ASAAS_ACCOUNT_CREATION_FAILED') {
          toast.error('Não foi possível configurar a conta de pagamento da franquia. Por favor, entre em contato com o suporte ou tente novamente mais tarde.')
          return
        }

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

  // Verificar aprovação ANTES de verificar unidades
  if (isNotApproved) {
    return (
      <ProfessorLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <ApprovalBanner approvalStatus={approvalStatus} userName={user?.name} />
            <ApprovalBlock
              title={approvalStatus === 'rejected' ? 'Acesso Negado' : 'Compra de Horas Bloqueada'}
              message={approvalStatus === 'rejected'
                ? 'Seu cadastro foi reprovado. Entre em contato com a administração para mais informações.'
                : 'Você poderá comprar pacotes de horas após a aprovação do seu cadastro pela administração.'}
              fullPage
              approvalStatus={approvalStatus}
            />
          </div>
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
      {/* Top Decoration */}
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-blue-600 to-meu-primary -z-10 opacity-10 rounded-b-[60px]" />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 text-gray-500 hover:text-meu-primary pl-1 md:hidden mb-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {step === 'select-package' && 'Comprar Horas'}
              {step === 'payment' && 'Confirmação e Pagamento'}
              {step === 'success' && 'Pedido Realizado!'}
            </h1>
            <p className="text-lg text-gray-500">
              {step === 'select-package' && 'Invista em sua carreira. Escolha o pacote ideal.'}
              {step === 'payment' && 'Finalize sua compra com segurança.'}
              {step === 'success' && 'Tudo pronto. Boas aulas!'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors", step === 'select-package' ? "bg-meu-primary/10 text-meu-primary" : "text-gray-400")}>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs", step === 'select-package' ? "bg-meu-primary text-white" : "bg-gray-200 text-gray-500")}>1</div>
              Pacotes
            </div>
            <div className="w-4 h-[1px] bg-gray-300" />
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors", step !== 'select-package' ? "bg-meu-primary/10 text-meu-primary" : "text-gray-400")}>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs", step !== 'select-package' ? "bg-meu-primary text-white" : "bg-gray-200 text-gray-500")}>2</div>
              Pagamento
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="comprar" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
          <TabsList className="bg-white border border-gray-200 shadow-sm p-1 rounded-xl w-full sm:w-auto h-12">
            <TabsTrigger value="comprar" className="rounded-lg data-[state=active]:bg-meu-primary data-[state=active]:text-white data-[state=active]:shadow-md px-6 h-full flex items-center gap-2 text-base transition-all">
              <ShoppingBag className="h-4 w-4" />
              Comprar
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-lg data-[state=active]:bg-meu-primary data-[state=active]:text-white data-[state=active]:shadow-md px-6 h-full flex items-center gap-2 text-base transition-all">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PaymentHistory />
          </TabsContent>

          <TabsContent value="comprar" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">

            {/* Passo 1: Selecionar Pacote */}
            {step === 'select-package' && (
              <div className="space-y-6">
                {/* Mensagem explicativa (mantida do layout anterior mas estilizada) */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
                  <Clock className="h-5 w-5 text-meu-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Como funciona o Banco de Horas?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Compre horas antecipadamente e use quando quiser dar aulas.
                      Suas horas são debitadas apenas quando as aulas são concluídas.
                    </p>
                  </div>
                </div>

                {packages.length === 0 ? (
                  <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-dashed border-2">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum pacote disponível</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Não encontramos pacotes de horas ativos no momento.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={cn(
                          "group relative bg-white rounded-3xl p-6 md:p-8 cursor-pointer transition-all duration-300 border-2 overflow-hidden hover:scale-[1.02]",
                          selectedPackage?.id === pkg.id
                            ? "border-meu-primary shadow-2xl shadow-blue-500/10"
                            : "border-transparent hover:border-gray-200 shadow-xl shadow-gray-200/50"
                        )}
                      >
                        {/* Highlight Effect */}
                        {selectedPackage?.id === pkg.id && (
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-meu-primary" />
                        )}

                        <div className="flex flex-col h-full">
                          <div className="mb-6">
                            <Badge className={cn("mb-3 px-3 py-1 text-sm font-semibold rounded-lg", selectedPackage?.id === pkg.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                              {pkg.hours_included} Horas
                            </Badge>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-meu-primary transition-colors">{pkg.name}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{pkg.description}</p>
                          </div>

                          <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm text-gray-400 font-medium">R$</span>
                              <span className="text-4xl font-bold text-gray-900 tracking-tight">{pkg.price.toFixed(2).split('.')[0]}</span>
                              <span className="text-xl font-bold text-gray-500">,{pkg.price.toFixed(2).split('.')[1]}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-medium text-meu-primary bg-blue-50 px-2 py-0.5 rounded">
                                R$ {(pkg.price / pkg.hours_included).toFixed(2)} / hora
                              </span>
                            </div>
                          </div>

                          <ul className="space-y-3 mb-8 flex-1">
                            {pkg.features.slice(0, 4).map((feature, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                <div className="mt-0.5 min-w-[18px] h-[18px] rounded-full bg-green-100 flex items-center justify-center">
                                  <Check className="h-3 w-3 text-green-600" />
                                </div>
                                {feature}
                              </li>
                            ))}

                          </ul>

                          <Button
                            className={cn(
                              "w-full h-12 text-base font-bold shadow-lg transition-all",
                              selectedPackage?.id === pkg.id
                                ? "bg-meu-primary hover:bg-meu-primary-dark text-white"
                                : "bg-gray-900 hover:bg-gray-800 text-white"
                            )}
                          >
                            {selectedPackage?.id === pkg.id ? 'Selecionado' : 'Escolher este pacote'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPackage && (
                  <div className="flex justify-end pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <Button
                      onClick={() => setStep('payment')}
                      className="h-14 px-8 text-lg font-bold bg-meu-primary hover:bg-meu-primary-dark shadow-xl hover:shadow-2xl hover:scale-105 transition-all rounded-xl"
                    >
                      Ir para Pagamento
                      <ChevronRight className="ml-2 h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Passo 2: Pagamento */}
            {step === 'payment' && selectedPackage && (
              <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  {/* Resumo Lateral */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 sticky top-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-meu-primary" />
                        Resumo do Pedido
                      </h3>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 text-sm">Pacote</span>
                          <span className="font-semibold text-gray-900 text-right">{selectedPackage.name}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 text-sm">Horas</span>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">{selectedPackage.hours_included} horas</Badge>
                        </div>

                      </div>

                      <div className="border-t border-dashed border-gray-200 my-4" />

                      <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-500 font-medium">Total</span>
                        <span className="text-3xl font-bold text-gray-900">R$ {selectedPackage.price.toFixed(2)}</span>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-snug">
                          Pagamento processado com segurança. Seus dados estão protegidos.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Métodos de Pagamento - Painel Principal */}
                  <div className="md:col-span-3">
                    <Card className="border-0 shadow-xl overflow-hidden bg-white/90 backdrop-blur-sm">
                      <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
                        <CardTitle>Como você prefere pagar?</CardTitle>
                        <CardDescription>Escolha uma das opções abaixo para finalizar.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-6">

                        <div className="grid grid-cols-1 gap-4">
                          <div
                            onClick={() => setPaymentMethod('PIX')}
                            className={cn(
                              "relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:bg-gray-50",
                              paymentMethod === 'PIX' ? "border-blue-500 bg-blue-50/50" : "border-gray-200"
                            )}
                          >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", paymentMethod === 'PIX' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>
                              <QrCode className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">PIX</p>
                              <p className="text-xs text-gray-500">Aprovação imediata. QR Code gerado na hora.</p>
                            </div>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", paymentMethod === 'PIX' ? "border-blue-600" : "border-gray-300")}>
                              {paymentMethod === 'PIX' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                            </div>
                          </div>

                          <div
                            onClick={() => setPaymentMethod('CREDIT_CARD')}
                            className={cn(
                              "relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:bg-gray-50",
                              paymentMethod === 'CREDIT_CARD' ? "border-blue-500 bg-blue-50/50" : "border-gray-200"
                            )}
                          >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", paymentMethod === 'CREDIT_CARD' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>
                              <CreditCard className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">Cartão de Crédito</p>
                              <p className="text-xs text-gray-500">Parcelamento disponível via link de pagamento.</p>
                            </div>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", paymentMethod === 'CREDIT_CARD' ? "border-blue-600" : "border-gray-300")}>
                              {paymentMethod === 'CREDIT_CARD' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                            </div>
                          </div>

                          <div
                            onClick={() => setPaymentMethod('BOLETO')}
                            className={cn(
                              "relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:bg-gray-50",
                              paymentMethod === 'BOLETO' ? "border-blue-500 bg-blue-50/50" : "border-gray-200"
                            )}
                          >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", paymentMethod === 'BOLETO' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500")}>
                              <Barcode className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">Boleto Bancário</p>
                              <p className="text-xs text-gray-500">Pode levar até 3 dias úteis para compensar.</p>
                            </div>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", paymentMethod === 'BOLETO' ? "border-blue-600" : "border-gray-300")}>
                              {paymentMethod === 'BOLETO' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 flex gap-4">
                          <Button variant="outline" onClick={() => setStep('select-package')} className="h-12 flex-1 rounded-xl">
                            Voltar
                          </Button>
                          <Button
                            className="h-12 flex-[2] bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:scale-[1.02] transition-all"
                            onClick={handlePurchase}
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Pagamento'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {checkoutUrl && paymentData?.id && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-yellow-800 text-sm font-medium">Link de pagamento gerado!</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                          // Use window.location.href for iOS compatibility as seen in previous code
                          onClick={() => {
                            if (checkoutUrl) window.location.href = checkoutUrl
                            else if (paymentData?.id) router.push(`/professor/pagamento/${paymentData.id}`)
                          }}
                        >
                          Ir para Pagamento
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {step === 'success' && paymentData && (
              <div className="max-w-xl mx-auto animate-in zoom-in-95 duration-500 pt-8">
                <Card className="border-0 shadow-2xl overflow-hidden text-center rounded-3xl">
                  <div className="bg-green-600 h-32 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="h-10 w-10 text-green-600" />
                    </div>
                  </div>
                  <CardContent className="p-8 md:p-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Pedido Criado!</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                      Seu pedido foi gerado com sucesso. Para liberar seus créditos, finalize o pagamento abaixo.
                    </p>

                    <div className="space-y-4">
                      {checkoutUrl && (
                        <Button
                          className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl shadow-green-600/30 rounded-xl hover:scale-105 transition-all"
                          onClick={() => {
                            if (checkoutUrl) window.location.href = checkoutUrl
                            else if (paymentData?.id) router.push(`/professor/pagamento/${paymentData.id}`)
                          }}
                        >
                          Pagar Agora
                        </Button>
                      )}

                      <Button variant="ghost" onClick={() => router.push('/professor/dashboard')} className="text-gray-500">
                        Voltar ao Início
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCpfModal} onOpenChange={setShowCpfModal}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
          <div className="bg-gradient-to-br from-blue-600 to-meu-primary h-24 w-full flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-50 backdrop-blur-[2px]" />
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg relative z-10 border border-white/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="p-8 pb-6 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center text-gray-900">Segurança em primeiro lugar</DialogTitle>
              <DialogDescription className="text-center text-base text-gray-600 pt-2">
                Para sua proteção e emissão da nota fiscal, precisamos que confirme seu CPF antes de prosseguir com o pagamento.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-meu-primary rounded-xl opacity-20 group-hover:opacity-40 transition duration-200 blur"></div>
                <Input
                  type="text"
                  value={cpfInput}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '')
                    if (v.length > 11) v = v.slice(0, 11)
                    v = v.replace(/(\d{3})(\d)/, '$1.$2')
                    v = v.replace(/(\d{3})(\d)/, '$1.$2')
                    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                    setCpfInput(v)
                  }}
                  placeholder="000.000.000-00"
                  className="relative bg-white border-gray-200 h-14 text-lg text-center font-mono tracking-wider text-gray-800 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                Ambiente seguro e criptografado
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 pb-8 flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowCpfModal(false)}
              disabled={cpfSaving}
              className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveCpfAndRetry}
              disabled={cpfSaving || cpfInput.length < 14}
              className="w-full h-12 bg-meu-primary hover:bg-meu-primary-dark text-white font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all rounded-xl"
            >
              {cpfSaving ? <Loader2 className="animate-spin" /> : 'Confirmar e Pagar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProfessorLayout>
  )
}
