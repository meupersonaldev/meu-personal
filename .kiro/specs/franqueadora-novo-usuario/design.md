# Design Document - Novo Usuário na Franqueadora

## Overview

O sistema de criação de novo usuário na franqueadora permite que administradores criem alunos ou professores diretamente, sem necessidade de aprovação posterior. O fluxo é dividido em duas etapas:

1. **Seleção de tipo**: Modal com opção de Professor ou Aluno
2. **Preenchimento de formulário**: Reutiliza os formulários existentes de cadastro
3. **Criação automática**: Usuário é criado com status APPROVED
4. **Email de boas-vindas**: Enviado com senha temporária

## Architecture

### Components

```
FranqueadoraUsuariosPage
├── UsuariosTable (lista existente)
├── BotãoNovoUsuário
└── ModalNovoUsuário
    ├── SeletorTipo (Professor/Aluno)
    └── FormulárioUsuário
        ├── CamposComuns (nome, email, telefone, cpf, gênero, senha)
        ├── CamposProfessor (CREF, carteirinha)
        └── CamposAluno (nenhum adicional)
```

### Data Flow

```
1. Usuário clica "Novo usuário"
   ↓
2. Modal abre com seletor de tipo
   ↓
3. Usuário seleciona Professor ou Aluno
   ↓
4. Formulário específico é exibido
   ↓
5. Usuário preenche e submete
   ↓
6. Backend cria usuário com status APPROVED
   ↓
7. Email de boas-vindas é enviado
   ↓
8. Modal fecha e lista é atualizada
```

## Components and Interfaces

### Frontend Components

#### 1. ModalNovoUsuário
- **Props**: `isOpen: boolean`, `onClose: () => void`, `onSuccess: () => void`
- **State**: `selectedRole: 'PROFESSOR' | 'ALUNO' | null`
- **Behavior**: 
  - Exibe seletor de tipo inicialmente
  - Ao selecionar tipo, exibe formulário
  - Ao submeter, chama API e fecha modal

#### 2. FormulárioUsuário
- **Props**: `role: 'PROFESSOR' | 'ALUNO'`, `onSubmit: (data) => Promise<void>`, `isLoading: boolean`
- **Reutiliza**: Campos do `RegisterTemplate` existente
- **Campos adicionais**: Nenhum (usa os mesmos do cadastro normal)

### Backend Endpoints

#### POST /api/franqueadora/usuarios
- **Auth**: Requer autenticação como franqueadora
- **Body**:
  ```typescript
  {
    name: string
    email: string
    phone: string
    cpf: string
    password: string
    gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY'
    role: 'STUDENT' | 'TEACHER'
    teacher?: {
      cref: string
      crefCardFile: File
    }
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean
    user: {
      id: string
      name: string
      email: string
      role: string
      status: 'APPROVED'
    }
    message: string
  }
  ```
- **Behavior**:
  1. Valida dados (mesmas validações do cadastro normal)
  2. Cria usuário com `status = 'APPROVED'`
  3. Se professor: salva CREF e carteirinha
  4. Gera senha temporária
  5. Envia email de boas-vindas
  6. Retorna dados do usuário criado

### Email Template

**Assunto**: Bem-vindo ao Meu Personal!

**Conteúdo**:
```
Olá [NOME],

Bem-vindo ao Meu Personal! Sua conta foi criada com sucesso.

Aqui estão suas credenciais de acesso:
- Email: [EMAIL]
- Senha temporária: [SENHA_TEMPORÁRIA]

Acesse a plataforma em: [LINK_LOGIN]

Na primeira vez que fizer login, você será solicitado a alterar sua senha.

Qualquer dúvida, entre em contato conosco.

Atenciosamente,
Equipe Meu Personal
```

## Data Models

### User (extensão)
```typescript
{
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  gender: string
  role: 'STUDENT' | 'TEACHER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_by_franqueadora: boolean // novo campo
  created_at: timestamp
  updated_at: timestamp
}
```

### TeacherProfile (extensão)
```typescript
{
  user_id: string
  cref: string
  cref_card_url: string
  is_approved: boolean // será true automaticamente
  created_at: timestamp
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Usuário criado é automaticamente aprovado
*For any* usuário criado pela franqueadora (professor ou aluno), o campo `status` SHALL ser `'APPROVED'` imediatamente após a criação.
**Validates: Requirements 2.1, 2.2**

### Property 2: Email de boas-vindas contém credenciais
*For any* usuário criado com sucesso, um email SHALL ser enviado para o endereço fornecido contendo nome do usuário, email de acesso e senha temporária.
**Validates: Requirements 3.1, 3.2**

### Property 3: Formulário reutiliza validações
*For any* dados submetidos para criar usuário, as mesmas validações do cadastro normal SHALL ser aplicadas (CPF válido, email único, senha mínimo 6 caracteres, etc).
**Validates: Requirements 4.3**

### Property 4: Professor criado tem CREF e carteirinha
*For any* professor criado pela franqueadora, os campos `cref` e `cref_card_url` SHALL estar preenchidos no banco de dados.
**Validates: Requirements 1.2, 4.1**

### Property 5: Usuário criado aparece na lista
*For any* usuário criado com sucesso, ao recarregar a página de usuários da franqueadora, o novo usuário SHALL aparecer na lista.
**Validates: Requirements 5.5**

## Error Handling

### Validações
- **Email duplicado**: "Este email já está registrado no sistema"
- **CPF inválido**: "CPF inválido. Verifique os dígitos"
- **Senha fraca**: "Senha deve ter no mínimo 6 caracteres"
- **Campos obrigatórios**: "Preencha todos os campos obrigatórios"
- **CREF inválido** (professor): "CREF deve estar no formato 12345-G/SP"
- **Carteirinha não enviada** (professor): "Envie a carteirinha (CREF) para continuar"

### Falhas de Email
- Se o email falhar, o usuário é criado normalmente
- Um log é registrado para auditoria
- Mensagem ao admin: "Usuário criado, mas falha ao enviar email. Tente reenviar depois."

## Testing Strategy

### Unit Tests
- Validação de CPF
- Validação de CREF (formato)
- Validação de senha (mínimo 6 caracteres)
- Formatação de telefone
- Geração de senha temporária

### Property-Based Tests
- **Property 1**: Para qualquer usuário criado, verificar que `status = 'APPROVED'`
- **Property 2**: Para qualquer usuário criado, verificar que email foi enviado com credenciais
- **Property 3**: Para qualquer dados válidos, aplicar mesmas validações do cadastro normal
- **Property 4**: Para qualquer professor criado, verificar CREF e carteirinha preenchidos
- **Property 5**: Para qualquer usuário criado, verificar que aparece na lista após refresh

### Integration Tests
- Fluxo completo: seleção de tipo → preenchimento → criação → email
- Criação de professor com carteirinha
- Criação de aluno
- Erro ao enviar email (usuário criado mesmo assim)
- Validação de campos obrigatórios
