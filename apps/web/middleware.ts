import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/professor', '/aluno', '/admin', '/franquia'] as const
const PROFESSOR_AUTH_ROUTES = ['/professor/login', '/professor/cadastro', '/professor/esqueci-senha', '/professor/redefinir-senha'] as const
const ALUNO_AUTH_ROUTES = ['/aluno/login', '/aluno/cadastro', '/aluno/esqueci-senha', '/aluno/redefinir-senha'] as const
const AUTH_PREFIXES: readonly string[] = [
  '/login',
  '/cadastro',
  '/esqueci-senha',
  ...PROFESSOR_AUTH_ROUTES,
  ...ALUNO_AUTH_ROUTES,
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authToken = request.cookies.get('auth-token')?.value

  const isFranqueadoraRoute = pathname.startsWith('/franqueadora')
  const isFranqueadoraLogin = pathname === '/franqueadora' || pathname === '/franqueadora/'
  const isFranqueadoraDashboard = isFranqueadoraRoute && !isFranqueadoraLogin
  const isProfessorAuth = PROFESSOR_AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isAlunoAuth = ALUNO_AUTH_ROUTES.some((route) => pathname.startsWith(route))

  const isProtectedRoute =
    PROTECTED_PREFIXES.some((route) => pathname.startsWith(route)) &&
    !isFranqueadoraRoute &&
    !isProfessorAuth &&
    !isAlunoAuth

  const isAuthRoute =
    isFranqueadoraLogin ||
    AUTH_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  if (isProtectedRoute && !authToken) {
    let target = '/login'

    if (pathname.startsWith('/professor')) {
      target = '/professor/login'
    } else if (pathname.startsWith('/aluno')) {
      target = '/aluno/login'
    } else if (isFranqueadoraRoute) {
      target = '/franqueadora'
    } else if (pathname.startsWith('/franquia')) {
      target = '/franquia'
    }

    if (pathname !== target) {
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  if (isAuthRoute && authToken && !isFranqueadoraRoute) {
    let target = '/'

    if (isProfessorAuth) {
      target = '/professor/dashboard'
    } else if (isAlunoAuth) {
      target = '/aluno/inicio'
    }

    if (pathname !== target) {
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
