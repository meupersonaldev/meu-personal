'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search, Menu, X } from 'lucide-react'
import SiteFooter from '@/components/site-footer'

export default function NotFound() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-meu-primary-dark text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFF373' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-meu-primary-dark via-meu-primary to-meu-primary-dark">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-meu-accent/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-meu-cyan/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Same as main page */}
        <header className="bg-meu-primary text-white sticky top-0 z-50 border-b border-meu-primary-dark">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-center justify-between py-4">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/logo-fundobranco.png"
                  alt="Meu Personal"
                  width={160}
                  height={60}
                  className="h-12 w-auto object-contain transform scale-[2] origin-left translate-y-2"
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
                  href="/#para-alunos"
                  className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Para Alunos
                </Link>
                <Link
                  href="/#para-professores"
                  className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Para Professores
                </Link>
                <Link
                  href="/#franquias"
                  className="block text-white hover:text-meu-accent transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Franquias
                </Link>
                <Link
                  href="/#como-funciona"
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
        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="container mx-auto max-w-4xl text-center">
            {/* 404 Animated Number */}
            <div className="mb-8 fade-in-on-load">
              <h1 className="text-8xl sm:text-9xl lg:text-[12rem] font-black leading-none">
                <span className="bg-gradient-to-r from-meu-accent via-yellow-300 to-meu-accent bg-clip-text text-transparent animate-gradient">
                  404
                </span>
              </h1>
            </div>

            {/* Error Message */}
            <div className="space-y-6 mb-12 fade-in-on-load-delay-1">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Ops! Página não encontrada
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Parece que você se perdeu no caminho para sua evolução fitness.
                <span className="block mt-2 text-meu-accent font-semibold">
                  Mas não se preocupe, vamos te ajudar a voltar ao treino!
                </span>
              </p>
            </div>

            {/* Error Illustration */}
            <div className="mb-12 fade-in-on-load-delay-2">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto">
                <div className="absolute inset-0 bg-meu-primary/50 backdrop-blur-sm rounded-3xl border border-meu-accent/30 flex items-center justify-center">
                  <div className="text-6xl sm:text-7xl animate-bounce">
                    🏋️‍♂️
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-meu-accent/20 rounded-full border-2 border-meu-accent/40 flex items-center justify-center">
                  <span className="text-2xl">❓</span>
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-meu-cyan/20 rounded-full border-2 border-meu-cyan/40 flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in-on-load-delay-3">
              <Link href="/" className="group w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                  <Home className="mr-2 h-5 w-5" />
                  Voltar ao Início
                </Button>
              </Link>

              <Link href="/login" className="group w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-2 border-meu-cyan bg-meu-cyan/10 backdrop-blur-sm text-meu-cyan hover:bg-meu-cyan hover:text-meu-primary font-bold px-8 py-4 text-base lg:text-lg rounded-xl transition-all duration-300 transform hover:scale-105">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Fazer Login
                </Button>
              </Link>

              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                className="w-full sm:w-auto border-2 border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 font-bold px-8 py-4 text-base lg:text-lg rounded-xl transition-all duration-300"
              >
                <Search className="mr-2 h-5 w-5" />
                Voltar
              </Button>
            </div>

            </div>
        </main>

        {/* Footer */}
        <SiteFooter />
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-on-load {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .fade-in-on-load-delay-1 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.2s forwards;
        }

        .fade-in-on-load-delay-2 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.4s forwards;
        }

        .fade-in-on-load-delay-3 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.6s forwards;
        }

        .fade-in-on-load-delay-4 {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.8s forwards;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}