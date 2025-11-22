// Script para copiar arquivos de documentação para o build
const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '../../../docs/cliente')
const destDir = path.join(__dirname, '../public/docs')

// Criar diretório de destino se não existir
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

// Copiar arquivos .md
if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.md'))
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const destPath = path.join(destDir, file)
    fs.copyFileSync(sourcePath, destPath)
    console.log(`Copiado: ${file}`)
  })
  
  console.log(`✅ ${files.length} arquivo(s) de documentação copiado(s)`)
} else {
  console.warn('⚠️ Diretório de origem não encontrado:', sourceDir)
}


