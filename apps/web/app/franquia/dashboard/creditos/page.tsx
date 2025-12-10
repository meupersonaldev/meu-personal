'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { CreditGrantForm, CreditGrantHistory } from '@/components/credits'

export default function FranquiaCreditosPage() {
  const router = useRouter()
  const { franquiaUser, academy, isAuthenticated } = useFranquiaStore()
  
  // Trigger para atualizar histórico após liberação
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Estado para verificar se funcionalidade está habilitada
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null)
  const [isCheckingFeature, setIsCheckingFeature] = useState(true)
  
  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  
  useEffect(() => { 
    setHydrated(true) 
  }, [])

  // Verificar se a funcionalidade está habilitada para esta franquia
  useEffect(() => {
    const checkFeatureEnabled = async () => {
      if (!academy?.id) {
        setIsCheckingFeature(false)
        return
      }

      // Verificar settings da academy
      const settings = (academy as any).settings || {}
      const enabled = settings.manualCreditReleaseEnabled === true
      
      setFeatureEnabled(enabled)
      setIsCheckingFeature(false)

      // Se não estiver habilitada, redirecionar para dashboard
      if (!enabled) {
        toast.error('Funcionalidade de liberação de créditos não está habilitada para esta franquia')
        router.push('/franquia/dashboard')
      }
    }

    if (hydrated && isAuthenticated) {
      checkFeatureEnabled()
    }
  }, [hydrated, isAuthenticated, academy, router])

  const handleGrantSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Obter token do localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || ''
    }
    return ''
  }

  if (!hydrated || isCheckingFeature) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !franquiaUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Você precisa estar autenticado para acessar esta página.</p>
        </div>
      </div>
    )
  }

  // Se a funcionalidade não está habilitada, mostrar mensagem (fallback caso redirecionamento falhe)
  if (featureEnabled === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Funcionalidade não disponível
          </h2>
          <p className="text-gray-600 mb-4">
            A liberação manual de créditos não está habilitada para esta franquia. 
            Entre em contato com a franqueadora para solicitar a ativação.
          </p>
          <button
            onClick={() => router.push('/franquia/dashboard')}
            className="px-4 py-2 bg-meu-primary text-white rounded-lg hover:bg-meu-primary/90 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  const token = getToken()

  return (
    <div className="p-3 sm:p-4 lg:p-8">
      {/* Header Desktop */}
      <div className="hidden lg:flex lg:items-center lg:justify-between mb-8">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Administração</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Liberação de Créditos — {academy?.name || 'Franquia'}
          </h1>
        </div>
      </div>

      {/* Mobile Title */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-meu-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Créditos</h2>
            </div>
            <p className="text-sm text-gray-600">Libere créditos para usuários</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Formulário de Liberação */}
        <div>
          <CreditGrantForm 
            token={token} 
            onSuccess={handleGrantSuccess}
          />
        </div>

        {/* Histórico de Liberações */}
        <div className="xl:col-span-1">
          <CreditGrantHistory 
            token={token}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  )
}
