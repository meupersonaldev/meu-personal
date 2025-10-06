'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useFranqueadoraPermissions, FRANQUEADORA_ALLOWED_ROLES } from '@/lib/auth/permissions'

type Props = {
  children: React.ReactNode
  roles?: typeof FRANQUEADORA_ALLOWED_ROLES
  requiredPermission?: string // compatibilidade com usos existentes
}

export default function FranqueadoraGuard({ children, roles = FRANQUEADORA_ALLOWED_ROLES }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const { isAuthenticated, canAccess } = useFranqueadoraPermissions(roles)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      // Sem sessão → voltar ao login da franqueadora
      router.replace('/franqueadora')
      return
    }
    if (!canAccess) {
      // Com sessão mas sem permissão → página inicial
      router.replace('/')
    }
  }, [hydrated, isAuthenticated, canAccess, router, pathname])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !canAccess) {
    // Evita flash de conteúdo
    return null
  }

  return <>{children}</>
}
