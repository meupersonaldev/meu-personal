# Configuração do Redis no Easypanel

## Opção 1: Usar Redis do Easypanel (Recomendado)

O Easypanel tem suporte nativo para Redis. Siga estes passos:

### 1. Adicionar serviço Redis no Easypanel

1. No painel do Easypanel, vá para seu projeto
2. Clique em **"Add Service"** ou **"Adicionar Serviço"**
3. Selecione **"Redis"** da lista de serviços disponíveis
4. Configure:
   - **Name**: `redis` (ou `meu-personal-redis`)
   - **Version**: Use a versão mais recente (7.x ou 8.x)
   - **Memory Limit**: 256MB ou 512MB (suficiente para cache)
   - **Port**: Deixe o padrão (6379) ou configure se necessário

### 2. Obter a URL de conexão

Após criar o serviço Redis, o Easypanel fornecerá:
- **Host**: Geralmente `redis` (nome do serviço) ou um host específico
- **Port**: 6379 (padrão)
- **Password**: Pode ser gerado automaticamente ou você pode definir

### 3. Configurar variável de ambiente

No serviço da sua API (backend), adicione a variável de ambiente:

```bash
REDIS_URL=redis://:senha@redis:6379
```

Ou se não tiver senha:
```bash
REDIS_URL=redis://redis:6379
```

**No Easypanel:**
1. Vá para o serviço da sua API
2. Aba **"Environment Variables"** ou **"Variáveis de Ambiente"**
3. Adicione:
   - **Key**: `REDIS_URL`
   - **Value**: `redis://redis:6379` (ajuste conforme sua configuração)

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

