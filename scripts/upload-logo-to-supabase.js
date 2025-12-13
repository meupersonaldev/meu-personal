/**
 * Script para fazer upload da logo para o Supabase Storage
 * Isso garante que a logo esteja sempre acessível nos emails
 * 
 * Uso: node scripts/upload-logo-to-supabase.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../apps/api/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function uploadLogo() {
  const logoPath = path.join(__dirname, '../apps/web/public/images/logo.png')
  
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Logo não encontrada em:', logoPath)
    process.exit(1)
  }

  const logoBuffer = fs.readFileSync(logoPath)
  
  console.log('📤 Fazendo upload da logo para Supabase Storage...')
  console.log('   Arquivo:', logoPath)
  console.log('   Tamanho:', (logoBuffer.length / 1024).toFixed(2), 'KB')

  const { data, error } = await supabase.storage
    .from('assets')
    .upload('logo.png', logoBuffer, {
      contentType: 'image/png',
      upsert: true // Sobrescreve se já existir
    })

  if (error) {
    console.error('❌ Erro no upload:', error.message)
    process.exit(1)
  }

  // Gerar URL pública
  const { data: publicUrl } = supabase.storage
    .from('assets')
    .getPublicUrl('logo.png')

  console.log('✅ Upload concluído!')
  console.log('')
  console.log('🔗 URL pública da logo:')
  console.log(publicUrl.publicUrl)
  console.log('')
  console.log('📝 Atualize a LOGO_URL em apps/api/src/services/email-templates.ts para:')
  console.log(`const LOGO_URL = '${publicUrl.publicUrl}'`)
}

uploadLogo().catch(console.error)
