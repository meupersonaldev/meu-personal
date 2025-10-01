# Troubleshooting - Erro no Endpoint Financeiro

## 🔴 Erro Atual

```
Failed to fetch financial data
GET http://localhost:3001/api/financial/summary?academy_id=xxx&period=30d
```

## 🔍 Possíveis Causas

### 1. Servidor da API não está rodando ⚠️

**Verificar:**
```bash
# No terminal, vá para a pasta da API
cd apps/api

# Verifique se está rodando
# Deve mostrar algo como: "Server running on port 3001"
```

**Solução:**
```bash
# Iniciar o servidor
cd apps/api
npm run dev
```

### 2. Porta 3001 ocupada ⚠️

**Verificar:**
```bash
# Windows
netstat -ano | findstr :3001

# Se mostrar algo, a porta está ocupada
```

**Solução:**
```bash
# Matar processo na porta 3001 (Windows)
# Substitua <PID> pelo número mostrado no comando anterior
taskkill /PID <PID> /F

# Ou mudar a porta no .env
PORT=3002
```

### 3. Variáveis de ambiente não configuradas ⚠️

**Verificar arquivo:** `apps/api/.env`

**Deve conter:**
```env
SUPABASE_URL=https://fstbhakmmznfdeluyexc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
PORT=3001
```

**Solução:**
```bash
# Copiar .env.example se não existir
cd apps/api
cp .env.example .env

# Editar e adicionar as chaves corretas
```

### 4. Rota não compilada (TypeScript) ⚠️

**Verificar:**
```bash
cd apps/api
npm run build
```

**Se houver erros de compilação, corrigir antes**

### 5. CORS bloqueando requisição ⚠️

**Verificar no console do navegador:**
- Se aparecer erro de CORS, o servidor precisa permitir origem

**Solução:** Já está configurado no `server.ts` com `cors()`

## ✅ Checklist de Verificação

Execute na ordem:

### Passo 1: Verificar se API está rodando
```bash
cd apps/api
npm run dev
```

**Deve mostrar:**
```
Server running on port 3001
Connected to Supabase
```

### Passo 2: Testar endpoint manualmente
```bash
# No navegador ou Postman
GET http://localhost:3001/api/financial/summary?academy_id=51716624-427f-42e9-8e85-12f9a3af8822&period=30d
```

**Deve retornar JSON com:**
```json
{
  "totalRevenue": 0,
  "activeSubscriptions": 0,
  "totalStudents": 0,
  "averageTicket": 0,
  "completedClasses": 0,
  "monthlyGrowth": 0,
  "revenueByPlan": [],
  "transactions": []
}
```

### Passo 3: Verificar logs no console
Abra o DevTools (F12) e veja os logs:
- `Fetching financial data from: ...` ← URL sendo chamada
- `Response status: ...` ← Status HTTP
- `Error response: ...` ← Mensagem de erro

### Passo 4: Verificar academy_id
```javascript
// No console do navegador
console.log(franquiaUser?.academyId)
// Deve mostrar um UUID válido
```

## 🛠️ Soluções Rápidas

### Solução 1: Reiniciar tudo
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Web
cd apps/web
npm run dev
```

### Solução 2: Limpar cache e reinstalar
```bash
# Parar tudo (Ctrl+C)

# Limpar node_modules
cd apps/api
rm -rf node_modules
npm install

cd ../web
rm -rf node_modules
npm install

# Reiniciar
cd ../api
npm run dev

# Novo terminal
cd apps/web
npm run dev
```

### Solução 3: Verificar .env
```bash
# apps/api/.env
SUPABASE_URL=https://fstbhakmmznfdeluyexc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
NODE_ENV=development

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://fstbhakmmznfdeluyexc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 Logs Esperados

### API (Terminal)
```
Server running on port 3001
GET /api/financial/summary?academy_id=xxx&period=30d
Fetching financial data for academy: xxx
Response sent: 200 OK
```

### Web (Console do Navegador)
```
Fetching financial data from: http://localhost:3001/api/financial/summary?academy_id=xxx&period=30d
Response status: 200
Financial data received: { totalRevenue: 0, ... }
```

## 🚨 Erros Comuns

### Erro 1: "ECONNREFUSED"
**Causa:** API não está rodando
**Solução:** `cd apps/api && npm run dev`

### Erro 2: "academy_id é obrigatório"
**Causa:** franquiaUser não tem academyId
**Solução:** Fazer login novamente

### Erro 3: "Supabase error"
**Causa:** Credenciais inválidas no .env
**Solução:** Verificar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

### Erro 4: "404 Not Found"
**Causa:** Rota não registrada
**Solução:** Verificar `server.ts` linha 65: `app.use('/api/financial', financialRoutes)`

### Erro 5: "500 Internal Server Error"
**Causa:** Erro no código do endpoint
**Solução:** Ver logs do terminal da API

## ✅ Teste Final

Depois de corrigir, teste:

1. Abra http://localhost:3001/api/financial/summary?academy_id=51716624-427f-42e9-8e85-12f9a3af8822&period=30d
2. Deve retornar JSON válido
3. Recarregue a página /franquia/dashboard/finance
4. Deve carregar os dados

---

**Criado em**: 2025-10-01
**Status**: Aguardando correção
