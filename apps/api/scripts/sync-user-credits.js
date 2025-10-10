/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function syncUserCredits() {
  console.log('==> Iniciando sincronizacao de creditos globais dos alunos...')

  const { data: balances, error } = await supabase
    .from('student_class_balance')
    .select('student_id, total_purchased, total_consumed, locked_qty')

  if (error) {
    console.error('Erro ao buscar saldos de aluno:', error)
    process.exit(1)
  }

  const totals = new Map()
  for (const balance of balances || []) {
    if (!balance.student_id) continue
    const available = (balance.total_purchased || 0) - (balance.total_consumed || 0) - (balance.locked_qty || 0)
    const current = totals.get(balance.student_id) || 0
    totals.set(balance.student_id, current + available)
  }

  let updated = 0
  for (const [studentId, available] of totals.entries()) {
    const credits = Math.max(0, Math.floor(available))
    const { error: updateError } = await supabase
      .from('users')
      .update({
        credits,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .eq('role', 'STUDENT')

    if (updateError) {
      console.warn(`Falha ao sincronizar aluno ${studentId}:`, updateError.message)
      continue
    }

    updated += 1
  }

  console.log(`✅ Sincronizacao concluida. ${updated} alunos atualizados.`)
}

syncUserCredits().catch((err) => {
  console.error('Erro inesperado ao sincronizar creditos:', err)
  process.exit(1)
})
