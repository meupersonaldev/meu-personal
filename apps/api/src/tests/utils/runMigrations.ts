import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

function getMigrationsDir() {
  // src/tests/utils -> ../../migrations
  return path.resolve(__dirname, '../../../migrations')
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const res = await client.query<{ exists: string | null }>(
    `SELECT to_regclass($1) AS exists`,
    [`public.${table}`]
  )
  return !!res.rows[0]?.exists
}

async function acquireLock(client: Client): Promise<boolean> {
  // Use a fixed advisory lock key to serialize migration execution
  const res = await client.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock($1, $2) AS locked',
    [54123, 1337]
  )
  return !!res.rows[0]?.locked
}

async function releaseLock(client: Client): Promise<void> {
  try {
    await client.query('SELECT pg_advisory_unlock($1, $2)', [54123, 1337])
  } catch {}
}

export async function runMigrationsIfNeeded(): Promise<void> {
  if (process.env.SKIP_DB_MIGRATIONS === 'true') return

  // Build a robust connection string for Supabase Postgres using service role
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const refMatch = supabaseUrl.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  const projectRef = refMatch?.[1]

  // Derive host:port/path from existing DATABASE_URL when available
  const dbUrlEnv = process.env.DATABASE_URL || ''
  let hostPortPath = 'aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=public'
  try {
    if (dbUrlEnv.startsWith('postgresql://')) {
      const afterAt = dbUrlEnv.split('@')[1]
      if (afterAt) {
        const firstSlash = afterAt.indexOf('/')
        hostPortPath = firstSlash >= 0 ? afterAt.substring(0) : afterAt
      }
    }
  } catch {}

  if (!projectRef || !serviceKey) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; skipping migrations')
    return
  }

  const connectionString = `postgresql://postgres.${projectRef}:${serviceKey}@${hostPortPath}`
  const client = new Client({ connectionString })
  try {
    await client.connect()
  } catch (err) {
    console.warn(`Could not connect to database for migrations: ${(err as any)?.message || err}`)
    return
  }

  try {
    const locked = await acquireLock(client)
    if (!locked) {
      // Another worker is migrating; wait for it to finish by polling
      let attempts = 0
      while (attempts < 60) { // up to ~30s
        const s = await tableExists(client, 'student_packages')
        const h = await tableExists(client, 'hour_packages')
        if (s && h) return
        await new Promise(r => setTimeout(r, 500))
        attempts++
      }
      return
    }

    // Check if required tables already exist
    const hasStudent = await tableExists(client, 'student_packages')
    const hasHour = await tableExists(client, 'hour_packages')
    if (hasStudent && hasHour) {
      return
    }

    const migrationsDir = getMigrationsDir()
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(fullPath, 'utf8')
      // Run as-is; files manage their own transactions when needed
      try {
        await client.query(sql)
      } catch (err) {
        // Ignore benign errors when objects already exist
        const msg = (err as any)?.message || String(err)
        console.warn(`Migration '${file}' failed: ${msg}`)
        throw err
      }
    }
  } finally {
    await releaseLock(client)
    await client.end()
  }
}
