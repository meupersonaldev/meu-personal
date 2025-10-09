'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, CalendarPlus, Users } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'

interface StudentHeaderActionsProps {
  variant?: 'desktop' | 'mobile'
}

export function StudentHeaderActions({ variant = 'desktop' }: StudentHeaderActionsProps) {
  const router = useRouter()
  const { user } = useAuthStore()

  const creditsLabel = useMemo(() => {
    const credits = user?.credits ?? 0
    if (credits >= 1) {
      return `${credits} crédito${credits === 1 ? '' : 's'}`
    }
    return 'Sem créditos'
  }, [user?.credits])

  const containerClasses =
    variant === 'mobile'
      ? 'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'
      : 'flex items-center gap-3'

  const creditClasses =
    variant === 'mobile'
      ? 'flex flex-1 items-center justify-between rounded-lg border border-meu-primary/30 bg-meu-primary/10 px-3 py-2'
      : 'flex items-center gap-2 rounded-lg border border-meu-primary/30 bg-meu-primary/10 px-4 py-2'

  return (
    <div className={containerClasses}>
      <div className={creditClasses}>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-meu-primary" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase text-gray-600">
              Créditos disponíveis
            </p>
            <p className="text-sm font-bold text-meu-primary md:text-base">{creditsLabel}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="bg-meu-primary text-white hover:bg-meu-primary-dark"
          onClick={() => router.push('/aluno/comprar')}
        >
          Comprar
        </Button>
      </div>

      {variant === 'desktop' && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => router.push('/aluno/inicio?section=professores')}
          >
            <Users className="h-4 w-4" />
            Encontrar professor
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => router.push('/aluno/inicio?section=agendamentos')}
          >
            <CalendarPlus className="h-4 w-4" />
            Agendar aula
          </Button>
        </div>
      )}
    </div>
  )
}
