'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, Users, Star, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await login(formData.email, formData.password)
      if (success) {
        toast.success('Login realizado com sucesso!')
        
        // Buscar dados do usuário após login
        const user = useAuthStore.getState().user
        console.log('User after login:', user)
        
        // Redirecionar baseado no role
        if (user?.role === 'STUDENT') {
          router.push('/aluno/inicio')
        } else if (user?.role === 'TEACHER') {
          router.push('/professor/dashboard')
        } else {
          router.push('/')
        }
      } else {
        toast.error('Email ou senha incorretos')
      }
    } catch {
      toast.error('Erro no login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (email: string) => {
    setFormData({ email, password: '123456' })
    setIsLoading(true)

    try {
      const success = await login(email, '123456')
      if (success) {
        toast.success('Login demo realizado!')

        // Buscar dados do usuário após login
        const user = useAuthStore.getState().user
        
        // Redirecionar baseado no role
        if (user?.role === 'STUDENT') {
          router.push('/aluno/inicio')
        } else if (user?.role === 'TEACHER') {
          router.push('/professor/dashboard')
        } else {
          router.push('/')
        }
      }
    } catch {
      toast.error('Erro no login demo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80)'
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
              Bem-vindo de volta ao
              <span className="text-meu-accent block">Meu Personal</span>
            </h1>

            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              Acesse sua conta e continue sua jornada fitness com os melhores personal trainers.
            </p>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-meu-accent" />
                </div>
                <div>
                  <div className="font-semibold text-white">500+ Personal Trainers</div>
                  <div className="text-white/70 text-sm">Profissionais qualificados</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-meu-cyan/20 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-meu-cyan" />
                </div>
                <div>
                  <div className="font-semibold text-white">10.000+ Aulas</div>
                  <div className="text-white/70 text-sm">Realizadas com sucesso</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">4.9 Estrelas</div>
                  <div className="text-white/70 text-sm">Avaliação média</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-start p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar ao início
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta</h1>
            <p className="text-gray-600">Entre na sua conta</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Entrar na conta</h2>
            <p className="text-gray-600 text-lg">Bem-vindo de volta! Por favor, entre com seus dados.</p>
          </div>

          <div className="space-y-6">

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="Digite seu email"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                    placeholder="Digite sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-meu-primary focus:ring-meu-primary"
                  />
                  <span className="text-sm text-gray-600">Lembrar-me</span>
                </label>
                <Link
                  href="/esqueci-senha"
                  className="text-sm text-meu-primary hover:text-meu-primary-dark transition-colors font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              </form>

              {/* Demo Logins */}
              <div className="mt-10 pt-8 border-t border-gradient-to-r from-transparent via-muted-foreground/20 to-transparent">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-900 font-medium">
                    Ou experimente com contas demonstração
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-12 text-sm border-2 border-meu-primary/20 text-meu-primary hover:bg-gradient-to-r hover:from-meu-primary/5 hover:to-meu-primary/10 hover:border-meu-primary/40 transition-all duration-300 rounded-lg group"
                    onClick={() => handleDemoLogin('joao@email.com')}
                    disabled={isLoading}
                  >
                    <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Demo Aluno
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 text-sm border-2 border-meu-primary/20 text-meu-primary hover:bg-gradient-to-r hover:from-meu-primary/5 hover:to-meu-primary/10 hover:border-meu-primary/40 transition-all duration-300 rounded-lg group"
                    onClick={() => handleDemoLogin('maria@email.com')}
                    disabled={isLoading}
                  >
                    <GraduationCap className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Demo Professor
                  </Button>
                </div>
              </div>

            {/* Sign up link */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link
                  href="/cadastro"
                  className="text-meu-primary hover:text-meu-primary-dark font-medium transition-colors"
                >
                  Cadastre-se gratuitamente
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}