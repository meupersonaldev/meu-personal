'use client'

import { FormEvent, Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore, UserRole } from '@/lib/stores/auth-store'

export interface LoginCopy {
  heroTitle: string
  heroHighlight: string
  heroDescription: string
  pageTitle: string
  pageSubtitle: string
  mobileTitle?: string
  mobileSubtitle?: string
  backLinkLabel?: string
  backLinkHref?: string
  rememberMeLabel?: string
  submitLabel?: string
  loadingLabel?: string
  forgotPasswordLabel?: string
  forgotPasswordHref?: string
  signupPrompt?: string
  signupCtaLabel?: string
  signupHref?: string
  successMessage?: string
  roleMismatchMessage?: string
  invalidCredentialsMessage?: string
  genericErrorMessage?: string
}

interface LoginTemplateProps {
  expectedRole: Extract<UserRole, 'STUDENT' | 'TEACHER'>
  defaultRedirect: string
  copy: LoginCopy
  backgroundImageUrl?: string
}

function LoginTemplateContent({ expectedRole, defaultRedirect, copy, backgroundImageUrl = '/images/photo-1571019613454-1cb2f99b2d8b-bg.jpg' }: LoginTemplateProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams?.get('redirect') ?? null
  const { login, logout } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const normalizedRedirect = useMemo(() => {
    if (!redirectParam) return null
    try {
      const decoded = decodeURIComponent(redirectParam)
      return decoded.startsWith('/') ? decoded : null
    } catch {
      return null
    }
  }, [redirectParam])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const result = await login(formData.email, formData.password)

      // Verificar se retornou objeto de erro ou boolean
      if (typeof result === 'object' && result !== null && 'success' in result) {
        // Novo formato: { success: false, error: string, code?: string }
        if (!result.success) {
          // Mensagem específica para usuário inativo
          if (result.code === 'USER_INACTIVE') {
            toast.error(result.error || 'Sua conta está desativada. Entre em contato com a administração.')
          } else {
            toast.error(result.error || (copy.invalidCredentialsMessage ?? 'Email ou senha incorretos'))
          }
          return
        }
      } else if (!result) {
        // Formato antigo: boolean false
        toast.error(copy.invalidCredentialsMessage ?? 'Email ou senha incorretos')
        return
      }

      const user = useAuthStore.getState().user

      if (!user || user.role !== expectedRole) {
        await logout({ redirect: false })
        toast.error(copy.roleMismatchMessage ?? 'Este login pertence a outro tipo de acesso.')
        return
      }

      toast.success(copy.successMessage ?? 'Login realizado com sucesso!')
      router.push(normalizedRedirect ?? defaultRedirect)
    } catch (error) {
      toast.error(copy.genericErrorMessage ?? 'Erro no login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary/90 to-meu-primary-dark/80"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-meu-accent/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-meu-cyan/10 rounded-full blur-2xl animate-pulse delay-1000"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <Image
              src="/images/logo.png"
              alt="Meu Personal"
              width={64}
              height={64}
              className="object-contain mb-8"
            />
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              {copy.heroTitle}
              <span className="text-meu-accent block">{copy.heroHighlight}</span>
            </h1>
            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              {copy.heroDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          <Link
            href={copy.backLinkHref ?? '/'}
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {copy.backLinkLabel ?? 'Voltar'}
          </Link>

          <div className="lg:hidden text-center mb-12">
            <Image
              src="/images/logo.png"
              alt="Meu Personal"
              width={48}
              height={48}
              className="object-contain mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{copy.mobileTitle ?? copy.pageTitle}</h1>
            <p className="text-gray-600">{copy.mobileSubtitle ?? copy.pageSubtitle}</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">{copy.pageTitle}</h2>
            <p className="text-gray-600 text-lg">{copy.pageSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="Digite seu email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />} 
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-meu-primary focus:ring-meu-primary"
                />
                <span className="text-sm text-gray-600">{copy.rememberMeLabel ?? 'Lembrar-me'}</span>
              </label>
              {copy.forgotPasswordHref && (
                <Link
                  href={copy.forgotPasswordHref}
                  className="text-sm text-meu-primary hover:text-meu-primary-dark transition-colors font-medium"
                >
                  {copy.forgotPasswordLabel ?? 'Esqueci minha senha'}
                </Link>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {copy.loadingLabel ?? 'Entrando...'}
                </>
              ) : (
                copy.submitLabel ?? 'Entrar'
              )}
            </Button>
          </form>

          {copy.signupHref && copy.signupCtaLabel && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {copy.signupPrompt ?? 'Não tem uma conta?'}{' '}
                <Link
                  href={copy.signupHref}
                  className="text-meu-primary hover:text-meu-primary-dark font-medium transition-colors"
                >
                  {copy.signupCtaLabel}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function LoginTemplate(props: LoginTemplateProps) {
  return (
    <Suspense fallback={<div />}>
      <LoginTemplateContent {...props} />
    </Suspense>
  )
}
