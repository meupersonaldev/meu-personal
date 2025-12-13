'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error'
  title: string
  message: string
}

export function AlertModal({ isOpen, onClose, type, title, message }: AlertModalProps) {
  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            "p-2 rounded-full shrink-0",
            type === 'success' ? "bg-green-100" : "bg-red-100"
          )}>
            {type === 'success' ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={cn(
              "text-lg font-semibold",
              type === 'success' ? "text-green-900" : "text-red-900"
            )}>
              {title}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {message}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onClose}
            className={cn(
              "min-w-[100px]",
              type === 'success' 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}