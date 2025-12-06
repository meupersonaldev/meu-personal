# Checklist de Estabilização (Go-Live)

Prioridade: deixar o ambiente produção funcional com `api.meupersonalfranquia.com.br` + `meupersonalfranquia.com.br`. Execute na ordem.

## 1) Infra / DNS / SSL
- [ ] DNS aponta `api.meupersonalfranquia.com.br` para o backend (LB/servidor).
- [ ] Certificados HTTPS válidos para `api.meupersonalfranquia.com.br` e `meupersonalfranquia.com.br`.
- [ ] Redirecionar HTTP → HTTPS no proxy.

## 2) Variáveis de ambiente (Produção)
Backend (`.env.production`):
- [ ] `NODE_ENV=production`, `PORT=3001`.
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service só no backend).
- [ ] `DATABASE_URL` do Supabase (pooler:6543, schema public).
- [ ] `FRONTEND_URL=https://meupersonalfranquia.com.br`.
- [ ] `CORS_ORIGINS=https://meupersonalfranquia.com.br` (adicione `https://www.meupersonalfranquia.com.br` se usar).
- [ ] `JWT_SECRET`, `JWT_EXPIRES_IN=7d`.
- [ ] Asaas: `ASAAS_API_KEY`, `ASAAS_ENV=production`, `ASAAS_API_URL=https://www.asaas.com/api/v3`.
- [ ] `REDIS_URL=redis://redis:6379` (se rate limit/cache usarem Redis).
- [ ] SMTP: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER/SMTP_PASS`.
- [ ] `APP_BASE_URL`, `API_BASE_URL`, `NEXT_PUBLIC_API_URL` = `https://api.meupersonalfranquia.com.br`.
- [ ] `HELMET_ENABLED=true`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.
- [ ] Schedulers: se usar, defina `SCHEDULER_INTERVAL_MINUTES`, `RESERVATION_SCHEDULER_HOUR`, `TEACHER_AVAILABILITY_SCHEDULER_HOUR` (defaults ok, mas confirmar).

Frontend (`apps/web/.env.production`):
- [ ] `NEXT_PUBLIC_API_URL=https://api.meupersonalfranquia.com.br`.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `FRONTEND_URL=https://meupersonalfranquia.com.br` (se usado em scripts/deploy).

## 3) Deploy / Orquestração
- [ ] docker-compose/easypanel.json usam as mesmas env acima.
- [ ] Volumes: Redis (`redis_data`) configurado.
- [ ] Healthchecks ativados (API /health, web /).

## 4) Smoke tests críticos
- [ ] API `/health` responde 200.
- [ ] Login STUDENT/TEACHER/FRANCHISE_ADMIN/SUPER_ADMIN via frontend (confere cookie `auth-token` SameSite=None; Secure).
- [ ] Listar slots e criar agendamento (booking) com créditos disponíveis.
- [ ] Painel Franqueadora carrega academias/analytics sem 401.
- [ ] SSE/notificações funcionam após login (cookie presente).

## 5) Pagamentos / Asaas
- [ ] `ASAAS_API_KEY` de produção válida e sem `$` no início.
- [ ] Webhooks Asaas apontam para `https://api.meupersonalfranquia.com.br/api/webhooks/asaas` (ou rota definida).
- [ ] Teste checkout de pacote (PIX/boleto) e retorno de status.

## 6) Segurança / CORS
- [ ] CORS só libera domínios de produção; testes locais via localhost ok em dev.
- [ ] Helmet ativo; CSP não bloqueia Supabase storage (`fstbhakmmznfdeluyexc.supabase.co`).

## 7) Logs e observabilidade
- [ ] Logging em modo info; sem console ruidoso em produção.
- [ ] Métricas/health prontos (ENABLE_METRICS=true se usado).

## 8) Gaps conhecidos para pós-go-live
- Supabase direto no frontend (franquia/franqueadora stores) ainda usa anon; quando RLS ativar, migrar chamadas para API backend.
- Lints e warnings na `franquia-store.ts` (variáveis error e consoles) não quebram produção, mas limpar depois.
- Consolidação de auth: ideal unificar login da franquia no `auth-store` para reduzir divergência de token/localStorage.

## 9) Checklist rápido antes de liberar
- [ ] Backend sobe sem erros de env/schedulers.
- [ ] Frontend build `next build` passa com env corretas.
- [ ] Fluxos de login/agendamento funcionam em ambiente real HTTPS.
- [ ] Pagamento teste criado e notificação recebida.
