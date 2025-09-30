'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Loader2 } from 'lucide-react'

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Simular verificação inicial
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Não redirecionar enquanto está verificando
    if (isChecking) return

    if (!isAuthenticated || !user) {
      router.push('/login')
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
          router.push('/login')
      }
    }
  }, [isAuthenticated, user, router, isChecking])

  // Mostrar loading enquanto verifica autenticação
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

  // Se não está autenticado ou não é professor, mostrar loading
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
