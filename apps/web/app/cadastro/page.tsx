'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore, UserRole } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, Clock, Trophy, GraduationCap, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function CadastroPage() {
  const router = useRouter()
  const { register } = useAuthStore()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as UserRole
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const success = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      })

      if (success) {
        toast.success('Conta criada com sucesso!')
        router.push(formData.role === 'STUDENT' ? '/aluno/inicio' : '/professor/dashboard')
      } else {
        toast.error('Email já está em uso')
      }
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.')
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
            backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary/90 to-meu-primary-dark/80"></div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-meu-accent/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-48 h-48 bg-meu-cyan/10 rounded-full blur-2xl animate-pulse delay-1000"></div>

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
              Sua jornada fitness
              <span className="text-meu-accent block">começa aqui</span>
            </h1>

            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              Cadastre-se gratuitamente e tenha acesso aos melhores personal trainers da sua região.
            </p>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">100% Gratuito</div>
                  <div className="text-white/70 text-sm">Cadastro sem custos</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-meu-cyan/20 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-meu-cyan" />
                </div>
                <div>
                  <div className="font-semibold text-white">Ativação Instantânea</div>
                  <div className="text-white/70 text-sm">Comece a usar agora mesmo</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">Professores Premium</div>
                  <div className="text-white/70 text-sm">Acesso aos melhores profissionais</div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar conta</h1>
            <p className="text-gray-600">Junte-se à nossa plataforma fitness</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Criar conta</h2>
            <p className="text-gray-600 text-lg">Comece sua jornada fitness conosco hoje mesmo.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo de usuário */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Selecione seu perfil:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.role === 'STUDENT'
                      ? 'border-meu-primary bg-meu-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <GraduationCap className={`h-6 w-6 mx-auto mb-2 ${
                    formData.role === 'STUDENT' ? 'text-meu-primary' : 'text-gray-400'
                  }`} />
                  <div className={`text-sm font-medium ${
                    formData.role === 'STUDENT' ? 'text-meu-primary' : 'text-gray-600'
                  }`}>
                    Aluno
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'TEACHER' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.role === 'TEACHER'
                      ? 'border-meu-primary bg-meu-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Users className={`h-6 w-6 mx-auto mb-2 ${
                    formData.role === 'TEACHER' ? 'text-meu-primary' : 'text-gray-400'
                  }`} />
                  <div className={`text-sm font-medium ${
                    formData.role === 'TEACHER' ? 'text-meu-primary' : 'text-gray-600'
                  }`}>
                    Professor
                  </div>
                </button>
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="Seu nome completo"
                required
              />
            </div>

            {/* Email */}
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
                placeholder="seu@email.com"
                required
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            {/* Senha */}
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
                  placeholder="Mínimo 6 caracteres"
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

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="Repita sua senha"
                  required
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

            {/* Terms notice */}
            <p className="text-xs text-gray-500 text-center">
              Ao criar uma conta, você concorda com nossos termos de uso e política de privacidade.
            </p>

            <Button
              type="submit"
              className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta gratuita'
              )}
            </Button>
          </form>

          {/* Sign in link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="text-meu-primary hover:text-meu-primary-dark font-medium transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
