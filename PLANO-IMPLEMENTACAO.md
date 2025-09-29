# Plano de Implementação Detalhado - MVP Meu Personal

## 🎯 Objetivo
Completar as funcionalidades essenciais do MVP para ter um produto funcional e testável em 7-9 dias.

---

## 📅 FASE 1: FUNCIONALIDADES CRÍTICAS (Dias 1-4)

### DIA 1: Sistema de Busca e Perfil de Professores

#### 1.1 Backend - Melhorar API de Professores
**Arquivo:** `apps/api/src/routes/teachers.ts`

```typescript
// Adicionar endpoints:
GET /api/teachers - Listar todos com filtros
GET /api/teachers/:id - Detalhes do professor
PUT /api/teachers/:id - Atualizar perfil (auth required)
GET /api/teachers/:id/availability - Ver disponibilidade
PUT /api/teachers/:id/availability - Atualizar disponibilidade
```

**Filtros necessários:**
- `specialty` - Filtrar por especialidade
- `min_rate` / `max_rate` - Filtrar por preço
- `min_rating` - Filtrar por avaliação mínima
- `available` - Apenas disponíveis

#### 1.2 Frontend - Página de Busca
**Arquivo:** `apps/web/app/aluno/buscar/page.tsx` (criar)

**Componentes a criar:**
- `TeacherCard` - Card com foto, nome, especialidades, preço, avaliação
- `TeacherFilters` - Filtros de busca
- `TeacherList` - Lista de professores

**Features:**
- Grid responsivo de professores
- Filtros por especialidade e preço
- Ordenação (avaliação, preço)
- Loading states
- Empty states

#### 1.3 Frontend - Perfil Detalhado do Professor
**Arquivo:** `apps/web/app/professor/[id]/page.tsx` (criar)

**Seções:**
- Header com foto, nome, especialidades
- Bio e descrição
- Avaliações e comentários
- Disponibilidade (calendário)
- Botão "Agendar Aula"

#### 1.4 Frontend - Edição de Perfil (Professor)
**Arquivo:** `apps/web/app/professor/perfil/page.tsx`

**Campos editáveis:**
- Foto de perfil (upload)
- Nome
- Bio
- Especialidades (multi-select)
- Valor por hora
- Telefone

#### 1.5 Upload de Imagens
**Configurar Supabase Storage:**
- Bucket: `avatars`
- Políticas: usuário pode fazer upload da própria foto
- Resize automático (opcional)

**Criar helper:**
`apps/web/lib/upload.ts`

---

### DIA 2: Sistema de Agendamento Completo

#### 2.1 Backend - API de Agendamentos
**Arquivo:** `apps/api/src/routes/bookings.ts`

**Endpoints a implementar:**
```typescript
POST /api/bookings - Criar agendamento
  - Validar créditos do aluno
  - Validar disponibilidade do professor
  - Criar booking com status PENDING
  - Debitar créditos temporariamente

PUT /api/bookings/:id/confirm - Professor confirma
  - Atualizar status para CONFIRMED
  - Enviar notificação ao aluno

PUT /api/bookings/:id/reject - Professor rejeita
  - Atualizar status para CANCELLED
  - Reembolsar créditos ao aluno
  - Enviar notificação

DELETE /api/bookings/:id - Cancelar agendamento
  - Validar quem pode cancelar
  - Reembolsar créditos se aplicável
  - Atualizar status

GET /api/bookings/my - Listar meus agendamentos
  - Filtrar por student_id ou teacher_id
  - Filtrar por status
  - Ordenar por data
```

#### 2.2 Frontend - Fluxo de Agendamento (Aluno)
**Arquivo:** `apps/web/components/booking/booking-modal.tsx` (criar)

**Steps:**
1. Selecionar data e horário
2. Confirmar detalhes (professor, valor em créditos)
3. Validar créditos suficientes
4. Criar agendamento
5. Mostrar confirmação

**Componentes:**
- `DateTimePicker` - Seletor de data/hora
- `BookingConfirmation` - Resumo do agendamento
- `CreditCheck` - Validação de créditos

#### 2.3 Frontend - Página Minhas Aulas (Aluno)
**Arquivo:** `apps/web/app/aluno/aulas/page.tsx`

**Seções:**
- Próximas aulas (CONFIRMED)
- Aguardando confirmação (PENDING)
- Histórico (COMPLETED)
- Canceladas (CANCELLED)

