'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Check, Building, Users, TrendingUp, Mail, Phone, MapPin } from 'lucide-react'

export default function SejaFranqueadoPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cidade: '',
    mensagem: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Adicionar classe de animação ao body quando a página carregar
    setTimeout(() => {
      document.body.classList.add('loaded')
    }, 100)
  }, [])

  if (!mounted) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simular envio do formulário
    setTimeout(() => {
      alert('Obrigado pelo seu interesse! Entraremos em contato em breve.')
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cidade: '',
        mensagem: ''
      })
      setIsSubmitting(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
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

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#oportunidade" className="text-white hover:text-meu-accent transition-colors font-medium">A Oportunidade</Link>
              <Link href="#vantagens" className="text-white hover:text-meu-accent transition-colors font-medium">Vantagens</Link>
              <Link href="#investimento" className="text-white hover:text-meu-accent transition-colors font-medium">Investimento</Link>
              <Link href="#contato" className="text-white hover:text-meu-accent transition-colors font-medium">Contato</Link>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-meu-primary-dark hover:text-white">
                  Voltar
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" className="text-white hover:bg-meu-primary-dark">
                Menu
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary overflow-hidden pt-24">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFF373' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center bg-gradient-to-r from-meu-accent/20 to-meu-cyan/20 border border-meu-accent/30 rounded-full px-6 py-3 backdrop-blur-sm">
                <span className="text-meu-accent text-sm lg:text-base font-semibold">🏢 Seja Franqueado</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">Faça Parte da</span>
                <br />
                <span className="text-meu-accent">Revolução Fitness</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed">
                Transforme sua carreira e seu patrimônio com o modelo de negócio mais inovador do mercado de fitness personalizado.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="#contato" className="group">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold px-8 py-4 text-lg rounded-xl shadow-2xl hover:shadow-meu-accent/50 transition-all duration-300 transform hover:scale-105">
                    Quero Ser Franqueado
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="#oportunidade" className="group">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-meu-cyan bg-meu-cyan/10 backdrop-blur-sm text-meu-cyan hover:bg-meu-cyan hover:text-meu-primary font-bold px-8 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-105">
                    Conheça o Modelo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Content */}
            <div className="relative">
              <div className="relative w-full h-[500px] bg-gradient-to-br from-meu-primary to-meu-primary-dark rounded-3xl overflow-hidden border-2 border-meu-accent/20">
                <Image
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop"
                  alt="Academia moderna"
                  fill
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark/80 to-transparent"></div>

                {/* Stats Overlay */}
                <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-meu-accent mb-1">50+</div>
                    <div className="text-sm text-white/80">Franquias</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-meu-cyan mb-1">R$ 2M</div>
                    <div className="text-sm text-white/80">Faturamento</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-meu-accent mb-1">25%</div>
                    <div className="text-sm text-white/80">Crescimento</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Oportunidade Section */}
      <section id="oportunidade" className="py-20 bg-meu-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Por que <span className="text-meu-accent">Meu Personal</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              O mercado de fitness nunca parou de crescer. Nós te damos o modelo perfeito para prosperar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-meu-primary p-8 rounded-2xl border border-meu-accent/20">
              <div className="w-16 h-16 bg-meu-accent/20 rounded-full flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Mercado em Expansão</h3>
              <p className="text-gray-300">
                O mercado de fitness brasileiro movimenta mais de R$ 30 bilhões anuais com crescimento constante.
              </p>
            </div>

            <div className="bg-meu-primary p-8 rounded-2xl border border-meu-cyan/20">
              <div className="w-16 h-16 bg-meu-cyan/20 rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-meu-cyan" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Modelo Validado</h3>
              <p className="text-gray-300">
                Sistema operacional comprovado, treinamento completo e suporte contínuo para seu sucesso.
              </p>
            </div>

            <div className="bg-meu-primary p-8 rounded-2xl border border-meu-accent/20">
              <div className="w-16 h-16 bg-meu-accent/20 rounded-full flex items-center justify-center mb-6">
                <Building className="h-8 w-8 text-meu-accent" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Tecnologia Própria</h3>
              <p className="text-gray-300">
                Plataforma digital completa para gestão de alunos, professores e financeiro em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens Section */}
      <section id="vantagens" className="py-20 bg-meu-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Vantagens de ser <span className="text-meu-accent">Franqueado</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start">
                <Check className="h-6 w-6 text-meu-accent mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Treinamento Completo</h4>
                  <p className="text-gray-300">Capacitação em operação, vendas, marketing e gestão da unidade.</p>
                </div>
              </div>

              <div className="flex items-start">
                <Check className="h-6 w-6 text-meu-accent mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Marketing Centralizado</h4>
                  <p className="text-gray-300">Suporte de marketing digital e tradicional para atração de clientes.</p>
                </div>
              </div>

              <div className="flex items-start">
                <Check className="h-6 w-6 text-meu-accent mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Supply Chain Própria</h4>
                  <p className="text-gray-300">Acesso a fornecedores exclusivos com melhores preços e condições.</p>
                </div>
              </div>

              <div className="flex items-start">
                <Check className="h-6 w-6 text-meu-accent mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Retorno Atrativo</h4>
                  <p className="text-gray-300">Modelo de negócio com potencial de retorno em 18-24 meses.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="w-full h-[400px] bg-gradient-to-br from-meu-primary-dark to-meu-primary rounded-3xl overflow-hidden border-2 border-meu-cyan/20">
                <Image
                  src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=600&fit=crop"
                  alt="Treinamento franquia"
                  fill
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-meu-primary-dark/80 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investimento Section */}
      <section id="investimento" className="py-20 bg-meu-primary-dark">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-meu-accent">Investimento</span> Inicial
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Investimento acessível com estrutura completa e suporte total para seu sucesso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-meu-primary p-6 rounded-2xl text-center border border-meu-accent/20">
              <div className="text-3xl font-bold text-meu-accent mb-2">R$ 150k</div>
              <div className="text-sm text-white/80">Investimento Inicial</div>
            </div>
            <div className="bg-meu-primary p-6 rounded-2xl text-center border border-meu-cyan/20">
              <div className="text-3xl font-bold text-meu-cyan mb-2">5%</div>
              <div className="text-sm text-white/80">Royalties</div>
            </div>
            <div className="bg-meu-primary p-6 rounded-2xl text-center border border-meu-accent/20">
              <div className="text-3xl font-bold text-meu-accent mb-2">2%</div>
              <div className="text-sm text-white/80">Fundo Marketing</div>
            </div>
            <div className="bg-meu-primary p-6 rounded-2xl text-center border border-meu-cyan/20">
              <div className="text-3xl font-bold text-meu-cyan mb-2">24 meses</div>
              <div className="text-sm text-white/80">Payback Estimado</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato Section */}
      <section id="contato" className="py-20 bg-meu-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Vamos <span className="text-meu-accent">Conversar</span>?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Preencha o formulário ao lado e nossa equipe de expansão entrará em contato para apresentar todos os detalhes da franquia.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">franquias@meupersonal.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">(11) 9999-9999</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">São Paulo/SP</span>
                </div>
              </div>
            </div>

            <div className="bg-meu-primary-dark p-8 rounded-2xl border border-meu-accent/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Nome Completo</label>
                  <Input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="bg-meu-primary border-meu-accent/20 text-white placeholder:text-white/50"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">E-mail</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-meu-primary border-meu-accent/20 text-white placeholder:text-white/50"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Telefone</label>
                  <Input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="bg-meu-primary border-meu-accent/20 text-white placeholder:text-white/50"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Cidade de Interesse</label>
                  <Input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="bg-meu-primary border-meu-accent/20 text-white placeholder:text-white/50"
                    placeholder="Cidade onde quer abrir"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Mensagem</label>
                  <textarea
                    value={formData.mensagem}
                    onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                    className="w-full bg-meu-primary border-meu-accent/20 text-white placeholder:text-white/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-meu-accent"
                    rows={4}
                    placeholder="Conte-nos sobre seu interesse na franquia..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-meu-accent text-meu-primary hover:bg-meu-accent/90 font-bold py-3 text-lg"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Informações'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-meu-primary-dark border-t border-meu-accent/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
          <p className="text-gray-300 mb-4">
            © 2025 Meu Personal. Todos os direitos reservados.
          </p>
          <p className="text-sm text-gray-400">
            Franquia | CNPJ: 00.000.000/0001-00
          </p>
        </div>
      </footer>
    </div>
  )
}
