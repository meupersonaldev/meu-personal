'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type PolicyDraft = {
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

type Props = {
  draft: PolicyDraft
  onChange: (k: keyof PolicyDraft, v: number | string) => void
}

export default function PolicyDraftForm({ draft, onChange }: Props) {
  return (
    <div className="space-y-6">
      <Section title="Geral">
        <Field label="Créditos por aula" title="Créditos consumidos por aula concluída pelo aluno.">
          <Input type="number" min={0} value={draft.credits_per_class} onChange={(e) => onChange('credits_per_class', e.target.value)} />
        </Field>
        <Field label="Duração da aula (min)" title="Duração padrão de cada aula em minutos.">
          <Input type="number" min={15} value={draft.class_duration_minutes} onChange={(e) => onChange('class_duration_minutes', e.target.value)} />
        </Field>
        <Field label="Tolerância de check-in (min)" title="Janela de tolerância após o horário para permitir check-in.">
          <Input type="number" min={0} max={180} value={draft.checkin_tolerance_minutes} onChange={(e) => onChange('checkin_tolerance_minutes', e.target.value)} />
        </Field>
      </Section>

      <Section title="Aluno">
        <Field label="Antecedência mínima p/ agendar (min)" title="Tempo mínimo antes do horário para o aluno agendar.">
          <Input type="number" min={0} value={draft.student_min_booking_notice_minutes} onChange={(e) => onChange('student_min_booking_notice_minutes', e.target.value)} />
        </Field>
        <Field label="Antecedência mínima p/ reagendar (min)" title="Tempo mínimo antes do horário para o aluno reagendar.">
          <Input type="number" min={0} value={draft.student_reschedule_min_notice_minutes} onChange={(e) => onChange('student_reschedule_min_notice_minutes', e.target.value)} />
        </Field>
        <Field label="Limite mensal de cancelamentos (aluno)" title="Máximo de cancelamentos por mês por aluno." colSpan>
          <Input type="number" min={0} value={draft.max_cancel_per_month} onChange={(e) => onChange('max_cancel_per_month', e.target.value)} />
        </Field>
      </Section>

      <Section title="Penalidades">
        <Field label="Janela late cancel (min)" title="Cancelamentos dentro desta janela contam como late cancel.">
          <Input type="number" min={0} value={draft.late_cancel_threshold_minutes} onChange={(e) => onChange('late_cancel_threshold_minutes', e.target.value)} />
        </Field>
        <Field label="Penalidade cancelamento tardio (créditos)" title="Créditos debitados em cancelamento tardio.">
          <Input type="number" min={0} value={draft.late_cancel_penalty_credits} onChange={(e) => onChange('late_cancel_penalty_credits', e.target.value)} />
        </Field>
        <Field label="Penalidade no-show (créditos)" title="Créditos debitados quando o aluno falta.">
          <Input type="number" min={0} value={draft.no_show_penalty_credits} onChange={(e) => onChange('no_show_penalty_credits', e.target.value)} />
        </Field>
      </Section>

      <Section title="Professor">
        <Field label="Minutos por aula creditados ao professor" title="Minutos creditados ao professor por aula concluída.">
          <Input type="number" min={0} value={draft.teacher_minutes_per_class} onChange={(e) => onChange('teacher_minutes_per_class', e.target.value)} />
        </Field>
        <Field label="Descanso entre aulas (min)" title="Intervalo mínimo entre aulas de um professor.">
          <Input type="number" min={0} max={180} value={draft.teacher_rest_minutes_between_classes} onChange={(e) => onChange('teacher_rest_minutes_between_classes', e.target.value)} />
        </Field>
        <Field label="Máximo de aulas por dia (professor)" title="Limite de aulas/dia por professor.">
          <Input type="number" min={0} max={48} value={draft.teacher_max_daily_classes} onChange={(e) => onChange('teacher_max_daily_classes', e.target.value)} />
        </Field>
      </Section>

      <Section title="Agenda">
        <Field label="Dias máximos para agendar no futuro" title="Janela de agendamento futuro, em dias.">
          <Input type="number" min={1} max={365} value={draft.max_future_booking_days} onChange={(e) => onChange('max_future_booking_days', e.target.value)} />
        </Field>
      </Section>

      <div className="border-t pt-4">
        <div className="grid grid-cols-1">
          <div>
            <Label className="block text-xs text-gray-600 mb-1">Comentário da versão</Label>
            <Input value={draft.comment} onChange={(e) => onChange('comment', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
        <div className="h-px flex-1 ml-4 bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, title, children, colSpan = false }: { label: string; title?: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <Label title={title} className="block text-xs text-gray-600 mb-1">{label}</Label>
      {children}
    </div>
  )
}
