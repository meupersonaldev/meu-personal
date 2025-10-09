FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY apps/api/package*.json apps/api/

RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/api ./apps/api

ENV NODE_ENV=production

RUN npm run build --workspace=@meu-personal/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY --from=deps /app/node_modules ./node_modules

RUN npm prune --omit=dev && npm cache clean --force

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/uploads ./apps/api/uploads

RUN chown -R nodejs:nodejs apps/api/uploads

WORKDIR /app/apps/api

EXPOSE 3001

USER nodejs

CMD ["node", "dist/server.js"]