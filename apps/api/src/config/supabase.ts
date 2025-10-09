import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Usar Service Role Key para operações do servidor
const baseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rawSql = (strings: TemplateStringsArray, ...values: unknown[]) => {
  let text = ''
  strings.forEach((part, index) => {
    text += part
    if (index < values.length) {
      const value = values[index]
      if (typeof value === 'object' && value !== null) {
        text += JSON.stringify(value)
      } else {
        text += String(value)
      }
    }
  })

  return {
    toPostgrest: () => text
  }
}

// Adiciona helper sql para expressões PostgREST (e mantém tipagem)
export const supabase = Object.assign(baseClient, {
  sql: rawSql
}) as SupabaseClient & { sql: typeof rawSql }
