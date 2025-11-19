'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, FileText, Users, Target, AlertTriangle, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export default function TermosDeUso() {
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-meu-cyan rounded-full mb-6">
              <FileText className="w-10 h-10 text-meu-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-meu-cyan to-blue-400 bg-clip-text text-transparent">
                Termos de Uso
              </span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Bem-vindo à Meu Personal! Estes termos estabelecem as regras e condições para o uso de nossa plataforma.
            </p>
            <div className="mt-6 inline-flex items-center bg-gradient-to-r from-meu-cyan/20 to-blue-400/20 border border-meu-cyan/30 rounded-full px-6 py-3 backdrop-blur-sm">
              <span className="text-meu-cyan text-sm font-semibold">Vigência: Novembro 2025</span>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Aceitação dos Termos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <FileText className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">1. Aceitação dos Termos</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Ao acessar e utilizar a plataforma Meu Personal, você concorda integralmente com estes Termos de Uso.
                    Caso não concorde com qualquer parte destes termos, não utilize nossos serviços.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Estes termos aplicam-se a todos os usuários, incluindo alunos, professores e administradores da plataforma.
                  </p>
                </div>
              </div>
            </section>

            {/* Descrição do Serviço */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Target className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">2. Descrição do Serviço</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    A Meu Personal é uma plataforma digital que conecta alunos a professores de educação física, oferecendo:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-accent">Para Alunos</h3>
                      <ul className="text-gray-300 space-y-2 text-sm">
                        <li>• Busca e seleção de professores qualificados</li>
                        <li>• Agendamento de sessões de treinamento</li>
                        <li>• Sistema de pagamento integrado</li>
                        <li>• Acompanhamento de progresso</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                      <h3 className="text-lg font-semibold mb-3 text-meu-cyan">Para Professores</h3>
                      <ul className="text-gray-300 space-y-2 text-sm">
                        <li>• Gestão completa de agenda</li>
                        <li>• Gerenciamento de alunos</li>
                        <li>• Recebimento de pagamentos</li>
                        <li>• Divulgação profissional</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Responsabilidades */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">3. Responsabilidades dos Usuários</h2>

              <div className="space-y-6">
                <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                  <h3 className="text-lg font-semibold mb-4 text-meu-accent">Dos Alunos</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Fornecer informações verdadeiras e atualizadas</li>
                    <li>• Comunicar condições de saúde relevantes</li>
                    <li>• Comparecer às sessões agendadas</li>
                    <li>• Realizar pagamentos em dia</li>
                    <li>• Respeitar os professores e regras da academia</li>
                  </ul>
                </div>

                <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-cyan/10">
                  <h3 className="text-lg font-semibold mb-4 text-meu-cyan">Dos Professores</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Possuir certificação e registro profissional válido</li>
                    <li>• Atender com profissionalismo e ética</li>
                    <li>• Cumprir horários agendados</li>
                    <li>• Manter informações atualizadas na plataforma</li>
                    <li>• Respeitar limites e condições dos alunos</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Pagamentos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-accent rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">4. Pagamentos e Tarifas</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    Os serviços são pagos através de nosso sistema de créditos ou pagamentos diretos:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">💰</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Créditos</h4>
                      <p className="text-sm text-gray-300">Sistema de créditos pré-pagos para agilizar pagamentos</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-meu-cyan rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">💳</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Taxa de Serviço</h4>
                      <p className="text-sm text-gray-300">Taxa de 15% sobre cada sessão para professores</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-meu-accent rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🔄</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Reembolso</h4>
                      <p className="text-sm text-gray-300">Política de reembolso com até 24h de antecedência</p>
                    </div>
                  </div>

                  <div className="bg-meu-primary/20 rounded-lg p-4 border border-meu-accent/20">
                    <h4 className="font-semibold text-meu-accent mb-2">Política de Cancelamento</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Cancelamento com 24h+ de antecedência: reembolso integral</li>
                      <li>• Cancelamento com menos de 24h: cobrança de 50% do valor</li>
                      <li>• Não comparecimento (no-show): cobrança integral</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Agendamentos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Calendar className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">5. Agendamentos e Horários</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Os agendamentos devem seguir as seguintes regras:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-meu-primary/30 rounded-lg p-4">
                      <h4 className="font-semibold text-meu-accent mb-2">Para Alunos</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Agendar com no mínimo 2h de antecedência</li>
                        <li>• Confirmar presença 1h antes da sessão</li>
                        <li>• Comunicar atrasos imediatamente</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-lg p-4">
                      <h4 className="font-semibold text-meu-cyan mb-2">Para Professores</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Confirmar agendamentos em até 12h</li>
                        <li>• Manter agenda atualizada</li>
                        <li>• Notificar sobre indisponibilidades</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Conteúdo do Usuário */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">6. Conteúdo do Usuário</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Ao utilizar nossa plataforma, você poderá fornecer conteúdo como fotos, vídeos, avaliações e comentários.
              </p>
              <div className="bg-meu-primary/30 rounded-xl p-6 border border-meu-accent/10">
                <h3 className="text-lg font-semibold mb-3 text-meu-accent">Direitos e Responsabilidades</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Você mantém os direitos sobre seu conteúdo</li>
                  <li>• Ao postar, você nos concede direito de uso na plataforma</li>
                  <li>• É proibido conteúdo ofensivo, discriminatório ou ilegal</li>
                  <li>• Respeite a privacidade de outros usuários</li>
                  <li>• Não compartilhe informações falsas ou enganosas</li>
                </ul>
              </div>
            </section>

            {/* Limitações de Responsabilidade */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-meu-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-meu-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">7. Limitações de Responsabilidade</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    A Meu Personal funciona como intermediária entre alunos e professores, com as seguintes limitações:
                  </p>

                  <div className="space-y-4">
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-red-400 mb-2">Não Somos Responsáveis Por:</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Qualidades do serviço prestado pelo professor</li>
                        <li>• Acidentes ou lesões durante treinamentos</li>
                        <li>• Disputas entre alunos e professores</li>
                        <li>• Problemas de saúde dos usuários</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-lg p-4">
                      <h4 className="font-semibold text-meu-accent mb-2">Recomendações Importantes</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Consulte um médico antes de iniciar atividades físicas</li>
                        <li>• Verifique a qualificação dos professores</li>
                        <li>• Siga orientações profissionais com responsabilidade</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Propriedade Intelectual */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">8. Propriedade Intelectual</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Todo o conteúdo da plataforma Meu Personal, incluindo设计, textos, logos, software e funcionalidades,
                é protegido por leis de propriedade intelectual.
              </p>
              <p className="text-gray-300 leading-relaxed">
                É proibida a cópia, modificação, distribuição ou uso comercial de qualquer parte da nossa plataforma
                sem autorização expressa.
              </p>
            </section>

            {/* Encerramento */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-cyan/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">9. Encerramento da Conta</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Podemos encerrar ou suspender contas que violarem estes termos ou que apresentem comportamento inadequado.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Usuários podem solicitar o encerramento de suas contas a qualquer momento através das configurações
                ou entrando em contato com nosso suporte.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Após o encerramento, dados pessoais serão excluídos conforme nossa política de privacidade, exceto
                informações que precisamos manter por obrigação legal.
              </p>
            </section>

            {/* Alterações nos Termos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-meu-accent/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">10. Alterações nos Termos</h2>
              <p className="text-gray-300 leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Mudanças significativas serão
                comunicadas com pelo menos 30 dias de antecedência através de e-mail ou notificações na plataforma.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Contato e Disputas */}
            <section className="bg-gradient-to-r from-meu-cyan/20 to-blue-400/20 rounded-2xl border border-meu-cyan/30 p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">11. Contato e Disputas</h2>
              <p className="text-gray-300 mb-6">
                Para quaisquer dúvidas, sugestões ou disputas relacionadas a estes termos, entre em contato:
              </p>

              <div className="space-y-2">
                <p className="text-meu-cyan font-semibold">E-mail: termos@meupersonal.com.br</p>
                <p className="text-meu-accent font-semibold">Telefone: (0XX) XXXXX-XXXX</p>
                <p className="text-gray-300">Disputas serão resolvidas preferencialmente por diálogo</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-meu-primary border-t border-meu-cyan/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300 mb-4">© 2025 Meu Personal. Todos os direitos reservados.</p>
          <div className="flex justify-center space-x-6">
            <Link href="/privacidade" className="text-gray-300 hover:text-meu-cyan transition-colors">Política de Privacidade</Link>
            <Link href="/cookies" className="text-gray-300 hover:text-meu-cyan transition-colors">Política de Cookies</Link>
            <Link href="/" className="text-gray-300 hover:text-meu-cyan transition-colors">Página Inicial</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}