'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PaymentIntent {
  id: string
  checkout_url: string | null
  status: string
  type: string
  amount_cents: number
}

export default function PagamentoPage() {
  const router = useRouter()
  const params = useParams()
  const paymentIntentId = params.id as string
  const { token } = useAuthStore()
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [loading, setLoading] = useState(true)
  const [opened, setOpened] = useState(false)
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null)
  const [polling, setPolling] = useState(false)

  // Detectar se é iOS
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  useEffect(() => {
    if (!token || !paymentIntentId) return

    const fetchPaymentIntent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/packages/payment-intent/${paymentIntentId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar link de pagamento')
        }

        const data = await response.json()
        const intent = data.payment_intent
        
        console.log('Payment Intent recebido:', {
          id: intent?.id,
          checkout_url: intent?.checkout_url,
          status: intent?.status,
          hasUrl: !!intent?.checkout_url
        })
        
        if (!intent?.checkout_url) {
          console.warn('⚠️ Payment Intent sem checkout_url! Dados completos:', intent)
        }
        
        setPaymentIntent(intent)
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar link de pagamento')
        router.push('/aluno/inicio')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentIntent()
  }, [token, paymentIntentId, router])

  // Abrir pagamento em nova aba automaticamente
  useEffect(() => {
    if (!paymentIntent?.checkout_url || opened) return

    const url = paymentIntent.checkout_url
    
    // Valida se a URL é válida
    if (!url || !url.startsWith('http')) {
      console.error('URL de pagamento inválida:', url)
      toast.error('URL de pagamento inválida. Clique no botão abaixo.')
      return
    }

    // Delay mínimo para garantir que o DOM está pronto
    const delay = 300
    
    const openTimer = setTimeout(() => {
      try {
        console.log('🔄 Abrindo pagamento em nova aba:', url)
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
        
        if (newWindow) {
          setPaymentWindow(newWindow)
          setOpened(true)
          setPolling(true)
          toast.success('Página de pagamento aberta em nova aba. Aguardando confirmação...')
        } else {
          // Se popup foi bloqueado, usa redirecionamento direto
          console.warn('⚠️ Popup bloqueado, redirecionando diretamente...')
          window.location.href = url
        }
      } catch (e) {
        console.error('❌ Erro ao abrir link:', e)
        toast.error('Erro ao abrir link de pagamento. Clique no botão abaixo.')
      }
    }, delay)

    return () => clearTimeout(openTimer)
  }, [paymentIntent?.checkout_url, opened])

  // Polling do status do pagamento
  useEffect(() => {
    if (!polling || !paymentIntentId || !token) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/packages/payment-intent/${paymentIntentId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) return

        const data = await response.json()
        const intent = data.payment_intent

        if (intent?.status === 'PAID') {
          console.log('✅ Pagamento confirmado!')
          setPolling(false)
          toast.success('Pagamento confirmado com sucesso!')
          
          // Fechar janela de pagamento se ainda estiver aberta
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.close()
          }

          // Redirecionar para página de compra após 1 segundo
          setTimeout(() => {
            router.push('/aluno/comprar')
          }, 1000)
        } else if (intent?.status === 'FAILED' || intent?.status === 'CANCELED') {
          console.log('❌ Pagamento falhou ou foi cancelado')
          setPolling(false)
          toast.error('Pagamento não foi concluído. Tente novamente.')
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error)
      }
    }, 3000) // Verifica a cada 3 segundos

    return () => clearInterval(pollInterval)
  }, [polling, paymentIntentId, token, paymentWindow, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando link de pagamento...</p>
        </div>
      </div>
    )
  }

  if (!paymentIntent || !paymentIntent.checkout_url) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link de pagamento não disponível</h2>
          <p className="text-gray-600 mb-4">
            O link de pagamento não está disponível ou já foi processado.
          </p>
          <Button
            onClick={() => router.push('/aluno/inicio')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header com botão voltar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <Button
          onClick={() => router.push('/aluno/inicio')}
          variant="ghost"
          className="text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Conteúdo de redirecionamento */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          {polling ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aguardando confirmação do pagamento...
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                A página de pagamento foi aberta em uma nova aba. Complete o pagamento e aguarde a confirmação automática.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    if (paymentWindow && !paymentWindow.closed) {
                      paymentWindow.focus()
                    } else if (paymentIntent.checkout_url) {
                      window.open(paymentIntent.checkout_url, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Abrir Página de Pagamento Novamente
                </Button>
                <Button
                  onClick={() => {
                    setPolling(false)
                    router.push('/aluno/comprar')
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Voltar para Comprar
                </Button>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Abrindo página de pagamento...
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {isIOS 
                  ? 'A página de pagamento será aberta em instantes.'
                  : 'A página de pagamento será aberta em uma nova aba em instantes.'}
              </p>
              {paymentIntent.checkout_url && (
                <Button
                  onClick={() => {
                    const url = paymentIntent.checkout_url!
                    console.log('Clique manual - abrindo em nova aba:', url)
                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
                    if (newWindow) {
                      setPaymentWindow(newWindow)
                      setOpened(true)
                      setPolling(true)
                      toast.success('Página de pagamento aberta. Aguardando confirmação...')
                    } else {
                      // Fallback se popup for bloqueado
                      window.location.href = url
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
                >
                  Abrir Link de Pagamento
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

