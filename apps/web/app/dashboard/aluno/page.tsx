'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Construction, ArrowLeft, User, Calendar, CreditCard, Star } from 'lucide-react'
import Link from 'next/link'

export default function DashboardAlunoPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  // Temporariamente sem proteção para testar
  console.log('Dashboard Aluno - User:', user)

  return (
    <div className="min-h-screen bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-meu-accent rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-meu-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Olá, {user?.name || 'Usuário'}!</h1>
                <p className="text-white/80 text-sm">Dashboard do Aluno</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-meu-accent/20 rounded-full mb-6">
              <Construction className="h-12 w-12 text-meu-accent" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Em Desenvolvimento
            </h2>
            
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              O dashboard do aluno está sendo desenvolvido com muito carinho! 
              Em breve você poderá agendar aulas, acompanhar seu progresso e muito mais.
            </p>

            {/* Preview Features */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-meu-accent" />
                  <span className="text-white font-medium">Agendamento de Aulas</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-meu-accent" />
                  <span className="text-white font-medium">Gestão de Créditos</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-meu-accent" />
                  <span className="text-white font-medium">Avaliação de Professores</span>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-meu-accent text-meu-primary font-semibold rounded-xl hover:bg-meu-accent/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
