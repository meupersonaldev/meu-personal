'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (user && user.role !== 'TEACHER') {
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
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user || user.role !== 'TEACHER') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-white/80">Carregando...</p>
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
