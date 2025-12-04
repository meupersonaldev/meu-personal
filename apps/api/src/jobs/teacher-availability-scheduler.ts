import { supabase } from '../lib/supabase'
import {
  ensureDefaultAvailabilityForTeacher,
  ensureAvailabilityWindowForTeacher
} from '../routes/teacher-preferences'

/**
 * Scheduler diário para preenchimento automático de disponibilidade
 * de professores pelos próximos 6 meses.
 *
 * Regras:
 * - Roda 1x por dia (configurável)
 * - Considera vínculos ativos em `academy_teachers`
 * - Só tenta preencher academias ativas
 * - Usa `ensureDefaultAvailabilityForTeacher`, que:
 *   - Respeita o `schedule` da academia (dias abertos/fechados)
 *   - Usa `academy_time_slots` como grade de horários
 *   - Insere em bulk e evita duplicatas se já existir disponibilidade
 */

interface AvailabilityJobResult {
  processedLinks: number
  processedTeachers: number
  skipped: number
  errors: number
}

export class TeacherAvailabilityScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Executa o job uma vez:
   * - Busca vínculos ativos em `academy_teachers`
   * - Para cada (teacher_id, academy_id):
   *   - Se ainda não foi seedado, roda `ensureDefaultAvailabilityForTeacher`
   *   - Se já foi seedado, roda `ensureAvailabilityWindowForTeacher` para manter janela de 6 meses
   */
  async runOnce(): Promise<AvailabilityJobResult> {
    const start = Date.now()
    const result: AvailabilityJobResult = {
      processedLinks: 0,
      processedTeachers: 0,
      skipped: 0,
      errors: 0
    }

    console.log('[TeacherAvailabilityScheduler] 🚀 Iniciando preenchimento de agenda...')

    try {
      // Buscar todos os vínculos ativos de professor x academia
      const { data: links, error } = await supabase
        .from('academy_teachers')
        .select(
          'teacher_id, academy_id, status, default_availability_seeded_at, academies!inner(is_active)'
        )
        .eq('status', 'active')

      if (error) {
        console.error('[TeacherAvailabilityScheduler] Erro ao buscar academy_teachers:', error)
        result.errors++
        return result
      }

      if (!links || links.length === 0) {
        console.log('[TeacherAvailabilityScheduler] Nenhum vínculo ativo encontrado')
        return result
      }

      console.log(
        `[TeacherAvailabilityScheduler] Encontrados ${links.length} vínculos ativos professor x academia`
      )

      for (const link of links as any[]) {
        const teacherId = link.teacher_id as string | undefined
        const academyId = link.academy_id as string | undefined
        const isAcademyActive = link.academies?.is_active ?? true
        const seededAt = link.default_availability_seeded_at as string | null | undefined

        if (!teacherId || !academyId) {
          result.skipped++
          continue
        }

        if (!isAcademyActive) {
          console.log(
            `[TeacherAvailabilityScheduler] ⏭️ Pulando academy inativa: teacher=${teacherId}, academy=${academyId}`
          )
          result.skipped++
          continue
        }

        result.processedLinks++

        try {
          if (!seededAt) {
            console.log(
              `[TeacherAvailabilityScheduler] 🌱 Seed inicial de disponibilidade: teacher=${teacherId}, academy=${academyId}`
            )
            await ensureDefaultAvailabilityForTeacher(teacherId, academyId)
          } else {
            console.log(
              `[TeacherAvailabilityScheduler] 🔁 Mantendo janela de disponibilidade: teacher=${teacherId}, academy=${academyId}`
            )
            await ensureAvailabilityWindowForTeacher(teacherId, academyId)
          }
          result.processedTeachers++
        } catch (err) {
          console.error(
            `[TeacherAvailabilityScheduler] ❌ Erro ao processar teacher=${teacherId}, academy=${academyId}:`,
            err
          )
          result.errors++
        }
      }

      const duration = Date.now() - start
      console.log('[TeacherAvailabilityScheduler] ✅ Execução concluída')
      console.log(
        `  - Vínculos processados: ${result.processedLinks}\n  - Professores preenchidos: ${result.processedTeachers}\n  - Pulados: ${result.skipped}\n  - Erros: ${result.errors}\n  - Duração: ${duration}ms`
      )

      return result
    } catch (err) {
      console.error('[TeacherAvailabilityScheduler] ❌ Erro inesperado na execução do job:', err)
      result.errors++
      return result
    }
  }

  /**
   * Inicia o scheduler para rodar diariamente em um horário específico.
   * Semelhante ao ReservationScheduler.
   */
  startDailyScheduler(hourToRun: number = 3): void {
    if (this.intervalId) {
      console.log('[TeacherAvailabilityScheduler] Scheduler já está rodando')
      return
    }

    console.log(
      `[TeacherAvailabilityScheduler] ⏰ Iniciando scheduler diário (execução às ${hourToRun}:00)`
    )

    this.intervalId = setInterval(async () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // Executar apenas na hora configurada (com margem de 5 minutos)
      if (currentHour === hourToRun && currentMinute < 5) {
        await this.runSafely()
      }
    }, 60 * 60 * 1000)

    // Também executar imediatamente se estiver na hora certa
    const now = new Date()
    if (now.getHours() === hourToRun) {
      this.runSafely()
    }
  }

  /**
   * Inicia o scheduler em intervalo fixo (útil para testes)
   */
  startIntervalScheduler(intervalMinutes: number = 60): void {
    if (this.intervalId) {
      console.log('[TeacherAvailabilityScheduler] Scheduler já está rodando')
      return
    }

    console.log(
      `[TeacherAvailabilityScheduler] ⏰ Iniciando scheduler de intervalo (a cada ${intervalMinutes} minutos)`
    )

    this.intervalId = setInterval(async () => {
      await this.runSafely()
    }, intervalMinutes * 60 * 1000)
  }

  private async runSafely(): Promise<void> {
    if (this.isRunning) {
      console.log('[TeacherAvailabilityScheduler] Execução já em andamento, pulando...')
      return
    }

    this.isRunning = true
    try {
      await this.runOnce()
    } finally {
      this.isRunning = false
    }
  }

  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[TeacherAvailabilityScheduler] ⏹️ Scheduler parado')
    }
  }
}

export const teacherAvailabilityScheduler = new TeacherAvailabilityScheduler()


