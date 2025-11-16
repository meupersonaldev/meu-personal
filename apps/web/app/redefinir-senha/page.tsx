'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api'
import { isStrongPassword } from '@/lib/utils'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const normalizedRole = (searchParams?.get('role') ?? '').toLowerCase()
  const isTeacher = normalizedRole === 'professor' || normalizedRole === 'teacher'
  const isStudent = normalizedRole === 'aluno' || normalizedRole === 'student'
  const loginHref = isTeacher ? '/professor/login' : isStudent ? '/aluno/login' : '/login'
  const forgotHref = isTeacher ? '/professor/esqueci-senha' : isStudent ? '/aluno/esqueci-senha' : '/esqueci-senha'

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tokenFromUrl = searchParams?.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    } else {
      router.push('/')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (!isStrongPassword(formData.password)) {
      toast.error('Senha fraca. Use no mínimo 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos.')
      return
    }

    setIsLoading(true)
    setError('')

    if (!token) {
      setError('Token de redefinição inválido ou ausente.')
      toast.error('Token de redefinição inválido ou ausente.')
      setIsLoading(false)
      return
    }

    try {
      const response = await authAPI.resetPassword(token, formData.password)

      setSuccess(true)
      toast.success(response.message || 'Senha redefinida com sucesso!')

      setTimeout(() => {
        router.push(loginHref)
      }, 3000)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao redefinir a senha. O link pode ter expirado.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/photo-1571019613454-1cb2f99b2d8b-2340.jpg)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary/90 to-meu-primary-dark/80"></div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-meu-accent/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-meu-cyan/10 rounded-full blur-2xl animate-pulse delay-1000"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <Image
              src="/images/logo.png"
              alt="Meu Personal"
              width={64}
              height={64}
              className="h-16 w-auto object-contain mb-8"
            />
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Crie uma nova
              <span className="text-meu-accent block">senha segura</span>
            </h1>
            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              Escolha uma senha forte para proteger sua conta.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-start p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Back Button */}
          <Link
            href={loginHref}
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar ao login
          </Link>

          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-12">
            <Image
              src="/images/logo.png"
              alt="Meu Personal"
              width={48}
              height={48}
              className="h-12 w-auto object-contain mx-auto mb-6"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Redefinir senha</h1>
            <p className="text-gray-600">Crie uma nova senha</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Redefinir senha</h2>
            <p className="text-gray-600 text-lg">
              Digite sua nova senha abaixo.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                <Link
                  href={forgotHref}
                  className="text-sm text-red-600 hover:text-red-700 font-medium underline mt-2 inline-block"
                >
                  Solicitar novo link
                </Link>
              </div>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    placeholder="Digite sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo.</p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    placeholder="Confirme sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                disabled={isLoading || !token || !!error}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo senha...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h3>
                <p className="text-gray-600 mb-4">
                  Sua senha foi alterada com sucesso.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecionando para o login...
                </p>
              </div>

              <Link href={loginHref} className="block">
                <Button className="w-full bg-meu-primary hover:bg-meu-primary-dark">
                  Ir para o login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
