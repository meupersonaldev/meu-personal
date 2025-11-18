'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteFooter from '@/components/site-footer'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import {
  ArrowRight,
  Check,
  Menu,
  X
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  
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

    // Adicionar classe de animação ao body quando a página carregar
    setTimeout(() => {
      document.body.classList.add('loaded')
    }, 100)
  }, [isAuthenticated, user, router])

  if (!mounted) {
    return null
  }

  if (isAuthenticated && user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-meu-primary-dark text-white">
      {/* Header */}
      <header className="bg-meu-primary text-white sticky top-0 z-50 border-b border-meu-primary-dark">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-fundobranco.png"
                alt="Meu Personal"
                width={200}
                height={75}
                priority
                className="object-contain transform scale-[1.5] origin-left translate-y-2"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#para-alunos" className="text-white hover:text-meu-accent transition-colors font-medium">Para Alunos</Link>
              <Link href="#para-professores" className="text-white hover:text-meu-accent transition-colors font-medium">Para Professores</Link>
              <Link href="#franquias" className="text-white hover:text-meu-accent transition-colors font-medium">Franquias</Link>
              <Link href="#como-funciona" className="text-white hover:text-meu-accent transition-colors font-medium">Como Funciona</Link>
              <Link href="/login">
                <Button size="sm" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90">
                  Comece agora
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-meu-primary-dark"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-meu-primary border-b border-meu-primary-dark">
          <div className="container mx-auto px-4 max-w-7xl">
            <nav className="py-4 space-y-3">
              <Link
                href="#para-alunos"
                className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Para Alunos
              </Link>
              <Link
                href="#para-professores"
                className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Para Professores
              </Link>
              <Link
                href="#franquias"
                className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Franquias
              </Link>
              <Link
                href="#como-funciona"
                className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Como Funciona
              </Link>
              <div className="pt-3 border-t border-meu-primary-dark space-y-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90 w-full">
                    Comece agora
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-24 pb-16">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary-dark via-meu-primary to-meu-primary-dark">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-72 h-72 bg-meu-accent rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-meu-cyan rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-meu-accent rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-500"></div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFF373' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center bg-gradient-to-r from-meu-accent/20 to-meu-cyan/20 border border-meu-accent/30 rounded-full px-6 py-3 backdrop-blur-sm fade-in-on-load">
                <span className="text-meu-accent text-sm lg:text-base font-semibold">🏋️ O Futuro do Personal Training</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.1] tracking-tight fade-in-on-load-delay-1">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Sua Jornada
                </span>
                <br />
                <span className="bg-gradient-to-r from-meu-accent via-yellow-300 to-meu-accent bg-clip-text text-transparent animate-gradient">
                  Fitness
                </span>
                <br />
                <span className="bg-gradient-to-r from-meu-cyan to-blue-400 bg-clip-text text-transparent">
                  Começa Aqui
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light fade-in-on-load-delay-2">
                O começo de uma <span className="text-meu-accent font-semibold">nova era no fitness</span>.
                <span className="text-meu-cyan font-semibold"> Conectamos alunos a professores</span>,
                <span className="text-white font-semibold"> profissionais qualificados</span> e
                <span className="text-meu-accent font-semibold"> tecnologia inovadora</span> para sua evolução.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center lg:justify-start pt-2 fade-in-on-load-delay-2">
                <Link href="/aluno/cadastro" className="group">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                    Começar Agora
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/professor/cadastro" className="group">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-meu-cyan bg-meu-cyan/10 backdrop-blur-sm text-meu-cyan hover:bg-meu-cyan hover:text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl transition-all duration-300 transform hover:scale-105">
                    Sou Professor
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative order-first lg:order-last fade-in-on-load-delay-1 hidden lg:block">
              {/* Main Image Card */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-meu-accent via-meu-cyan to-meu-accent rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                <div className="relative h-[280px] sm:h-[360px] lg:h-[440px] bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/images/photo-1534438327276-14e5300c3a48.jpg"
                    alt="Personal Training"
                    fill
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark via-transparent to-transparent"></div>

                  {/* Floating Stats Cards */}
                  <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-meu-accent rounded-full flex items-center justify-center">
                        <span className="text-xl">💪</span>
                      </div>
                      <div>
                        <div className="text-white font-bold text-base">LANÇAMENTO</div>
                        <div className="text-gray-300 text-xs">Primeira Unidade</div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-meu-cyan rounded-full flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                      <div>
                        <div className="text-white font-bold text-base">INOVAÇÃO</div>
                        <div className="text-gray-300 text-xs">Tecnologia & Fitness</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </section>

      {/* Para Alunos Section */}
      <section id="para-alunos" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-meu-primary to-meu-primary-dark opacity-100 transform translate-y-0 transition-all duration-700 ease-out">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center bg-meu-accent/10 border border-meu-accent/20 rounded-full px-4 py-2 mb-6">
                <span className="text-meu-accent text-sm font-medium">💪 Para Alunos</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Encontre seu <span className="text-meu-accent">Personal Trainer</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Conecte-se com profissionais qualificados em nossa primeira unidade. Tecnologia de ponta para agendamento, check-in e acompanhamento da sua evolução fitness.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Professores Certificados</h4>
                    <p className="text-sm text-gray-400">Perfis verificados e avaliados</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Agendamento Fácil</h4>
                    <p className="text-sm text-gray-400">Reserve em poucos cliques</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Sistema de Créditos</h4>
                    <p className="text-sm text-gray-400">Flexibilidade total</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">QR Code Check-in</h4>
                    <p className="text-sm text-gray-400">Rápido e seguro</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/aluno/cadastro" className="group">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                    Cadastrar como Aluno
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/aluno/login" className="group">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-meu-accent bg-meu-accent/10 backdrop-blur-sm text-meu-accent hover:bg-meu-accent hover:text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl transition-all duration-300 transform hover:scale-105">
                    Já sou Aluno
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="relative w-full h-[400px] sm:h-[500px] bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-3xl overflow-hidden border border-meu-accent/20">
                <Image 
                  src="/images/photo-1571019614242-c5c5dee9f50b.jpg" 
                  alt="Aluno treinando" 
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark/80 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para Professores Section */}
      <section id="para-professores" className="py-16 sm:py-20 lg:py-24 bg-meu-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-last lg:order-first relative">
              <div className="relative w-full h-[400px] sm:h-[500px] bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-3xl overflow-hidden border border-meu-cyan/20">
                <Image 
                  src="/images/photo-1571019613454-1cb2f99b2d8b.jpg" 
                  alt="Personal trainer" 
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark/80 to-transparent"></div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center bg-meu-cyan/10 border border-meu-cyan/20 rounded-full px-4 py-2 mb-6">
                <span className="text-meu-cyan text-sm font-medium">🎯 Para Professores</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Faça Parte do <span className="text-meu-cyan">Nosso Time</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Junte-se ao nosso time de profissionais. Gestão completa de agenda, pagamentos integrados e acesso à estrutura de primeira para atender seus alunos com excelência.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-cyan mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Agenda Online</h4>
                    <p className="text-sm text-gray-400">Gestão completa</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-cyan mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Mais Alunos</h4>
                    <p className="text-sm text-gray-400">Visibilidade garantida</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-cyan mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Espaços Equipados</h4>
                    <p className="text-sm text-gray-400">Academias parceiras</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-cyan mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Pagamentos Seguros</h4>
                    <p className="text-sm text-gray-400">Sistema integrado</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/professor/cadastro" className="group">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-cyan to-blue-400 hover:from-blue-400 hover:to-meu-cyan text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-cyan/50 transition-all duration-300 transform hover:scale-105">
                    Cadastrar como Professor
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/professor/login" className="group">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-meu-cyan bg-meu-cyan/10 backdrop-blur-sm text-meu-cyan hover:bg-meu-cyan hover:text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl transition-all duration-300 transform hover:scale-105">
                    Já sou Professor
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Franquias Section */}
      <section id="franquias" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-meu-primary to-meu-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center bg-meu-accent/10 border border-meu-accent/20 rounded-full px-4 py-2 mb-6">
                <span className="text-meu-accent text-sm font-medium">🏢 Franquias</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                <span className="text-meu-accent">Em Breve</span>: Franquias
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Estamos construindo o futuro do fitness personalizado. Em breve você poderá fazer parte da nossa rede de franquias com tecnologia e suporte completos.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Modelo Validado</h4>
                    <p className="text-sm text-gray-400">Negócio comprovado</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Suporte Total</h4>
                    <p className="text-sm text-gray-400">Acompanhamento constante</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Plataforma Tech</h4>
                    <p className="text-sm text-gray-400">Sistema completo</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Check className="h-6 w-6 text-meu-accent mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Marketing Incluso</h4>
                    <p className="text-sm text-gray-400">Divulgação garantida</p>
                  </div>
                </div>
              </div>
              <Link href="/seja-franqueado" className="group">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                  Receba Informações
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="relative w-full h-[400px] sm:h-[500px] bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-3xl overflow-hidden border border-meu-accent/20">
                <Image 
                  src="/images/photo-1534438327276-14e5300c3a48-600.jpg" 
                  alt="Academia franquia" 
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark/80 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-16 sm:py-20 lg:py-24 bg-meu-primary-dark fade-in-on-load">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12 lg:mb-16 fade-in-on-load-delay-1">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6">
              Como <span className="text-meu-accent">Funciona</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Simples, moderno e eficiente. Comece sua jornada fitness em poucos passos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center fade-in-on-load-delay-2">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-6 text-3xl lg:text-4xl font-bold text-meu-primary">
                1
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Cadastre-se</h3>
              <p className="text-gray-300 leading-relaxed">
                Crie sua conta como aluno ou professor. Processo rápido e seguro para começar sua jornada.
              </p>
            </div>

            <div className="text-center fade-in-on-load-delay-3">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-meu-cyan rounded-full flex items-center justify-center mx-auto mb-6 text-3xl lg:text-4xl font-bold text-meu-primary">
                2
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Conecte-se</h3>
              <p className="text-gray-300 leading-relaxed">
                Alunos encontram seus professores ideais e profissionais começam a atender com nossa tecnologia.
              </p>
            </div>

            <div className="text-center fade-in-on-load-delay-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-6 text-3xl lg:text-4xl font-bold text-meu-primary">
                3
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Treine e Evolua</h3>
              <p className="text-gray-300 leading-relaxed">
                Agende sessões, utilize nosso sistema de check-in e acompanhe sua evolução com acompanhamento completo.
              </p>
            </div>
          </div>
        </div>
      </section>

  
      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-meu-primary-dark via-meu-primary to-meu-primary-dark relative overflow-hidden fade-in-on-load">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/images/photo-1571019613454-1cb2f99b2d8b-1920.jpg"
            alt="Gym background"
            fill
            className="object-cover"
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center relative z-10 fade-in-on-load-delay-2">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 lg:mb-8">
            Comece sua <span className="text-meu-accent">Jornada Fitness</span>
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-12 lg:mb-16 max-w-4xl mx-auto leading-relaxed">
            Seja você um aluno buscando resultados ou um professor pronto para fazer a diferença, estamos aqui para transformar ideias em realidade.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Alunos */}
            <div className="bg-meu-primary/50 backdrop-blur-sm p-6 lg:p-8 rounded-2xl border-2 border-meu-accent/30 hover:border-meu-accent transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Sou Aluno</h3>
              <p className="text-gray-300 mb-6">
                Encontre seu personal trainer ideal e comece sua transformação
              </p>
              <Link href="/aluno/cadastro" className="group">
                <Button className="w-full bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Professores */}
            <div className="bg-meu-primary/50 backdrop-blur-sm p-6 lg:p-8 rounded-2xl border-2 border-meu-cyan/30 hover:border-meu-cyan transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Sou Professor</h3>
              <p className="text-gray-300 mb-6">
                Expanda sua carreira e conquiste mais alunos
              </p>
              <Link href="/professor/cadastro" className="group">
                <Button className="w-full bg-gradient-to-r from-meu-cyan to-blue-400 hover:from-blue-400 hover:to-meu-cyan text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-cyan/50 transition-all duration-300 transform hover:scale-105">
                  Cadastrar-se
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Franqueados */}
            <div className="bg-meu-primary/50 backdrop-blur-sm p-6 lg:p-8 rounded-2xl border-2 border-meu-accent/30 hover:border-meu-accent transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Franquias</h3>
              <p className="text-gray-300 mb-6">
                Em breve, leve nosso conceito para sua cidade
              </p>
              <Link href="/seja-franqueado" className="group">
                <Button className="w-full bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                  Saber Mais
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
