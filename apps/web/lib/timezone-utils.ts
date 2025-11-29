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
 * Cria data UTC a partir de data e hora local (Brasil UTC-3)
 * Input: '2025-11-29', '21:00' (horário de Brasília)
 * Output: Date em UTC (2025-11-30T00:00:00.000Z)
 */
export function createUtcFromLocal(dateStr: string, timeStr: string): Date {
  // Parsear componentes
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  
  // Criar Date em UTC adicionando o offset do Brasil (+3h para ir de local para UTC)
  return new Date(Date.UTC(year, month - 1, day, hour + Math.abs(BRAZIL_TIMEZONE_OFFSET), minute, 0))
}

/**
 * Extrai hora local (Brasil) de uma data UTC
 * Input: '2025-11-30T00:00:00.000Z' (UTC)
 * Output: '21:00' (horário de Brasília)
 */
export function getLocalTimeFromUtc(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  // Subtrair offset para ir de UTC para local (UTC-3 = subtrair 3h)
  const localHour = date.getUTCHours() - Math.abs(BRAZIL_TIMEZONE_OFFSET)
  const adjustedHour = localHour < 0 ? localHour + 24 : localHour
  const minute = date.getUTCMinutes()
  return `${adjustedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

/**
 * Extrai data local (Brasil) de uma data UTC
 * Input: '2025-11-30T00:00:00.000Z' (UTC)
 * Output: '2025-11-29' (data de Brasília)
 */
export function getLocalDateFromUtc(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  // Subtrair offset para ir de UTC para local
  const localHour = date.getUTCHours() - Math.abs(BRAZIL_TIMEZONE_OFFSET)
  
  // Se a hora local ficou negativa, voltar um dia
  if (localHour < 0) {
    const adjustedDate = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    return `${adjustedDate.getUTCFullYear()}-${(adjustedDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${adjustedDate.getUTCDate().toString().padStart(2, '0')}`
  }
  
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
}
