# Script para executar migration de adicionar coluna gender
# Execute este script da pasta apps/api

$ErrorActionPreference = "Stop"

Write-Host "Executando migration: add_gender_column" -ForegroundColor Cyan

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "ERRO: Arquivo .env nao encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar na pasta apps/api" -ForegroundColor Yellow
    exit 1
}

# Carregar DATABASE_URL do .env
$envContent = Get-Content ".env" -Raw
if ($envContent -match 'DATABASE_URL=["'']?([^"''\r\n]+)["'']?') {
    $databaseUrl = $matches[1]
    Write-Host "DATABASE_URL encontrada" -ForegroundColor Green
} else {
    Write-Host "ERRO: DATABASE_URL nao encontrada no .env" -ForegroundColor Red
    exit 1
}

# Executar migration SQL
Write-Host "`nExecutando SQL migration..." -ForegroundColor Cyan

$sqlFile = "migrations\20251206_add_notification_fields.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERRO: Arquivo de migration nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

# Usar psql para executar a migration
$env:PGPASSWORD = ""
if ($databaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $user = $matches[1]
    $password = $matches[2]
    $dbHost = $matches[3]
    $port = $matches[4]
    $database = $matches[5].Split('?')[0]
    
    Write-Host "Conectando ao banco: $database@$dbHost" -ForegroundColor Yellow
    
    $env:PGPASSWORD = $password
    
    try {
        $sqlContent = Get-Content $sqlFile -Raw
        $sqlContent | psql -h $dbHost -p $port -U $user -d $database
        Write-Host "`nMigration executada com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "`nERRO ao executar migration: $_" -ForegroundColor Red
        Write-Host "`nTentando metodo alternativo..." -ForegroundColor Yellow
        Write-Host "Execute manualmente no Supabase SQL Editor:" -ForegroundColor Cyan
        Write-Host (Get-Content $sqlFile -Raw) -ForegroundColor White
    }
} else {
    Write-Host "Formato de DATABASE_URL nao reconhecido" -ForegroundColor Yellow
    Write-Host "Execute manualmente no Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host (Get-Content $sqlFile -Raw) -ForegroundColor White
}

Write-Host "`nProximo passo: Execute 'npm run prisma:generate' para atualizar o Prisma Client" -ForegroundColor Cyan
