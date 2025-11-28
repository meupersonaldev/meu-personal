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
  const [redirecting, setRedirecting] = useState(false)

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
        setPaymentIntent(data.payment_intent)
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar link de pagamento')
        router.push('/aluno/inicio')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentIntent()
  }, [token, paymentIntentId, router])

  // Redirecionamento automático - otimizado para iOS
  useEffect(() => {
    if (!paymentIntent?.checkout_url || redirecting) return

    setRedirecting(true)
    
    // Para iOS e dispositivos móveis, sempre usa window.location.href (mais confiável)
    // Para desktop, também usa window.location.href para garantir funcionamento
    const delay = isIOS ? 300 : 800 // Delay menor para iOS
    
    setTimeout(() => {
      try {
        // Sempre usa window.location.href para garantir funcionamento em todos os dispositivos
        window.location.href = paymentIntent.checkout_url!
      } catch (e) {
        console.error('Erro ao redirecionar:', e)
        toast.error('Erro ao abrir link de pagamento. Clique no botão abaixo.')
      }
    }, delay)
  }, [paymentIntent?.checkout_url, redirecting, isIOS])

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
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {redirecting ? 'Redirecionando...' : 'Abrindo página de pagamento...'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {isIOS 
              ? 'Você será redirecionado para a página de pagamento em instantes.'
              : redirecting
                ? 'Se a página não abriu automaticamente, clique no botão abaixo.'
                : 'A página de pagamento será aberta em instantes.'}
          </p>
          {paymentIntent.checkout_url && (
            <Button
              onClick={() => {
                // Sempre usa window.location.href para garantir funcionamento em todos os dispositivos
                window.location.href = paymentIntent.checkout_url!
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
            >
              {isIOS ? 'Ir para Pagamento' : 'Abrir Link de Pagamento'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

