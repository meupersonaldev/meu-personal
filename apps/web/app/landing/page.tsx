'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Check, Star, Users, Target, Dumbbell, Heart, Zap, Shield } from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: 'Básico',
      price: 'R$ 89,90',
      period: '/mês',
      features: ['Acesso à academia', 'Equipamentos básicos', 'Horário comercial', 'Avaliação física inicial'],
      popular: false
    },
    {
      name: 'Premium',
      price: 'R$ 149,90',
      period: '/mês',
      features: ['Acesso total à academia', 'Todos os equipamentos', 'Horário estendido', 'Aulas coletivas', 'Avaliação física completa', 'Nutricionista', 'Personal trainer 1x/mês'],
      popular: true
    },
    {
      name: 'VIP',
      price: 'R$ 249,90',
      period: '/mês',
      features: ['Acesso ilimitado', 'Equipamentos premium', 'Horário 24h', 'Aulas exclusivas', 'Avaliação completa', 'Nutricionista personal', 'Personal trainer 2x/semana', 'Sauna e spa'],
      popular: false
    }
  ];

  const testimonials = [
    {
      name: 'João Silva',
      role: 'Empresário',
      content: 'Transformei meu corpo e minha vida aqui. Os profissionais são incríveis e a estrutura é fantástica!',
      rating: 5,
      image: '/api/placeholder/100/100'
    },
    {
      name: 'Maria Santos',
      role: 'Advogada',
      content: 'O melhor investimento que fiz em mim mesma. Aulas variadas, ambiente motivador e resultados visíveis.',
      rating: 5,
      image: '/api/placeholder/100/100'
    },
    {
      name: 'Pedro Costa',
      role: 'Estudante',
      content: 'Excelente custo-benefício. Adoro a flexibilidade de horários e a qualidade dos equipamentos.',
      rating: 5,
      image: '/api/placeholder/100/100'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Dumbbell className="h-8 w-8 text-orange-500 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Fit<span className="text-orange-500">Live</span></span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-orange-500 transition-colors">Início</a>
              <a href="#sobre" className="text-gray-700 hover:text-orange-500 transition-colors">Sobre</a>
              <a href="#planos" className="text-gray-700 hover:text-orange-500 transition-colors">Planos</a>
              <a href="#depoimentos" className="text-gray-700 hover:text-orange-500 transition-colors">Depoimentos</a>
              <a href="#contato" className="text-gray-700 hover:text-orange-500 transition-colors">Contato</a>
              <button className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors">
                Matricule-se
              </button>
            </div>

            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#inicio" className="block px-3 py-2 text-gray-700 hover:text-orange-500">Início</a>
              <a href="#sobre" className="block px-3 py-2 text-gray-700 hover:text-orange-500">Sobre</a>
              <a href="#planos" className="block px-3 py-2 text-gray-700 hover:text-orange-500">Planos</a>
              <a href="#depoimentos" className="block px-3 py-2 text-gray-700 hover:text-orange-500">Depoimentos</a>
              <a href="#contato" className="block px-3 py-2 text-gray-700 hover:text-orange-500">Contato</a>
              <button className="w-full text-left bg-orange-500 text-white px-3 py-2 rounded-full hover:bg-orange-600">
                Matricule-se
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Transforme Seu<br />
            <span className="text-yellow-300">Corpo Hoje</span>
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
            Junte-se à melhor academia da região e alcance seus objetivos com profissionais qualificados e estrutura completa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-orange-500 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
              Começar Gratuitamente
              <ChevronRight className="inline-block ml-2 h-5 w-5" />
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-orange-500 transition-all">
              Conhecer a Academia
            </button>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">10.000+</div>
              <div className="text-white">Alunos Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-white">Equipamentos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">30+</div>
              <div className="text-white">Aulas Semanais</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">15+</div>
              <div className="text-white">Profissionais</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por Que Escolher a <span className="text-orange-500">FitLive</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Temos tudo que você precisa para alcançar seus objetivos de fitness em um lugar só
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Equipamentos Modernos</h3>
              <p className="text-gray-600">Aparelhos de última geração para treinos seguros e eficazes</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profissionais Qualificados</h3>
              <p className="text-gray-600">Personal trainers e instrutores certificados para te acompanhar</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Acompanhamento Personalizado</h3>
              <p className="text-gray-600">Planos de treino individualizados conforme seus objetivos</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aulas Variadas</h3>
              <p className="text-gray-600">Musculação, crossfit, yoga, spinning e muito mais</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Planos que Se Adaptam a Você
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Escolha o plano ideal para seus objetivos e rotina
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl ${
                  plan.popular
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white transform scale-105 shadow-2xl'
                    : 'bg-white border-2 border-gray-200 hover:border-orange-500 shadow-lg'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-lg ${plan.popular ? 'text-white' : 'text-gray-600'}`}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                        plan.popular ? 'text-white' : 'text-green-500'
                      }`} />
                      <span className={plan.popular ? 'text-white' : 'text-gray-700'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-full font-semibold transition-all ${
                    plan.popular
                      ? 'bg-white text-orange-500 hover:bg-gray-100'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  Escolher Plano
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Alunos que Transformaram Suas Vidas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Conheça as histórias de sucesso de quem já faz parte da FitLive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para Começar Sua Transformação?
          </h2>
          <p className="text-xl text-white mb-8">
            Matricule-se hoje mesmo e ganhe 7 dias de avaliação gratuita
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-orange-500 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
              Matricular Agora
              <ChevronRight className="inline-block ml-2 h-5 w-5" />
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-orange-500 transition-all">
              Agendar Visita
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Dumbbell className="h-8 w-8 text-orange-500 mr-2" />
                <span className="text-2xl font-bold">Fit<span className="text-orange-500">Live</span></span>
              </div>
              <p className="text-gray-400">
                Transformando vidas através do fitness e bem-estar desde 2020.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#inicio" className="text-gray-400 hover:text-orange-500">Início</a></li>
                <li><a href="#sobre" className="text-gray-400 hover:text-orange-500">Sobre</a></li>
                <li><a href="#planos" className="text-gray-400 hover:text-orange-500">Planos</a></li>
                <li><a href="#depoimentos" className="text-gray-400 hover:text-orange-500">Depoimentos</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📍 Rua das Academias, 123</li>
                <li>📱 (11) 99999-9999</li>
                <li>✉️ contato@fitlive.com.br</li>
                <li>🕒 Seg-Sex: 6h-23h</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Siga-nos</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-orange-500 text-2xl">📘</a>
                <a href="#" className="text-gray-400 hover:text-orange-500 text-2xl">📷</a>
                <a href="#" className="text-gray-400 hover:text-orange-500 text-2xl">🐦</a>
                <a href="#" className="text-gray-400 hover:text-orange-500 text-2xl">📹</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FitLive. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}