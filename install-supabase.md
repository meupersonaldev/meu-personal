# Comandos para instalar Supabase

## 1. Instalar dependências Supabase
```bash
cd apps/web
npm install @supabase/supabase-js
```

## 2. Adicionar variáveis de ambiente
Criar arquivo `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

## 3. Executar schema no Supabase
- Copiar conteúdo do arquivo `supabase-schema.sql`
- Colar no SQL Editor do Supabase Dashboard
- Executar

## 4. Configurar Auth no Supabase Dashboard
- Ir em Authentication > Settings
- Configurar Site URL: http://localhost:3000
- Adicionar Redirect URLs se necessário

## 5. Substituir auth store
- Renomear `auth-store.ts` para `auth-store-old.ts`
- Renomear `auth-store-supabase.ts` para `auth-store.ts`

## 6. Remover backend Express (opcional)
- Pode manter para futuras funcionalidades
- Ou remover pasta `apps/api` completamente
