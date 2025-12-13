'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Save, MapPin, Building2, MoreVertical, Edit, History, Mail, AlertTriangle } from 'lucide-react'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import PolicyOverrideDialog from '@/components/policies/PolicyOverrideDialog'
import PolicyDraftForm from '@/components/policies/PolicyDraftForm'
import ConflictsAlert from '@/components/policies/ConflictsAlert'
import RollbackConfirmDialog from '@/components/policies/RollbackConfirmDialog'
import { format } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DraftDiffChips from '@/components/policies/DraftDiffChips'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

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

function PoliticasPageContent() {
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
  const [hasConflicts, setHasConflicts] = useState(false)
  const [conflictsCount, setConflictsCount] = useState(0)
  const [notifyFranchises, setNotifyFranchises] = useState(true)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<any>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>(canEdit ? 'rascunho' : 'resumo')

  useEffect(() => {
    setIsLoading(true)
    fetchAcademies().finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      } catch { }
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
      } catch { }
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
        body: JSON.stringify({ 
          effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          notify_franchises: notifyFranchises
        })
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
      const publishResult = await res.json()
      
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
      if (publishResult.notificationsSent > 0) {
        toast.info(`${publishResult.notificationsSent} franquia(s) notificada(s) por email`)
      }
      
      // Recarregar histórico
      setHistory([])
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

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-1">Administração</p>
            <h1 className="text-3xl font-bold text-meu-primary tracking-tight">Políticas de Operação</h1>
            <p className="text-gray-500 mt-1">Definições centralizadas da Franqueadora</p>
          </div>
        </div>

        {!canEdit && (
          <Card className="p-4 border-l-4 border-l-red-400 bg-red-50 text-red-900 shadow-sm">
            <p className="text-sm font-medium">Você não tem permissão para editar. Contate a Franqueadora.</p>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="bg-gray-100/50 p-1 rounded-xl mb-6 flex flex-wrap h-auto gap-2 sm:gap-0">
            <TabsTrigger
              value="resumo"
              className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:text-meu-primary data-[state=active]:shadow-sm transition-all"
            >
              Resumo
            </TabsTrigger>
            {canEdit && <TabsTrigger value="rascunho" className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:text-meu-primary data-[state=active]:shadow-sm transition-all">Rascunho</TabsTrigger>}
            <TabsTrigger value="unidades" className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:text-meu-primary data-[state=active]:shadow-sm transition-all">Unidades</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:text-meu-primary data-[state=active]:shadow-sm transition-all">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="p-4 sm:p-6 border-l-4 border-l-meu-primary shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Política Vigente</h2>
                {published ? (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {((published as any).version) ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Versão {(published as any).version}</Badge>
                    ) : null}
                    {((published as any).effective_from) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Vigendo desde {format(new Date((published as any).effective_from), 'dd/MM/yyyy')}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {loadingPublished ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                  <div className="rounded-xl border border-gray-100 p-4 h-24 bg-gray-50" />
                  <div className="rounded-xl border border-gray-100 p-4 h-24 bg-gray-50" />
                  <div className="rounded-xl border border-gray-100 p-4 h-24 bg-gray-50" />
                </div>
              ) : published ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Créditos por aula</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.credits_per_class}</div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Duração da aula</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.class_duration_minutes} <span className="text-sm font-normal text-gray-500">min</span></div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Tolerância check-in</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.checkin_tolerance_minutes} <span className="text-sm font-normal text-gray-500">min</span></div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Antecedência p/ agendar</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.student_min_booking_notice_minutes} <span className="text-sm font-normal text-gray-500">min</span></div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Janela late cancel</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.late_cancel_threshold_minutes} <span className="text-sm font-normal text-gray-500">min</span></div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors hover:bg-gray-50">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Dias p/ agendar no futuro</div>
                    <div className="text-2xl font-bold text-meu-primary">{published.max_future_booking_days} <span className="text-sm font-normal text-gray-500">dias</span></div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500">Nenhuma política publicada encontrada.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {canEdit && (
            <TabsContent value="rascunho" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="p-4 sm:p-6 border-l-4 border-l-meu-accent shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Editor de Política</h2>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={saveDraft} disabled={savingDraft || !draft} className="flex-1 sm:flex-none">
                      {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Rascunho
                    </Button>
                    <Button onClick={publishDraft} disabled={publishing || !draft} className="bg-meu-primary hover:bg-meu-primary-dark text-white flex-1 sm:flex-none">
                      {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Publicar
                    </Button>
                  </div>
                </div>

                {/* Alerta de conflitos */}
                <ConflictsAlert 
                  token={token} 
                  apiUrl={API_URL} 
                  useDraft={true}
                  onConflictsChange={(has, count) => {
                    setHasConflicts(has)
                    setConflictsCount(count)
                  }}
                />

                {!loadingDraft && draft && published && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Alterações Pendentes:</p>
                    <DraftDiffChips draft={draft} published={published} />
                  </div>
                )}
                
                {/* Checkbox de notificação */}
                <div className="mb-6 flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    id="notify-franchises"
                    checked={notifyFranchises}
                    onChange={(e) => setNotifyFranchises(e.target.checked)}
                    className="h-4 w-4 text-meu-primary border-gray-300 rounded focus:ring-meu-primary"
                  />
                  <label htmlFor="notify-franchises" className="text-sm text-blue-800 cursor-pointer flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Notificar franquias por email ao publicar
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide" title="Ao definir, a publicação passará a valer a partir deste momento (UTC).">
                      Effective From (Opcional)
                    </label>
                    <Input
                      type="datetime-local"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Ao definir, a publicação passará a valer a partir deste momento (UTC).</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6">
                  {loadingDraft ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-gray-100" />
                      ))}
                    </div>
                  ) : !draft ? (
                    <div className="py-8 text-center text-gray-500">Nenhum rascunho disponível.</div>
                  ) : (
                    <PolicyDraftForm draft={draft} onChange={handleChange} />
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="unidades" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Unidades e Exceções</h3>
                  <p className="text-xs text-gray-500 mt-1">Gerencie overrides específicos por unidade da franquia.</p>
                </div>
                <Button variant="outline" onClick={() => fetchAcademies()} disabled={isLoading} size="sm" className="w-full sm:w-auto">
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Atualizar Lista
                </Button>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  <Loader2 className="inline h-5 w-5 mr-2 animate-spin text-meu-primary" /> Carregando unidades...
                </div>
              ) : isEmpty ? (
                <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                  <Building2 className="h-8 w-8 text-gray-300" />
                  <p>Nenhuma unidade encontrada.</p>
                </div>
              ) : (
                <div className="bg-white">
                  {/* Mobile View (Cards) */}
                  <div className="block sm:hidden divide-y divide-gray-100">
                    {academies.map((a) => (
                      <div key={a.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-meu-primary" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{a.name}</h4>
                              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                <MapPin className="h-3 w-3 mr-1" />
                                {a.city} • {a.state}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="-mr-2" onClick={() => { setSelectedAcademy({ id: a.id, name: a.name, city: a.city, state: a.state }); setOverrideOpen(true) }}>
                            <Edit className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs mb-3">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Créditos</span>
                            <span className="font-semibold text-gray-900">{published?.credits_per_class ?? '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Duração</span>
                            <span className="font-semibold text-gray-900">{published?.class_duration_minutes ?? '—'} min</span>
                          </div>
                        </div>

                        {!!overridesByAcademy[a.id]?.length && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed border-meu-primary/30 text-meu-primary hover:bg-meu-primary/5">
                                {overridesByAcademy[a.id].length} overrides ativos
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                              {overridesByAcademy[a.id].map((f) => (
                                <DropdownMenuItem key={f} className="text-xs">
                                  {f}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop View (Table) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidade</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Créditos</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duração (min)</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tolerância (min)</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {academies.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{a.name}</div>
                                  <div className="text-xs text-gray-500">{a.city} - {a.state}</div>
                                  {!!overridesByAcademy[a.id]?.length && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mt-1 hover:bg-blue-100 inline-block">
                                        {overridesByAcademy[a.id].length} overrides
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        {overridesByAcademy[a.id].map((f) => (
                                          <DropdownMenuItem key={f} className="text-xs">
                                            {f}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block">
                                {published?.credits_per_class ?? '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{published?.class_duration_minutes ?? '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{published?.checkin_tolerance_minutes ?? '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button variant="ghost" size="sm" disabled={!canEdit} onClick={() => { setSelectedAcademy({ id: a.id, name: a.name, city: a.city, state: a.state }); setOverrideOpen(true) }} className="hover:bg-gray-100">
                                <Edit className="h-4 w-4 text-gray-500" />
                                <span className="ml-2">Editar</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="p-4 sm:p-6 shadow-sm border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="h-1 w-4 bg-gray-300 rounded-full" />
                Histórico de Versões
              </h3>
              {loadingHistory ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-12 rounded-lg bg-gray-50 border border-gray-100" />
                  <div className="h-12 rounded-lg bg-gray-50 border border-gray-100" />
                  <div className="h-12 rounded-lg bg-gray-50 border border-gray-100" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">Nenhum histórico encontrado.</div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                  {history.map((h: any, idx: number) => {
                    const isCurrentVersion = idx === 0
                    return (
                      <div key={h.id || `${h.version}-${h.effective_from}`} className={`flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors gap-2 sm:gap-0 ${isCurrentVersion ? 'bg-green-50/30' : ''}`}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className={`${isCurrentVersion ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            v{h.version}
                            {isCurrentVersion && ' (atual)'}
                          </Badge>
                          {h.is_rollback && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              <History className="h-3 w-3 mr-1" />
                              Rollback da v{h.rollback_to_version}
                            </Badge>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            Efetiva em: {h.effective_from ? format(new Date(h.effective_from), 'dd/MM/yyyy HH:mm') : 'Imediato'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            Criada em: {h.created_at ? format(new Date(h.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                          </span>
                          {canEdit && !isCurrentVersion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRollbackTarget(h)
                                setRollbackOpen(true)
                              }}
                              className="text-amber-600 border-amber-200 hover:bg-amber-50 h-7 px-2"
                            >
                              <History className="h-3.5 w-3.5 mr-1" />
                              Reverter
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
            onSaved={() => { }}
          />
        )}
        
        {/* Modal de Rollback */}
        {rollbackTarget && history.length > 0 && (
          <RollbackConfirmDialog
            open={rollbackOpen}
            onOpenChange={setRollbackOpen}
            targetVersion={rollbackTarget}
            currentVersion={history[0]}
            token={token || undefined}
            apiUrl={API_URL}
            onSuccess={() => {
              setHistory([])
              // Recarregar política publicada
              const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              }
              fetch(`${API_URL}/api/franchisor/policies`, { credentials: 'include', headers })
                .then(r => r.ok ? r.json() : null)
                .then(json => json?.data && setPublished(json.data))
            }}
          />
        )}
      </div>
    </FranqueadoraGuard>
  )
}

export default function PoliticasPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
        </div>
      </div>
    }>
      <PoliticasPageContent />
    </Suspense>
  )
}
