'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, Users, BarChart3, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFranquiaStore } from '@/lib/stores/franquia-store'

export default function FranquiaLoginPage() {
  const router = useRouter()
  const { login } = useFranquiaStore()
  
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
      console.log('[LOGIN] Iniciando login...')
      const success = await login(formData.email, formData.password)
      console.log('[LOGIN] Resultado do login:', success)
      
      if (success) {
        toast.success('Login realizado com sucesso!')
        
        // Verificar estado do store
        const state = useFranquiaStore.getState()
        console.log('[LOGIN] Estado após login:', {
          isAuthenticated: state.isAuthenticated,
          franquiaUser: state.franquiaUser,
          academy: state.academy
        })
        
        // Garantir persistência salva antes de navegar
        try {
          // @ts-ignore
          const p = (useFranquiaStore as any).persist
          await p?.flush?.()
          console.log('[LOGIN] Persist flush concluído')
        } catch (e) {
          console.error('[LOGIN] Erro no flush:', e)
        }
        
        // Pequeno delay para garantir que o store foi persistido
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('[LOGIN] Redirecionando para dashboard...')
        console.log('[LOGIN] URL atual:', window.location.href)
        
        // Usar window.location para garantir navegação
        window.location.href = '/franquia/dashboard'
      } else {
        console.log('[LOGIN] Login falhou')
        toast.error('Email ou senha incorretos')
      }
    } catch (error) {
      console.error('[LOGIN] Erro no login:', error)
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
            href="/seja-franqueado" 
            className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Seja Franqueado
          </Link>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Painel da Franquia
            </h1>
            <p className="text-white/80">
              Gerencie sua academia com facilidade
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email da Academia
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@suaacademia.com"
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
                'Entrar no Painel'
              )}
            </Button>
          </form>


          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Precisa de ajuda? {' '}
              <Link href="#" className="text-meu-accent hover:underline">
                Entre em contato
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
              Gerencie sua Academia
            </h2>
            <p className="text-xl text-white/80">
              Tudo que você precisa para administrar sua franquia em um só lugar
            </p>
          </div>

          <div className="space-y-8">
            {/* Feature 1 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-meu-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Gestão de Professores e Alunos
                </h3>
                <p className="text-white/70">
                  Cadastre, edite e acompanhe todos os professores e alunos da sua academia
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-meu-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Relatórios e Analytics
                </h3>
                <p className="text-white/70">
                  Acompanhe o desempenho da sua academia com relatórios detalhados
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-meu-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Controle Total
                </h3>
                <p className="text-white/70">
                  Gerencie planos, horários e todas as operações da sua franquia
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
