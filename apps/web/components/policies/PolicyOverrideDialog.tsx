"use client"

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface PolicyForm {
  credits_per_class: number
  class_duration_minutes: number
  checkin_tolerance_minutes: number
  student_min_booking_notice_minutes: number
  student_reschedule_min_notice_minutes: number
  late_cancel_threshold_minutes: number
  late_cancel_penalty_credits: number
  no_show_penalty_credits: number
  teacher_minutes_per_class: number
  teacher_rest_minutes_between_classes: number
  teacher_max_daily_classes: number
  max_future_booking_days: number
  max_cancel_per_month: number
  comment?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  academy: { id: string; name: string; city?: string; state?: string }
  token?: string | null
  apiUrl?: string
  onSaved?: () => void
}

const FIELD_META: Record<keyof PolicyForm, { label: string; min?: number; max?: number; help: string } > = {
  credits_per_class: { label: 'Créditos por aula', min: 0, help: 'Créditos consumidos por aula concluída pelo aluno.' },
  class_duration_minutes: { label: 'Duração da aula (min)', min: 15, help: 'Duração padrão de cada aula em minutos.' },
  checkin_tolerance_minutes: { label: 'Tolerância de check-in (min)', min: 0, max: 180, help: 'Janela de tolerância após o horário para permitir check-in.' },
  student_min_booking_notice_minutes: { label: 'Antecedência mínima p/ agendar (min)', min: 0, max: 10080, help: 'Tempo mínimo antes do horário para o aluno agendar.' },
  student_reschedule_min_notice_minutes: { label: 'Antecedência mínima p/ reagendar (min)', min: 0, max: 10080, help: 'Tempo mínimo antes do horário para o aluno reagendar.' },
  late_cancel_threshold_minutes: { label: 'Janela late cancel (min)', min: 0, max: 1440, help: 'Cancelamentos dentro desta janela contam como late cancel.' },
  late_cancel_penalty_credits: { label: 'Penalidade late cancel (créditos)', min: 0, help: 'Créditos debitados em cancelamento tardio.' },
  no_show_penalty_credits: { label: 'Penalidade no-show (créditos)', min: 0, help: 'Créditos debitados quando o aluno falta.' },
  teacher_minutes_per_class: { label: 'Minutos por aula (professor)', min: 0, help: 'Minutos creditados ao professor por aula concluída.' },
  teacher_rest_minutes_between_classes: { label: 'Descanso entre aulas (min)', min: 0, max: 180, help: 'Intervalo mínimo entre aulas de um professor.' },
  teacher_max_daily_classes: { label: 'Máximo de aulas por dia', min: 0, max: 48, help: 'Limite de aulas/dia por professor.' },
  max_future_booking_days: { label: 'Dias máximos para agendar', min: 1, max: 365, help: 'Janela de agendamento futuro, em dias.' },
  max_cancel_per_month: { label: 'Limite mensal de cancelamentos', min: 0, help: 'Máximo de cancelamentos por mês por aluno.' },
  comment: { label: 'Comentário', help: 'Observações gerais (não é aplicado como política).' },
}

