'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

function AutoLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams?.get('token')
    const redirect = searchParams?.get('redirect') || '/aluno/inicio'

    if (!token) {
      router.push('/login')
      return
    }

    // Definir token no store e cookie
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    
    // Buscar dados do usuário com o token
    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Token inválido')
        }
        const { user } = await res.json()
        
        // Definir token e usuário no store
        useAuthStore.setState({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar_url: user.avatarUrl ?? user.avatar_url,
            approval_status: user.approval_status
          },
          isAuthenticated: true,
          isLoading: false
        })

        // Definir cookie
        if (typeof document !== 'undefined') {
          const maxAge = 7 * 24 * 60 * 60
          let sameSite: 'Lax' | 'None' = 'Lax'
          let secure = ''
          
          try {
            const pageOrigin = window.location.origin
            const apiOrigin = new URL(API_URL).origin
            const crossSite = pageOrigin && apiOrigin && apiOrigin !== pageOrigin
            const isHttps = window.location.protocol === 'https:'
            
            if (crossSite) {
              sameSite = 'None'
              secure = '; Secure'
            } else if (isHttps) {
              secure = '; Secure'
            }
          } catch {}
          
          document.cookie = `auth-token=${token}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`
        }

        // Redirecionar baseado no role
        let finalRedirect = redirect
        if (user.role === 'TEACHER') {
          finalRedirect = '/professor/inicio'
        } else if (user.role === 'FRANCHISE_ADMIN') {
          finalRedirect = '/franquia/inicio'
        } else if (user.role === 'STUDENT') {
          finalRedirect = '/aluno/inicio'
        }

        router.push(finalRedirect)
      })
      .catch((error) => {
        console.error('Erro no auto-login:', error)
        router.push('/login')
      })
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Fazendo login...</p>
      </div>
    </div>
  )
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AutoLoginContent />
    </Suspense>
  )
}

