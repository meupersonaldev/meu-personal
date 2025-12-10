'use client'

import { useState, useEffect } from 'react'
import { Gift } from 'lucide-react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import FranqueadoraNotificationsDropdown from '@/components/notifications/FranqueadoraNotificationsDropdown'
import { CreditGrantForm, CreditGrantHistory } from '@/components/credits'

export default function FranqueadoraCreditosPage() {
  const { franqueadora, isAuthenticated, token, isLoading } = useFranqueadoraStore()
  
  // Trigger para atualizar histórico após liberação
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const handleGrantSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Você precisa estar autenticado para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8">
        {/* Header Desktop */}
        <div className="hidden lg:flex lg:items-center lg:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Administração</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Liberação de Créditos — {franqueadora?.name || 'Franqueadora'}
            </h1>
          </div>
          <FranqueadoraNotificationsDropdown />
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
            <FranqueadoraNotificationsDropdown />
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
    </FranqueadoraGuard>
  )
}
