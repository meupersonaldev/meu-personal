'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import PolicyOverrideDialog from '@/components/policies/PolicyOverrideDialog'
import PolicyDraftForm from '@/components/policies/PolicyDraftForm'
import { format } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DraftDiffChips from '@/components/policies/DraftDiffChips'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
  comment: string
}

export default function PoliticasPage() {
  const { user, academies, fetchAcademies, token } = useFranqueadoraStore((s) => ({
    user: s.user,
    academies: s.academies,
    fetchAcademies: s.fetchAcademies,
    token: s.token,
  }))

  const [isLoading, setIsLoading] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [loadingPublished, setLoadingPublished] = useState(true)
  const [savingDraft, setSavingDraft] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [draft, setDraft] = useState<PolicyForm | null>(null)
  const [published, setPublished] = useState<PolicyForm | null>(null)
  const canEdit = useMemo(() => {
    const r = (user?.role || '').toUpperCase()
    return r === 'FRANQUEADORA' || r === 'FRANCHISOR' || r === 'SUPER_ADMIN'
  }, [user?.role])
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [selectedAcademy, setSelectedAcademy] = useState<{ id: string; name: string; city?: string; state?: string } | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState<string>('')
  const [overridesByAcademy, setOverridesByAcademy] = useState<Record<string, string[]>>({})
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>(canEdit ? 'rascunho' : 'resumo')

  useEffect(() => {
    setIsLoading(true)
    fetchAcademies().finally(() => setIsLoading(false))
  }, [fetchAcademies])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'resumo' || t === 'rascunho' || t === 'unidades' || t === 'historico') {
      setActiveTab(t)
    } else {
      setActiveTab(canEdit ? 'rascunho' : 'resumo')
    }
  }, [searchParams, canEdit])

  useEffect(() => {
    let mounted = true
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
    const defaultPolicy: PolicyForm = {
      credits_per_class: 1,
      class_duration_minutes: 60,
      checkin_tolerance_minutes: 30,
      student_min_booking_notice_minutes: 0,
      student_reschedule_min_notice_minutes: 0,
      late_cancel_threshold_minutes: 120,
      late_cancel_penalty_credits: 1,
      no_show_penalty_credits: 1,
      teacher_minutes_per_class: 60,
      teacher_rest_minutes_between_classes: 10,
      teacher_max_daily_classes: 12,
      max_future_booking_days: 30,
      max_cancel_per_month: 0,
      comment: ''
    }
    async function load() {
      setLoadingDraft(true)
      setLoadingPublished(true)
      let pub: PolicyForm | null = null
      try {
        const pubRes = await fetch(`${API_URL}/api/franchisor/policies`, { credentials: 'include', headers })
        if (pubRes.ok) {
          const json = await pubRes.json()
          pub = json.data as PolicyForm
          if (mounted) setPublished(pub)
        }
      } catch {}
      finally { if (mounted) setLoadingPublished(false) }
      try {
        const dRes = await fetch(`${API_URL}/api/franchisor/policies?status=draft`, { credentials: 'include', headers })
        if (dRes.ok) {
          const json = await dRes.json()
          if (mounted) setDraft(json.data as PolicyForm)
        } else {
          if (mounted) setDraft(pub || defaultPolicy)
        }
      } catch {
        if (mounted) setDraft(pub || defaultPolicy)
      } finally {
        if (mounted) setLoadingDraft(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [API_URL, token])

  // Buscar overrides por unidade para exibir indicador
  useEffect(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
    let cancelled = false
    async function loadOverrides() {
      if (!academies || academies.length === 0) return
      try {
        const results = await Promise.allSettled(
          academies.map(async (a) => {
            const resp = await fetch(`${API_URL}/api/academies/${a.id}/policies-overrides`, { credentials: 'include', headers })
            if (!resp.ok) return { id: a.id, fields: [] as string[] }
            const json = await resp.json()
            const fields = Object.keys(json?.overrides || {})
            return { id: a.id, fields }
          })
        )
        if (cancelled) return
        const map: Record<string, string[]> = {}
        for (const r of results) {
          if (r.status === 'fulfilled') {
            map[r.value.id] = r.value.fields
          }
        }
        setOverridesByAcademy(map)
      } catch {}
    }
    loadOverrides()
    return () => { cancelled = true }
  }, [academies, API_URL, token])

  useEffect(() => {
    if (activeTab !== 'historico' || loadingHistory || history.length) return
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
    setLoadingHistory(true)
    fetch(`${API_URL}/api/franchisor/policies/history?limit=10`, { credentials: 'include', headers })
      .then(async (r) => r.ok ? (await r.json()).data : [])
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .finally(() => setLoadingHistory(false))
  }, [activeTab, API_URL, token, loadingHistory, history.length])

  const handleChange = (k: keyof PolicyForm, v: number | string) => {
    if (!draft) return
    setDraft({ ...draft, [k]: typeof v === 'number' ? v : (k === 'comment' ? v : Number(v) || 0) } as PolicyForm)
  }

  // Validação local espelhando o backend
  function validateDraftLocal(p: PolicyForm): string[] {
    const errors: string[] = []
    const check = (key: keyof PolicyForm, min?: number, max?: number) => {
      const n = Number((p as any)[key])
      if (!Number.isFinite(n)) { errors.push(`${String(key)} inválido`); return }
      if (min != null && n < min) errors.push(`${String(key)} < ${min}`)
      if (max != null && n > max) errors.push(`${String(key)} > ${max}`)
    }
    check('credits_per_class', 1)
    check('class_duration_minutes', 15)
    check('checkin_tolerance_minutes', 0, 180)
    check('student_min_booking_notice_minutes', 0, 10080)
    check('student_reschedule_min_notice_minutes', 0, 10080)
    check('late_cancel_threshold_minutes', 0, 1440)
    check('late_cancel_penalty_credits', 0)
    check('no_show_penalty_credits', 0)
    check('teacher_minutes_per_class', 0)
    check('teacher_rest_minutes_between_classes', 0, 180)
    check('teacher_max_daily_classes', 0, 48)
    check('max_future_booking_days', 1, 365)
    check('max_cancel_per_month', 0, 999)
    return errors
  }

  async function saveDraft() {
    if (!canEdit || !draft) return
    const errs = validateDraftLocal(draft)
    if (errs.length) {
      toast.error(`Corrija os campos: ${errs.slice(0, 3).join(', ')}${errs.length > 3 ? '…' : ''}`)
      return
    }
    setSavingDraft(true)
    try {
      const res = await fetch(`${API_URL}/api/franchisor/policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(draft)
      })
      if (!res.ok) {
        try {
          const j = await res.json()
          const det = Array.isArray(j?.details) ? j.details.join(', ') : ''
          throw new Error(det || 'Falha ao salvar rascunho')
        } catch {
          throw new Error('Falha ao salvar rascunho')
        }
      }
      toast.success('Rascunho salvo')
    } catch {
      toast.error('Erro ao salvar rascunho')
    } finally {
      setSavingDraft(false)
    }
  }

  async function publishDraft() {
    if (!canEdit || !draft) return
    const errs = validateDraftLocal(draft)
    if (errs.length) {
      toast.error(`Corrija os campos: ${errs.slice(0, 3).join(', ')}${errs.length > 3 ? '…' : ''}`)
      return
    }
    setPublishing(true)
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      await fetch(`${API_URL}/api/franchisor/policies`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(draft)
      })
      const res = await fetch(`${API_URL}/api/franchisor/policies/publish`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined })
      })
      if (!res.ok) {
        try {
          const j = await res.json()
          const det = Array.isArray(j?.details) ? j.details.join(', ') : ''
          throw new Error(det || 'Falha ao publicar')
        } catch {
          throw new Error('Falha ao publicar')
        }
      }
      // Recarregar política publicada para obter versão/efetivação
      try {
        const pubRes = await fetch(`${API_URL}/api/franchisor/policies`, { credentials: 'include', headers })
        if (pubRes.ok) {
          const json = await pubRes.json()
          setPublished(json.data as PolicyForm)
        } else {
          setPublished(draft)
        }
      } catch {
        setPublished(draft)
      }
      toast.success('Políticas publicadas')
    } catch {
      toast.error('Erro ao publicar políticas')
    } finally {
      setPublishing(false)
    }
  }

  const isEmpty = useMemo(() => !academies || academies.length === 0, [academies])
  const onTabChange = (val: string) => {
    setActiveTab(val)
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', val)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  // Removido: edição por unidade. Agora usamos política central (draft/published).

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Políticas de Operação</h1>
            <p className="text-sm sm:text-base text-gray-600">Definições centralizadas da Franqueadora</p>
          </div>
        </div>
      </div>

      {!canEdit && (
        <Card className="p-4 border-l-4 border-red-400 mb-6">
          <p className="text-sm text-gray-700">Você não tem permissão para editar. Contate a Franqueadora.</p>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          {canEdit && <TabsTrigger value="rascunho">Rascunho</TabsTrigger>}
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

      <TabsContent value="resumo">
      <Card className="p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Política vigente</h2>
          {published ? (
            <div className="flex items-center gap-2">
              {((published as any).version) ? (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">Versão {(published as any).version}</span>
              ) : null}
              {((published as any).effective_from) ? (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700">Vigendo desde {format(new Date((published as any).effective_from), 'dd/MM/yyyy HH:mm')}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        {loadingPublished ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            <div className="rounded-md border p-3 h-16 bg-gray-50" />
            <div className="rounded-md border p-3 h-16 bg-gray-50" />
            <div className="rounded-md border p-3 h-16 bg-gray-50" />
          </div>
        ) : published ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Créditos por aula</div>
              <div className="text-lg font-semibold text-gray-900">{published.credits_per_class}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Duração da aula (min)</div>
              <div className="text-lg font-semibold text-gray-900">{published.class_duration_minutes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Tolerância de check-in (min)</div>
              <div className="text-lg font-semibold text-gray-900">{published.checkin_tolerance_minutes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Antecedência p/ agendar (min)</div>
              <div className="text-lg font-semibold text-gray-900">{published.student_min_booking_notice_minutes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Janela late cancel (min)</div>
              <div className="text-lg font-semibold text-gray-900">{published.late_cancel_threshold_minutes}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-gray-500">Dias p/ agendar no futuro</div>
              <div className="text-lg font-semibold text-gray-900">{published.max_future_booking_days}</div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-sm text-gray-500">Nenhuma política publicada.</div>
        )}
      </Card>
      </TabsContent>

      {canEdit && (
        <TabsContent value="rascunho">
        <Card className="p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Política (Rascunho)</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={savingDraft || !draft}>
                {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar rascunho
              </Button>
              <Button onClick={publishDraft} disabled={publishing || !draft} className="bg-meu-primary text-white">
                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Publicar
              </Button>
            </div>
          </div>
          {!loadingDraft && draft && published && (
            <DraftDiffChips draft={draft} published={published} />
          )}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-600 mb-1" title="Ao definir, a publicação passará a valer a partir deste momento (UTC).">Effective from (opcional)</label>
              <Input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>
          {loadingDraft ? (
            <div className="py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-md border bg-gray-50" />
                ))}
              </div>
            </div>
          ) : !draft ? (
            <div className="py-6 text-sm text-gray-500">Nenhum rascunho disponível.</div>
          ) : (
            <div className="mt-4">
              <PolicyDraftForm draft={draft} onChange={handleChange} />
            </div>
          )}
        </Card>
        </TabsContent>
      )}

      <TabsContent value="unidades">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Unidades</h3>
          <Button variant="outline" onClick={() => fetchAcademies()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Atualizar
          </Button>
        </div>
        <p className="text-xs text-gray-500 mb-4">As unidades herdam automaticamente a política vigente. Você pode ajustar overrides por unidade conforme necessário.</p>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            <Loader2 className="inline h-4 w-4 mr-2 animate-spin" /> Carregando unidades...
          </div>
        ) : isEmpty ? (
          <div className="py-8 text-center text-sm text-gray-500">Nenhuma unidade encontrada.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créditos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração (min)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tolerância</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {academies.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-500">{a.city} • {a.state}</div>
                      {!!overridesByAcademy[a.id]?.length && (
                        <div className="mt-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-[11px] text-meu-primary-700 underline underline-offset-2">
                              Overrides ativos ({overridesByAcademy[a.id].length})
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {overridesByAcademy[a.id].map((f) => (
                                <DropdownMenuItem key={f} className="text-xs">
                                  {f}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{published?.credits_per_class ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{published?.class_duration_minutes ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{published?.checkin_tolerance_minutes ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => { setSelectedAcademy({ id: a.id, name: a.name, city: a.city, state: a.state }); setOverrideOpen(true) }}>Editar overrides</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </TabsContent>
      <TabsContent value="historico">
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Publicações anteriores</h3>
          {loadingHistory ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 rounded border bg-gray-50" />
              <div className="h-10 rounded border bg-gray-50" />
              <div className="h-10 rounded border bg-gray-50" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum histórico encontrado.</div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-md border">
              {history.map((h: any) => (
                <div key={h.id || `${h.version}-${h.effective_from}`} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">Versão {h.version}</span>
                    <span className="text-sm text-gray-700">Efetiva em {h.effective_from ? format(new Date(h.effective_from), 'dd/MM/yyyy HH:mm') : '—'}</span>
                  </div>
                  <span className="text-xs text-gray-500">Criada em {h.created_at ? format(new Date(h.created_at), 'dd/MM/yyyy HH:mm') : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>
      </Tabs>
      {selectedAcademy && (
        <PolicyOverrideDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          academy={selectedAcademy}
          token={token || undefined}
          apiUrl={API_URL}
          onSaved={() => {}}
        />
      )}
    </div>
    </FranqueadoraGuard>
  )
}