**Ações:**
- Ver detalhes da aula
- Cancelar aula (se permitido)
- Avaliar aula (se COMPLETED)

#### 2.4 Frontend - Agenda do Professor
**Arquivo:** `apps/web/app/professor/agenda/page.tsx`

**Melhorias:**
- Calendário visual (usar lib como react-big-calendar)
- Lista de solicitações pendentes
- Botões confirmar/rejeitar
- Ver detalhes do aluno

#### 2.5 Validações e Regras de Negócio
- Aluno não pode agendar se não tiver créditos
- Não pode agendar no mesmo horário
- Professor não pode ter 2 aulas no mesmo horário
- Cancelamento até 2h antes (configurável)
- Reembolso de créditos em cancelamentos

---

### DIA 3: Sistema de Créditos

#### 3.1 Backend - API de Créditos
**Arquivo:** `apps/api/src/routes/credits.ts` (criar)

**Endpoints:**
```typescript
GET /api/credits/packages - Listar pacotes disponíveis
POST /api/credits/purchase - Comprar créditos
  - Criar transação
  - Adicionar créditos ao usuário
  - Retornar link de pagamento (mock por enquanto)

GET /api/credits/balance - Ver saldo
GET /api/credits/history - Histórico de transações
```

#### 3.2 Backend - Tabela de Pacotes
**Criar migration ou seed:**
```sql
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  credits INTEGER,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true
);

INSERT INTO credit_packages VALUES
  ('pkg-1', 'Pacote Básico', 5, 50.00, true),
  ('pkg-2', 'Pacote Intermediário', 10, 90.00, true),
  ('pkg-3', 'Pacote Avançado', 20, 160.00, true);
```

#### 3.3 Frontend - Página de Compra de Créditos
**Arquivo:** `apps/web/app/aluno/creditos/page.tsx` (criar)

**Seções:**
- Saldo atual
- Pacotes disponíveis (cards)
- Histórico de compras
- Histórico de uso

**Componentes:**
- `CreditPackageCard` - Card de pacote
- `CreditBalance` - Mostrar saldo
- `TransactionHistory` - Histórico

#### 3.4 Frontend - Carteira do Professor
**Arquivo:** `apps/web/app/professor/carteira/page.tsx`

**Seções:**
- Saldo disponível
- Ganhos do mês
- Histórico de recebimentos
- Gráfico de ganhos (opcional)

#### 3.5 Lógica de Créditos
**Regras:**
- 1 crédito = 1 hora de aula (padrão)
- Créditos debitados ao criar agendamento
- Créditos reembolsados se cancelado/rejeitado
- Créditos transferidos ao professor após aula COMPLETED
- Taxa da plataforma (10%?) descontada

---

### DIA 4: Perfil do Aluno e Ajustes

#### 4.1 Backend - API de Usuários
**Arquivo:** `apps/api/src/routes/users.ts` (criar)

**Endpoints:**
```typescript
GET /api/users/me - Dados do usuário logado
PUT /api/users/me - Atualizar perfil
PUT /api/users/me/avatar - Upload de avatar
GET /api/users/:id/stats - Estatísticas do usuário
```

#### 4.2 Frontend - Perfil do Aluno
**Arquivo:** `apps/web/app/aluno/perfil/page.tsx`

**Seções:**
- Foto de perfil (com upload)
- Dados pessoais (nome, email, telefone)
- Estatísticas (aulas realizadas, créditos usados)
- Histórico de aulas
- Configurações

#### 4.3 Frontend - Componentes Compartilhados
**Criar:**
- `AvatarUpload` - Upload de foto
- `ProfileForm` - Formulário de perfil
- `StatsCard` - Card de estatísticas

#### 4.4 Ajustes e Melhorias
- [ ] Melhorar loading states
- [ ] Adicionar skeleton loaders
- [ ] Melhorar mensagens de erro
- [ ] Adicionar validações de formulário
- [ ] Testar responsividade mobile
- [ ] Corrigir bugs encontrados

---

## 📅 FASE 2: FUNCIONALIDADES IMPORTANTES (Dias 5-7)

### DIA 5: Sistema de Avaliações

#### 5.1 Backend - API de Avaliações
**Arquivo:** `apps/api/src/routes/reviews.ts` (criar)

**Endpoints:**
```typescript
POST /api/reviews - Criar avaliação
  - Validar que aula foi COMPLETED
  - Validar que aluno participou da aula
  - Criar review
  - Atualizar média do professor

GET /api/reviews/teacher/:id - Avaliações do professor
PUT /api/reviews/:id - Editar avaliação (própria)
DELETE /api/reviews/:id - Deletar avaliação (própria)
```