export default function PolicyOverrideDialog({ open, onOpenChange, academy, token, apiUrl, onSaved }: Props) {
  const API_URL = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const headers: HeadersInit = useMemo(() => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [effective, setEffective] = useState<PolicyForm | null>(null)
  const [currentOverrides, setCurrentOverrides] = useState<Record<string, number>>({})
  const [inherit, setInherit] = useState<Record<string, boolean>>({})
  const [regen, setRegen] = useState(false)
  const [prevEffective, setPrevEffective] = useState<PolicyForm | null>(null)

  useEffect(() => {
    if (!open) return
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const eff = await fetch(`${API_URL}/api/academies/${academy.id}/policies-effective`, { credentials: 'include', headers })
        if (eff.ok) {
          const json = await eff.json()
          if (mounted) {
            setEffective(json.effective)
            setPrevEffective(json.effective)
          }
        }
        const ov = await fetch(`${API_URL}/api/academies/${academy.id}/policies-overrides`, { credentials: 'include', headers })
        if (ov.ok) {
          const json = await ov.json()
          const ovObj = (json.overrides || {}) as Record<string, number>
          if (mounted) {
            setCurrentOverrides(ovObj)
            const inh: Record<string, boolean> = {}
            Object.keys(FIELD_META).forEach((k) => {
              inh[k] = !(k in ovObj)
            })
            setInherit(inh)
          }
        } else {
          if (mounted) {
            const inh: Record<string, boolean> = {}
            Object.keys(FIELD_META).forEach((k) => { inh[k] = true })
            setInherit(inh)
            setCurrentOverrides({})
          }
        }
      } catch {}
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [open, academy.id, API_URL, headers])

  function onToggleInherit(field: keyof PolicyForm, value: boolean) {
    setInherit(prev => ({ ...prev, [field]: value }))
    if (value) {
      // voltar a herdar: remove override
      setCurrentOverrides(prev => { const n = { ...prev }; delete (n as any)[field]; return n })
    } else {
      // desabilitar herança: setar valor inicial pelo efetivo
      setCurrentOverrides(prev => ({ ...prev, [field]: Number(effective ? (effective as any)[field] : 0) }))
    }
  }

  function onChangeValue(field: keyof PolicyForm, v: string) {
    setCurrentOverrides(prev => ({ ...prev, [field]: Number(v) || 0 }))
    if (field === 'class_duration_minutes' && effective) {
      const newVal = Number(v) || 0
      setRegen(prevEffective ? prevEffective.class_duration_minutes !== newVal : false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // montar apenas overrides ativos (inherit=false)
      const payload: Record<string, number> = {}
      Object.keys(FIELD_META).forEach((k) => {
        const inh = inherit[k]
        if (!inh && currentOverrides[k] !== undefined) payload[k] = currentOverrides[k]
      })

      const resp = await fetch(`${API_URL}/api/academies/${academy.id}/policies-overrides`, {
        method: 'PUT', credentials: 'include', headers, body: JSON.stringify({ overrides: payload })
      })
      if (!resp.ok) throw new Error('Falha ao salvar overrides')

      if (regen && ((prevEffective?.class_duration_minutes ?? null) !== (inherit.class_duration_minutes ? (prevEffective?.class_duration_minutes ?? null) : currentOverrides.class_duration_minutes))) {
        try {
          await fetch(`${API_URL}/api/time-slots/generate`, { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ academy_id: academy.id }) })
        } catch {}
      }

      toast.success('Overrides salvos')
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error('Erro ao salvar overrides')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-[56rem] max-h-[90vh] overflow-hidden">
        <DialogHeader className="sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-10 pb-3 border-b">
          <DialogTitle>Políticas da unidade • {academy.name}</DialogTitle>
        </DialogHeader>
        {loading || !effective ? (
          <div className="py-6 text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            <div className="space-y-5 max-h-[72vh] overflow-y-auto px-2 sm:px-3 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {Object.keys(FIELD_META).filter(k => k !== 'comment').map((k) => {
                  const key = k as keyof PolicyForm
                  const meta = FIELD_META[key]
                  const inherited = inherit[key]
                  const value = inherited ? (effective as any)[key] : (currentOverrides as any)[key]
                  return (
                    <div key={key} className="min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <Label title={meta.help} className="text-xs text-gray-600 truncate">{meta.label}</Label>
                        <div className="flex items-center gap-2 shrink-0 w-28 justify-end">
                          <span className="hidden sm:inline text-[11px] text-gray-500">Herdar</span>
                          <Switch checked={!!inherited} onCheckedChange={(v: boolean) => onToggleInherit(key, v)} />
                        </div>
                      </div>
                      <Input className="h-10" type="number" min={meta.min} max={meta.max} value={Number(value ?? 0)} disabled={!!inherited} onChange={(e) => onChangeValue(key, e.target.value)} />
                    </div>
                  )
                })}
              </div>

            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-3 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={regen} onCheckedChange={(v: boolean) => setRegen(v)} />
                <span className="text-sm text-gray-700">Regenerar slots futuros desta unidade</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-10 border-t px-3 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-meu-primary text-white">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
