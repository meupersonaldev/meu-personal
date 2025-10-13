import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

export function fmtTime(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, tz || getUserTimeZone(), 'HH:mm', { locale: ptBR })
}

export function fmtDate(date: string | Date, tz?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, tz || getUserTimeZone(), 'dd/MM/yyyy', { locale: ptBR })
}
