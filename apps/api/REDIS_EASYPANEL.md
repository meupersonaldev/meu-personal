# Configuração do Redis no Easypanel

## Passo a Passo Completo

### 1. Criar o serviço Redis no Easypanel

1. No painel do Easypanel, vá para seu projeto
2. Clique em **"Criar Redis"** ou selecione **"Redis"** da lista de serviços
3. No modal que abrir, preencha:
   - **Nome do Serviço**: `redis` (ou `meu-personal-redis`)
   - **Senha**: Deixe vazio para gerar automaticamente OU defina uma senha personalizada
   - **Imagem Docker**: `redis:7` (já vem preenchido, pode deixar assim)
4. Clique em **"Criar"**

### 2. Obter informações de conexão

Após criar o Redis, você precisa descobrir:
- **Nome do serviço**: O nome que você definiu (ex: `redis`)
- **Senha**: Se você deixou vazio, o Easypanel gerou uma senha aleatória. Você pode ver ela nas variáveis de ambiente do serviço Redis ou nos logs.

**Como ver a senha gerada:**
1. Vá para o serviço Redis que você criou
2. Aba **"Environment Variables"** ou **"Variáveis de Ambiente"**
3. Procure por uma variável como `REDIS_PASSWORD` ou similar
4. Ou verifique os logs do Redis

### 3. Configurar variável de ambiente na API

Agora você precisa configurar a `REDIS_URL` no serviço da sua API:

1. Vá para o serviço da sua **API** (não o Redis)
2. Aba **"Environment Variables"** ou **"Variáveis de Ambiente"**
3. Clique em **"Add Variable"** ou **"Adicionar Variável"**
4. Adicione:
   - **Key**: `REDIS_URL`
   - **Value**: `redis://default:f37f4e0986b5e18215f5@projeto_meu-personal-redis:6379`
   
   **Formato geral**: `redis://[username]:[password]@[host]:[port]`
   
   **No seu caso específico**:
   - Username: `default`
   - Password: `f37f4e0986b5e18215f5`
   - Host: `projeto_meu-personal-redis`
   - Port: `6379`
   - URL completa: `redis://default:f37f4e0986b5e18215f5@projeto_meu-personal-redis:6379`

### 4. Reiniciar a API

Após adicionar a variável `REDIS_URL`, reinicie o serviço da API para aplicar as mudanças.

### 5. Verificar se funcionou

Verifique os logs da API. Você deve ver algo como:
```
✅ Redis conectado com sucesso
```

Ou se não conectou:
```
⚠️ Redis connection error, falling back to memory cache
```

**Nota**: Se não conectar, o sistema continua funcionando com cache em memória (fallback automático).

### 4. Reiniciar o serviço da API

Após adicionar a variável, reinicie o serviço da API para aplicar as mudanças.

---

## Opção 2: Redis como Container Docker (Alternativa)

Se o Easypanel não tiver Redis nativo, você pode adicionar como container Docker:

### 1. Adicionar serviço Docker

1. No Easypanel, adicione um novo serviço
2. Selecione **"Docker"** ou **"Custom"**
3. Use a imagem oficial do Redis:

```yaml
Image: redis:7-alpine
Port: 6379
```

### 2. Configurar variáveis (opcional)

Se quiser adicionar senha:
```yaml
Environment Variables:
  - REDIS_PASSWORD=suasenhaaqui
```

E use no comando:
```yaml
Command: redis-server --requirepass ${REDIS_PASSWORD}
```

### 3. Configurar REDIS_URL na API

```bash
REDIS_URL=redis://:suasenhaaqui@nome-do-servico-redis:6379
```

---

## Verificar se está funcionando

Após configurar, verifique os logs da API. Você deve ver:

```
✅ Redis conectado com sucesso
```

Ou se não estiver conectado:

```
⚠️ Redis connection error, falling back to memory cache
```

**Nota**: O sistema funciona perfeitamente sem Redis usando cache em memória. Redis é recomendado para:
- Cache distribuído (múltiplas instâncias da API)
- Persistência do cache
- Melhor performance em produção

---

## Troubleshooting

### Redis não conecta

1. Verifique se o serviço Redis está rodando no Easypanel
2. Verifique se a variável `REDIS_URL` está correta
3. Verifique se o nome do serviço Redis está correto na URL
4. Verifique os logs do Redis no Easypanel

### Cache não funciona

O sistema tem fallback automático para cache em memória. Se Redis não estiver disponível, o cache ainda funcionará, mas será local a cada instância da API.

---

## Formato da REDIS_URL

```
redis://[senha]@[host]:[porta]
```

Exemplos:
- `redis://redis:6379` (sem senha)
- `redis://:minhasenha@redis:6379` (com senha)
- `redis://:senha@meu-redis:6379/0` (com database number)

