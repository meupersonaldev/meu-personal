FROM node:18-alpine AS base

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de package
COPY apps/api/package*.json ./
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

# Build da aplicação
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS production

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar dependências e build
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# Criar diretório de uploads
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Trocar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production

# Comando de start
CMD ["node", "dist/server.js"]