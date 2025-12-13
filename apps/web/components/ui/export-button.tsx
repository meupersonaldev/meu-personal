'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function ExportButton({ onClick, disabled, loading, className }: ExportButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={`bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ${className || ''}`}
    >
      <Download className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Exportando...' : 'Exportar'}
    </Button>
  )
}
