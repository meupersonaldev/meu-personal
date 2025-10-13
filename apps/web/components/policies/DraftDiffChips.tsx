'use client'

import React from 'react'
import type { PolicyDraft } from './PolicyDraftForm'

type Props = {
  draft: PolicyDraft
  published: PolicyDraft
}

const LABELS: Record<keyof PolicyDraft, string> = {
  credits_per_class: 'Créditos por aula',
  class_duration_minutes: 'Duração da aula (min)',
  checkin_tolerance_minutes: 'Tolerância de check-in (min)',
  student_min_booking_notice_minutes: 'Antecedência p/ agendar (min)',
  student_reschedule_min_notice_minutes: 'Antecedência p/ reagendar (min)',
  late_cancel_threshold_minutes: 'Janela late cancel (min)',
  late_cancel_penalty_credits: 'Penalidade cancelamento tardio',
  no_show_penalty_credits: 'Penalidade no-show',
  teacher_minutes_per_class: 'Minutos por aula (prof.)',
  teacher_rest_minutes_between_classes: 'Descanso entre aulas (min)',
  teacher_max_daily_classes: 'Máximo de aulas/dia',
  max_future_booking_days: 'Dias p/ agendar',
  max_cancel_per_month: 'Limite mensal de cancelamentos',
  comment: 'Comentário',
}

export default function DraftDiffChips({ draft, published }: Props) {
  const keys = Object.keys(LABELS) as (keyof PolicyDraft)[]
  const diffs = keys
    .filter((k) => k !== 'comment')
    .filter((k) => (draft as any)[k] !== (published as any)[k])
    .slice(0, 10) // limitar visualmente

  if (diffs.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {diffs.map((k) => {
        const from = (published as any)[k]
        const to = (draft as any)[k]
        return (
          <span
            key={String(k)}
            className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-xs"
            title={`${LABELS[k]}: ${from} → ${to}`}
          >
            <span className="font-medium mr-1">{LABELS[k]}:</span>
            <span className="opacity-80">{from}</span>
            <span className="mx-1">→</span>
            <span>{to}</span>
          </span>
        )
      })}
    </div>
  )
}
