# ⚙️ CONFIGURAÇÃO DO SUPABASE PARA PRODUÇÃO

## 🔐 Authentication Settings

Para permitir a criação de usuários sem verificação de email (necessário para o sistema de franquias):

### 1. Acesse o Dashboard do Supabase
- URL: https://supabase.com/dashboard

### 2. Vá em Authentication > Providers
- Clique em **Email**

### 3. Desabilite a Confirmação de Email
- **Desmarque**: ✅ `Enable email confirmations`
- **Ou configure**: `Confirm email` → **OFF**

### 4. Salve as Configurações
- Clique em **Save**

---

## 🎯 Por que isso é necessário?

Quando a franqueadora cria uma nova franquia, o sistema:
1. Cria automaticamente um usuário admin via `supabase.auth.signUp()`
2. Este usuário precisa fazer login imediatamente
3. **Sem verificação de email**, o usuário pode logar instantaneamente

Se a verificação estiver **ativada**:
- ❌ Supabase exige que o usuário clique no link de confirmação enviado por email
- ❌ O admin da franquia não consegue logar até confirmar o email
- ❌ Emails de teste (`@teste.com`, `@example.com`) são bloqueados

---

## 🔧 Configurações Alternativas

### Opção 1: Desabilitar Confirmação (Recomendado para MVP)
```
Authentication > Providers > Email
├─ Enable email confirmations: OFF
└─ Enable autoconfirm: ON (opcional)
```

### Opção 2: Autoconfirm (Melhor para Produção)
```
Authentication > Providers > Email
├─ Enable email confirmations: ON
└─ Enable autoconfirm: ON
```
- Usuários são automaticamente confirmados sem precisar clicar no link

### Opção 3: Usar Admin API (Futuro)
- Criar usuários usando Service Role Key
- Bypass total do sistema de confirmação
- Requer backend seguro com Service Role Key

---

## ✅ Status Após Configuração

Após desabilitar a confirmação de email:
- ✅ Franqueadora pode criar franquias com login instantâneo
- ✅ Admin da franquia recebe email/senha e pode logar imediatamente
- ✅ Sem bloqueio de domínios de email
- ✅ Sistema pronto para uso

---

## 🚨 Segurança

⚠️ **IMPORTANTE**: Em produção, considere:
1. Habilitar confirmação de email novamente
2. Usar domínios corporativos verificados
3. Implementar MFA (Multi-Factor Authentication)
4. Usar Service Role Key no backend para criar usuários

---

## 📞 Suporte

Se o erro persistir:
1. Verifique se está logado no projeto correto do Supabase
2. Limpe o cache do navegador
3. Aguarde 2-3 minutos após salvar as configurações
4. Tente criar a franquia novamente