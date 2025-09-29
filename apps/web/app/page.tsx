'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/header'
import {
  Calendar,
  Star,
  Shield,
  ArrowRight,
  Play
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (isAuthenticated && user) {
      // Redirecionar baseado no role do usuário
      switch (user.role) {
        case 'STUDENT':
          router.push('/aluno/inicio')
          break
        case 'TEACHER':
          router.push('/professor/dashboard')
          break
        case 'ADMIN':
          router.push('/admin/dashboard')
          break
      }
    }
  }, [isAuthenticated, user, router])

  if (!mounted) {
    return null
  }

  if (isAuthenticated && user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen">
      <Header />
      

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary overflow-hidden">
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFF373' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-meu-accent/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-meu-cyan/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-meu-accent/30 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="relative z-10 text-center text-white px-4 max-w-6xl mx-auto">
          <div className="inline-flex items-center bg-meu-accent/10 border border-meu-accent/20 rounded-full px-4 py-2 mb-6">
            <span className="text-meu-accent text-sm font-medium">🚀 Plataforma #1 em Personal Training</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Transforme seu corpo com
            <span className="text-meu-accent block">Personal Training</span>
            <span className="text-meu-cyan">profissional</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-normal">
            A primeira plataforma que conecta você aos melhores personal trainers em academias franqueadas. 
            Agende aulas personalizadas, acompanhe seu progresso e alcance seus objetivos fitness de forma inteligente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/cadastro">
              <Button size="lg" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90 font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button variant="outline" size="lg" className="border-2 border-meu-accent text-meu-accent hover:bg-meu-accent hover:text-meu-primary font-semibold px-8 py-4 text-lg rounded-xl">
                <Play className="mr-2 h-5 w-5" />
                Ver Como Funciona
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">500+</div>
              <div className="text-white/80 font-normal">Personal Trainers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">50+</div>
              <div className="text-white/80 font-normal">Academias Parceiras</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">10k+</div>
              <div className="text-white/80 font-normal">Aulas Realizadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">4.9</div>
              <div className="text-white/80 font-normal">Avaliação Média</div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Em apenas 3 passos simples, você estará conectado ao seu personal trainer ideal
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-meu-accent to-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-meu-primary">1</span>
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Cadastre-se</h3>
              <p className="text-gray-600 leading-relaxed">
                Crie sua conta gratuita e conte-nos sobre seus objetivos fitness e preferências de treino
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-meu-cyan to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Encontre seu Personal</h3>
              <p className="text-gray-600 leading-relaxed">
                Navegue pelos perfis de personal trainers qualificados e escolha aquele que mais combina com você
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Agende e Treine</h3>
              <p className="text-gray-600 leading-relaxed">
                Agende suas aulas, faça check-in com QR Code e acompanhe seu progresso em tempo real
              </p>
            </div>
          </div>

          {/* Screenshot Placeholder */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="w-24 h-24 bg-meu-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Interface Intuitiva</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Nossa plataforma foi desenvolvida pensando na melhor experiência do usuário. 
                Interface limpa, navegação intuitiva e funcionalidades poderosas ao seu alcance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              Funcionalidades Poderosas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para ter a melhor experiência em personal training
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-meu-accent/20 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6 text-meu-primary" />
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">Agendamento Inteligente</h3>
              <p className="text-gray-600">
                Sistema de agendamento em tempo real com confirmação automática e lembretes por notificação
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-meu-cyan/20 rounded-xl flex items-center justify-center mb-6">
                <Star className="h-6 w-6 text-meu-primary" />
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">Sistema de Avaliações</h3>
              <p className="text-gray-600">
                Avalie seus personal trainers e veja avaliações de outros alunos para fazer a melhor escolha
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-meu-primary" />
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">Pagamento Seguro</h3>
              <p className="text-gray-600">
                Sistema de créditos seguro com integração bancária e múltiplas formas de pagamento
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">Acompanhamento de Progresso</h3>
              <p className="text-gray-600">
                Dashboards completos para acompanhar sua evolução, frequência e resultados alcançados
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">QR Code Check-in</h3>
              <p className="text-gray-600">
                Check-in rápido e seguro nas academias usando QR Code, sem complicações ou filas
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-meu-primary mb-4">Professores Certificados</h3>
              <p className="text-gray-600">
                Todos os personal trainers são verificados, certificados e avaliados continuamente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Histórias reais de transformação e sucesso
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4">
                  <span className="font-bold text-meu-primary">JS</span>
                </div>
                <div>
                  <h4 className="font-bold text-meu-primary">João Silva</h4>
                  <p className="text-sm text-gray-600">Aluno há 6 meses</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "Perdi 15kg em 6 meses com acompanhamento personalizado. A plataforma é incrível e os professores são muito qualificados!"
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4">
                  <span className="font-bold text-white">MS</span>
                </div>
                <div>
                  <h4 className="font-bold text-meu-primary">Maria Santos</h4>
                  <p className="text-sm text-gray-600">Personal Trainer</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "Como personal trainer, a plataforma me ajudou a organizar minha agenda e aumentar minha cartela de clientes em 200%!"
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <span className="font-bold text-white">AC</span>
                </div>
                <div>
                  <h4 className="font-bold text-meu-primary">Ana Costa</h4>
                  <p className="text-sm text-gray-600">Aluna há 1 ano</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "Finalmente encontrei uma forma prática de treinar. O sistema de créditos é muito flexível e conveniente!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-meu-primary mb-2">500+</div>
              <div className="text-muted-foreground font-normal">Personal Trainers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-meu-primary mb-2">10k+</div>
              <div className="text-muted-foreground font-normal">Aulas Realizadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-meu-primary mb-2">50+</div>
              <div className="text-muted-foreground font-normal">Academias Parceiras</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-meu-primary mb-2">4.9</div>
              <div className="text-muted-foreground font-normal">Avaliação Média</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-meu-primary to-meu-primary-dark">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar sua vida?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Junte-se a milhares de pessoas que já estão alcançando seus objetivos fitness com nossa plataforma
          </p>
          <Link href="/cadastro">
            <Button size="lg" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90 font-semibold px-12 py-4 text-xl rounded-xl shadow-lg hover:shadow-xl transition-all">
              Começar Minha Jornada
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image 
                  src="/images/logo.png" 
                  alt="Meu Personal" 
                  width={40} 
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-gray-400 font-normal">
                Conectando pessoas aos melhores personal trainers
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Funcionalidades</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Preços</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Sobre</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Blog</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Carreiras</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Central de Ajuda</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Contato</Link></li>
                <li><Link href="#" className="hover:text-meu-accent transition-colors font-normal">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
            <p className="font-normal">&copy; 2025 Meu Personal. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
