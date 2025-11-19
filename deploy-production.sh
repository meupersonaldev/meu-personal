#!/bin/bash

# 🚀 SCRIPT DE DEPLOY - MEU PERSONAL
# Ambiente: Produção

echo "🔧 Iniciando deploy para produção..."

# ========================================
# 📦 Build do Frontend
# ========================================
echo "📦 Build do Frontend..."
cd apps/web

# Copiar variáveis de ambiente de produção
cp .env.production .env.local

# Instalar dependências
npm ci --production

# Build da aplicação
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build do frontend concluído com sucesso!"
else
    echo "❌ Erro no build do frontend!"
    exit 1
fi

# ========================================
# 🔧 Configuração da API
# ========================================
echo "🔧 Configurando API..."
cd ../api

# Copiar variáveis de ambiente de produção
cp .env.production .env

# Instalar dependências
npm ci --production

# Build da API (TypeScript)
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build da API concluído com sucesso!"
else
    echo "❌ Erro no build da API!"
    exit 1
fi

# ========================================
# 🔄 Reiniciar Serviços
# ========================================
echo "🔄 Reiniciando serviços com PM2..."

# Parar processos existentes
pm2 stop all || true
pm2 delete all || true

# Iniciar API
pm2 start ecosystem.config.js --env production

# Iniciar Frontend
cd ../web
pm2 start ecosystem.config.js --env production

# Salvar configuração do PM2
pm2 save

# ========================================
# ✅ Verificação
# ========================================
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Serviços rodando:"
echo "  - Frontend: https://meupersonalfranquia.com.br"
echo "  - API: https://api.meupersonalfranquia.com.br"
echo ""
echo "📊 Status:"
pm2 status
pm2 logs --lines 20