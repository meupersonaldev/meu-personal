# Meu Personal - Sistema de Agendamento de Personal Trainers

Sistema completo para gerenciamento de academias, personal trainers e agendamentos.

## 🚀 Tecnologias

### Frontend (Next.js)
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui
- Zustand (gerenciamento de estado)

### Backend (Node.js)
- Express.js
- TypeScript
- Supabase (banco de dados)
- JWT (autenticação)
- Zod (validação)

### Banco de Dados
- PostgreSQL (via Supabase)
- Tabelas: users, teacher_profiles, bookings, academies, etc.

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <repository-url>
cd meu-personal
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://fstbhakmmznfdeluyexc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdGJoYWttbXpuZmRlbHV5ZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzc3OTAsImV4cCI6MjA3NDY1Mzc5MH0.R9MaYf45DejVYpUlxUARE9UO2Qj1_THASVBBhIKOL9Q
```

#### Backend (.env)
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://fstbhakmmznfdeluyexc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=coloque_sua_service_role_key_aqui
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
DEFAULT_CREDITS_PER_CLASS=1
# Pagamentos (opcional para MVP)
# ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
# ASAAS_API_KEY=

# Notas Fiscais
# Recomendado: Use ASAAS (já configurado para pagamentos)
INVOICE_PROVIDER=ASAAS
# Ou use NFe.io como alternativa:
# INVOICE_PROVIDER=NFE_IO
# NFE_IO_API_KEY=sua_api_key_aqui
```

## 🎯 Como Executar

### 1. Iniciar o Backend (Terminal 1)
```bash
cd apps/api
npm run dev
```
O backend rodará em: http://localhost:3001

### 2. Iniciar o Frontend (Terminal 2)
```bash
cd apps/web
npm run dev
```
O frontend rodará em: http://localhost:3000

## 👤 Usuários de Teste

### Professores
- **Email:** maria@email.com | **Senha:** 123456
- **Email:** carlos@email.com | **Senha:** 123456

### Alunos
- **Email:** joao@email.com | **Senha:** 123456
- **Email:** ana@email.com | **Senha:** 123456

## 📂 Estrutura do Projeto

```
meu-personal/
├── apps/
│   ├── web/           # Frontend Next.js
│   │   ├── app/       # App Router (Next.js 13+)
│   │   ├── components/
│   │   ├── lib/       # Utilitários e configurações
│   │   └── ...
│   └── api/           # Backend Express.js
│       ├── src/
│       │   ├── routes/
│       │   ├── lib/
│       │   └── server.ts
│       └── ...
└── package.json       # Configuração do monorepo
```

## 🔗 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Logout

### Professores
- `GET /api/teachers` - Listar professores
- `GET /api/teachers/:id` - Detalhes do professor
- `PUT /api/teachers/:id` - Atualizar perfil (auth)

### Agendamentos
- `GET /api/bookings` - Listar agendamentos
- `GET /api/bookings/:id` - Detalhes do agendamento
- `POST /api/bookings` - Criar agendamento (auth)
- `PUT /api/bookings/:id` - Atualizar agendamento (auth)
- `DELETE /api/bookings/:id` - Cancelar agendamento (auth)

## 📋 Funcionalidades

### ✅ Implementadas
- **Autenticação completa** (login/registro)
- **Gestão de professores** (perfil, especialidades, valores)
- **Sistema de agendamentos** (criar, confirmar, cancelar)
- **Dashboard por tipo de usuário** (aluno, professor, franquia, franqueadora)
- **Integração completa com Supabase**
- **API RESTful completa**
- **Interface responsiva**

### 🔄 Em Desenvolvimento
- Sistema de pagamentos
- Notificações em tempo real
- Chat entre aluno e professor
- Relatórios avançados

## 🔧 Scripts Disponíveis

### Root
```bash
npm run dev          # Inicia frontend e backend simultaneamente
npm run build        # Build de produção
npm run start        # Inicia versão de produção
```

### Frontend
```bash
npm run dev          # Modo desenvolvimento
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # ESLint
```

### Backend
```bash
npm run dev          # Modo desenvolvimento com hot reload
npm run build        # Compilar TypeScript
npm run start        # Executar versão compilada
```

## 🗃️ Banco de Dados

O projeto usa Supabase como backend-as-a-service. As principais tabelas são:

- **users** - Usuários do sistema
- **teacher_profiles** - Perfis dos professores
- **bookings** - Agendamentos
- **academies** - Academias/franquias
- **reviews** - Avaliações
- **transactions** - Transações

## 🛠️ Desenvolvimento

### Adicionando novas funcionalidades
1. Crie as rotas no backend (`apps/api/src/routes/`)
2. Implemente os endpoints na API (`apps/web/lib/api.ts`)
3. Crie os componentes no frontend (`apps/web/components/`)
4. Adicione as páginas necessárias (`apps/web/app/`)

### Padrões de código
- Use TypeScript em todos os arquivos
- Siga as convenções do ESLint
- Componentes React devem usar hooks
- APIs devem ter validação com Zod
- Sempre trate erros adequadamente

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique se o backend está rodando na porta 3001
2. Verifique se o frontend está rodando na porta 3000
3. Confirme as variáveis de ambiente
4. Verifique os logs do console para erros

## 🎨 UI/UX

O projeto utiliza:
- **Tailwind CSS** para estilização
- **Shadcn/ui** para componentes base
- **Lucide React** para ícones
- **Design responsivo** para mobile e desktop
- **Tema consistente** em azul e gradientes
