'use client'

import Link from 'next/link'
import Image from 'next/image'
import SiteFooter from '@/components/site-footer'
import { ArrowLeft, Shield, Database, Eye, Download, AlertCircle, CheckCircle, FileText, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LGPD() {
  return (
    <div className="min-h-screen bg-meu-primary-dark">
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                LGPD
              </span>
            </h1>
            <h2 className="text-2xl font-bold mb-4 text-white">Lei Geral de Proteção de Dados</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Nosso compromisso com a Lei nº 13.709/2018 e a proteção dos seus dados pessoais.
            </p>
            <div className="mt-6 inline-flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-full px-6 py-3 backdrop-blur-sm">
              <span className="text-green-400 text-sm font-semibold">Em conformidade com LGPD • Lei nº 13.709/2018</span>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* O que é LGPD */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">O que é a LGPD?</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    A Lei Geral de Proteção de Dados Pessoais (LGPD) é a legislação brasileira que estabelece regras
                    sobre coleta, armazenamento, tratamento e compartilhamento de dados pessoais.
                  </p>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Entrou em vigor em setembro de 2020 e tem como objetivo proteger os direitos fundamentais de
                    liberdade e privacidade dos cidadãos brasileiros.
                  </p>
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">Princípios Fundamentais</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Finalidade específica e legítima</li>
                      <li>• Necessidade e adequação</li>
                      <li>• Livre acesso e transparência</li>
                      <li>• Qualidade e segurança dos dados</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados que Tratamos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-white">Dados Pessoais que Tratamos</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-green-400">Dados de Identificação</h3>
                      <ul className="text-gray-300 space-y-1 text-sm">
                        <li>• Nome completo</li>
                        <li>• CPF e RG</li>
                        <li>• Data de nascimento</li>
                        <li>• Endereço e CEP</li>
                        <li>• Telefone e e-mail</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-emerald-400">Dados de Saúde e Fitness</h3>
                      <ul className="text-gray-300 space-y-1 text-sm">
                        <li>• Informações sobre condições físicas</li>
                        <li>• Histórico de atividades físicas</li>
                        <li>• Objetivos de treinamento</li>
                        <li>• Medidas corporais</li>
                        <li>• Avaliações físicas</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-green-400">Dados de Uso da Plataforma</h3>
                      <ul className="text-gray-300 space-y-1 text-sm">
                        <li>• Histórico de agendamentos</li>
                        <li>• Preferências e configurações</li>
                        <li>• Interações com professores</li>
                        <li>• Dados de pagamento</li>
                        <li>• Localização (com consentimento)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Base Legal */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Base Legal para Tratamento</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-meu-primary/30 rounded-xl p-6 border border-green-500/10">
                  <h3 className="text-lg font-semibold mb-3 text-green-400">Consentimento</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Autorização clara e informada para tratamentos específicos:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Marketing e comunicação</li>
                    <li>• Compartilhamento com parceiros</li>
                    <li>• Uso de imagens e vídeos</li>
                  </ul>
                </div>

                <div className="bg-meu-primary/30 rounded-xl p-6 border border-emerald-500/10">
                  <h3 className="text-lg font-semibold mb-3 text-emerald-400">Execução do Contrato</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Dados necessários para cumprimento do serviço:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Cadastro e autenticação</li>
                    <li>• Agendamento de sessões</li>
                    <li>• Processamento de pagamentos</li>
                  </ul>
                </div>

                <div className="bg-meu-primary/30 rounded-xl p-6 border border-green-500/10">
                  <h3 className="text-lg font-semibold mb-3 text-green-400">Obrigação Legal</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Cumprimento de obrigações legais e regulatórias:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Requisitos fiscais</li>
                    <li>• Regulamentação educacional</li>
                    <li>• Processos judiciais</li>
                  </ul>
                </div>

                <div className="bg-meu-primary/30 rounded-xl p-6 border border-emerald-500/10">
                  <h3 className="text-lg font-semibold mb-3 text-emerald-400">Interesse Legítimo</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Para finalidades compatíveis com nossos objetivos:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Melhoria dos serviços</li>
                    <li>• Prevenção de fraudes</li>
                    <li>• Segurança da plataforma</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Seus Direitos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-white">Seus Direitos LGPD</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-green-500/10">
                      <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Direitos de Acesso e Correção
                      </h3>
                      <ul className="text-gray-300 text-sm space-y-2">
                        <li>• <strong>Confirmar</strong> se seus dados são tratados</li>
                        <li>• <strong>Acessar</strong> seus dados pessoais</li>
                        <li>• <strong>Corrigir</strong> informações incompletas</li>
                        <li>• <strong>Atualizar</strong> dados desatualizados</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-emerald-500/10">
                      <h3 className="text-lg font-semibold mb-3 text-emerald-400 flex items-center">
                        <Download className="w-5 h-5 mr-2" />
                        Direitos de Portabilidade
                      </h3>
                      <ul className="text-gray-300 text-sm space-y-2">
                        <li>• <strong>Exportar</strong> seus dados em formato legível</li>
                        <li>• <strong>Transferir</strong> para outros serviços</li>
                        <li>• <strong>Receber</strong> histórico completo</li>
                        <li>• <strong>Compartilhar</strong> com terceiros</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-green-500/10">
                      <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center">
                        <Lock className="w-5 h-5 mr-2" />
                        Direitos de Eliminação
                      </h3>
                      <ul className="text-gray-300 text-sm space-y-2">
                        <li>• <strong>Solicitar</strong> exclusão de dados</li>
                        <li>• <strong>Anonimizar</strong> informações</li>
                        <li>• <strong>Revogar</strong> consentimento</li>
                        <li>• <strong>Esquecer</strong> quando aplicável</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-xl p-6 border border-emerald-500/10">
                      <h3 className="text-lg font-semibold mb-3 text-emerald-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Direitos de Informação
                      </h3>
                      <ul className="text-gray-300 text-sm space-y-2">
                        <li>• <strong>Saber</strong> sobre compartilhamentos</li>
                        <li>• <strong>Receber</strong> aviso de vazamentos</li>
                        <li>• <strong>Entender</strong> finalidades de uso</li>
                        <li>• <strong>Cancelar</strong> autorizações</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Como Exercer Direitos */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Como Exercer Seus Direitos</h2>

              <div className="space-y-6">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-400">Canais de Atendimento LGPD</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-white mb-2">E-mail Principal</h4>
                      <p className="text-green-400 font-mono">lgpd@meupersonal.com.br</p>
                      <p className="text-gray-300 text-sm mt-1">Resposta em até 15 dias corridos</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Canal Prioritário</h4>
                      <p className="text-emerald-400">Formulário na plataforma</p>
                      <p className="text-gray-300 text-sm mt-1">Área do usuário → Dados LGPD</p>
                    </div>
                  </div>
                </div>

                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-400 mb-3">Processo de Solicitação</h4>
                  <ol className="text-gray-300 text-sm space-y-2">
                    <li>1. Envie solicitação por e-mail ou formulário</li>
                    <li>2. Informe qual(is) direito(s) deseja exercer</li>
                    <li>3. Aguarde nossa análise (até 15 dias)</li>
                    <li>4. Receba resposta com nosso posicionamento</li>
                    <li>5. Caso insatisfeito, solicite revisão</li>
                  </ol>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">Documentação Necessária</h4>
                  <p className="text-gray-300 text-sm">
                    Para confirmar sua identidade, podemos solicitar documento de identificação com foto.
                    Solicitações por terceiros exigem procuração específica.
                  </p>
                </div>
              </div>
            </section>

            {/* Medidas de Segurança */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-white">Medidas de Segurança e Privacidade</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🔐</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Criptografia</h4>
                      <p className="text-sm text-gray-300">Dados criptografados ponta a ponta</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🛡️</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Controle de Acesso</h4>
                      <p className="text-sm text-gray-300">Acesso restrito e monitorado</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📋</span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">Relatórios</h4>
                      <p className="text-sm text-gray-300">Auditoria e conformidade contínua</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-meu-primary/30 rounded-lg p-4 border border-green-500/10">
                      <h4 className="font-semibold text-green-400 mb-2">Encarregado de Dados (DPO)</h4>
                      <p className="text-gray-300 text-sm mb-2">
                        Nossa empresa possui um Encarregado de Proteção de Dados responsável por:
                      </p>
                      <ul className="text-gray-300 text-sm space-y-1 ml-4">
                        <li>• Orientar sobre tratamento de dados</li>
                        <li>• Receber reclamações e solicitações</li>
                        <li>• Comunicar à ANPD em caso de incidentes</li>
                        <li>• Realizar auditorias internas</li>
                      </ul>
                    </div>

                    <div className="bg-meu-primary/30 rounded-lg p-4 border border-emerald-500/10">
                      <h4 className="font-semibold text-emerald-400 mb-2">Treinamento e Conscientização</h4>
                      <p className="text-gray-300 text-sm">
                        Todos nossos colaboradores recebem treinamento regular sobre LGPD e melhores práticas
                        de proteção de dados pessoais.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Incidentes */}
            <section className="bg-meu-primary/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Notificação de Incidentes</h2>

              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3 text-red-400 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Em caso de vazamento ou incidente
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Nossa política é comunicar todos os titulares afetados em até 72 horas após a detecção
                    do incidente que possa oferecer risco relevante.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-white mb-2">O que informaremos:</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Natureza do incidente</li>
                        <li>• Dados afetados</li>
                        <li>• Medidas tomadas</li>
                        <li>• Recomendações aos usuários</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Nossas ações imediatas:</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Conter o vazamento</li>
                        <li>• Investigar a causa</li>
                        <li>• Notificar autoridades</li>
                        <li>• Implementar melhorias</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-2">Canal de Notificação</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Caso identifique possível vazamento, entre em contato imediatamente:
                  </p>
                  <p className="text-green-400 font-mono">incidentes@meupersonal.com.br</p>
                </div>
              </div>
            </section>

            {/* Contato Final */}
            <section className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-400/30 p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">Nossos Canais LGPD</h2>
              <p className="text-gray-300 mb-6">
                Estamos à disposição para qualquer dúvida ou solicitação sobre seus dados pessoais
                e nossos direitos e deveres sob a LGPD.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-2">Dúvidas Gerais</h4>
                  <p className="text-green-400 text-sm font-mono">lgpd@meupersonal.com.br</p>
                </div>
                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-400 mb-2">Solicitações</h4>
                  <p className="text-emerald-400 text-sm font-mono">solicitacoes@meupersonal.com.br</p>
                </div>
                <div className="bg-meu-primary/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-2">Incidentes</h4>
                  <p className="text-green-400 text-sm font-mono">incidentes@meupersonal.com.br</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-green-400 font-semibold">Prazo de resposta: 15 dias corridos</p>
                <p className="text-emerald-400">Disponível 24/7 para casos urgentes</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
