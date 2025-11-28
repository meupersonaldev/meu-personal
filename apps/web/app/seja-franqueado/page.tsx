'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, Building } from 'lucide-react'
import FranchiseLeadModal from '@/components/franchise-lead-modal'

export default function SejaFranqueadoPage() {
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeout(() => {
      document.body.classList.add('loaded')
    }, 100)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-meu-primary-dark">
      {/* Header */}
      <header className="bg-meu-primary text-white sticky top-0 z-50 border-b border-meu-primary-dark">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <Logo
              size="header"
              variant="default"
              showText={false}
              href="/"
            />
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-meu-primary-dark hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="min-h-[calc(100vh-80px)] flex items-center justify-center py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-meu-accent/20 rounded-full mb-8">
            <Building className="h-12 w-12 text-meu-accent" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
            <span className="text-meu-accent">Franquias</span>
            <br />
            Em Breve
          </h1>

          <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Estamos preparando algo especial para você. Em breve, você poderá fazer parte da nossa rede de franquias.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105"
            >
              Receber Informações
            </Button>
            <Link href="/">
              <Button variant="outline" className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-meu-primary font-bold px-8 py-4 text-lg rounded-xl transition-all duration-300">
                Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-meu-primary border-t border-meu-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
          <p className="text-gray-300 mb-4">
            © 2025 Meu Personal. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Formulário */}
      <FranchiseLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}
