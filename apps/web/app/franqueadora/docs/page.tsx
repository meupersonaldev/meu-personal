import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { BookOpen, FileText, ArrowRight, Users, Building2, GraduationCap, UserCheck } from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface DocFile {
    slug: string
    title: string
    description: string
    icon: 'franqueadora' | 'franquia' | 'professor' | 'aluno'
}

// Lista estática de documentos - funciona em produção
const docs: DocFile[] = [
    {
        slug: 'manual_franqueadora',
        title: 'Manual da Franqueadora',
        description: 'Guia completo para gestão da rede, franquias, usuários, créditos e políticas globais.',
        icon: 'franqueadora'
    },
    {
        slug: 'manual_franquia',
        title: 'Manual da Franquia',
        description: 'Instruções para gestão da unidade, professores, alunos e agenda local.',
        icon: 'franquia'
    },
    {
        slug: 'manual_professor',
        title: 'Manual do Professor',
        description: 'Como gerenciar sua agenda, disponibilidade, alunos e acompanhar seus ganhos.',
        icon: 'professor'
    },
    {
        slug: 'manual_aluno',
        title: 'Manual do Aluno',
        description: 'Guia para agendamento de aulas, compra de créditos, check-in e uso do sistema.',
        icon: 'aluno'
    }
]

const iconMap = {
    franqueadora: Building2,
    franquia: Users,
    professor: GraduationCap,
    aluno: UserCheck
}

export default function DocsPage() {
    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-meu-primary">
                        <BookOpen className="h-10 w-10" />
                        <div>
                            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
                            <p className="text-gray-500 text-sm">Manuais e guias do Meu Personal</p>
                        </div>
                    </div>
                    <p className="text-gray-600 max-w-2xl">
                        Encontre aqui os guias completos para cada tipo de usuário do sistema. 
                        Selecione o manual adequado ao seu perfil ou compartilhe com sua equipe.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {docs.map((doc) => {
                        const IconComponent = iconMap[doc.icon]
                        return (
                            <Link key={doc.slug} href={`/franqueadora/docs/${doc.slug}`} className="block group">
                                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-meu-primary/50 border-2 border-transparent hover:bg-gray-50">
                                    <CardHeader>
                                        <div className="mb-4 w-14 h-14 rounded-xl bg-meu-primary/10 flex items-center justify-center text-meu-primary group-hover:bg-meu-primary group-hover:text-white transition-colors">
                                            <IconComponent className="h-7 w-7" />
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-meu-primary transition-colors">
                                            {doc.title}
                                        </CardTitle>
                                        <CardDescription className="text-base">
                                            {doc.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-sm font-medium text-meu-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200">
                                            Abrir manual <ArrowRight className="ml-2 h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>

                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2">💡 Dica</h3>
                    <p className="text-gray-600 text-sm">
                        Você pode compartilhar estes manuais com seus franqueados, professores e alunos. 
                        Cada manual foi escrito de forma simples e direta para facilitar o uso do sistema.
                    </p>
                </div>
            </div>
        </FranqueadoraGuard>
    )
}
