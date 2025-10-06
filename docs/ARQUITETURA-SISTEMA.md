# Arquitetura do Sistema - Meu Personal

## 🏗️ Visão Geral da Arquitetura

```mermaid
graph TB
    subgraph "Frontend (Next.js 15)"
        A[ Landing Page ] 
        B[ Autenticação ]
        C[ Dashboard Aluno ]
        D[ Dashboard Professor ]
        E[ Dashboard Franquia ]
        F[ Dashboard Franqueadora ]
    end
    
    subgraph "Backend (Express.js)"
        G[ API Gateway ]
        H[ Auth Middleware ]
        I[ Routes ]
        J[ Services ]
        K[ Utils ]
    end
    
    subgraph "Database (Supabase)"
        L[ PostgreSQL ]
        M[ Auth Service ]
        N[ Storage ]
        O[ Realtime ]
    end
    
    subgraph "External Services"
        P[ Asaas API ]
        Q[ Email Service ]
        R[ Storage CDN ]
    end
    
    A --> G
    B --> G
    C --> G
    D --> G
    E --> G
    F --> G
    
    G --> H
    H --> I
    I --> J
    J --> K
    
    I --> L
    H --> M
    J --> N
    J --> O
    
    J --> P
    J --> Q
    N --> R
```

## 🔐 Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant M as Middleware
    participant A as Auth API
    participant S as Supabase
    
    U->>F: Login com email/senha
    F->>A: POST /api/auth/login
    A->>S: Verificar credenciais
    S-->>A: Dados do usuário
    A->>A: Gerar JWT
    A-->>F: Token + dados usuário
    F->>F: Armazenar token
    F->>U: Redirecionar para dashboard
    
    Note over F,S: Requisições subsequentes
    F->>M: Requisição com token
    M->>M: Validar JWT
    M->>A: req.user anexado
    A-->>F: Resposta da API
```

## 🚨 Pontos Críticos de Segurança Identificados

### 1. Vulnerabilidade no Middleware
```mermaid
graph LR
    A[Middleware] --> B{NODE_ENV}
    B -->|development| C[Bypass autenticação]
    B -->|production| D[Valida token]
    C --> E[Rota desprotegida]
    D --> F[Rota protegida]
    
    style C fill:#ffcccc
    style E fill:#ffcccc
```

### 2. Falha de Autenticação na Rota /franquia
```mermaid
graph LR
    A[Rota /franquia] --> B{Validação de token?}
    B -->|Não| C[Accesso liberado]
    B -->|Sim| D[Accesso restrito]
    
    style C fill:#ffcccc
    style A fill:#ffcccc
```

## 📊 Estrutura do Banco de Dados

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        string phone
        enum role
        int credits
        boolean is_active
        timestamp created_at
        timestamp updated_at
        string avatar_url
    }
    
    academies {
        uuid id PK
        string name
        string address
        string phone
        string email
        json schedule
        time opening_time
        time closing_time
        int checkin_tolerance
        timestamp created_at
        timestamp updated_at
    }
    
    bookings {
        uuid id PK
        uuid student_id FK
        uuid teacher_id FK
        uuid academy_id FK
        timestamp date
        int duration
        enum status
        string checkin_code
        timestamp checked_in_at
        string notes
        int credits_cost
        string payment_source
        timestamp created_at
        timestamp updated_at
    }
    
    checkins {
        uuid id PK
        uuid academy_id FK
        uuid teacher_id FK
        uuid booking_id FK
        enum status
        string reason
        string method
        timestamp created_at
    }
    
    notifications {
        uuid id PK
        uuid academy_id FK
        string type
        string title
        string message
        json data
        boolean read
        timestamp created_at
        timestamp updated_at
    }
    
    users ||--o{ bookings : "student"
    users ||--o{ bookings : "teacher"
    academies ||--o{ bookings : "academy"
    academies ||--o{ notifications : "academy"
    bookings ||--o| checkins : "booking"
```

## 🔧 Componentes da API

### Middleware de Autenticação
- **requireAuth**: Validação básica de JWT
- **requireFranqueadoraAdmin**: Validação de admin da franqueadora
- **Vulnerabilidade**: Bypass em ambiente de desenvolvimento

