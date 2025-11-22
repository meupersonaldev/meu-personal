import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { BookOpen, FileText, ArrowRight } from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface DocFile {
    slug: string
    title: string
    description: string
}

async function getDocs(): Promise<DocFile[]> {
    // Tentar diferentes caminhos possíveis
    const cwd = process.cwd()
    const possiblePaths = [
        // Produção: arquivos copiados para public/docs
        path.join(cwd, 'public/docs'),
        // Desenvolvimento local (monorepo)
        path.join(cwd, '../../docs/cliente'),
        // Produção (se docs estiver na raiz)
        path.join(cwd, 'docs/cliente'),
        // Alternativa (se estiver em outro lugar)
        path.join(cwd, '../docs/cliente'),
        // Caminho absoluto a partir da raiz do projeto
        path.resolve(process.cwd(), 'docs/cliente'),
    ]

    let docsDir: string | null = null
    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            docsDir = possiblePath
            break
        }
    }

    if (!docsDir) {
        console.warn('Diretório de documentação não encontrado. Tentou:', possiblePaths)
        return []
    }

    // Mapeamento de nomes de arquivo para títulos amigáveis
    const meta: Record<string, { title: string, description: string }> = {
        'manual_franqueadora.md': { title: 'Manual da Franqueadora', description: 'Guia completo para gestão da rede, franquias e configurações globais.' },
        'manual_franquia.md': { title: 'Manual da Franquia', description: 'Instruções para gestão da unidade, agenda e financeiro local.' },
        'manual_professor.md': { title: 'Manual do Professor', description: 'Como gerenciar agenda, alunos e acompanhar recebimentos.' },
        'manual_aluno.md': { title: 'Manual do Aluno', description: 'Guia para agendamento de aulas, compra de créditos e uso do app.' },
        'estrutura_dados.md': { title: 'Estrutura de Dados', description: 'Visão técnica simplificada do banco de dados e entidades.' },
        'arquitetura_sistema.md': { title: 'Arquitetura do Sistema', description: 'Visão geral de como o sistema funciona tecnicamente.' },
    }

    try {
        if (!docsDir || !fs.existsSync(docsDir)) {
            console.warn('Diretório de docs não encontrado:', docsDir)
            // Retornar lista estática como fallback
            return Object.keys(meta).map(file => {
                const info = meta[file]
                return {
                    slug: file.replace('.md', ''),
                    title: info.title,
                    description: info.description
                }
            })
        }

        const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'))

        if (files.length === 0) {
            console.warn('Nenhum arquivo .md encontrado em:', docsDir)
            // Retornar lista estática como fallback
            return Object.keys(meta).map(file => {
                const info = meta[file]
                return {
                    slug: file.replace('.md', ''),
                    title: info.title,
                    description: info.description
                }
            })
        }

        return files.map(file => {
            const info = meta[file] || {
                title: file.replace('.md', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: 'Documentação do sistema.'
            }

            return {
                slug: file.replace('.md', ''),
                title: info.title,
                description: info.description
            }
        })
    } catch (error) {
        console.error('Erro ao ler documentação:', error)
        // Retornar lista estática como fallback mesmo em caso de erro
        return Object.keys(meta).map(file => {
            const info = meta[file]
            return {
                slug: file.replace('.md', ''),
                title: info.title,
                description: info.description
            }
        })
    }
}

export default async function DocsPage() {
    const docs = await getDocs()

    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-meu-primary">
                        <BookOpen className="h-8 w-8" />
                        <h1 className="text-3xl font-bold">Documentação do Sistema</h1>
                    </div>
                    <p className="text-gray-600 max-w-2xl">
                        Acesse os manuais e documentações técnicas do Meu Personal.
                        Estes guias foram preparados para auxiliar diferentes perfis de usuários.
                    </p>
                </div>

                {docs.length === 0 ? (
                    <Card className="p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Nenhuma documentação encontrada</p>
                        <p className="text-sm text-gray-500">
                            Os arquivos de documentação podem não estar disponíveis em produção.
                            Verifique os logs do servidor para mais detalhes.
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {docs.map((doc) => (
                            <Link key={doc.slug} href={`/franqueadora/docs/${doc.slug}`} className="block group">
                                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-meu-primary/50 border-2 border-transparent hover:bg-gray-50">
                                    <CardHeader>
                                        <div className="mb-4 w-12 h-12 rounded-lg bg-meu-primary/10 flex items-center justify-center text-meu-primary group-hover:bg-meu-primary group-hover:text-white transition-colors">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="group-hover:text-meu-primary transition-colors">
                                            {doc.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {doc.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-sm font-medium text-meu-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200">
                                            Ler documentação <ArrowRight className="ml-2 h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </FranqueadoraGuard>
    )
}
