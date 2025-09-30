'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowLeft, Building2, Users, BarChart3, Shield, Star, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFranquiaStore } from '@/lib/stores/franquia-store'

interface FranquiaCredentials {
  email: string
  password: string
}

export default function FranquiaLoginPage() {
  const router = useRouter()
  const { login } = useFranquiaStore()

  const [formData, setFormData] = useState<FranquiaCredentials>({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Tentar login usando o store
      const success = await login(formData.email, formData.password)

      if (success) {
        // Salvar dados simples de autenticação no localStorage para middleware
        const franquiaData = {
          id: mockFranquiaUser.id,
          name: mockFranquiaUser.name,
          email: mockFranquiaUser.email,
          role: mockFranquiaUser.role,
          academyId: mockFranquiaUser.academyId,
          isAuthenticated: true
        }

        localStorage.setItem('franquia-auth', JSON.stringify(franquiaData))

        toast.success('Login realizado com sucesso!')
        router.push('/franquia/dashboard')
      } else {
        toast.error('Email ou senha incorretos')
      }
    } catch (error) {
      toast.error('Erro no login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setFormData({
      email: mockFranquiaUser.email,
      password: mockFranquiaUser.password
    })
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-12 w-12 text-blue-600 mr-3" />
            <span className="text-2xl font-bold text-gray-900">Academia FitLife</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Painel Administrativo</h1>
          <p className="text-gray-600 text-lg">Entre com suas credenciais de franquia</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Administrativo
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="admin@academia.com"
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
                className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Acessar Painel'
            )}
          </Button>
        </form>

        {/* Demo Login */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-700 font-medium">
              Demonstração
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 text-sm border-2 border-blue-600/20 text-blue-600 hover:bg-blue-50 hover:border-blue-600/40 transition-all duration-300 rounded-lg"
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Entrar como Admin Demo
          </Button>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Acesso Restrito</p>
              <p>Este painel é exclusivo para administradores de franquia. Todas as ações são monitoradas e registradas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}