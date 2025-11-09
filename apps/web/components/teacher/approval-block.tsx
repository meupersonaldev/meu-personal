'use client'

import { AlertCircle, Lock, XCircle } from 'lucide-react'

interface ApprovalBlockProps {
  title?: string
  message?: string
  fullPage?: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
}

export function ApprovalBlock({ 
  title = 'Aguardando Aprovação',
  message = 'Esta funcionalidade estará disponível após a aprovação do seu cadastro pela administração.',
  fullPage = false,
  approvalStatus = 'pending'
}: ApprovalBlockProps) {
  const isRejected = approvalStatus === 'rejected'
  const borderColor = isRejected ? 'border-red-200' : 'border-yellow-200'
  const bgColor = isRejected ? 'bg-red-100' : 'bg-yellow-100'
  const iconColor = isRejected ? 'text-red-600' : 'text-yellow-600'
  const textColor = isRejected ? 'text-red-800' : 'text-yellow-800'
  const boxBgColor = isRejected ? 'bg-red-50' : 'bg-yellow-50'
  const boxBorderColor = isRejected ? 'border-red-200' : 'border-yellow-200'
  const Icon = isRejected ? XCircle : Lock
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className={`bg-white p-8 rounded-lg shadow-lg max-w-md text-center border-2 ${borderColor}`}>
          <div className={`${bgColor} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`h-8 w-8 ${iconColor}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className={`${boxBgColor} border ${boxBorderColor} rounded-lg p-4`}>
            <p className={`text-sm ${textColor}`}>
              {isRejected ? (
                <>
                  <strong>Seu cadastro foi reprovado.</strong>
                  <br />
                  Entre em contato com o suporte para mais informações.
                </>
              ) : (
                <>
                  <strong>Por enquanto, você pode:</strong>
                  <br />
                  • Editar seu perfil
                  <br />
                  • Configurar suas preferências
                  <br />
                  • Aguardar a análise da administração
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center mx-4">
        <Icon className={`h-12 w-12 ${iconColor} mx-auto mb-3`} />
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
