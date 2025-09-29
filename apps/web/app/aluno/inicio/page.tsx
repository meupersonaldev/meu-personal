'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Construction,
  Dumbbell,
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Clock,
  Rocket
} from 'lucide-react'

export default function AlunoInicioPage() {
  const { user, logout } = useAuthStore()

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-white/80 hover:text-meu-accent transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Voltar ao início
            </Link>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-meu-accent text-sm">{user.credits} créditos</p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-meu-accent to-meu-accent/80 rounded-3xl mb-6 shadow-xl">
            <Construction className="h-10 w-10 text-meu-primary" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Área do Aluno
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-meu-accent mb-6">
            Em Desenvolvimento
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Estamos construindo uma experiência incrível para você! Em breve, você terá acesso a todas as funcionalidades.
          </p>
        </div>

        {/* Features Coming Soon */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-meu-accent/20 rounded-2xl mb-4">
                <Calendar className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Agendamento</h3>
              <p className="text-white/70">
                Agende suas aulas com personal trainers qualificados
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-meu-accent/20 rounded-2xl mb-4">
                <Users className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professores</h3>
              <p className="text-white/70">
                Encontre o personal trainer perfeito para seus objetivos
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-meu-accent/20 rounded-2xl mb-4">
                <Trophy className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Progresso</h3>
              <p className="text-white/70">
                Acompanhe sua evolução e conquiste seus objetivos
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-meu-accent/20 rounded-2xl mb-4">
                <Clock className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Histórico</h3>
              <p className="text-white/70">
                Veja o histórico completo de suas aulas e treinos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="backdrop-blur-sm bg-white/5 border border-meu-accent/30 shadow-2xl">
            <CardContent className="p-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-meu-accent to-meu-accent/80 rounded-2xl mb-6 shadow-lg">
                <Rocket className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Fique por dentro das novidades!
              </h3>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">
                Estamos trabalhando duro para trazer a melhor experiência de personal training para você. Em breve, novidades incríveis!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button className="bg-meu-accent hover:bg-meu-accent/90 text-meu-primary font-semibold">
                    <Dumbbell className="mr-2 h-4 w-4" />
                    Voltar ao início
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={logout}
                >
                  Fazer logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}