'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Cookie, Settings, Shield, BarChart3, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export default function PoliticaCookies() {
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-meu-accent to-yellow-400 rounded-full mb-6">
              <Cookie className="w-10 h-10 text-meu-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-meu-accent to-yellow-400 bg-clip-text text-transparent">
                Política de Cookies
              </span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Explicamos como usamos cookies e tecnologias similares para melhorar sua experiência na Meu Personal.
            </p>
            <div className="mt-6 inline-flex items-center bg-gradient-to-r from-meu-accent/20 to-yellow-400/20 border border-meu-accent/30 rounded-full px-6 py-3 backdrop-blur-sm">
              <span className="text-meu-accent text-sm font-semibold">Atualizado: Novembro 2025</span>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* O que são Cookies */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Cookie className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">O que são Cookies?</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Cookies são pequenos arquivos de texto armazenados em seu dispositivo quando você visita nosso site.
                    Eles nos permitem reconhecer seu navegador e lembrar informações sobre suas preferências.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Usamos cookies para melhorar a funcionalidade, personalizar sua experiência e analisar o uso da plataforma.
                  </p>
                </div>
              </div>
            </section>

            {/* Tipos de Cookies */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Settings className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-white">Tipos de Cookies que Usamos</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Cookies Essenciais</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Necessários para o funcionamento básico do site:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Autenticação e login</li>
                        <li>• Carrinho de compras</li>
                        <li>• Segurança do site</li>
                        <li>• Preferências básicas</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-cyan">Cookies de Desempenho</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Ajudam a entender como você usa o site:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Análise de tráfego</li>
                        <li>• Tempo de permanência</li>
                        <li>• Páginas visitadas</li>
                        <li>• Taxa de rejeição</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Cookies Funcionais</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Melhoram sua experiência no site:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Lembrar preferências</li>
                        <li>• Personalizar conteúdo</li>
                        <li>• Salvar filtros</li>
                        <li>• Manter sessões</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-cyan">Cookies de Marketing</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Para publicidade personalizada:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Anúncios relevantes</li>
                        <li>• Remarketing</li>
                        <li>• Redes sociais</li>
                        <li>• Campanhas específicas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookies Específicos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Cookies Específicos da Meu Personal</h2>

              <div className="space-y-6">
                <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                  <h3 className="text-lg font-semibold mb-3 text-meu-accent flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Sessão e Autenticação
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-meu-accent/10">
                      <span className="text-gray-300 font-mono text-sm">session_token</span>
                      <span className="text-meu-accent text-sm">Essencial</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-meu-accent/10">
                      <span className="text-gray-300 font-mono text-sm">user_preferences</span>
                      <span className="text-meu-cyan text-sm">Funcional</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-300 font-mono text-sm">auth_remember</span>
                      <span className="text-meu-accent text-sm">Funcional</span>
                    </div>
                  </div>
                </div>

                <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                  <h3 className="text-lg font-semibold mb-3 text-meu-cyan flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Analytics e Desempenho
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-meu-cyan/10">
                      <span className="text-gray-300 font-mono text-sm">_ga</span>
                      <span className="text-meu-cyan text-sm">Desempenho</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-meu-cyan/10">
                      <span className="text-gray-300 font-mono text-sm">page_views</span>
                      <span className="text-meu-cyan text-sm">Desempenho</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-300 font-mono text-sm">user_engagement</span>
                      <span className="text-meu-cyan text-sm">Desempenho</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Como Gerenciar Cookies */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Settings className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Gerenciando Cookies</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    Você tem controle sobre os cookies que aceita em nosso site:
                  </p>

                  <div className="space-y-4">
                    <div className="bg-meu-primary/30 rounded-lg p-4">
                      <h4 className="font-semibold text-meu-accent mb-2">Configurações do Navegador</h4>
                      <p className="text-gray-300 text-sm mb-3">
                        Através das configurações do seu navegador, você pode:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1 ml-4">
                        <li>• Bloquear todos os cookies</li>
                        <li>• Aceitar apenas cookies essenciais</li>
                        <li>• Limpar cookies existentes</li>
                        <li>• Receber notificações sobre cookies</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-lg p-4">
                      <h4 className="font-semibold text-meu-cyan mb-2">Configurações da Plataforma</h4>
                      <p className="text-gray-300 text-sm mb-3">
                        Em nosso painel de preferências você pode:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1 ml-4">
                        <li>• Desativar cookies de marketing</li>
                        <li>• Limitar cookies de desempenho</li>
                        <li>• Personalizar funcionalidades</li>
                        <li>• Revisar consentimento</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Importante</h4>
                      <p className="text-gray-300 text-sm">
                        Bloquear cookies essenciais pode afetar o funcionamento adequado da plataforma,
                        incluindo login, agendamentos e processamento de pagamentos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookies de Terceiros */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Cookies de Terceiros</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Utilizamos serviços de terceiros que podem instalar cookies em nosso site:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-meu-accent mb-2">Google Analytics</h4>
                  <p className="text-gray-300 text-sm">
                    Para análise de tráfego e comportamento dos usuários.
                  </p>
                </div>

                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-meu-cyan mb-2">Stripe</h4>
                  <p className="text-gray-300 text-sm">
                    Para processamento seguro de pagamentos.
                  </p>
                </div>

                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-meu-accent mb-2">Facebook/Meta</h4>
                  <p className="text-gray-300 text-sm">
                    Para marketing e redes sociais.
                  </p>
                </div>

                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-meu-cyan mb-2">Hotjar</h4>
                  <p className="text-gray-300 text-sm">
                    Para análise de experiência do usuário.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacidade e Segurança */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Shield className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Privacidade e Segurança</h2>
                  <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                      Levamos a segurança e privacidade dos seus dados a sério:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">🔒</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Criptografia</h4>
                        <p className="text-sm text-gray-300">Dados criptografados e seguros</p>
                      </div>

                      <div className="text-center">
                        <div className="w-16 h-16 bg-meu-cyan rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">⏱️</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Expiração</h4>
                        <p className="text-sm text-gray-300">Cookies com prazo definido</p>
                      </div>

                      <div className="text-center">
                        <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">🎯</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Mínimo Necessário</h4>
                        <p className="text-sm text-gray-300">Apenas dados essenciais</p>
                      </div>
                    </div>

                    <div className="bg-meu-primary/20 rounded-lg p-4 border border-meu-accent/20">
                      <h4 className="font-semibold text-meu-accent mb-2">Nossa Política</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Não vendemos dados para terceiros</li>
                        <li>• Respeitamos suas preferências</li>
                        <li>• Cumprimos com LGPD</li>
                        <li>• Auditorias regulares de segurança</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Atualizações */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Atualizações da Política</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Esta política de cookies pode ser atualizada para refletir mudanças em nossas práticas
                ou requisitos legais.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Mudanças significativas serão comunicadas através de:
              </p>
              <ul className="text-gray-300 space-y-2 ml-4">
                <li>• Notificações na plataforma</li>
                <li>• E-mail para usuários cadastrados</li>
                <li>• Banner no site</li>
                <li>• Atualização da data desta política</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Recomendamos revisar esta política periodicamente para manter-se informado sobre nossas práticas.
              </p>
            </section>

            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-meu-primary border-t border-meu-accent/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300 mb-4">© 2025 Meu Personal. Todos os direitos reservados.</p>
          <div className="flex justify-center space-x-6">
            <Link href="/privacidade" className="text-gray-300 hover:text-meu-accent transition-colors">Política de Privacidade</Link>
            <Link href="/termos" className="text-gray-300 hover:text-meu-accent transition-colors">Termos de Uso</Link>
            <Link href="/" className="text-gray-300 hover:text-meu-accent transition-colors">Página Inicial</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}