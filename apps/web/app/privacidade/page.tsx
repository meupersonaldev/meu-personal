'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Eye, Lock, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-meu-primary-dark">
      {/* Header */}
      <header className="bg-meu-primary text-white sticky top-0 z-50 border-b border-meu-primary-dark">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Logo
              size="header"
              variant="default"
              showText={false}
              href="/"
            />

            {/* Back Button */}
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-meu-primary-dark">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 lg:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-meu-accent rounded-full mb-6">
              <Shield className="w-10 h-10 text-meu-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-meu-accent via-yellow-300 to-meu-accent bg-clip-text text-transparent">
                Política de Privacidade
              </span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Sua privacidade é fundamental para nós. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais.
            </p>
            <div className="mt-6 inline-flex items-center bg-gradient-to-r from-meu-accent/20 to-meu-cyan/20 border border-meu-accent/30 rounded-full px-6 py-3 backdrop-blur-sm">
              <span className="text-meu-accent text-sm font-semibold">Última atualização: Novembro 2025</span>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Introdução */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Eye className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Sobre Esta Política</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    A Meu Personal está comprometida em proteger sua privacidade e garantir a segurança dos seus dados pessoais.
                    Esta política de privacidade explica como coletamos, usamos, compartilhamos e protegemos suas informações
                    quando você utiliza nossos serviços.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Ao utilizar nosso plataforma, você concorda com as práticas descritas nesta política.
                  </p>
                </div>
              </div>
            </section>

            {/* Coleta de Dados */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <UserCheck className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Informações Que Coletamos</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Dados Pessoais</h3>
                      <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Nome completo e informações de contato</li>
                        <li>Data de nascimento e gênero</li>
                        <li>Endereço de e-mail e telefone</li>
                        <li>Informações de pagamento</li>
                        <li>Documento de identificação (CPF/RG)</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-meu-cyan">Dados de Saúde e Fitness</h3>
                      <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Informações sobre condições físicas</li>
                        <li>Objetivos de fitness e bem-estar</li>
                        <li>Histórico de treinos e progresso</li>
                        <li>Avaliações físicas e medições</li>
                        <li>Preferências de treinamento</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Dados de Uso</h3>
                      <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Informações de login e acesso</li>
                        <li>Interações com a plataforma</li>
                        <li>Preferências e configurações</li>
                        <li>Dados de geolocalização (com consentimento)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Uso de Dados */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Lock className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Como Usamos Suas Informações</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Para Professores</h3>
                      <ul className="text-gray-300 space-y-2 text-sm">
                        <li>• Gerenciar sua agenda e alunos</li>
                        <li>• Processar pagamentos</li>
                        <li>• Validar credenciais</li>
                        <li>• Melhorar nossos serviços</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-cyan">Para Alunos</h3>
                      <ul className="text-gray-300 space-y-2 text-sm">
                        <li>• Conectar com professores</li>
                        <li>• Agendar sessões</li>
                        <li>• Acompanhar progresso</li>
                        <li>• Personalizar experiência</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Compartilhamento */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Compartilhamento de Dados</h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-meu-accent rounded-full mt-2 mr-3"></div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-meu-accent">Com Seu Consentimento</h3>
                    <p className="text-gray-300">Compartilhamos informações com professores quando você agenda sessões ou solicita serviços específicos.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-2 h-2 bg-meu-cyan rounded-full mt-2 mr-3"></div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-meu-cyan">Parceiros de Serviço</h3>
                    <p className="text-gray-300">Utilizamos parceiros confiáveis para processamento de pagamentos, envio de comunicações e analytics.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-2 h-2 bg-meu-accent rounded-full mt-2 mr-3"></div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-meu-accent">Obrigação Legal</h3>
                    <p className="text-gray-300">Podemos compartilhar dados quando exigido por lei ou para proteger nossos direitos e segurança.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Segurança */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Proteção de Dados</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Implementamos medidas robustas de segurança para proteger suas informações pessoais:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Criptografia</h4>
                  <p className="text-sm text-gray-300">Dados criptografados em trânsito e em repouso</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-meu-cyan rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Acesso Restrito</h4>
                  <p className="text-sm text-gray-300">Apenas pessoal autorizado tem acesso</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Monitoramento</h4>
                  <p className="text-sm text-gray-300">Monitoramento 24/7 contra ameaças</p>
                </div>
              </div>
            </section>

            {/* Direitos do Usuário */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Seus Direitos</h2>

              <div className="space-y-4">
                <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                  <h3 className="text-lg font-semibold mb-3 text-meu-accent">Direitos LGPD</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Acesso aos seus dados pessoais</li>
                    <li>• Correção de informações incompletas</li>
                    <li>• Eliminação de dados desnecessários</li>
                    <li>• Portabilidade de dados</li>
                    <li>• Revogação do consentimento</li>
                  </ul>
                </div>

                <p className="text-gray-300 text-sm mt-4">
                  Para exercer seus direitos, entre em contato conosco através do e-mail:
                  <span className="text-meu-accent font-semibold"> privacidade@meupersonal.com.br</span>
                </p>
              </div>
            </section>

            {/* Contato */}
            <section className="bg-gradient-to-r from-meu-accent/20 to-meu-cyan/20 rounded-2xl border border-meu-accent/30 p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">Dúvidas e Contato</h2>
              <p className="text-gray-300 mb-6">
                Para quaisquer questões sobre esta política de privacidade ou tratamento de seus dados,
                entre em contato conosco:
              </p>

              <div className="space-y-2">
                <p className="text-meu-accent font-semibold">E-mail: privacidade@meupersonal.com.br</p>
                <p className="text-meu-cyan font-semibold">Telefone: (0XX) XXXXX-XXXX</p>
                <p className="text-gray-300">Resposta em até 15 dias corridos</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-meu-primary border-t border-meu-accent/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300 mb-4">© 2025 Meu Personal. Todos os direitos reservados.</p>
          <div className="flex justify-center space-x-6">
            <Link href="/termos" className="text-gray-300 hover:text-meu-accent transition-colors">Termos de Uso</Link>
            <Link href="/cookies" className="text-gray-300 hover:text-meu-accent transition-colors">Política de Cookies</Link>
            <Link href="/" className="text-gray-300 hover:text-meu-accent transition-colors">Página Inicial</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}