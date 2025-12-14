'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BookOpen, FileText, ArrowRight, Users, Building2, GraduationCap, UserCheck, Search, HelpCircle } from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface DocFile {
    slug: string
    title: string
    description: string
    icon: 'franqueadora' | 'franquia' | 'professor' | 'aluno'
}

// Lista estática de documentos
const docs: DocFile[] = [
    {
        slug: 'manual_franquia',
        title: 'Manual da Franquia',
        description: 'Guia completo para gestão da sua unidade: professores, alunos, agenda, vendas, check-in e financeiro.',
        icon: 'franquia'
    },
    {
        slug: 'manual_professor',
        title: 'Manual do Professor',
        description: 'Como configurar disponibilidade, gerenciar agenda, realizar aulas, acompanhar alunos e sacar ganhos.',
        icon: 'professor'
    },
    {
        slug: 'manual_aluno',
        title: 'Manual do Aluno',
        description: 'Guia para criar conta, comprar créditos, agendar aulas, fazer check-in e acompanhar seu histórico.',
        icon: 'aluno'
    },
    {
        slug: 'manual_franqueadora',
        title: 'Manual da Franqueadora',
        description: 'Gestão da rede: franquias, usuários, leads, políticas, comunicações e visão consolidada.',
        icon: 'franqueadora'
    }
]

const iconMap = {
    franqueadora: Building2,
    franquia: Users,
    professor: GraduationCap,
    aluno: UserCheck
}

export default function DocsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredDocs = docs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-6 items-center text-center max-w-2xl mx-auto pt-6">
                    <div className="p-3 bg-blue-50 rounded-full text-meu-primary shadow-sm">
                        <BookOpen className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-meu-primary tracking-tight">Central de Ajuda</h1>
                        <p className="text-gray-500 text-lg">
                            Encontre manuais e guias completos para utilizar o sistema da melhor forma.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Buscar manuais..."
                            className="pl-10 h-12 bg-white shadow-sm border-gray-200 focus:border-meu-primary focus:ring-meu-primary/20 text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                {filteredDocs.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto pt-4">
                        {filteredDocs.map((doc) => {
                            const IconComponent = iconMap[doc.icon]
                            return (
                                <Link key={doc.slug} href={`/franqueadora/docs/${doc.slug}`} className="block group h-full">
                                    <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-meu-primary/30 border-gray-200 overflow-hidden flex flex-col">
                                        <div className="h-2 bg-gradient-to-r from-meu-primary to-blue-400 w-0 group-hover:w-full transition-all duration-500" />
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="p-3 rounded-2xl bg-blue-50 text-meu-primary group-hover:bg-meu-primary group-hover:text-white transition-all duration-300">
                                                    <IconComponent className="h-8 w-8" />
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-meu-primary transform translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300" />
                                            </div>
                                            <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-meu-primary transition-colors pt-4">
                                                {doc.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <CardDescription className="text-base text-gray-600 leading-relaxed font-medium">
                                                {doc.description}
                                            </CardDescription>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 max-w-md mx-auto">
                        <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum resultado encontrado</h3>
                        <p className="text-gray-500">
                            Não encontramos manuais correspondentes à sua busca "{searchTerm}".
                        </p>
                    </div>
                )}

                {/* Footer Help */}
                <div className="max-w-3xl mx-auto mt-12 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    <div className="p-3 bg-yellow-50 rounded-full text-yellow-600 shrink-0">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Precisa de suporte técnico?</h3>
                        <p className="text-gray-600 text-sm">
                            Se você encontrou um problema técnico ou bug, entre em contato diretamente com nossa equipe de desenvolvimento via WhatsApp.
                        </p>
                    </div>
                </div>
            </div>
        </FranqueadoraGuard>
    )
}