### Rotas Principais
- **/api/auth**: Login, registro, recuperação de senha
- **/api/users**: Gestão de usuários
- **/api/teachers**: Gestão de professores
- **/api/students**: Gestão de alunos
- **/api/bookings**: Sistema de agendamentos
- **/api/franchises**: Gestão de franquias
- **/api/financial**: Sistema financeiro

### Serviços Externos
- **Supabase**: Banco de dados e autenticação
- **Asaas**: Processamento de pagamentos
- **Storage CDN**: Upload de arquivos

## 🚨 Inconsistências Identificadas

### Schema Prisma vs Supabase
| Tabela | Schema Prisma | Supabase | Status |
|--------|---------------|-----------|---------|
| users | password (string) | password_hash (string) | ❌ Inconsistente |
| users | Sem avatar_url | avatar_url (string) | ❌ Faltando |
| academies | Não existe | ✅ Existe | ❌ Faltando |
| checkins | Não existe | ✅ Existe | ❌ Faltando |
| notifications | Não existe | ✅ Existe | ❌ Faltando |
| teacher_preferences | Parcial | ✅ Existe | ⚠️ Incompleto |

## 📋 Fluxos Principais do Sistema

### Fluxo de Agendamento
```mermaid
sequenceDiagram
    participant A as Aluno
    participant F as Frontend
    participant API as API
    participant DB as Database
    participant T as Professor
    
    A->>F: Buscar professor
    F->>API: GET /api/teachers
    API->>DB: Consultar professores
    DB-->>API: Lista de professores
    API-->>F: Professores disponíveis
    F-->>A: Exibir resultados
    
    A->>F: Selecionar horário
    F->>API: POST /api/bookings
    API->>DB: Verificar créditos
    DB-->>API: Saldo suficiente
    API->>DB: Criar agendamento
    API->>DB: Debitar créditos
    DB-->>API: Agendamento criado
    API-->>F: Confirmação
    F-->>A: Agendamento confirmado
    
    API->>T: Notificar novo agendamento
    T->>API: Confirmar/Rejeitar
    API->>DB: Atualizar status
    API->>A: Notificar confirmação
```

### Fluxo de Check-in
```mermaid
sequenceDiagram
    participant P as Professor
    participant F as Frontend
    participant API as API
    participant DB as Database
    participant A as Aluno
    
    P->>F: Escanear QR Code
    F->>API: POST /api/checkins/validate
    API->>DB: Verificar agendamento
    DB-->>API: Agendamento válido
    API->>DB: Registrar check-in
    API->>DB: Creditar professor
    DB-->>API: Check-in registrado
    API-->>F: Sucesso
    F-->>P: Acesso liberado
    
    API->>A: Notificar presença
```

## 🛡️ Camadas de Segurança

### 1. Frontend
- Validação de formulários
- Sanitização de inputs
- Proteção XSS
- Armazenamento seguro de tokens

### 2. Backend
- Middleware de autenticação
- Validação de entrada (Zod)
- Rate limiting
- CORS configurado

### 3. Banco de Dados
- Row Level Security (RLS)
- Índices otimizados
- Backups automáticos
- Criptografia de dados sensíveis

### 4. Infraestrutura
- HTTPS/TLS
- Headers de segurança
- Firewall
- Monitoramento

## 📈 Estratégia de Escalabilidade

### Horizontal Scaling
- Frontend: Vercel Edge Functions
- Backend: Docker containers + Kubernetes
- Database: Supabase (auto-scaling)
- Storage: CDN global

### Performance Optimization
- Cache Redis para dados frequentes
- CDN para assets estáticos
- Lazy loading de componentes
- Otimização de queries

### Monitoramento e Observabilidade
- Logs centralizados
- Métricas de performance
- Alertas de erro
- Health checks automatizados

---

**Status da Arquitetura**: Funcional com vulnerabilidades críticas
**Prioridade**: Segurança > Funcionalidade > Performance
**Complexidade**: Média (bem estruturado mas precisa de ajustes)