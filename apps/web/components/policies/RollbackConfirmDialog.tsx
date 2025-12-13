"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PolicyVersion {
  id: string
  version: number
  effective_from: string
  created_at: string
  credits_per_class: number
  class_duration_minutes: number
  checkin_tolerance_minutes: number
  is_rollback?: boolean
  rollback_to_version?: number
}

interface RollbackConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetVersion: PolicyVersion
  currentVersion: PolicyVersion
  token?: string | null
  apiUrl?: string
  onSuccess?: () => void
}

export default function RollbackConfirmDialog({
  open,
  onOpenChange,
  targetVersion,
  currentVersion,
  token,
  apiUrl,
  onSuccess
}: RollbackConfirmDialogProps) {
  const API_URL = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [notifyFranchises, setNotifyFranchises] = useState(true)

  const handleRollback = async () => {
    setLoading(true)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      const res = await fetch(`${API_URL}/api/franchisor/policies/rollback`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          target_version: targetVersion.version,
          comment: comment || undefined,
          notify_franchises: notifyFranchises
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer rollback')
      }

      const data = await res.json()
      toast.success(`Rollback realizado! Nova versão: ${data.data.version}`)
      
      if (data.notificationsSent > 0) {
        toast.info(`${data.notificationsSent} franquia(s) notificada(s)`)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer rollback')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Campos para comparação
  const compareFields = [
    { key: 'credits_per_class', label: 'Créditos por aula' },
    { key: 'class_duration_minutes', label: 'Duração da aula (min)' },
    { key: 'checkin_tolerance_minutes', label: 'Tolerância check-in (min)' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-600" />
            Reverter para Versão {targetVersion.version}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Atenção</p>
              <p>Esta ação criará uma nova versão com os valores da versão {targetVersion.version}. O histórico será mantido.</p>
            </div>
          </div>

          {/* Comparação */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Comparação de valores:</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 pb-2 border-b">
                <span>Campo</span>
                <span className="text-center">Atual (v{currentVersion.version})</span>
                <span className="text-center">Alvo (v{targetVersion.version})</span>
              </div>
              {compareFields.map(({ key, label }) => {
                const currentVal = (currentVersion as any)[key]
                const targetVal = (targetVersion as any)[key]
                const isDifferent = currentVal !== targetVal
                return (
                  <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-600">{label}</span>
                    <span className={`text-center ${isDifferent ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                      {currentVal}
                    </span>
                    <span className={`text-center ${isDifferent ? 'text-green-600 font-medium' : 'text-gray-900'}`}>
                      {targetVal}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info da versão alvo */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Versão alvo publicada em:</span>
            <Badge variant="outline">{formatDate(targetVersion.effective_from || targetVersion.created_at)}</Badge>
            {targetVersion.is_rollback && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                Rollback da v{targetVersion.rollback_to_version}
              </Badge>
            )}
          </div>

          {/* Comentário */}
          <div className="space-y-2">
            <Label htmlFor="rollback-comment">Motivo do rollback (opcional)</Label>
            <Textarea
              id="rollback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Valores anteriores causaram problemas operacionais..."
              rows={2}
            />
          </div>

          {/* Notificar franquias */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify-franchises-rollback"
              checked={notifyFranchises}
              onChange={(e) => setNotifyFranchises(e.target.checked)}
              className="h-4 w-4 text-meu-primary border-gray-300 rounded focus:ring-meu-primary"
            />
            <Label htmlFor="notify-franchises-rollback" className="text-sm cursor-pointer">
              Notificar franquias por email sobre o rollback
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleRollback}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Revertendo...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Confirmar Rollback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