#### 5.2 Frontend - Modal de Avaliação
**Componente:** `apps/web/components/reviews/review-modal.tsx`

**Features:**
- Seletor de estrelas (1-5)
- Campo de comentário
- Validação
- Feedback visual

#### 5.3 Frontend - Exibição de Avaliações
**Componente:** `apps/web/components/reviews/review-list.tsx`

**Features:**
- Lista de avaliações
- Filtros (mais recentes, melhor avaliadas)
- Paginação
- Avatar do aluno
- Data da avaliação

#### 5.4 Cálculo de Média
**Trigger no banco:**
```sql
-- Atualizar média do professor quando review é criada/atualizada
CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teacher_profiles
  SET 
    rating = (SELECT AVG(rating) FROM reviews WHERE teacher_id = NEW.teacher_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE teacher_id = NEW.teacher_id)
  WHERE user_id = NEW.teacher_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### DIA 6: QR Code e Check-in

#### 6.1 Backend - API de Check-in
**Arquivo:** `apps/api/src/routes/bookings.ts`

**Adicionar endpoints:**
```typescript
POST /api/bookings/:id/generate-qr - Gerar QR Code
  - Gerar código único
  - Salvar em booking.check_in_code
  - Retornar código

POST /api/bookings/:id/checkin - Fazer check-in
  - Validar código QR
  - Validar que é o professor da aula
  - Atualizar status para COMPLETED
  - Transferir créditos ao professor
  - Registrar data/hora do check-in
```

#### 6.2 Frontend - Geração de QR Code (Aluno)
**Componente:** `apps/web/components/booking/qr-code-display.tsx`

**Features:**
- Gerar QR Code (usar lib `qrcode` ou `react-qr-code`)
- Mostrar código em tela cheia
- Botão para compartilhar
- Expiração do código

#### 6.3 Frontend - Scanner de QR Code (Professor)
**Componente:** `apps/web/components/booking/qr-scanner.tsx`

**Features:**
- Scanner de QR Code (usar lib `html5-qrcode`)
- Validação do código
- Confirmação de check-in
- Feedback visual

#### 6.4 Fluxo Completo
1. Aluno gera QR Code antes da aula
2. Professor escaneia QR Code
3. Sistema valida e confirma presença
4. Aula marcada como COMPLETED
5. Créditos transferidos ao professor
6. Aluno pode avaliar a aula

---

### DIA 7: Notificações Básicas

#### 7.1 Backend - Sistema de Notificações
**Arquivo:** `apps/api/src/routes/notifications.ts`

**Estrutura:**
```typescript
interface Notification {
  id: string
  user_id: string
  type: 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_REMINDER'
  title: string
  message: string
  data: any // JSON com dados extras
  read: boolean
  created_at: Date
}
```

**Endpoints:**
```typescript
GET /api/notifications - Listar notificações
PUT /api/notifications/:id/read - Marcar como lida
PUT /api/notifications/read-all - Marcar todas como lidas
DELETE /api/notifications/:id - Deletar notificação
```

#### 7.2 Frontend - Componente de Notificações
**Componente:** `apps/web/components/notifications/notification-bell.tsx`

**Features:**
- Ícone de sino com badge
- Dropdown com lista de notificações
- Marcar como lida
- Link para ação relacionada

#### 7.3 Triggers de Notificações
**Criar notificações quando:**
- Novo agendamento criado (notificar professor)
- Agendamento confirmado (notificar aluno)
- Agendamento cancelado (notificar ambos)
- 1h antes da aula (notificar ambos)
- Nova avaliação recebida (notificar professor)

#### 7.4 Real-time (Opcional)
**Se houver tempo:**
- Usar Supabase Realtime
- Atualizar notificações em tempo real
- Toast quando nova notificação chega

---

## 📅 FASE 3: POLIMENTO E TESTES (Dias 8-9)

### DIA 8: Testes e Correções

#### 8.1 Testes de Fluxo Completo
**Testar como Aluno:**
- [ ] Cadastro e login
- [ ] Buscar professores
- [ ] Ver perfil do professor
- [ ] Comprar créditos
- [ ] Agendar aula
- [ ] Ver minhas aulas
- [ ] Cancelar aula
- [ ] Gerar QR Code
- [ ] Avaliar professor
- [ ] Editar perfil

**Testar como Professor:**
- [ ] Cadastro e login
- [ ] Completar perfil
- [ ] Ver solicitações de aula
- [ ] Confirmar/rejeitar aula
- [ ] Ver agenda
- [ ] Escanear QR Code
- [ ] Ver avaliações
- [ ] Ver ganhos
- [ ] Editar perfil

#### 8.2 Testes de Responsividade
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Testar em diferentes navegadores

#### 8.3 Testes de Performance
- [ ] Lighthouse score > 80
- [ ] Tempo de carregamento < 3s
- [ ] Interações < 500ms
- [ ] Otimizar imagens
- [ ] Lazy loading de componentes

#### 8.4 Correção de Bugs
- [ ] Listar todos os bugs encontrados
- [ ] Priorizar por severidade
- [ ] Corrigir bugs críticos
- [ ] Corrigir bugs importantes
- [ ] Documentar bugs conhecidos (se não der tempo)

---

### DIA 9: Documentação e Deploy

#### 9.1 Documentação
**Atualizar README.md:**
- Descrição do projeto
- Como instalar
- Como rodar localmente
- Variáveis de ambiente
- Scripts disponíveis
- Estrutura do projeto

**Criar API.md:**
- Documentar todos os endpoints
- Request/Response examples
- Códigos de erro
- Autenticação

**Criar USER-GUIDE.md:**
- Como usar a plataforma (aluno)
- Como usar a plataforma (professor)
- FAQ
- Troubleshooting

#### 9.2 Preparar Deploy
**Frontend (Vercel):**
- [ ] Criar projeto no Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Conectar repositório
- [ ] Configurar domínio (opcional)

**Backend:**
- [ ] Já está no Supabase (não precisa deploy separado)
- [ ] Validar RLS policies
- [ ] Configurar backups

**Banco de Dados:**
- [ ] Validar schema
- [ ] Rodar migrations
- [ ] Criar dados de teste em produção
- [ ] Configurar backups automáticos

#### 9.3 Testes em Produção
- [ ] Testar todos os fluxos em produção
- [ ] Validar variáveis de ambiente
- [ ] Testar performance
- [ ] Validar SSL/HTTPS
- [ ] Testar em dispositivos reais

---

## 🛠️ Ferramentas e Bibliotecas Necessárias

### Já Instaladas
- ✅ Next.js 15
- ✅ React 19
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Shadcn/ui
- ✅ Zustand
- ✅ React Query
- ✅ Axios
- ✅ Supabase Client

### A Instalar
```bash
# QR Code
npm install qrcode react-qr-code
npm install -D @types/qrcode

