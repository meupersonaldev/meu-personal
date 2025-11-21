import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import MermaidDiagram from '@/components/ui/mermaid-diagram'

interface DocPageProps {
    params: Promise<{
        slug: string
    }>
}

async function getDocContent(slug: string) {
    const docsDir = path.join(process.cwd(), '../../docs/cliente')
    const filePath = path.join(docsDir, `${slug}.md`)

    try {
        if (!fs.existsSync(filePath)) {
            return null
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        const stats = fs.statSync(filePath)

        return {
            content,
            lastModified: stats.mtime
        }
    } catch (error) {
        console.error('Erro ao ler arquivo:', error)
        return null
    }
}

export default async function DocPage({ params }: DocPageProps) {
    const { slug } = await params
    const doc = await getDocContent(slug)

    if (!doc) {
        notFound()
    }

    // Título amigável baseado no slug (mesma lógica da listagem)
    const meta: Record<string, string> = {
        'manual_franqueadora': 'Manual da Franqueadora',
        'manual_franquia': 'Manual da Franquia',
        'manual_professor': 'Manual do Professor',
        'manual_aluno': 'Manual do Aluno',
        'estrutura_dados': 'Estrutura de Dados',
        'arquitetura_sistema': 'Arquitetura do Sistema',
    }

    const title = meta[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return (
        <FranqueadoraGuard requiredPermission="canViewDashboard">
            <div className="min-h-screen bg-gray-50/50">
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    {/* Header de Navegação */}
                    <div className="flex items-center gap-4">
                        <Link href="/franqueadora/docs">
                            <Button variant="ghost" size="sm" className="gap-2 pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para Documentação
                            </Button>
                        </Link>
                    </div>

                    {/* Conteúdo do Documento */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-8 md:p-12">
                            <div className="mb-8 pb-8 border-b border-gray-100">
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    {title}
                                </h1>
                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Atualizado em {doc.lastModified.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{doc.lastModified.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            <article className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-bold prose-headings:text-gray-900 
                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                prose-p:text-gray-600 prose-p:leading-relaxed
                prose-a:text-meu-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6
                prose-ol:list-decimal prose-ol:pl-6
                prose-li:marker:text-gray-400
                prose-img:rounded-xl prose-img:shadow-md
                prose-code:text-meu-primary prose-code:bg-meu-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-[''] prose-code:after:content-['']
                prose-pre:bg-gray-900 prose-pre:text-gray-50
                prose-blockquote:border-l-4 prose-blockquote:border-meu-primary/30 prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
              ">
                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            const isMermaid = match && match[1] === 'mermaid'

                                            if (!inline && isMermaid) {
                                                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
                                            }

                                            return (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {doc.content}
                                </ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </FranqueadoraGuard>
    )
}
