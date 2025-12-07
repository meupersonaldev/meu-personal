"use client"

import { Button } from './button'
import { Card } from './card'
import {
  AlertTriangle,
  Trash2,
  CheckCircle,
  Info
} from 'lucide-react'
import { ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
  children?: ReactNode
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  loading = false,
  children
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: Trash2,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          confirmBgColor: 'bg-red-600 hover:bg-red-700',
          confirmTextStyle: 'text-white'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          confirmBgColor: 'bg-yellow-600 hover:bg-yellow-700',
          confirmTextStyle: 'text-white'
        }
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          confirmBgColor: 'bg-green-600 hover:bg-green-700',
          confirmTextStyle: 'text-white'
        }
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          confirmBgColor: 'bg-blue-600 hover:bg-blue-700',
          confirmTextStyle: 'text-white'
        }
    }
  }

  const { icon: Icon, iconColor, bgColor, borderColor, confirmBgColor, confirmTextStyle } = getIconAndColors()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <Card className={`w-full max-w-md ${bgColor} ${borderColor} border-2`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className={`flex-shrink-0 w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mr-4`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-700 leading-relaxed">{description}</p>

          {children && (
            <div className="mt-4">{children}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={`${confirmBgColor} ${confirmTextStyle}`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}