# Design Document - Email Template Management

## Overview

This feature provides a simple interface for franqueadora administrators to view and edit email templates. The system maintains a fixed base template (header, footer, layout) while allowing customization of content, title, and button text. Templates are stored in the database with fallback to hardcoded defaults.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Template List   │  │ Template Editor │                   │
│  │ /franqueadora/  │  │ /franqueadora/  │                   │
│  │ emails          │  │ emails/[slug]   │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           └────────┬───────────┘                             │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │ API Calls
┌────────────────────┼─────────────────────────────────────────┐
│                    │        Backend (Express)                │
│           ┌────────▼────────┐                                │
│           │ /api/email-     │                                │
│           │ templates       │                                │
│           └────────┬────────┘                                │
│                    │                                         │
│           ┌────────▼────────┐                                │
│           │ EmailTemplate   │                                │
│           │ Service         │                                │
│           └────────┬────────┘                                │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────┐
│                    │        Database (Supabase)              │
│           ┌────────▼────────┐                                │
│           │ email_templates │                                │
│           └─────────────────┘                                │
└──────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### EmailTemplateService
```typescript
interface EmailTemplateService {
  // Get all templates (custom + defaults merged)
  getAllTemplates(): Promise<EmailTemplate[]>
  
  // Get single template by slug
  getTemplate(slug: string): Promise<EmailTemplate>
  
  // Update template content
  updateTemplate(slug: string, data: UpdateTemplateDTO): Promise<EmailTemplate>
  
  // Reset template to default
  resetTemplate(slug: string): Promise<EmailTemplate>
  
  // Get template for sending (custom or default)
  getTemplateForSending(slug: string): Promise<EmailTemplateContent>
}

interface UpdateTemplateDTO {
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
}
```

#### API Routes
```typescript
// GET /api/email-templates - List all templates
// GET /api/email-templates/:slug - Get single template
// PUT /api/email-templates/:slug - Update template
// POST /api/email-templates/:slug/reset - Reset to default
// GET /api/email-templates/:slug/preview - Get rendered preview
```

### Frontend Components

#### EmailTemplateList
- Displays all templates in a card grid
- Shows name, description, last modified
- Click to edit

#### EmailTemplateEditor
- Split view: editor on left, preview on right
- Fields: title, content (textarea/rich text), button text
- Variables panel with click-to-insert
- Save and Reset buttons

## Data Models

### email_templates Table
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  button_text VARCHAR(100),
  button_url VARCHAR(500),
  variables JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Template Slugs (System Templates)
```typescript
const SYSTEM_TEMPLATES = [
  // Cadastro pela plataforma (sem senha)
  'welcome-student',           // Boas-vindas aluno (auto-cadastro)
  'welcome-teacher',           // Boas-vindas professor (auto-cadastro)
  
  // Cadastro pela franqueadora/professor (com senha)
  'welcome-student-created',   // Aluno criado pela franqueadora/professor (envia senha)
  'welcome-teacher-created',   // Professor criado pela franqueadora (envia senha)
  
  // Vínculo professor-aluno
  'student-linked',            // Aluno vinculado a novo professor
  
  // Aprovação de professor
  'teacher-approved',          // Professor aprovado
  'teacher-rejected',          // Professor rejeitado
  
  // Senha
  'password-reset',            // Redefinição de senha
] as const
```

### Default Templates Configuration
```typescript
interface DefaultTemplate {
  slug: string
  name: string
  description: string
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
  variables: Variable[]
}

interface Variable {
  name: string        // e.g., "nome"
  placeholder: string // e.g., "{{nome}}"
  description: string // e.g., "Nome do usuário"
  example: string     // e.g., "João Silva"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Template list completeness
*For any* request to list templates, the response SHALL contain all system templates with name, description, and updated_at fields populated.
**Validates: Requirements 1.1, 1.2**

### Property 2: Save round-trip consistency
*For any* valid template update, saving the template and then fetching it SHALL return equivalent title, content, and buttonText values.
**Validates: Requirements 2.4**

### Property 3: Required field validation
*For any* template update with empty title or empty content, the save operation SHALL be rejected with a validation error.
**Validates: Requirements 2.3**

### Property 4: Preview variable replacement
*For any* template content containing variables in `{{variable}}` format, the preview SHALL replace all variables with their example values.
**Validates: Requirements 3.2**

### Property 5: Custom template priority
*For any* template slug, when a custom template exists in the database, getTemplateForSending SHALL return the custom content instead of the default.
**Validates: Requirements 5.1, 5.3**

### Property 6: Reset restores defaults
*For any* customized template, calling reset SHALL restore the title, content, and buttonText to their default values.
**Validates: Requirements 5.2**

## Error Handling

| Error Case | HTTP Status | Response |
|------------|-------------|----------|
| Template not found | 404 | `{ error: "Template não encontrado" }` |
| Invalid slug | 400 | `{ error: "Slug inválido" }` |
| Empty required field | 400 | `{ error: "Título e conteúdo são obrigatórios" }` |
| Unauthorized | 403 | `{ error: "Acesso não autorizado" }` |

## Testing Strategy

### Unit Tests
- Validate template service methods
- Test variable replacement logic
- Test default fallback behavior

### Property-Based Tests
Using fast-check library:
- Property 1: Template list completeness
- Property 2: Save round-trip consistency
- Property 3: Required field validation
- Property 4: Preview variable replacement
- Property 5: Custom template priority
- Property 6: Reset restores defaults

Each property test will run minimum 100 iterations with randomly generated inputs.
