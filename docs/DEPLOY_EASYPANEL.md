# Guia de Deploy - EasyPanel

Este guia detalha o processo completo para fazer deploy do projeto Meu Personal em uma VPS com EasyPanel.

## 📋 Pré-requisitos

### 1. VPS com EasyPanel Instalado
- VPS com Ubuntu 20.04+ ou Debian 11+
- Mínimo 2GB RAM (recomendado 4GB)
- 20GB de espaço em disco
- EasyPanel instalado e configurado

### 2. Serviços Externos Configurados

#### Supabase (Banco de Dados)
- Projeto criado em [supabase.com](https://supabase.com)
- Anote as seguintes credenciais:
  - `SUPABASE_URL`: URL do projeto (https://xxx.supabase.co)
  - `SUPABASE_ANON_KEY`: Chave anônima (Settings > API)
  - `SUPABASE_SERVICE_KEY`: Chave de serviço (Settings > API)
  - `DATABASE_URL`: Connection string PostgreSQL (Settings > Database)

#### Resend (Envio de Emails)
- Conta criada em [resend.com](https://resend.com)
- Domínio verificado
- API Key gerada
- Anote:
  - `RESEND_API_KEY`: Sua API key
  - `RESEND_FROM_EMAIL`: Email remetente verificado

#### Asaas (Pagamentos)
- Conta criada em [asaas.com](https://asaas.com)
- Anote:
  - `ASAAS_API_KEY`: Sua API key (sandbox ou produção)
  - `ASAAS_WEBHOOK_SECRET`: Secret para validação de webhooks

### 3. Repositório Git
- Código versionado no GitHub/GitLab/Bitbucket
- Acesso SSH ou HTTPS configurado

---

## 🚀 Passo a Passo do Deploy

### Etapa 1: Preparação Local

#### 1.1. Gerar JWT Secret
```bash
openssl rand -base64 32
```
Anote o resultado - será usado como `JWT_SECRET`.

#### 1.2. Verificar Configurações do Next.js
Certifique-se de que `apps/web/next.config.js` está configurado para output standalone:

```javascript
module.exports = {
  output: 'standalone',
  // ... outras configurações
}
```

#### 1.3. Commit e Push
```bash
git add .
git commit -m "Preparação para deploy em produção"
git push origin main
```

---

### Etapa 2: Configuração no EasyPanel

#### 2.1. Acessar EasyPanel
1. Acesse o painel do EasyPanel: `https://seu-servidor:3000`
2. Faça login com suas credenciais

#### 2.2. Criar Novo Projeto
1. Clique em **"New Project"**
2. Nome: `meu-personal`
3. Selecione **"Docker Compose"** como tipo

#### 2.3. Conectar Repositório Git
1. Em **Source**, selecione seu provedor Git
2. Autorize o acesso ao repositório
3. Selecione o repositório `meu-personal`
4. Branch: `main` (ou sua branch de produção)

---

### Etapa 3: Configurar Variáveis de Ambiente

No EasyPanel, vá em **Environment Variables** e adicione:

#### Variáveis Essenciais

```env
# Node.js
NODE_ENV=production

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres

# Auth
JWT_SECRET=[gerado-com-openssl]
JWT_EXPIRES_IN=7d

# URLs (ajuste para seu domínio)
FRONTEND_URL=https://meupersonal.com.br
NEXT_PUBLIC_API_URL=https://api.meupersonal.com.br
APP_BASE_URL=https://api.meupersonal.com.br

# Supabase
SUPABASE_URL=https://[projeto].supabase.co
SUPABASE_ANON_KEY=[sua-chave-anonima]
SUPABASE_SERVICE_KEY=[sua-chave-servico]

# Redis
REDIS_URL=redis://redis:6379

# Email (Resend)
RESEND_API_KEY=re_[sua-api-key]
RESEND_FROM_EMAIL=contato@meupersonal.com.br

# Pagamentos (Asaas)
ASAAS_API_KEY=[sua-api-key]
ASAAS_API_URL=https://www.asaas.com/api/v3
ASAAS_ENV=production
ASAAS_WEBHOOK_SECRET=[seu-webhook-secret]

# MVP
DEFAULT_CREDITS_PER_CLASS=1

# API
PORT=3001
```

---

### Etapa 4: Configurar Docker Compose

O EasyPanel usará o arquivo `docker-compose.yml` existente. Certifique-se de que está correto:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: meu-personal-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    networks:
      - meu-personal-network
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: meu-personal-api
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ASAAS_API_KEY=${ASAAS_API_KEY}
      - ASAAS_API_URL=${ASAAS_API_URL}
      - ASAAS_ENV=${ASAAS_ENV}
      - ASAAS_WEBHOOK_SECRET=${ASAAS_WEBHOOK_SECRET}
    depends_on:
      - redis
    volumes:
      - ./apps/api/uploads:/app/uploads
    restart: unless-stopped
    networks:
      - meu-personal-network

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
        - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
        - FRONTEND_URL=${FRONTEND_URL}
    container_name: meu-personal-web
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - meu-personal-network

volumes:
  redis_data:

networks:
  meu-personal-network:
    driver: bridge
```

---

### Etapa 5: Configurar Domínios

#### 5.1. No Provedor de DNS
Configure os registros DNS:

```
# Frontend
A     meupersonal.com.br          -> IP_DA_VPS
A     www.meupersonal.com.br      -> IP_DA_VPS

# API
A     api.meupersonal.com.br      -> IP_DA_VPS
```

#### 5.2. No EasyPanel
1. Vá em **Domains**
2. Adicione os domínios:
   - `meupersonal.com.br` → porta 3000 (web)
   - `api.meupersonal.com.br` → porta 3001 (api)
3. Habilite **SSL/TLS** (Let's Encrypt automático)

---

### Etapa 6: Deploy

#### 6.1. Iniciar Build
1. No EasyPanel, clique em **Deploy**
2. Aguarde o build dos containers (pode levar 5-10 minutos)
3. Monitore os logs em tempo real

#### 6.2. Verificar Status
Após o deploy, verifique:

```bash
# Health check da API
curl https://api.meupersonal.com.br/health

# Frontend
curl https://meupersonal.com.br
```

---

### Etapa 7: Configurações Pós-Deploy

#### 7.1. Configurar Webhooks do Asaas
1. Acesse o painel do Asaas
2. Vá em **Integrações > Webhooks**
3. Configure a URL: `https://api.meupersonal.com.br/api/webhooks/asaas`
4. Eventos a monitorar:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`

#### 7.2. Testar Funcionalidades
- [ ] Login/Registro de usuários
- [ ] Compra de pacotes de créditos
- [ ] Agendamento de aulas
- [ ] Check-in via QR Code
- [ ] Envio de emails
- [ ] Processamento de pagamentos

#### 7.3. Configurar Backups
No EasyPanel:
1. Vá em **Backups**
2. Configure backup automático:
   - Volume `redis_data`: diário
   - Volume `uploads`: diário
3. Backup do Supabase é gerenciado pelo próprio Supabase

---

## 🔧 Manutenção e Troubleshooting

### Visualizar Logs

```bash
# Logs da API
docker logs meu-personal-api -f

# Logs do Frontend
docker logs meu-personal-web -f

# Logs do Redis
docker logs meu-personal-redis -f
```

### Reiniciar Serviços

No EasyPanel:
1. Vá em **Services**
2. Selecione o serviço
3. Clique em **Restart**

### Atualizar Código

1. Faça commit e push das alterações
2. No EasyPanel, clique em **Deploy**
3. O sistema fará rebuild automático

### Problemas Comuns

#### Build Falha
- Verifique os logs de build
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o Dockerfile está correto

#### Containers Não Iniciam
- Verifique os logs do container
- Confirme conexão com Supabase
- Verifique se o Redis está rodando

#### Erro 502 Bad Gateway
- Verifique se a API está rodando: `docker ps`
- Confirme que as portas estão corretas
- Verifique os logs da API

#### Emails Não Enviam
- Confirme que `RESEND_API_KEY` está correta
- Verifique se o domínio está verificado no Resend
- Consulte logs da API para erros

---

## 📊 Monitoramento

### Métricas Importantes

1. **CPU e Memória**: Monitore via EasyPanel Dashboard
2. **Logs de Erro**: Configure alertas para erros críticos
3. **Uptime**: Use serviços como UptimeRobot
4. **Performance**: Configure APM (ex: New Relic, DataDog)

### Alertas Recomendados

- CPU > 80% por 5 minutos
- Memória > 90%
- Disco > 85%
- Container reiniciando frequentemente
- Erros 5xx > 10/minuto

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] Todas as variáveis sensíveis estão em variáveis de ambiente
- [ ] SSL/TLS habilitado em todos os domínios
- [ ] Firewall configurado (apenas portas 80, 443, 22)
- [ ] Chaves SSH configuradas (sem senha)
- [ ] Backups automáticos habilitados
- [ ] Logs de auditoria habilitados
- [ ] Rate limiting configurado na API
- [ ] CORS configurado corretamente
- [ ] Helmet.js habilitado
- [ ] Dependências atualizadas

---

## 📝 Comandos Úteis

### Acessar Container

```bash
# API
docker exec -it meu-personal-api sh

# Web
docker exec -it meu-personal-web sh

# Redis
docker exec -it meu-personal-redis redis-cli
```

### Limpar Cache do Redis

```bash
docker exec -it meu-personal-redis redis-cli FLUSHALL
```

### Ver Uso de Recursos

```bash
docker stats
```

### Backup Manual

```bash
# Backup do volume Redis
docker run --rm -v meu-personal_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz /data

# Backup de uploads
tar czf uploads-backup-$(date +%Y%m%d).tar.gz apps/api/uploads/
```

---

## 🚨 Rollback

Se algo der errado após um deploy:

1. No EasyPanel, vá em **Deployments**
2. Selecione o deployment anterior
3. Clique em **Rollback**
4. Confirme a operação

Ou via Git:

```bash
git revert HEAD
git push origin main
# Deploy automático será acionado
```

---

## 📞 Suporte

- **Documentação EasyPanel**: https://easypanel.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Express Docs**: https://expressjs.com

---

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] Todos os serviços estão rodando (verde no EasyPanel)
- [ ] SSL/TLS configurado e funcionando
- [ ] Domínios apontando corretamente
- [ ] Variáveis de ambiente configuradas
- [ ] Webhooks do Asaas configurados
- [ ] Emails sendo enviados corretamente
- [ ] Pagamentos funcionando (teste em sandbox)
- [ ] Backups automáticos habilitados
- [ ] Monitoramento configurado
- [ ] Testes de carga realizados
- [ ] Documentação atualizada
- [ ] Equipe treinada

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0.0
