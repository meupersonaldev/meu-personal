'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, CheckCircle, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface User {
  id: string
  name: string
  email: string
  cpf?: string
  cref?: string
  cref_card_url?: string | null
  approval_status?: string
}

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  userName: string
}

export function ImageModal({ isOpen, onClose, imageUrl, userName }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Carteirinha CREF - {userName}</DialogTitle>
          <DialogDescription>
            Visualização do documento enviado pelo profissional
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Carteirinha CREF de ${userName}`}
              width={800}
              height={600}
              className="object-contain max-h-[70vh]"
              unoptimized
            />
          ) : (
            <div className="text-center p-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma imagem disponível</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  user: User
  action: 'approve' | 'reject'
  loading?: boolean
}

export function ApprovalModal({ isOpen, onClose, onConfirm, user, action, loading }: ApprovalModalProps) {
  const isApprove = action === 'approve'
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprovar Profissional
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Reprovar Profissional
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Tem certeza que deseja aprovar este profissional?'
              : 'Tem certeza que deseja reprovar este profissional?'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600">Nome:</span>
              <p className="text-sm text-gray-900">{user.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <p className="text-sm text-gray-900">{user.email}</p>
            </div>
            {user.cpf && (
              <div>
                <span className="text-sm font-medium text-gray-600">CPF:</span>
                <p className="text-sm text-gray-900">{user.cpf}</p>
              </div>
            )}
            {user.cref && (
              <div>
                <span className="text-sm font-medium text-gray-600">CREF:</span>
                <p className="text-sm text-gray-900">{user.cref}</p>
              </div>
            )}
          </div>

          {isApprove && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Ao aprovar, o profissional poderá acessar a plataforma e começar a trabalhar.
              </p>
            </div>
          )}

          {!isApprove && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                Ao reprovar, o profissional não poderá acessar a plataforma.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {loading ? 'Processando...' : isApprove ? 'Aprovar' : 'Reprovar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