# Scanner QR Code
npm install html5-qrcode

# Calendário
npm install react-big-calendar
npm install date-fns

# Charts (opcional)
npm install recharts

# Upload de arquivos
# (Supabase Storage já está disponível)
```

---

## 📊 Métricas de Progresso

### Checklist Geral
- [ ] Fase 1 completa (Dias 1-4)
- [ ] Fase 2 completa (Dias 5-7)
- [ ] Fase 3 completa (Dias 8-9)
- [ ] MVP testado e funcional
- [ ] Deploy em produção
- [ ] Documentação completa

### KPIs do MVP
- **Funcionalidade:** 100% dos fluxos principais funcionando
- **Performance:** Lighthouse > 80
- **Responsividade:** 100% mobile-friendly
- **Bugs Críticos:** 0
- **Cobertura de Testes:** Manuais completos

---

## 🚨 Riscos e Mitigações

### Risco 1: Atraso no desenvolvimento
**Mitigação:** Priorizar funcionalidades críticas, deixar desejáveis para v2

### Risco 2: Bugs em produção
**Mitigação:** Testes extensivos antes do deploy, ter rollback plan

### Risco 3: Performance ruim
**Mitigação:** Otimizar desde o início, usar lazy loading, cache

### Risco 4: Problemas com Supabase
**Mitigação:** Ter backup do schema, documentar configurações

---

## 📞 Próximos Passos Imediatos

1. **Revisar este plano** e ajustar se necessário
2. **Começar pelo Dia 1** - Sistema de busca de professores
3. **Trabalhar em ordem** - não pular etapas
4. **Testar continuamente** - não deixar bugs acumularem
5. **Documentar decisões** - facilita manutenção futura

---

**Criado em:** 29/09/2025  
**Versão:** 1.0  
**Status:** Pronto para execução
