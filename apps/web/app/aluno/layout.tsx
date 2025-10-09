'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import StudentLayout from '@/components/layout/student-layout'

const PUBLIC_AUTH_PREFIXES = [
  '/aluno/login',
  '/aluno/cadastro',
  '/aluno/esqueci-senha',
  '/aluno/redefinir-senha'
] as const

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isPublicAuthRoute = PUBLIC_AUTH_PREFIXES.some((route) =>
    pathname?.startsWith(route)
  )
  const { user, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (isPublicAuthRoute) {
      setIsChecking(false)
      return
    }

    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [isPublicAuthRoute])

  useEffect(() => {
    if (isPublicAuthRoute || isChecking) return

    if (!isAuthenticated || !user) {
      router.push('/aluno/login')
      return
    }

    if (user.role !== 'STUDENT') {
      switch (user.role) {
        case 'TEACHER':
          router.push('/professor/dashboard')
          break
        case 'ADMIN':
          router.push('/admin/dashboard')
          break
        default:
          router.push('/aluno/login')
      }
    }
  }, [isAuthenticated, user, router, isChecking, isPublicAuthRoute])

  if (isPublicAuthRoute) {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'STUDENT') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent" />
          <p className="text-white/80">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return <StudentLayout>{children}</StudentLayout>
}
