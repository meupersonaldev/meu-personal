# Plano de Implementação: Sistema de Cadastro de Alunos - Meu Personal

> **Data:** 06 de Dezembro de 2025  
> **Status:** Aguardando aprovação  

Este documento descreve as mudanças necessárias para implementar os dois cenários de cadastro de alunos: **(1) auto-cadastro** e **(2) cadastro pelo personal**.

---

## Decisões Pendentes

> ⚠️ **Itens que precisam de confirmação antes da implementação:**

1. **CPF obrigatório no auto-cadastro?** Atualmente é obrigatório. Manter?
2. **Primeira aula gratuita única por CPF?** Se o mesmo CPF aparecer em duas contas, só uma ganha a aula grátis?
3. **Senha automática do personal:** Sugiro 8 caracteres alfanuméricos. OK?
4. **Email de confirmação:** Deve ter link de ativação ou é apenas informativo?
5. **Seleção de personal por região:** Como funciona a "região"? Por cidade? Bairro? Raio de distância?

---

## Cenários do Documento Original

### Cenário 1 — Quando o aluno se cadastra

**História do usuário:**
- O aluno entra no site do Meu Personal, preenche seus dados e cria sua conta
- Recebe a informação de que tem direito à primeira aula gratuita, validada pelo CPF
- Escolhe a data e horário desejados
- Seleciona o personal da sua preferência
- Visualiza todos os personais disponíveis na região que ele escolheu
- Confirma o agendamento da aula inicial

**Critérios de aceite:**
1. O aluno deve receber um e-mail automático logo após o cadastro, confirmando sua conta
2. O aluno deve ser avisado claramente que sua primeira aula é gratuita antes de agendar

### Cenário 2 — Quando o personal cadastra o aluno

**História do usuário:**
- O personal acessa o painel interno da plataforma e cadastra um aluno informando apenas dados básicos, sem CPF
- O personal já consegue visualizar esse aluno na sua carteira
- Pode imediatamente agendar uma aula para ele

**Critérios de aceite:**
1. Se o aluno não tiver conta, ele recebe um e-mail informando que foi cadastrado, junto com uma senha gerada automaticamente
2. Para alunos novos cadastrados pelo personal:
   - A primeira aula é gratuita
   - O personal decide se deseja ou não cobrar o aluno por essa aula
   - A franquia não cobra essa primeira aula do personal
   - Qualquer cobrança entre personal e aluno ocorre por fora
3. Todos os alunos que o personal atender passam automaticamente para sua carteira
4. O personal não tem acesso à base completa de alunos — apenas aos da sua carteira
5. Todo aluno cadastrado pelo personal passa a ter uma conta ativa no Meu Personal
6. No painel do aluno, todas as aulas aparecem no histórico (marcadas por ele ou pelo personal)
7. Quando o personal agenda uma aula para o aluno:
   - Não há consumo de créditos do aluno
   - A aula não impede o aluno de usar o espaço normalmente
   - A responsabilidade de pagamento é do personal

---

## Proposed Changes

### 1. Banco de Dados (Supabase/PostgreSQL)

**NOVA MIGRATION:** `migrations/20241206_student_registration_fields.sql`

```sql
-- Campos para controle de primeira aula gratuita
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_class_free_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_class_free_claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registered_by_teacher_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS auto_generated_password BOOLEAN DEFAULT FALSE;

-- Índice para busca por CPF (otimização)
CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf) WHERE cpf IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.users.first_class_free_claimed IS 'Se o aluno já usou sua primeira aula gratuita';
COMMENT ON COLUMN public.users.registered_by_teacher_id IS 'ID do personal que cadastrou este aluno (NULL se auto-cadastro)';
COMMENT ON COLUMN public.users.auto_generated_password IS 'Se a senha foi gerada automaticamente (precisa trocar)';
```

---

### 2. Backend API

#### MODIFICAR: `routes/auth.ts`

**Mudanças no registro de alunos:**

```diff
// Após criar usuário com sucesso, enviar email de confirmação
+ // Enviar email de boas-vindas para aluno
+ if (createdUser.role === 'STUDENT') {
+   try {
+     await emailService.sendEmail({
+       to: createdUser.email,
+       subject: 'Bem-vindo ao Meu Personal! 🎉',
+       html: `
+         <h1>Olá ${createdUser.name}!</h1>
+         <p>Sua conta foi criada com sucesso.</p>
+         <p><strong>🎁 Você tem direito à sua primeira aula gratuita!</strong></p>
+         <p>Acesse a plataforma e agende agora mesmo.</p>
+         <a href="${process.env.FRONTEND_URL}/aluno/agendar">Agendar primeira aula</a>
+       `,
+       text: `Olá ${createdUser.name}! Sua conta foi criada. Você tem direito à primeira aula gratuita!`
+     })
+   } catch (e) {
+     console.warn('Falha ao enviar email de boas-vindas:', e)
+   }
+ }
```

---

#### MODIFICAR: `routes/teacher-students.ts`

**Permitir cadastro SEM CPF + gerar senha automática:**

