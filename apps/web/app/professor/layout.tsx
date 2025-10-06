'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Loader2 } from 'lucide-react'

const PUBLIC_AUTH_PREFIXES = ['/professor/login', '/professor/cadastro', '/professor/esqueci-senha', '/professor/redefinir-senha'] as const

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isPublicAuthRoute = PUBLIC_AUTH_PREFIXES.some((route) => pathname?.startsWith(route))
  const { user, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (isPublicAuthRoute) {
      setIsChecking(false)
      return
    }

    // Simular verificacao inicial
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [isPublicAuthRoute])

  useEffect(() => {
    // Nao redirecionar enquanto esta verificando ou em uma rota publica
    if (isPublicAuthRoute || isChecking) return

    if (!isAuthenticated || !user) {
      router.push('/professor/login')
      return
    }

    if (user.role !== 'TEACHER') {
      // Redirecionar para o dashboard correto baseado no role
      switch (user.role) {
        case 'STUDENT':
          router.push('/aluno/inicio')
          break
        case 'ADMIN':
          router.push('/admin/dashboard')
          break
        default:
          router.push('/professor/login')
      }
    }
  }, [isAuthenticated, user, router, isChecking, isPublicAuthRoute])

  if (isPublicAuthRoute) {
    return <>{children}</>
  }

  // Mostrar loading enquanto verifica autenticacao
  if (isChecking) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se nao esta autenticado ou nao e professor, mostrar loading
  // (o useEffect vai redirecionar)
  if (!isAuthenticated || !user || user.role !== 'TEACHER') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-white/80">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}
