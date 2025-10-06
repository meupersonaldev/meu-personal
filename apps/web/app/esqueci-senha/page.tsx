'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const searchParams = useSearchParams()
  const normalizedRole = (searchParams?.get('role') ?? '').toLowerCase()
  const isTeacher = normalizedRole === 'professor' || normalizedRole === 'teacher'
  const isStudent = normalizedRole === 'aluno' || normalizedRole === 'student'
  const loginHref = isTeacher ? '/professor/login' : isStudent ? '/aluno/login' : '/login'
  const heroHighlight = isTeacher ? 'sua conta de professor' : isStudent ? 'sua conta de aluno' : 'sua conta'
  const helperSubtitle = isTeacher
    ? 'Vamos te ajudar a voltar aos seus alunos rapidamente.'
    : isStudent
    ? 'Vamos te ajudar a voltar aos seus treinos rapidamente.'
    : 'Vamos te ajudar a redefinir sua senha em poucos passos.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setEmailSent(true)
        toast.success('Email enviado! Verifique sua caixa de entrada.')
      } else {
        toast.error(data.message || 'Erro ao enviar email')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erro ao processar solicitação. Tente novamente.')
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
            backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)'
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
              Recupere o acesso a
              <span className="text-meu-accent block">{heroHighlight}</span>
            </h1>
            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              Nao se preocupe! {helperSubtitle}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Esqueci minha senha</h1>
            <p className="text-gray-600">Recupere o acesso a {heroHighlight}</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Esqueci minha senha</h2>
            <p className="text-gray-600 text-lg">
              Digite seu email e enviaremos instruções para redefinir sua senha.
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar link de recuperação
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email enviado!</h3>
                <p className="text-gray-600 mb-4">
                  Se o email <strong>{email}</strong> estiver cadastrado, você receberá instruções para redefinir sua senha.
                </p>
                <p className="text-sm text-gray-500">
                  Verifique sua caixa de entrada e também a pasta de spam.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Tentar outro email
                </Button>

                <Link href={loginHref} className="block">
                  <Button variant="ghost" className="w-full">
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!emailSent && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Lembrou sua senha?{' '}
                <Link
                  href={loginHref}
                  className="text-meu-primary hover:text-meu-primary-dark font-medium transition-colors"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
