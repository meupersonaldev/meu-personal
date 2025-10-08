FROM node:18-alpine AS base

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de package
COPY apps/web/package*.json ./
COPY package*.json ./

# Instalar todas as dependências (incluindo dev dependencies para build)
RUN npm ci

# Copiar código fonte
COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/next.config.ts ./
COPY apps/web/tailwind.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/postcss.config.mjs ./

# Build da aplicação
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS production

# Instalar dependências de produção
WORKDIR /app
COPY apps/web/package*.json ./
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar build e arquivos necessários
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Trocar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando de start
CMD ["node", "server.js"]