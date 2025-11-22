#!/usr/bin/env node

/**
 * Script para verificar a configuração do Asaas
 * Uso: node scripts/check-asaas-config.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

console.log('🔍 Verificando configuração do Asaas...\n')

const asaasApiKey = process.env.ASAAS_API_KEY
const asaasEnv = process.env.ASAAS_ENV || 'sandbox'

console.log('📋 Configurações encontradas:')
console.log(`   ASAAS_ENV: ${asaasEnv}`)
console.log(`   ASAAS_API_KEY: ${asaasApiKey ? '✅ Configurada (' + asaasApiKey.length + ' caracteres)' : '❌ NÃO CONFIGURADA'}`)

if (asaasApiKey) {
  const maskedKey = asaasApiKey.length > 30 
    ? asaasApiKey.substring(0, 30) + '...' + asaasApiKey.substring(asaasApiKey.length - 15)
    : asaasApiKey.substring(0, 10) + '...'
  console.log(`   Preview da chave: ${maskedKey}`)
  console.log(`   Prefixo: ${asaasApiKey.substring(0, 15)}`)
}

if (!asaasApiKey) {
  console.log('\n❌ ERRO: ASAAS_API_KEY não está configurada!')
  console.log('\n📝 Como resolver:')
  console.log('   1. Crie ou edite o arquivo apps/api/.env')
  console.log('   2. Adicione a seguinte linha:')
  console.log('      ASAAS_API_KEY=sua_chave_api_aqui')
  console.log('   3. Para sandbox (desenvolvimento):')
  console.log('      - Acesse: https://sandbox.asaas.com')
  console.log('      - Vá em: Integrações → Chave de API')
  console.log('      - Copie a chave e cole no .env')
  console.log('   4. Para produção:')
  console.log('      - Acesse: https://www.asaas.com')
  console.log('      - Vá em: Integrações → Chave de API')
  console.log('      - Copie a chave e cole no .env')
  console.log('   5. Reinicie o servidor após configurar')
  process.exit(1)
}

// Validar formato da chave
if (asaasApiKey.startsWith('$aact_')) {
  console.log('   ⚠️  A chave parece estar com o prefixo "$" - remova o "$" do início')
  console.log('   Exemplo correto: aact_prod_... ou aact_hmlg_...')
} else if (asaasApiKey.startsWith('aact_')) {
  console.log('   ✅ Formato da chave parece correto')
} else {
  console.log('   ⚠️  A chave não parece estar no formato esperado')
  console.log('   Formato esperado: aact_prod_... ou aact_hmlg_...')
}

// Verificar se ambiente corresponde à chave
if (asaasEnv === 'production' && asaasApiKey.includes('hmlg')) {
  console.log('\n⚠️  AVISO: Você está usando uma chave de sandbox (hmlg) em produção!')
  console.log('   Isso causará erros de autenticação.')
} else if (asaasEnv === 'sandbox' && asaasApiKey.includes('prod')) {
  console.log('\n⚠️  AVISO: Você está usando uma chave de produção (prod) em sandbox!')
  console.log('   Isso causará erros de autenticação.')
}

console.log('\n✅ Verificação concluída!')
console.log('\n💡 Dica: Se ainda tiver problemas, verifique:')
console.log('   - Se a chave está correta e não expirou')
console.log('   - Se o ambiente (sandbox/production) corresponde à chave')
console.log('   - Se reiniciou o servidor após configurar o .env')

