import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const cwd = process.cwd()
    const possiblePaths = [
      path.join(cwd, 'public/docs'),
      path.join(cwd, '../../docs/cliente'),
      path.join(cwd, 'docs/cliente'),
      path.join(cwd, '../docs/cliente'),
    ]

    let docsDir: string | null = null
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        docsDir = possiblePath
        break
      }
    }

    if (!docsDir) {
      return NextResponse.json({ docs: [] }, { status: 200 })
    }

    const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'))

    const meta: Record<string, { title: string, description: string }> = {
      'manual_franqueadora.md': { title: 'Manual da Franqueadora', description: 'Guia completo para gestão da rede, franquias e configurações globais.' },
      'manual_franquia.md': { title: 'Manual da Franquia', description: 'Instruções para gestão da unidade, agenda e financeiro local.' },
      'manual_professor.md': { title: 'Manual do Professor', description: 'Como gerenciar agenda, alunos e acompanhar recebimentos.' },
      'manual_aluno.md': { title: 'Manual do Aluno', description: 'Guia para agendamento de aulas, compra de créditos e uso do app.' },
      'estrutura_dados.md': { title: 'Estrutura de Dados', description: 'Visão técnica simplificada do banco de dados e entidades.' },
      'arquitetura_sistema.md': { title: 'Arquitetura do Sistema', description: 'Visão geral de como o sistema funciona tecnicamente.' },
    }

    const docs = files.map(file => {
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

    return NextResponse.json({ docs })
  } catch (error: any) {
    console.error('Erro ao buscar documentação:', error)
    return NextResponse.json({ docs: [] }, { status: 200 })
  }
}


