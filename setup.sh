#!/bin/bash

echo "🚀 Iniciando setup do projeto Meu Personal..."

# Install dependencies
echo "📦 Instalando dependências..."
npm install

# Start Docker containers
echo "🐳 Iniciando containers Docker..."
docker-compose up -d

# Wait for database
echo "⏳ Aguardando banco de dados..."
sleep 5

# Run Prisma migrations
echo "🗄️ Configurando banco de dados..."
cd apps/api
npx prisma generate
npx prisma db push
cd ../..

# Create .env files
echo "📝 Criando arquivos .env..."
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

echo "✅ Setup concluído! Execute 'npm run dev' para iniciar o projeto."