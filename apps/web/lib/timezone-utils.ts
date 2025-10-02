/**
 * Utilitários para padronizar conversões de timezone
 * Brasil: UTC-3 (horário padrão de Brasília)
 */

const BRAZIL_TIMEZONE_OFFSET = -3 // UTC-3

/**
 * Converte data UTC para horário local do Brasil
 */
export function utcToLocal(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return new Date(date.getTime() + (Math.abs(BRAZIL_TIMEZONE_OFFSET) * 60 * 60 * 1000))
}

/**
 * Converte data local do Brasil para UTC
 */
export function localToUtc(localDate: Date | string): Date {
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate
  return new Date(date.getTime() - (Math.abs(BRAZIL_TIMEZONE_OFFSET) * 60 * 60 * 1000))
}

/**
 * Formata data para exibição no horário local
 */
export function formatLocalTime(utcDate: Date | string, format: 'time' | 'date' | 'datetime' = 'time'): string {
  const localDate = utcToLocal(utcDate)
  
  switch (format) {
    case 'time':
      return localDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      })
    case 'date':
      return localDate.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      })
    case 'datetime':
      return localDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      })
    default:
      return localDate.toISOString()
  }
}

/**
 * Verifica se uma data/hora UTC já passou no horário local
 */
export function hasPassedLocal(utcDate: Date | string): boolean {
  const localDate = utcToLocal(utcDate)
  const now = new Date()
  return localDate < now
}

/**
 * Cria data UTC a partir de data e hora local
 */
export function createUtcFromLocal(dateStr: string, timeStr: string): Date {
  const localDateTime = new Date(`${dateStr}T${timeStr}:00`)
  return localToUtc(localDateTime)
}

/**
 * Extrai hora local de uma data UTC
 */
export function getLocalTimeFromUtc(utcDate: Date | string): string {
  const localDate = utcToLocal(utcDate)
  return localDate.toTimeString().slice(0, 5) // HH:MM
}

/**
 * Extrai data local de uma data UTC
 */
export function getLocalDateFromUtc(utcDate: Date | string): string {
  const localDate = utcToLocal(utcDate)
  return localDate.toISOString().split('T')[0] // YYYY-MM-DD
}
