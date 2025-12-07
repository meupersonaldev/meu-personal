'use client'

import { getHtmlEmailTemplate } from './email-template-preview'

export default function EmailPreviewPage() {
    const sampleContent = `
    <p>Olá <strong>Teste Usuário</strong>,</p>
    <p><strong>João Silva</strong> cadastrou você na plataforma <strong>Meu Personal</strong>.</p>
    <p>Abaixo estão suas credenciais de acesso:</p>
    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> teste@email.com</p>
      <p style="margin: 0;"><strong>Senha temporária:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">abc123xyz</span></p>
    </div>
    <p style="color: #b91c1c; font-size: 14px; margin-top: 16px;"><strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.</p>
  `

    const emailHtml = getHtmlEmailTemplate(
        'Bem-vindo ao Meu Personal! 🎉',
        sampleContent,
        'https://meupersonalfranquia.com.br/aluno/login',
        'Acessar Plataforma'
    )

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Preview do Template de Email</h1>
                <p className="text-gray-600 mb-6">Este é um preview de como os emails de marketing aparecem para os usuários.</p>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <iframe
                        srcDoc={emailHtml}
                        className="w-full h-[800px] border-0"
                        title="Email Preview"
                    />
                </div>
            </div>
        </div>
    )
}
