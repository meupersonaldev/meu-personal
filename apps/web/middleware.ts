import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rotas que requerem autenticação
  // Em desenvolvimento liberamos o dashboard para facilitar testes
  const protectedRoutes = process.env.NODE_ENV === 'production'
    ? ['/dashboard', '/professor', '/aluno', '/admin']
    : ['/admin']
  
  // Rotas de autenticação (redirecionam se já logado)
  const authRoutes = ['/login', '/cadastro', '/esqueci-senha']
  
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Verificar se é uma rota de autenticação
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Simular verificação de token (em produção seria JWT)
  const authToken = request.cookies.get('auth-token')?.value
  
  if (isProtectedRoute && !authToken) {
    // Redirecionar para login se não autenticado
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (isAuthRoute && authToken) {
    // Redirecionar para dashboard se já autenticado
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
