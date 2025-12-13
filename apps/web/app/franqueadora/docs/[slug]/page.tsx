'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, Calendar, ChevronRight, Hash, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { Badge } from '@/components/ui/badge'

// --- MOCK CONTENT FOR MANUALS ---

const MANUALS_CONTENT: Record<string, {
    title: string;
    description: string;
    lastUpdated: string;
    sections: { title: string; content: React.ReactNode }[]
}> = {
    'manual_franqueadora': {
        title: 'Manual da Franqueadora',
        description: 'Guia completo para gestão da rede, franquias e políticas globais.',
        lastUpdated: '10/12/2023',
        sections: [
            {
                title: '1. Visão Geral',
                content: (
                    <div className="space-y-4">
                        <p>O painel da Franqueadora é o centro de comando de toda a rede "Meu Personal". Nele, você tem acesso a estatísticas globais, gestão de unidades, e controle financeiro.</p>
                        <p>Principais funcionalidades:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Dashboard:</strong> Visão macro de KPIs (Vendas, Aulas, Ativos).</li>
                            <li><strong>Gestão de Franquias:</strong> Cadastro e acompanhamento de unidades.</li>
                            <li><strong>Liberação de Créditos:</strong> Inserção de saldo para professores e alunos.</li>
                        </ul>
                    </div>
                )
            },
            {
                title: '2. Gestão de Franquias',
                content: (
                    <div className="space-y-4">
                        <p>Para adicionar uma nova franquia, acesse o menu <strong>"Nova Franquia"</strong>. É necessário preencher os dados cadastrais (CNPJ, Endereço) e definir os dados do Administrador da unidade.</p>
                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 text-sm">
                            <strong>Nota:</strong> O email do administrador será utilizado para o primeiro acesso à unidade.
                        </div>
                    </div>
                )
            },
            {
                title: '3. Políticas e Termos',
                content: (
                    <div className="space-y-4">
                        <p>A seção de <strong>Políticas</strong> permite editar os Termos de Uso e Política de Privacidade que aparecem no aplicativo dos usuários.</p>
                        <p>Você pode criar rascunhos, salvar versões e publicar quando estiver pronto. O histórico de versões é mantido automaticamente.</p>
                    </div>
                )
            }
        ]
    },
    'manual_franquia': {
        title: 'Manual da Franquia',
        description: 'Instruções para gestão da unidade, professores e alunos.',
        lastUpdated: '05/11/2023',
        sections: [
            {
                title: '1. Painel da Franquia',
                content: (
                    <div className="space-y-4">
                        <p>Como gestor de franquia, seu foco é a operação local. O painel exibe seus alunos ativos, professores vinculados e a agenda do dia.</p>
                    </div>
                )
            },
            {
                title: '2. Aprovação de Professores',
                content: (
                    <div className="space-y-4">
                        <p>Quando um professor se cadastra selecionando sua unidade, ele aparece como <strong>"Pendente"</strong>. Você deve verificar os dados e aprovar o cadastro para que ele possa começar a dar aulas.</p>
                        <p>Professores rejeitados não terão acesso ao aplicativo.</p>
                    </div>
                )
            },
            {
                title: '3. Venda de Créditos',
                content: (
                    <div className="space-y-4">
                        <p>Alunos compram créditos diretamente pelo app ou na recepção. Você pode lançar vendas manuais pelo painel em <strong>"Vendas" {'>'} "Nova Venda"</strong>.</p>
                    </div>
                )
            }
        ]
    },
    'manual_professor': {
        title: 'Manual do Professor',
        description: 'Como gerenciar sua agenda e alunos.',
        lastUpdated: '01/12/2023',
        sections: [
            {
                title: '1. Sua Agenda',
                content: (
                    <div className="space-y-4">
                        <p>A agenda é o coração do seu trabalho. Defina seus horários disponíveis em <strong>"Disponibilidade"</strong> para que os alunos possam agendar aulas.</p>
                        <p>Bloqueios podem ser criados para férias ou compromissos pessoais.</p>
                    </div>
                )
            },
            {
                title: '2. Realizando uma Aula',
                content: (
                    <div className="space-y-4">
                        <p>Ao chegar na unidade, faça o check-in ou confirme a presença do aluno pelo app. Após a aula, marque como <strong>"Concluída"</strong> para receber o valor correspondente na sua carteira virtual.</p>
                    </div>
                )
            },
            {
                title: '3. Carteira e Saque',
                content: (
                    <div className="space-y-4">
                        <p>Seus ganhos acumulam na <strong>Carteira</strong>. Você pode solicitar o saque quando atingir o valor mínimo estipulado pela franquia.</p>
                    </div>
                )
            }
        ]
    },
    'manual_aluno': {
        title: 'Manual do Aluno',
        description: 'Guia para agendamento e uso do sistema.',
        lastUpdated: '15/10/2023',
        sections: [
            {
                title: '1. Agendando Aulas',
                content: (
                    <div className="space-y-4">
                        <p>Navegue pelos professores disponíveis, escolha um horário e confirme. Seus créditos serão descontados apenas após a confirmação.</p>
                    </div>
                )
            },
            {
                title: '2. Comprando Créditos',
                content: (
                    <div className="space-y-4">
                        <p>Acesse a loja no app para adquirir pacotes de aulas. Aceitamos PIX e Cartão de Crédito.</p>
                    </div>
                )
            },
            {
                title: '3. Cancelamentos',
                content: (
                    <div className="space-y-4">
                        <p>Cancelamentos devem ser feitos com antecedência mínima de X horas para reembolso do crédito. Consulte a política da sua unidade.</p>
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
                <div className="bg-meu-primary text-white py-12 px-6 pattern-grid-lg">
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

                        <div className="flex items-center gap-4 mt-8 text-sm text-blue-200 mt-6">
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
