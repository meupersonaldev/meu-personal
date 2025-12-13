'use client'

import { useEffect, useState } from 'react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, Calendar, Users, AlertTriangle, CheckCircle, Shield } from 'lucide-react'

// Helper para obter token do localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || ''
  }
  return ''
}

interface EffectivePolicy {
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
}

interface PolicyResponse {
  success: boolean
  effective: EffectivePolicy
  published: boolean
  overrides: Record<string, number>
}

export default function FranquiaPoliticasPage() {
  const { academy } = useFranquiaStore()
  const [policy, setPolicy] = useState<EffectivePolicy | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPolicy() {
      const token = getToken()
      if (!academy?.id) {
        setLoading(false)
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const token = getToken()
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(`${API_URL}/api/academies/${academy.id}/policies-effective`, {
          credentials: 'include',
          headers
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar políticas')
        }

        const data: PolicyResponse = await response.json()
        setPolicy(data.effective)
        setOverrides(data.overrides || {})
        setIsPublished(data.published)
      } catch (err) {
        console.error('Erro ao buscar políticas:', err)
        setError('Não foi possível carregar as políticas. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
  }, [academy?.id])

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const hasOverride = (field: string): boolean => {
    return field in overrides
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Nenhuma política configurada pela franqueadora.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">
            Políticas de Operação
          </h1>
          <p className="text-gray-500 mt-1">
            Regras definidas pela franqueadora para sua unidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPublished ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Política Ativa
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Política Padrão
            </Badge>
          )}
          {Object.keys(overrides).length > 0 && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {Object.keys(overrides).length} override(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Regras do Aluno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-meu-primary" />
            Regras para Alunos
          </CardTitle>
          <CardDescription>
            Configurações que afetam os agendamentos dos alunos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PolicyCard
              label="Créditos por Aula"
              value={policy.credits_per_class.toString()}
              unit="crédito(s)"
              hasOverride={hasOverride('credits_per_class')}
            />
            <PolicyCard
              label="Antecedência Mínima p/ Agendar"
              value={formatMinutes(policy.student_min_booking_notice_minutes)}
              hasOverride={hasOverride('student_min_booking_notice_minutes')}
            />
            <PolicyCard
              label="Antecedência Mínima p/ Reagendar"
              value={formatMinutes(policy.student_reschedule_min_notice_minutes)}
              hasOverride={hasOverride('student_reschedule_min_notice_minutes')}
            />
            <PolicyCard
              label="Dias Máximos p/ Agendar"
              value={policy.max_future_booking_days.toString()}
              unit="dias"
              hasOverride={hasOverride('max_future_booking_days')}
            />
            <PolicyCard
              label="Limite de Cancelamentos/Mês"
              value={policy.max_cancel_per_month === 0 ? 'Ilimitado' : policy.max_cancel_per_month.toString()}
              hasOverride={hasOverride('max_cancel_per_month')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regras de Cancelamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Regras de Cancelamento
          </CardTitle>
          <CardDescription>
            Penalidades e janelas de cancelamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PolicyCard
              label="Janela de Late Cancel"
              value={formatMinutes(policy.late_cancel_threshold_minutes)}
              description="Cancelamentos dentro desta janela são considerados late cancel"
              hasOverride={hasOverride('late_cancel_threshold_minutes')}
            />
            <PolicyCard
              label="Penalidade Late Cancel"
              value={policy.late_cancel_penalty_credits.toString()}
              unit="crédito(s)"
              hasOverride={hasOverride('late_cancel_penalty_credits')}
            />
            <PolicyCard
              label="Penalidade No-Show"
              value={policy.no_show_penalty_credits.toString()}
              unit="crédito(s)"
              hasOverride={hasOverride('no_show_penalty_credits')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regras do Professor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-meu-primary" />
            Regras para Professores
          </CardTitle>
          <CardDescription>
            Limites e configurações para os professores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PolicyCard
              label="Máximo de Aulas/Dia"
              value={policy.teacher_max_daily_classes === 0 ? 'Ilimitado' : policy.teacher_max_daily_classes.toString()}
              unit="aulas"
              hasOverride={hasOverride('teacher_max_daily_classes')}
            />
            <PolicyCard
              label="Descanso Entre Aulas"
              value={formatMinutes(policy.teacher_rest_minutes_between_classes)}
              hasOverride={hasOverride('teacher_rest_minutes_between_classes')}
            />
            <PolicyCard
              label="Minutos por Aula"
              value={policy.teacher_minutes_per_class.toString()}
              unit="min"
              hasOverride={hasOverride('teacher_minutes_per_class')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regras de Aula e Check-in */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-meu-primary" />
            Aulas e Check-in
          </CardTitle>
          <CardDescription>
            Configurações de duração e tolerância
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PolicyCard
              label="Duração da Aula"
              value={policy.class_duration_minutes.toString()}
              unit="min"
              hasOverride={hasOverride('class_duration_minutes')}
            />
            <PolicyCard
              label="Tolerância de Check-in"
              value={formatMinutes(policy.checkin_tolerance_minutes)}
              description="Tempo após o horário para permitir check-in"
              hasOverride={hasOverride('checkin_tolerance_minutes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Nota sobre overrides */}
      {Object.keys(overrides).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Os campos marcados com borda azul possuem valores personalizados 
              para sua unidade, diferentes da política padrão da franqueadora.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PolicyCard({ 
  label, 
  value, 
  unit, 
  description, 
  hasOverride 
}: { 
  label: string
  value: string
  unit?: string
  description?: string
  hasOverride?: boolean
}) {
  return (
    <div className={`p-4 rounded-lg border ${hasOverride ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {value} {unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}
      </p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
      {hasOverride && (
        <Badge variant="outline" className="mt-2 text-xs bg-blue-100 text-blue-700 border-blue-200">
          Personalizado
        </Badge>
      )}
    </div>
  )
}
