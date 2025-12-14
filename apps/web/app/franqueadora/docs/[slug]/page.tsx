'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

// Componentes de destaque para o conteúdo
const Tip = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 text-sm flex gap-3">
        <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>{children}</div>
    </div>
)

const Warning = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 text-sm flex gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>{children}</div>
    </div>
)

const Success = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400 text-sm flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>{children}</div>
    </div>
)

const InfoBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm flex gap-3">
        <Info className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
        <div>{children}</div>
    </div>
)

// --- CONTEÚDO DOS MANUAIS ---
const MANUALS_CONTENT: Record<string, {
    title: string;
    description: string;
    lastUpdated: string;
    sections: { title: string; content: React.ReactNode }[]
}> = {
    'manual_franqueadora': {
        title: 'Manual da Franqueadora',
        description: 'Guia completo para gestão da rede, franquias, usuários, créditos e políticas globais.',
        lastUpdated: '14/12/2024',
        sections: [
            {
                title: '1. Visão Geral do Sistema',
                content: (
                    <div className="space-y-4">
                        <p>O painel da Franqueadora é o centro de comando de toda a rede <strong>Meu Personal</strong>. Aqui você tem controle total sobre todas as unidades, usuários e configurações do sistema.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Principais Módulos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Dashboard:</strong> Visão consolidada de KPIs (receita, aulas, usuários ativos)</li>
                            <li><strong>Franquias:</strong> Gestão completa de todas as unidades da rede</li>
                            <li><strong>Usuários:</strong> Controle de professores e alunos de toda a rede</li>
                            <li><strong>Leads:</strong> Gestão de interessados em abrir franquias</li>
                            <li><strong>Políticas:</strong> Termos de uso e políticas de privacidade</li>
                            <li><strong>Emails:</strong> Templates e histórico de comunicações</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Use o menu lateral para navegar entre os módulos. O dashboard é atualizado em tempo real.
                        </Tip>
                    </div>
                )
            },
            {
                title: '2. Gestão de Franquias',
                content: (
                    <div className="space-y-4">
                        <p>Gerencie todas as unidades da rede em um só lugar. Cada franquia possui seu próprio painel de controle.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Cadastrar Nova Franquia:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Franquias → Nova Franquia</strong></li>
                            <li>Preencha os dados cadastrais (Nome, CNPJ, Endereço)</li>
                            <li>Defina o administrador da unidade (email e senha)</li>
                            <li>Configure as taxas e comissões específicas</li>
                            <li>Clique em <strong>Criar Franquia</strong></li>
                        </ol>
                        <Warning>
                            <strong>Importante:</strong> O email do administrador será usado para o primeiro acesso. Certifique-se de que está correto.
                        </Warning>
                        <h4 className="font-semibold text-gray-900 mt-6">Monitoramento de Unidades:</h4>
                        <p>Na listagem de franquias você pode ver:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Status da unidade (ativa/inativa)</li>
                            <li>Quantidade de professores e alunos</li>
                            <li>Receita mensal e aulas realizadas</li>
                            <li>Check-ins e agendamentos pendentes</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '3. Gestão de Usuários',
                content: (
                    <div className="space-y-4">
                        <p>Controle centralizado de todos os professores e alunos da rede.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Professores:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Pendentes:</strong> Aguardando aprovação da franquia</li>
                            <li><strong>Aprovados:</strong> Podem dar aulas normalmente</li>
                            <li><strong>Rejeitados:</strong> Cadastro negado</li>
                            <li><strong>Inativos:</strong> Temporariamente desativados</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Alunos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Visualize o saldo de créditos de cada aluno</li>
                            <li>Histórico de compras e agendamentos</li>
                            <li>Vincule alunos a professores específicos</li>
                        </ul>
                        <InfoBox>
                            Use os filtros para encontrar usuários por nome, email, status ou franquia.
                        </InfoBox>
                    </div>
                )
            },
            {
                title: '4. Sistema de Créditos',
                content: (
                    <div className="space-y-4">
                        <p>O sistema utiliza <strong>horas-aula</strong> como moeda interna. Entenda como funciona:</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Para Alunos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Compram pacotes de horas-aula</li>
                            <li>Créditos são debitados ao agendar</li>
                            <li>Cancelamentos devolvem créditos (conforme política)</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Para Professores:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Recebem horas na carteira ao concluir aulas</li>
                            <li>Podem solicitar saque quando atingir mínimo</li>
                            <li>Histórico completo de ganhos disponível</li>
                        </ul>
                        <Success>
                            <strong>Novo:</strong> Agora você pode visualizar o saldo consolidado de todas as franquias no dashboard.
                        </Success>
                    </div>
                )
            },
            {
                title: '5. Políticas e Termos',
                content: (
                    <div className="space-y-4">
                        <p>Gerencie os documentos legais que aparecem para todos os usuários do sistema.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Tipos de Documentos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Termos de Uso:</strong> Regras gerais de utilização</li>
                            <li><strong>Política de Privacidade:</strong> Tratamento de dados (LGPD)</li>
                            <li><strong>Política de Cancelamento:</strong> Regras para reembolso</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Fluxo de Publicação:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Crie ou edite um rascunho</li>
                            <li>Revise o conteúdo</li>
                            <li>Publique a nova versão</li>
                            <li>Usuários serão notificados automaticamente</li>
                        </ol>
                        <Warning>
                            Ao publicar uma nova versão, os usuários precisarão aceitar novamente os termos.
                        </Warning>
                    </div>
                )
            },
            {
                title: '6. Comunicações e Emails',
                content: (
                    <div className="space-y-4">
                        <p>Gerencie templates de email e acompanhe o histórico de envios.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Templates Disponíveis:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Boas-vindas (aluno e professor)</li>
                            <li>Aprovação/Rejeição de professor</li>
                            <li>Confirmação de agendamento</li>
                            <li>Lembrete de aula</li>
                            <li>Recuperação de senha</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Histórico de Envios:</h4>
                        <p>Acompanhe métricas de entrega:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Emails enviados e entregues</li>
                            <li>Taxa de abertura</li>
                            <li>Cliques em links</li>
                            <li>Bounces e erros</li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    'manual_franquia': {
        title: 'Manual da Franquia',
        description: 'Guia completo para gestão da sua unidade, professores, alunos e operação diária.',
        lastUpdated: '14/12/2024',
        sections: [
            {
                title: '1. Primeiros Passos',
                content: (
                    <div className="space-y-4">
                        <p>Bem-vindo ao painel da sua franquia! Aqui você gerencia toda a operação da sua unidade.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Acesso ao Sistema:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>app.meupersonal.com.br/franquia/login</strong></li>
                            <li>Use o email e senha fornecidos pela franqueadora</li>
                            <li>Na primeira vez, você será solicitado a alterar a senha</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Visão Geral do Dashboard:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Aulas Hoje:</strong> Agendamentos do dia</li>
                            <li><strong>Professores Ativos:</strong> Quantos estão disponíveis</li>
                            <li><strong>Alunos Ativos:</strong> Com créditos ou agendamentos</li>
                            <li><strong>Receita do Mês:</strong> Vendas realizadas</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Configure notificações para receber alertas de novos agendamentos e cadastros.
                        </Tip>
                    </div>
                )
            },
            {
                title: '2. Gestão de Professores',
                content: (
                    <div className="space-y-4">
                        <p>Os professores são a base do seu negócio. Gerencie-os com cuidado.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Fluxo de Cadastro:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Professor se cadastra no app selecionando sua unidade</li>
                            <li>Cadastro aparece como <strong>"Pendente"</strong> no seu painel</li>
                            <li>Você analisa os dados e documentos</li>
                            <li>Aprova ou rejeita o cadastro</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Aprovação de Professores:</h4>
                        <p>Antes de aprovar, verifique:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Dados pessoais completos</li>
                            <li>CREF válido (se aplicável)</li>
                            <li>Foto de perfil profissional</li>
                            <li>Especialidades declaradas</li>
                        </ul>
                        <Warning>
                            <strong>Atenção:</strong> Professores rejeitados não podem se cadastrar novamente com o mesmo email. Use com cautela.
                        </Warning>
                        <h4 className="font-semibold text-gray-900 mt-6">Gerenciando Professores Ativos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Disponibilidade:</strong> Veja os horários de cada professor</li>
                            <li><strong>Agenda:</strong> Acompanhe os agendamentos</li>
                            <li><strong>Carteira:</strong> Saldo e histórico de ganhos</li>
                            <li><strong>Alunos:</strong> Quais alunos estão vinculados</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '3. Gestão de Alunos',
                content: (
                    <div className="space-y-4">
                        <p>Acompanhe seus alunos e garanta uma boa experiência.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Cadastro de Alunos:</h4>
                        <p>Alunos podem se cadastrar de duas formas:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Auto-cadastro:</strong> Pelo app, escolhendo sua unidade</li>
                            <li><strong>Cadastro pelo Professor:</strong> Professor adiciona o aluno</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Informações do Aluno:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Saldo de créditos (horas-aula)</li>
                            <li>Histórico de agendamentos</li>
                            <li>Professor(es) vinculado(s)</li>
                            <li>Última atividade</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Vínculo Aluno-Professor:</h4>
                        <p>Quando um professor cadastra um aluno, eles ficam automaticamente vinculados. Isso permite:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Agendamento direto com o professor</li>
                            <li>Comunicação facilitada</li>
                            <li>Histórico compartilhado</li>
                        </ul>
                        <InfoBox>
                            Alunos podem ter múltiplos professores vinculados se desejarem variar os treinos.
                        </InfoBox>
                    </div>
                )
            },
            {
                title: '4. Agenda e Agendamentos',
                content: (
                    <div className="space-y-4">
                        <p>A agenda é o coração da operação. Entenda como funciona.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Visualização da Agenda:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Visão Diária:</strong> Todos os horários do dia</li>
                            <li><strong>Visão Semanal:</strong> Panorama da semana</li>
                            <li><strong>Por Professor:</strong> Agenda individual</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Status dos Agendamentos:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><span className="text-blue-600 font-medium">Agendado:</span> Confirmado, aguardando a aula</li>
                            <li><span className="text-yellow-600 font-medium">Pendente:</span> Aguardando confirmação</li>
                            <li><span className="text-green-600 font-medium">Concluído:</span> Aula realizada</li>
                            <li><span className="text-red-600 font-medium">Cancelado:</span> Aula cancelada</li>
                            <li><span className="text-gray-600 font-medium">No-show:</span> Aluno não compareceu</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Agendamentos Recorrentes:</h4>
                        <p>Alunos podem criar séries de agendamentos (ex: toda terça às 8h). Isso facilita a rotina e garante o horário.</p>
                        <Tip>
                            <strong>Dica:</strong> Incentive alunos a criarem agendamentos recorrentes para melhor previsibilidade.
                        </Tip>
                    </div>
                )
            },
            {
                title: '5. Check-in e Presença',
                content: (
                    <div className="space-y-4">
                        <p>O sistema de check-in garante controle de presença e segurança.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Funciona:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Aluno chega na academia</li>
                            <li>Escaneia o QR Code da unidade</li>
                            <li>Sistema registra o check-in</li>
                            <li>Professor confirma a presença no app</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">QR Code da Unidade:</h4>
                        <p>Cada franquia possui um QR Code único. Você pode:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Imprimir e colocar na recepção</li>
                            <li>Exibir em um tablet/TV</li>
                            <li>Regenerar se necessário (invalida o anterior)</li>
                        </ul>
                        <Warning>
                            <strong>Importante:</strong> O check-in é obrigatório para que a aula seja marcada como concluída e o professor receba.
                        </Warning>
                    </div>
                )
            },
            {
                title: '6. Vendas e Financeiro',
                content: (
                    <div className="space-y-4">
                        <p>Gerencie as vendas de pacotes e acompanhe o financeiro da unidade.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Venda de Pacotes:</h4>
                        <p>Alunos podem comprar créditos de duas formas:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Pelo App:</strong> PIX ou Cartão de Crédito (Asaas)</li>
                            <li><strong>Na Recepção:</strong> Você registra a venda manual</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Pacotes Disponíveis:</h4>
                        <p>Os pacotes são definidos pela franqueadora. Exemplos comuns:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>4 aulas (1 mês)</li>
                            <li>8 aulas (1 mês)</li>
                            <li>12 aulas (1 mês)</li>
                            <li>Pacotes trimestrais com desconto</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Relatórios Financeiros:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Vendas por período</li>
                            <li>Receita por professor</li>
                            <li>Comissões a pagar</li>
                            <li>Taxa de franquia</li>
                        </ul>
                        <Success>
                            <strong>Integração Asaas:</strong> Pagamentos online são processados automaticamente e os créditos liberados na hora.
                        </Success>
                    </div>
                )
            },
            {
                title: '7. Carteira dos Professores',
                content: (
                    <div className="space-y-4">
                        <p>Entenda como funciona o pagamento dos professores.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Acúmulo de Horas:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Professor dá uma aula</li>
                            <li>Aula é marcada como concluída</li>
                            <li>Horas são creditadas na carteira</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Solicitação de Saque:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Professor acumula o mínimo para saque</li>
                            <li>Solicita o saque pelo app</li>
                            <li>Franquia aprova e processa o pagamento</li>
                            <li>Valor é transferido para conta do professor</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Comissões:</h4>
                        <p>A divisão padrão é definida pela franqueadora. Exemplo:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Professor: 60-70%</li>
                            <li>Franquia: 20-30%</li>
                            <li>Franqueadora: 5-10%</li>
                        </ul>
                        <InfoBox>
                            Os percentuais podem variar conforme o contrato de cada professor.
                        </InfoBox>
                    </div>
                )
            },
            {
                title: '8. Configurações da Unidade',
                content: (
                    <div className="space-y-4">
                        <p>Personalize as configurações da sua franquia.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Dados Cadastrais:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Nome da unidade</li>
                            <li>Endereço completo</li>
                            <li>Telefone e WhatsApp</li>
                            <li>Horário de funcionamento</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Configurações de Agendamento:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Antecedência mínima:</strong> Tempo mínimo para agendar</li>
                            <li><strong>Cancelamento:</strong> Prazo para cancelar sem perder crédito</li>
                            <li><strong>Duração padrão:</strong> Tempo de cada aula (ex: 60min)</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Notificações:</h4>
                        <p>Configure quais alertas deseja receber:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Novo cadastro de professor</li>
                            <li>Novo agendamento</li>
                            <li>Cancelamentos</li>
                            <li>Solicitações de saque</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '9. Problemas Comuns e Soluções',
                content: (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Professor não consegue acessar:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verifique se o cadastro foi aprovado</li>
                            <li>Confirme se o email está correto</li>
                            <li>Peça para redefinir a senha</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Aluno sem créditos após pagamento:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verifique o status do pagamento no Asaas</li>
                            <li>Se PIX, confirme se foi compensado</li>
                            <li>Créditos são liberados automaticamente após confirmação</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Aula não aparece como concluída:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verifique se o check-in foi feito</li>
                            <li>Professor precisa marcar como concluída no app</li>
                            <li>Pode ser feito até 24h após o horário</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">QR Code não funciona:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verifique a conexão de internet do aluno</li>
                            <li>Tente regenerar o QR Code nas configurações</li>
                            <li>Aluno pode fazer check-in manual pelo app</li>
                        </ul>
                        <Warning>
                            Se o problema persistir, entre em contato com o suporte técnico da franqueadora.
                        </Warning>
                    </div>
                )
            }
        ]
    },
    'manual_professor': {
        title: 'Manual do Professor',
        description: 'Guia completo para gerenciar sua agenda, alunos, aulas e ganhos.',
        lastUpdated: '14/12/2024',
        sections: [
            {
                title: '1. Começando no Sistema',
                content: (
                    <div className="space-y-4">
                        <p>Bem-vindo ao Meu Personal! Este guia vai te ajudar a aproveitar ao máximo a plataforma.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Cadastro e Aprovação:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Baixe o app ou acesse pelo navegador</li>
                            <li>Clique em <strong>"Sou Professor"</strong></li>
                            <li>Preencha seus dados e selecione a academia</li>
                            <li>Aguarde a aprovação da franquia (até 48h)</li>
                            <li>Você receberá um email quando for aprovado</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Seu Perfil:</h4>
                        <p>Complete seu perfil para atrair mais alunos:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Foto profissional</li>
                            <li>Especialidades (musculação, funcional, etc.)</li>
                            <li>Breve descrição sobre você</li>
                            <li>CREF (se aplicável)</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Professores com perfil completo recebem até 3x mais agendamentos!
                        </Tip>
                    </div>
                )
            },
            {
                title: '2. Configurando sua Disponibilidade',
                content: (
                    <div className="space-y-4">
                        <p>A disponibilidade define quando os alunos podem agendar com você.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Configurar:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Disponibilidade</strong> no menu</li>
                            <li>Selecione os dias da semana</li>
                            <li>Defina os horários de início e fim</li>
                            <li>Salve as alterações</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Bloqueios Temporários:</h4>
                        <p>Precisa de um dia de folga? Use os bloqueios:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Bloqueie datas específicas (férias, consultas)</li>
                            <li>Bloqueie horários pontuais</li>
                            <li>Alunos não conseguirão agendar nesses períodos</li>
                        </ul>
                        <Warning>
                            <strong>Atenção:</strong> Bloqueios não cancelam agendamentos já existentes. Cancele manualmente se necessário.
                        </Warning>
                    </div>
                )
            },
            {
                title: '3. Gerenciando sua Agenda',
                content: (
                    <div className="space-y-4">
                        <p>Sua agenda mostra todos os agendamentos confirmados.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Visualizações:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Hoje:</strong> Aulas do dia atual</li>
                            <li><strong>Semana:</strong> Visão semanal completa</li>
                            <li><strong>Mês:</strong> Calendário mensal</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Detalhes do Agendamento:</h4>
                        <p>Ao clicar em uma aula, você vê:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Nome e foto do aluno</li>
                            <li>Horário e duração</li>
                            <li>Status (agendado, concluído, etc.)</li>
                            <li>Histórico de aulas com esse aluno</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Agendamentos Recorrentes:</h4>
                        <p>Alunos podem criar séries de aulas (ex: toda terça às 8h). Você verá todas as aulas da série na agenda.</p>
                    </div>
                )
            },
            {
                title: '4. Realizando Aulas',
                content: (
                    <div className="space-y-4">
                        <p>O fluxo correto garante que você receba pelos seus serviços.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Passo a Passo:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li><strong>Antes da aula:</strong> Verifique sua agenda</li>
                            <li><strong>Chegada:</strong> Aluno faz check-in pelo QR Code</li>
                            <li><strong>Durante:</strong> Realize o treino normalmente</li>
                            <li><strong>Após:</strong> Marque a aula como <strong>Concluída</strong></li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Botão de Check-in:</h4>
                        <p>Você também pode confirmar a presença do aluno:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Abra o agendamento na sua agenda</li>
                            <li>Clique em <strong>"Confirmar Presença"</strong></li>
                            <li>Após a aula, clique em <strong>"Concluir Aula"</strong></li>
                        </ul>
                        <Success>
                            <strong>Importante:</strong> Só marque como concluída após realmente dar a aula. Isso credita as horas na sua carteira.
                        </Success>
                    </div>
                )
            },
            {
                title: '5. Seus Alunos',
                content: (
                    <div className="space-y-4">
                        <p>Gerencie seus alunos e acompanhe o progresso deles.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Cadastrando Novos Alunos:</h4>
                        <p>Você pode cadastrar alunos diretamente:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Meus Alunos</strong></li>
                            <li>Clique em <strong>Adicionar Aluno</strong></li>
                            <li>Preencha nome e email</li>
                            <li>Aluno receberá convite por email</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Informações do Aluno:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Saldo de créditos</li>
                            <li>Histórico de aulas com você</li>
                            <li>Frequência e assiduidade</li>
                            <li>Contato (WhatsApp)</li>
                        </ul>
                        <InfoBox>
                            Alunos cadastrados por você ficam automaticamente vinculados ao seu perfil.
                        </InfoBox>
                    </div>
                )
            },
            {
                title: '6. Carteira e Ganhos',
                content: (
                    <div className="space-y-4">
                        <p>Acompanhe seus ganhos e solicite saques.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Funciona:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Cada aula concluída credita horas na carteira</li>
                            <li>O valor por hora é definido pela franquia</li>
                            <li>Você pode ver o histórico completo</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Solicitando Saque:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Carteira</strong></li>
                            <li>Verifique se atingiu o mínimo para saque</li>
                            <li>Clique em <strong>Solicitar Saque</strong></li>
                            <li>Confirme seus dados bancários</li>
                            <li>Aguarde a aprovação da franquia</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Prazos:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Solicitações até sexta: pagamento na semana seguinte</li>
                            <li>Prazo médio: 3-5 dias úteis</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Mantenha seus dados bancários sempre atualizados para evitar atrasos.
                        </Tip>
                    </div>
                )
            },
            {
                title: '7. Cancelamentos e No-shows',
                content: (
                    <div className="space-y-4">
                        <p>Entenda as regras de cancelamento e o que fazer quando o aluno falta.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Cancelamento pelo Aluno:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Com antecedência: crédito devolvido ao aluno</li>
                            <li>Em cima da hora: pode perder o crédito (conforme política)</li>
                            <li>Você é notificado automaticamente</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Cancelamento por Você:</h4>
                        <p>Evite cancelar, mas se necessário:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Cancele com máxima antecedência</li>
                            <li>Aluno recebe o crédito de volta</li>
                            <li>Muitos cancelamentos podem afetar sua reputação</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Aluno Não Compareceu (No-show):</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Aguarde 15 minutos após o horário</li>
                            <li>Marque como <strong>"No-show"</strong></li>
                            <li>Conforme política, você pode receber mesmo assim</li>
                        </ol>
                        <Warning>
                            <strong>Atenção:</strong> Não marque como concluída uma aula que não aconteceu. Isso é considerado fraude.
                        </Warning>
                    </div>
                )
            }
        ]
    },
    'manual_aluno': {
        title: 'Manual do Aluno',
        description: 'Guia completo para agendar aulas, comprar créditos e aproveitar ao máximo seus treinos.',
        lastUpdated: '14/12/2024',
        sections: [
            {
                title: '1. Primeiros Passos',
                content: (
                    <div className="space-y-4">
                        <p>Bem-vindo ao Meu Personal! Vamos te ajudar a começar.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Criando sua Conta:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse o app ou site</li>
                            <li>Clique em <strong>"Criar Conta"</strong></li>
                            <li>Preencha seus dados (nome, email, telefone)</li>
                            <li>Selecione sua academia</li>
                            <li>Confirme seu email</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Seu Perfil:</h4>
                        <p>Complete seu perfil para uma melhor experiência:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Foto de perfil</li>
                            <li>Data de nascimento</li>
                            <li>Objetivos de treino</li>
                            <li>Restrições ou observações médicas</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Seu professor pode ver essas informações para personalizar seu treino!
                        </Tip>
                    </div>
                )
            },
            {
                title: '2. Comprando Créditos',
                content: (
                    <div className="space-y-4">
                        <p>Para agendar aulas, você precisa de créditos (horas-aula).</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Pacotes Disponíveis:</h4>
                        <p>Escolha o pacote ideal para você:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>4 aulas:</strong> Ideal para começar</li>
                            <li><strong>8 aulas:</strong> Treino 2x por semana</li>
                            <li><strong>12 aulas:</strong> Treino 3x por semana</li>
                            <li><strong>Pacotes maiores:</strong> Melhor custo-benefício</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Formas de Pagamento:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>PIX:</strong> Liberação instantânea</li>
                            <li><strong>Cartão de Crédito:</strong> Parcele em até 12x</li>
                            <li><strong>Na Recepção:</strong> Dinheiro ou cartão</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Comprar:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Comprar Créditos</strong></li>
                            <li>Escolha o pacote</li>
                            <li>Selecione a forma de pagamento</li>
                            <li>Confirme a compra</li>
                            <li>Créditos liberados automaticamente!</li>
                        </ol>
                        <Success>
                            <strong>Pagamento via PIX:</strong> Seus créditos são liberados em segundos após a confirmação!
                        </Success>
                    </div>
                )
            },
            {
                title: '3. Agendando Aulas',
                content: (
                    <div className="space-y-4">
                        <p>Agendar é simples e rápido!</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Passo a Passo:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Agendar</strong> no menu</li>
                            <li>Escolha seu professor (ou veja todos disponíveis)</li>
                            <li>Selecione a data desejada</li>
                            <li>Escolha o horário disponível</li>
                            <li>Confirme o agendamento</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Agendamento Recorrente:</h4>
                        <p>Quer treinar sempre no mesmo horário? Crie uma série:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Marque <strong>"Repetir semanalmente"</strong></li>
                            <li>Escolha quantas semanas</li>
                            <li>Todas as aulas são agendadas de uma vez</li>
                            <li>Garanta seu horário preferido!</li>
                        </ul>
                        <InfoBox>
                            Agendamentos recorrentes debitam os créditos de todas as aulas no momento da criação.
                        </InfoBox>
                    </div>
                )
            },
            {
                title: '4. Check-in na Academia',
                content: (
                    <div className="space-y-4">
                        <p>O check-in confirma sua presença e libera a aula.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Fazer:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Chegue na academia</li>
                            <li>Abra o app e vá em <strong>Check-in</strong></li>
                            <li>Escaneie o QR Code da recepção</li>
                            <li>Pronto! Seu professor será notificado</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Não consegue escanear?</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Verifique sua conexão de internet</li>
                            <li>Peça ajuda na recepção</li>
                            <li>Seu professor pode confirmar manualmente</li>
                        </ul>
                        <Warning>
                            <strong>Importante:</strong> O check-in é necessário para que a aula seja registrada corretamente.
                        </Warning>
                    </div>
                )
            },
            {
                title: '5. Cancelando Aulas',
                content: (
                    <div className="space-y-4">
                        <p>Imprevistos acontecem. Veja como cancelar corretamente.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">Política de Cancelamento:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Com antecedência (24h+):</strong> Crédito devolvido integralmente</li>
                            <li><strong>Menos de 24h:</strong> Pode haver perda parcial</li>
                            <li><strong>Menos de 2h:</strong> Crédito pode ser perdido</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Como Cancelar:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Acesse <strong>Meus Agendamentos</strong></li>
                            <li>Encontre a aula que deseja cancelar</li>
                            <li>Clique em <strong>Cancelar</strong></li>
                            <li>Confirme o cancelamento</li>
                        </ol>
                        <h4 className="font-semibold text-gray-900 mt-6">Cancelando Série Recorrente:</h4>
                        <p>Você pode cancelar:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Apenas uma aula específica</li>
                            <li>Todas as aulas futuras da série</li>
                        </ul>
                        <Tip>
                            <strong>Dica:</strong> Cancele o quanto antes para não perder créditos e liberar o horário para outros alunos.
                        </Tip>
                    </div>
                )
            },
            {
                title: '6. Histórico e Acompanhamento',
                content: (
                    <div className="space-y-4">
                        <p>Acompanhe sua evolução e histórico de treinos.</p>
                        <h4 className="font-semibold text-gray-900 mt-6">O que você pode ver:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Aulas realizadas:</strong> Histórico completo</li>
                            <li><strong>Frequência:</strong> Quantas vezes treinou por mês</li>
                            <li><strong>Créditos:</strong> Saldo atual e extrato</li>
                            <li><strong>Compras:</strong> Histórico de pagamentos</li>
                        </ul>
                        <h4 className="font-semibold text-gray-900 mt-6">Seus Professores:</h4>
                        <p>Veja os professores com quem você já treinou:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Perfil e especialidades</li>
                            <li>Quantidade de aulas juntos</li>
                            <li>Agendar novamente com um clique</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '7. Dúvidas Frequentes',
                content: (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Meus créditos expiram?</h4>
                        <p className="text-gray-600">Depende da política da sua academia. Geralmente, créditos têm validade de 3 a 6 meses. Verifique no app.</p>
                        
                        <h4 className="font-semibold text-gray-900 mt-6">Posso trocar de professor?</h4>
                        <p className="text-gray-600">Sim! Você pode agendar com qualquer professor disponível na sua academia.</p>
                        
                        <h4 className="font-semibold text-gray-900 mt-6">E se o professor cancelar?</h4>
                        <p className="text-gray-600">Seu crédito é devolvido automaticamente e você pode reagendar.</p>
                        
                        <h4 className="font-semibold text-gray-900 mt-6">Posso transferir créditos?</h4>
                        <p className="text-gray-600">Não, créditos são pessoais e intransferíveis.</p>
                        
                        <h4 className="font-semibold text-gray-900 mt-6">Como falo com meu professor?</h4>
                        <p className="text-gray-600">Pelo app você pode ver o WhatsApp do professor ou enviar mensagem direta.</p>
                        
                        <h4 className="font-semibold text-gray-900 mt-6">Esqueci minha senha:</h4>
                        <p className="text-gray-600">Na tela de login, clique em "Esqueci minha senha" e siga as instruções por email.</p>
                    </div>
                )
            }
        ]
    }
}


export default function DocViewerPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    // Safety check for unknown slugs
    if (!slug || !MANUALS_CONTENT[slug]) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <BookOpen className="h-10 w-10 text-red-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Manual não encontrado</h1>
                <p className="text-gray-500 mb-6">O documento que você procura não existe ou foi movido.</p>
                <Button onClick={() => router.push('/franqueadora/docs')} variant="outline">
                    Voltar para Central de Ajuda
                </Button>
            </div>
        )
    }

    const doc = MANUALS_CONTENT[slug]

    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="min-h-screen bg-white">
                {/* Header Banner */}
                <div className="bg-meu-primary text-white py-12 px-6">
                    <div className="max-w-4xl mx-auto">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/franqueadora/docs')}
                            className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-6"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar para Manuais
                        </Button>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{doc.title}</h1>
                        <p className="text-blue-100 text-lg max-w-2xl leading-relaxed opacity-90">{doc.description}</p>

                        <div className="flex items-center gap-4 text-sm text-blue-200 mt-6">
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                                <Clock className="h-3.5 w-3.5" /> Atualizado em {doc.lastUpdated}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                                <BookOpen className="h-3.5 w-3.5" /> {doc.sections.length} Tópicos
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-[250px_1fr] gap-12 items-start">
                        {/* Sidebar Navigation */}
                        <div className="hidden md:block sticky top-8">
                            <h3 className="font-bold text-gray-900 mb-4 px-2">Neste manual</h3>
                            <nav className="space-y-1">
                                {doc.sections.map((section, index) => (
                                    <a
                                        key={index}
                                        href={`#section-${index}`}
                                        className="block px-3 py-2 text-sm text-gray-600 hover:text-meu-primary hover:bg-blue-50 rounded-md transition-colors truncate"
                                    >
                                        {section.title}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        {/* Article Content */}
                        <div className="space-y-12">
                            {doc.sections.map((section, index) => (
                                <section key={index} id={`section-${index}`} className="scroll-mt-8">
                                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                                        <div className="bg-blue-50 text-meu-primary h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                            {index + 1}
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                            {section.title.replace(/^\d+\.\s/, '')}
                                        </h2>
                                    </div>
                                    <div className="prose prose-blue prose-lg text-gray-600 leading-relaxed max-w-none">
                                        {section.content}
                                    </div>
                                </section>
                            ))}

                            {/* Feedback Section */}
                            <div className="mt-16 pt-8 border-t border-gray-100">
                                <Card className="bg-gray-50 border-gray-200 shadow-none">
                                    <CardContent className="p-6 text-center">
                                        <h4 className="font-semibold text-gray-900 mb-2">Este manual foi útil?</h4>
                                        <p className="text-gray-500 text-sm mb-4">Seu feedback nos ajuda a melhorar nossa documentação.</p>
                                        <div className="flex justify-center gap-3">
                                            <Button variant="outline" size="sm" className="bg-white hover:bg-gray-100">Sim, ajudou</Button>
                                            <Button variant="outline" size="sm" className="bg-white hover:bg-gray-100">Não encontrei o que procurava</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FranqueadoraGuard>
    )
}