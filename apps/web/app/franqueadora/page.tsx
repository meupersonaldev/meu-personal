'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, Building, Crown, BarChart3, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'

export default function FranqueadoraLoginPage() {
  const router = useRouter()
  const { login } = useFranqueadoraStore()
  
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
        router.push('/franqueadora/dashboard')
      } else {
        toast.error('Email ou senha incorretos')
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary flex fixed inset-0 overflow-auto">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link 
            href="/" 
            className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Link>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4 relative">
              <div className="w-24 h-24 bg-meu-accent rounded-full flex items-center justify-center">
                <span className="text-4xl">👑</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Painel da Franqueadora
            </h1>
            <p className="text-white/80">
              Central de controle da rede de franquias
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email da Matriz
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="matriz@meupersonal.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-meu-accent focus:ring-meu-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-meu-accent focus:ring-meu-accent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-meu-accent text-meu-primary hover:bg-meu-accent/90 font-semibold py-3 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na Matriz'
              )}
            </Button>
          </form>

          {/* Bloco removido: Credenciais de Demonstração */}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Suporte técnico: {' '}
              <Link href="#" className="text-meu-accent hover:underline">
                suporte@meupersonal.com
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8">
        <div className="max-w-lg">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Controle Total da Rede
            </h2>
            <p className="text-xl text-white/80">
              Gerencie todas as franquias, leads e performance em um só lugar
            </p>
          </div>

          <div className="space-y-8">
            {/* Feature 1 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building className="h-6 w-6 text-meu-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Gestão de Franquias
                </h3>
                <p className="text-white/70">
                  Monitore performance, royalties e contratos de todas as unidades
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-meu-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Analytics Consolidados
                </h3>
                <p className="text-white/70">
                  Visão completa da performance da rede e oportunidades
                </p>
              </div>
            </div>
          </div>

          {/* Bloco removido: Métricas estáticas (50+, R$ 2M, 25%) */}
        </div>
      </div>
    </div>
  )
}