```diff
// POST /api/teachers/:teacherId/students - Criar aluno
router.post('/:teacherId/students', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params
-   const { name, email, phone, notes, academy_id, hourly_rate } = req.body
+   const { name, email, phone, notes, academy_id, hourly_rate, cpf } = req.body

+   // Gerar senha aleatória para novos usuários
+   const generatePassword = () => {
+     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
+     return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
+   }

    if (existingUser) {
      userId = existingUser.id
    } else {
+     const autoPassword = generatePassword()
+     const passwordHash = await bcrypt.hash(autoPassword, 10)
+     
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          name,
          phone,
+         cpf: cpf?.replace(/\D/g, '') || null, // CPF opcional
          role: 'STUDENT',
          credits: 0,
+         password_hash: passwordHash,
+         registered_by_teacher_id: teacherId,
+         auto_generated_password: true,
        })
        .select('id')
        .single()

+     // Enviar email com credenciais
+     await emailService.sendEmail({
+       to: email,
+       subject: 'Você foi cadastrado no Meu Personal!',
+       html: `
+         <h1>Olá ${name}!</h1>
+         <p>O personal cadastrou você na plataforma Meu Personal.</p>
+         <p><strong>Seus dados de acesso:</strong></p>
+         <ul>
+           <li>Email: ${email}</li>
+           <li>Senha temporária: <code>${autoPassword}</code></li>
+         </ul>
+         <a href="${process.env.FRONTEND_URL}/aluno/login">Acessar plataforma</a>
+       `,
+       text: `Olá ${name}! Você foi cadastrado. Email: ${email}, Senha: ${autoPassword}`
+     })

      userId = newUser.id
    }
```

---

#### NOVA ROTA: `routes/first-class.ts`

**Validar/consumir primeira aula gratuita:**

```typescript
import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /api/first-class/check - Verificar se usuário tem primeira aula gratuita
router.get('/check', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId

    const { data: user, error } = await supabase
      .from('users')
      .select('id, cpf, first_class_free_claimed, first_class_free_claimed_at')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Se já usou
    if (user.first_class_free_claimed) {
      return res.json({ 
        eligible: false, 
        reason: 'already_claimed',
        claimed_at: user.first_class_free_claimed_at 
      })
    }

    // Verificar se CPF já foi usado por outro usuário
    if (user.cpf) {
      const { data: others } = await supabase
        .from('users')
        .select('id')
        .eq('cpf', user.cpf)
        .eq('first_class_free_claimed', true)
        .neq('id', userId)
        .limit(1)

      if (others && others.length > 0) {
        return res.json({ 
          eligible: false, 
          reason: 'cpf_already_used' 
        })
      }
    }

    res.json({ eligible: true })
  } catch (error) {
    console.error('Erro ao verificar primeira aula:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/first-class/claim - Usar primeira aula gratuita
router.post('/claim', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId

    const { error } = await supabase
      .from('users')
      .update({
        first_class_free_claimed: true,
        first_class_free_claimed_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    res.json({ success: true, message: 'Primeira aula gratuita consumida' })
  } catch (error) {
    console.error('Erro ao usar primeira aula:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
```

---

#### MODIFICAR: `routes/bookings.ts`

**Diferenciar aulas agendadas pelo personal (não consome créditos):**

```diff
// POST /api/bookings - Criar agendamento
+ // Se quem está agendando é o personal (para o aluno), não consome créditos
+ const isTeacherBookingForStudent = 
+   req.user?.role === 'TEACHER' && 
+   req.body.student_id !== req.user?.userId

+ if (isTeacherBookingForStudent) {
+   newBooking.booked_by_teacher = true
+   newBooking.credits_cost = 0
+ }
```

---

### 3. Frontend Web

#### MODIFICAR: `components/modals/student-modal.tsx`

**Tornar CPF opcional no cadastro pelo personal:**

```diff
<Input
  id="cpf"
  type="text"
  value={studentCpf}
  onChange={(e) => setStudentCpf(e.target.value)}
  placeholder="000.000.000-00"
- required
/>
+ <p className="text-xs text-gray-500">
+   CPF opcional. Se não informado, aluno receberá email com senha de acesso.
+ </p>
```

---

#### NOVA PÁGINA: `app/aluno/agendar/primeira-aula/page.tsx`

**Fluxo dedicado para primeira aula gratuita:**

1. Verificar elegibilidade via `/api/first-class/check`
2. Seletor de região (cidade/bairro)
3. Lista de personals disponíveis na região
4. Seletor de data/horário
5. Confirmação do agendamento

---

## Checklist de Verificação

### Cenário 1 - Auto-cadastro:
- [ ] Criar conta como aluno no site
- [ ] Verificar email de confirmação recebido
- [ ] Confirmar aviso de "primeira aula gratuita"
- [ ] Testar fluxo de agendamento

### Cenário 2 - Personal cadastra:
- [ ] Logar como personal
- [ ] Cadastrar aluno SEM CPF
- [ ] Verificar se aluno recebeu email com senha
- [ ] Logar como o novo aluno
- [ ] Verificar histórico de aulas unificado

### Regras de negócio:
- [ ] Confirmar que personal só vê seus próprios alunos
- [ ] Confirmar que aula agendada pelo personal não consome créditos
- [ ] Confirmar que primeira aula é única por CPF

---

## Arquivos a Criar/Modificar (Resumo)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/20241206_student_registration_fields.sql` | **CRIAR** | Campos de controle de primeira aula |
| `routes/auth.ts` | MODIFICAR | Email de boas-vindas |
| `routes/teacher-students.ts` | MODIFICAR | CPF opcional + senha auto |
| `routes/first-class.ts` | **CRIAR** | Validar/consumir primeira aula |
| `routes/bookings.ts` | MODIFICAR | Diferenciar booking do personal |
| `services/email.service.ts` | MODIFICAR | Novos templates de email |
| `components/auth/register-template.tsx` | MODIFICAR | Aviso primeira aula |
| `components/modals/student-modal.tsx` | MODIFICAR | CPF opcional |
| `app/aluno/agendar/primeira-aula/page.tsx` | **CRIAR** | Fluxo primeira aula |
