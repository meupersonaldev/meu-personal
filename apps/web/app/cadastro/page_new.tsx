'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore, UserRole } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, GraduationCap, Users, ArrowLeft, Shield, Clock, Trophy, ArrowRight } from 'lucide-react'
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
    <div className="h-screen overflow-hidden flex bg-gray-50">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar ao início
          </Link>

          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <Image 
              src="/images/logo.png" 
              alt="Meu Personal" 
              width={48} 
              height={48}
              className="h-12 w-auto object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-meu-primary">Criar conta</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="hidden lg:block">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-meu-accent to-yellow-400 rounded-2xl mb-4 shadow-lg">
                    <User className="h-8 w-8 text-meu-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-meu-primary mb-2">Criar sua conta</h2>
                  <p className="text-gray-600 text-sm">Junte-se à maior plataforma de personal training</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de usuário */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Selecione seu perfil:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                      className={`group p-4 rounded-xl border-2 transition-all duration-300 ${
                        formData.role === 'STUDENT'
                          ? 'border-meu-accent bg-meu-accent/5 shadow-md'
                          : 'border-gray-200 hover:border-meu-accent/40 hover:bg-gray-50'
                      }`}
                    >
                      <GraduationCap className={`h-6 w-6 mx-auto mb-2 ${
                        formData.role === 'STUDENT' ? 'text-meu-accent' : 'text-gray-400'
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
                      className={`group p-4 rounded-xl border-2 transition-all duration-300 ${
                        formData.role === 'TEACHER'
                          ? 'border-meu-accent bg-meu-accent/5 shadow-md'
                          : 'border-gray-200 hover:border-meu-accent/40 hover:bg-gray-50'
                      }`}
                    >
                      <Users className={`h-6 w-6 mx-auto mb-2 ${
                        formData.role === 'TEACHER' ? 'text-meu-accent' : 'text-gray-400'
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
                  <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Nome completo
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-meu-primary transition-colors" />
                    </div>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-11 text-sm border-2 border-gray-200 focus:border-meu-accent focus:ring-0 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 hover:border-gray-300"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-meu-primary transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 h-11 text-sm border-2 border-gray-200 focus:border-meu-accent focus:ring-0 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 hover:border-gray-300"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                    Telefone
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-meu-primary transition-colors" />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10 h-11 text-sm border-2 border-gray-200 focus:border-meu-accent focus:ring-0 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 hover:border-gray-300"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-meu-primary transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10 h-11 text-sm border-2 border-gray-200 focus:border-meu-accent focus:ring-0 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 hover:border-gray-300"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-meu-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                    Confirmar senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-meu-primary transition-colors" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10 pr-10 h-11 text-sm border-2 border-gray-200 focus:border-meu-accent focus:ring-0 rounded-xl bg-gray-50 focus:bg-white transition-all duration-200 hover:border-gray-300"
                      placeholder="Repita sua senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-meu-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-meu-accent/90 hover:to-yellow-400/90 text-meu-primary font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar conta gratuita
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-sm text-gray-600 text-center mt-4">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="text-meu-primary hover:text-meu-accent transition-colors font-semibold hover:underline">
                    Faça login aqui
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
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
    </div>
  )
}
