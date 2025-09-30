'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowRight, 
  Building2, 
  TrendingUp, 
  Users, 
  Shield, 
  Star,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  BarChart3,
  Award,
  Handshake,
  Target,
  Zap,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { toast } from 'sonner'

export default function SejaFranqueadoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    investment: '',
    message: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simular envio do formulário
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast.success('Interesse enviado! Entraremos em contato em breve.')
    setFormData({
      name: '',
      email: '',
      phone: '',
      city: '',
      investment: '',
      message: ''
    })
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Header for Franchise Page */}
      <header className="bg-meu-primary text-white sticky top-0 z-50 border-b border-meu-primary-dark">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <Logo size="md" variant="default" showText={false} href="/" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/franquia" className="text-white hover:text-meu-accent transition-colors font-medium">
                Já sou franqueado
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-meu-primary-dark hover:text-white"
                onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Fale Conosco
              </Button>
              <Link href="/cadastro">
                <Button size="sm" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90">
                  Começar Agora
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-meu-primary-dark"
                onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
              >
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
        />

        {/* Floating Elements */}
        <div className="absolute top-32 left-10 w-20 h-20 bg-meu-accent/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-meu-cyan/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-meu-accent/30 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="relative z-40 text-center text-white px-4 max-w-6xl mx-auto">
          <div className="inline-flex items-center bg-meu-accent/10 border border-meu-accent/20 rounded-full px-4 py-2 mb-6">
            <Award className="h-5 w-5 text-meu-accent mr-2" />
            <span className="text-meu-accent text-sm font-medium">🚀 Franquia #1 em Personal Training</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Seja um
            <span className="text-meu-accent block">Franqueado</span>
            <span className="text-meu-cyan">Meu Personal</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-normal">
            Transforme sua paixão por fitness em um negócio de sucesso. 
            Junte-se à rede que está revolucionando o mercado de personal training com tecnologia e suporte completo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90 font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Quero ser Franqueado
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-meu-accent text-meu-accent hover:bg-meu-accent hover:text-meu-primary font-semibold px-8 py-4 text-lg rounded-xl"
              onClick={() => document.getElementById('investimento')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Investimento
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">50+</div>
              <div className="text-white/80 text-sm md:text-base">Franquias Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">R$ 15k</div>
              <div className="text-white/80 text-sm md:text-base">Faturamento Médio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">18</div>
              <div className="text-white/80 text-sm md:text-base">Meses Payback</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-meu-accent mb-2">95%</div>
              <div className="text-white/80 text-sm md:text-base">Satisfação</div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Por que ser franqueado */}
      <section className="py-20 bg-gray-50 relative -top-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              Por que ser um Franqueado?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Aproveite um modelo de negócio comprovado e lucrativo no mercado fitness
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-meu-accent/20 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Mercado em Crescimento</h3>
              <p className="text-gray-600 leading-relaxed">
                O mercado fitness cresce 15% ao ano. Personal training é tendência com alta demanda e rentabilidade.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-meu-cyan/20 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Modelo Comprovado</h3>
              <p className="text-gray-600 leading-relaxed">
                Sistema testado e aprovado com processos otimizados, tecnologia própria e suporte completo.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                <DollarSign className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Alta Rentabilidade</h3>
              <p className="text-gray-600 leading-relaxed">
                Margem de lucro de até 40% com modelo de receita recorrente e múltiplas fontes de faturamento.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Suporte Completo</h3>
              <p className="text-gray-600 leading-relaxed">
                Treinamento, marketing, operações e suporte técnico. Você nunca estará sozinho.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Tecnologia Própria</h3>
              <p className="text-gray-600 leading-relaxed">
                Plataforma completa com app, sistema de gestão, agendamentos e pagamentos integrados.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-meu-primary" />
              </div>
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Território Exclusivo</h3>
              <p className="text-gray-600 leading-relaxed">
                Área de atuação protegida com exclusividade territorial e potencial de expansão.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Investimento */}
      <section id="investimento" className="py-20 bg-white relative -top-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              Investimento e Retorno
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Valores transparentes e retorno garantido
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano Básico */}
            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-meu-primary mb-2">Franquia Básica</h3>
                <p className="text-gray-600 mb-4">Ideal para começar</p>
                <div className="text-4xl font-bold text-meu-primary mb-2">R$ 45.000</div>
                <p className="text-sm text-gray-500">Investimento inicial</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Licença da marca</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Treinamento completo</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Sistema de gestão</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Suporte por 12 meses</span>
                </li>
              </ul>
            </div>

            {/* Plano Premium */}
            <div className="bg-meu-primary p-8 rounded-2xl border-2 border-meu-accent relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-meu-accent text-meu-primary px-4 py-2 rounded-full text-sm font-semibold">
                  Mais Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Franquia Premium</h3>
                <p className="text-white/80 mb-4">Completa e lucrativa</p>
                <div className="text-4xl font-bold text-meu-accent mb-2">R$ 75.000</div>
                <p className="text-sm text-white/70">Investimento inicial</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">Tudo do plano básico</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">Marketing digital incluso</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">Equipamentos básicos</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-meu-accent mr-3" />
                  <span className="text-white">Consultoria por 24 meses</span>
                </li>
              </ul>
            </div>

            {/* Plano Master */}
            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-meu-primary mb-2">Franquia Master</h3>
                <p className="text-gray-600 mb-4">Máximo potencial</p>
                <div className="text-4xl font-bold text-meu-primary mb-2">R$ 120.000</div>
                <p className="text-sm text-gray-500">Investimento inicial</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Tudo do plano premium</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Território ampliado</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Equipamentos completos</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Suporte vitalício</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ROI Info */}
          <div className="mt-16 bg-meu-accent/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-meu-primary mb-4">Retorno do Investimento</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="text-3xl font-bold text-meu-primary mb-2">18 meses</div>
                  <p className="text-gray-600">Payback médio</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-meu-primary mb-2">40%</div>
                  <p className="text-gray-600">Margem de lucro</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-meu-primary mb-2">R$ 15k</div>
                  <p className="text-gray-600">Faturamento médio/mês</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formulário de Contato */}
      <section id="contato" className="py-20 bg-gray-50 relative -top-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-meu-primary mb-6">
              Quero ser Franqueado
            </h2>
            <p className="text-xl text-gray-600">
              Preencha o formulário e receba mais informações
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade de Interesse *
                  </label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo, SP"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacidade de Investimento
                </label>
                <select
                  value={formData.investment}
                  onChange={(e) => setFormData({ ...formData, investment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                >
                  <option value="">Selecione uma faixa</option>
                  <option value="45k-75k">R$ 45.000 - R$ 75.000</option>
                  <option value="75k-120k">R$ 75.000 - R$ 120.000</option>
                  <option value="120k+">Acima de R$ 120.000</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem (opcional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Conte-nos mais sobre seu interesse..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-meu-primary text-white hover:bg-meu-primary/90 font-semibold py-3 text-lg"
              >
                {isLoading ? 'Enviando...' : 'Quero ser Franqueado'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-meu-primary text-white relative -top-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Logo size="sm" variant="default" showText={false} />
                <span className="text-xl font-bold ml-3">Meu Personal</span>
              </div>
              <p className="text-white/80">
                A franquia que está revolucionando o mercado de personal training
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  (11) 3333-4444
                </li>
                <li className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  franquia@meupersonal.com
                </li>
                <li className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  São Paulo, SP
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Franquia</h4>
              <ul className="space-y-2 text-white/80">
                <li><Link href="#investimento" className="hover:text-meu-accent transition-colors">Investimento</Link></li>
                <li><Link href="#contato" className="hover:text-meu-accent transition-colors">Seja Franqueado</Link></li>
                <li><Link href="/franquia" className="hover:text-meu-accent transition-colors">Portal do Franqueado</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-white/80">
                <li><Link href="/" className="hover:text-meu-accent transition-colors">Sobre</Link></li>
                <li><Link href="/" className="hover:text-meu-accent transition-colors">Blog</Link></li>
                <li><Link href="/" className="hover:text-meu-accent transition-colors">Carreiras</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>&copy; 2025 Meu Personal. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
