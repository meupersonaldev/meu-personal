import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ArrowRight, Wallet, CheckCircle, Ticket } from 'lucide-react'

interface UpcomingLessonInfo {
  teacherName: string
  scheduleLabel: string
}

interface SummaryCardsProps {
  formattedCredits: string
  upcomingLesson: UpcomingLessonInfo | null
  completedCount: number
  totalMinutesTrained: number
  lastCheckinLabel: string | null
  isCheckinAvailable: boolean
  onBuyCredits: () => void
  onManageSchedule: () => void
  onNewCheckin: () => void
}

export function SummaryCards({
  formattedCredits,
  upcomingLesson,
  completedCount,
  totalMinutesTrained,
  lastCheckinLabel,
  isCheckinAvailable,
  onBuyCredits,
  onManageSchedule,
  onNewCheckin,
}: SummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Créditos disponíveis</p>
              <p className="text-2xl font-bold text-gray-900">{formattedCredits}</p>
            </div>
            <Wallet className="h-10 w-10 text-meu-primary" />
          </div>
          <Button
            variant="outline"
            className="border-meu-primary/30 text-meu-primary hover:bg-meu-primary/10"
            onClick={onBuyCredits}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Comprar créditos
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Próxima aula</p>
              {upcomingLesson ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">{upcomingLesson.teacherName}</p>
                  <p className="text-sm text-gray-600">{upcomingLesson.scheduleLabel}</p>
                </>
              ) : (
                <p className="text-lg font-semibold text-gray-900">Nenhuma aula agendada</p>
              )}
            </div>
            <Calendar className="h-10 w-10 text-meu-primary" />
          </div>
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-100"
            onClick={onManageSchedule}
          >
            Gerenciar agenda
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aulas concluídas</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <p className="text-sm text-gray-600">
            Tempo total treinado:{' '}
            <span className="font-semibold text-gray-900">
              {Math.floor(totalMinutesTrained / 60)}h {totalMinutesTrained % 60}min
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Último check-in</p>
              <p className="text-lg font-semibold text-gray-900">
                {lastCheckinLabel ?? 'Ainda não realizado'}
              </p>
            </div>
            <Ticket className="h-10 w-10 text-meu-primary" />
          </div>
          <Button
            variant="outline"
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-100"
            disabled={!isCheckinAvailable}
            onClick={onNewCheckin}
          >
            {isCheckinAvailable ? 'Gerar check-in agora' : 'Selecione uma unidade'}
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
