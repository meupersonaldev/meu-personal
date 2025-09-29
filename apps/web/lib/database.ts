// Abstração para facilitar migração futura
import { supabase } from './supabase'

// Interface genérica para operações de banco
export interface DatabaseClient {
  from: (table: string) => any
  auth: any
}

// Cliente atual (Supabase)
export const db: DatabaseClient = supabase

// Quando migrar, só trocar a implementação:
// export const db: DatabaseClient = new PostgreSQLClient(connectionString)

// Todas as operações ficam iguais:
// const { data } = await db.from('users').select('*')

export default db
