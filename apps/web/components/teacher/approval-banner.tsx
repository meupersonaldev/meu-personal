'use client'

import { Clock, XCircle } from 'lucide-react'

interface ApprovalBannerProps {
  approvalStatus?: string
  userName?: string
}

export function ApprovalBanner({ approvalStatus, userName }: ApprovalBannerProps) {
  if (approvalStatus === 'approved') {
    return null // Não mostra nada se aprovado
  }

  if (approvalStatus === 'rejected') {
    return (
      <div className="mb-6 rounded-lg border border-red-500 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800 mb-1">Cadastro Reprovado</h3>
            <p className="text-sm text-red-700">
              Seu cadastro foi reprovado pela administração. Entre em contato com o suporte para mais informações.
              Enquanto isso, você não pode realizar agendamentos ou comprar pacotes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Status pending ou undefined
  return (
    <div className="mb-6 rounded-lg border border-yellow-500 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-yellow-800 mb-1">Cadastro Pendente de Aprovação</h3>
          <p className="text-sm text-yellow-700">
            Olá {userName || 'Professor(a)'}! Seu cadastro está em análise pela administração.
            Você poderá realizar agendamentos e comprar pacotes após a aprovação.
            Por enquanto, você pode editar seu perfil e configurar suas preferências.
          </p>
        </div>
      </div>
    </div>
  )
}
