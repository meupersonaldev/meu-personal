/**
 * EmailTemplateService - Manages customizable email templates
 * 
 * This service provides CRUD operations for email templates with:
 * - Default templates fallback (hardcoded)
 * - Custom templates stored in database
 * - Variable replacement for previews
 * - Integration with the base HTML email template
 */

import { supabase } from '../lib/supabase'
import { getHtmlEmailTemplate } from './email-templates'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Variable {
  name: string        // e.g., "nome"
  placeholder: string // e.g., "{{nome}}"
  description: string // e.g., "Nome do usuário"
  example: string     // e.g., "João Silva"
}

export interface DefaultTemplate {
  slug: string
  name: string
  description: string
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
  variables: Variable[]
}

export interface EmailTemplate {
  id?: string
  slug: string
  name: string
  description: string
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
  variables: Variable[]
  updatedAt?: string
  updatedBy?: string
  createdAt?: string
  isCustom: boolean
}

export interface UpdateTemplateDTO {
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
}

export interface EmailTemplateContent {
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
}

// ============================================================================
// System Template Slugs
// ============================================================================

export const SYSTEM_TEMPLATE_SLUGS = [
  'welcome-student',           // Boas-vindas aluno (auto-cadastro)
  'welcome-teacher',           // Boas-vindas professor (auto-cadastro)
  'welcome-student-created',   // Aluno criado pela franqueadora/professor (envia senha)
  'welcome-teacher-created',   // Professor criado pela franqueadora (envia senha)
  'student-linked',            // Aluno vinculado a novo professor
  'teacher-approved',          // Professor aprovado
  'teacher-rejected',          // Professor rejeitado
  'password-reset',            // Redefinição de senha
  'policy-published',          // Nova política publicada
  'policy-rollback',           // Rollback de política
] as const

export type SystemTemplateSlug = typeof SYSTEM_TEMPLATE_SLUGS[number]


// ============================================================================
// Default Templates Configuration
// ============================================================================

const PRIMARY_COLOR = '#002C4E'

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    slug: 'welcome-student',
    name: 'Boas-vindas Aluno',
    description: 'Email enviado quando um aluno se cadastra na plataforma',
    title: 'Bem-vindo ao Meu Personal!',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Seja muito bem-vindo(a) ao <strong>Meu Personal</strong>!</p>

<p>Estamos muito felizes em ter você conosco. Agora você faz parte de uma comunidade que valoriza saúde, bem-estar e treinos personalizados.</p>

<p style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: ${PRIMARY_COLOR};">🎁 Presente de Boas-Vindas!</strong><br>
  Você ganhou <strong>1 aula gratuita</strong> para experimentar nossos serviços! Aproveite para conhecer nossos professores e encontrar o profissional ideal para você.
</p>

<p><strong>O que você pode fazer agora:</strong></p>
<ul>
  <li>Agendar sua primeira aula gratuita</li>
  <li>Conhecer nossos professores</li>
  <li>Comprar pacotes de aulas quando quiser</li>
</ul>

<p>Qualquer dúvida, estamos à disposição!</p>

<p>Bons treinos!</p>`,
    buttonText: 'Acessar Minha Conta',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do aluno', example: 'João Silva' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login do aluno', example: 'https://meupersonalfranquia.com.br/aluno/login' }
    ]
  },
  {
    slug: 'welcome-teacher',
    name: 'Boas-vindas Professor',
    description: 'Email enviado quando um professor se cadastra na plataforma',
    title: 'Bem-vindo ao Meu Personal!',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Seja muito bem-vindo(a) ao <strong>Meu Personal</strong>!</p>

<p>Estamos muito felizes em ter você como parte da nossa equipe de profissionais. Aqui você terá acesso a ferramentas que vão facilitar sua rotina e ajudar a gerenciar seus alunos de forma eficiente.</p>

<p style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #92400e;">⏳ Aguardando Aprovação</strong><br>
  Seu cadastro está sendo analisado pela nossa equipe. Assim que for aprovado, você receberá uma notificação e poderá começar a atender seus alunos.
</p>

<p><strong>Enquanto isso, você pode:</strong></p>
<ul>
  <li>Completar seu perfil profissional</li>
  <li>Configurar sua disponibilidade de horários</li>
  <li>Conhecer a plataforma e suas funcionalidades</li>
</ul>

<p><strong>Após a aprovação:</strong></p>
<ul>
  <li>Receber agendamentos de alunos</li>
  <li>Realizar check-in via QR Code</li>
  <li>Acompanhar seus ganhos na carteira</li>
</ul>

<p>Qualquer dúvida, entre em contato com a franquia onde você está vinculado.</p>

<p>Sucesso na sua jornada!</p>`,
    buttonText: 'Acessar Minha Conta',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do professor', example: 'Maria Santos' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login do professor', example: 'https://meupersonalfranquia.com.br/professor/login' }
    ]
  },
  {
    slug: 'welcome-student-created',
    name: 'Aluno Criado (com senha)',
    description: 'Email enviado quando um aluno é criado pela franqueadora ou professor',
    title: 'Sua conta foi criada no Meu Personal!',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Uma conta foi criada para você na plataforma <strong>Meu Personal</strong>.</p>

<p style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: ${PRIMARY_COLOR};">🔐 Seus dados de acesso:</strong><br>
  <strong>Email:</strong> {{email}}<br>
  <strong>Senha temporária:</strong> {{senha}}
</p>

<p><strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso.</p>

<p><strong>O que você pode fazer agora:</strong></p>
<ul>
  <li>Agendar aulas com seu professor</li>
  <li>Conhecer nossos professores</li>
  <li>Comprar pacotes de aulas</li>
</ul>

<p>Qualquer dúvida, estamos à disposição!</p>

<p>Bons treinos!</p>`,
    buttonText: 'Acessar Minha Conta',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do aluno', example: 'João Silva' },
      { name: 'email', placeholder: '{{email}}', description: 'Email do aluno', example: 'joao@email.com' },
      { name: 'senha', placeholder: '{{senha}}', description: 'Senha temporária', example: '********' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login', example: 'https://meupersonalfranquia.com.br/aluno/login' }
    ]
  },
  {
    slug: 'welcome-teacher-created',
    name: 'Professor Criado (com senha)',
    description: 'Email enviado quando um professor é criado pela franqueadora',
    title: 'Sua conta foi criada no Meu Personal!',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Uma conta de professor foi criada para você na plataforma <strong>Meu Personal</strong>.</p>

<p style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: ${PRIMARY_COLOR};">🔐 Seus dados de acesso:</strong><br>
  <strong>Email:</strong> {{email}}<br>
  <strong>Senha temporária:</strong> {{senha}}
</p>

<p><strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso.</p>

<p style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #92400e;">⏳ Aguardando Aprovação</strong><br>
  Seu cadastro está sendo analisado. Assim que for aprovado, você poderá começar a atender alunos.
</p>

<p>Sucesso na sua jornada!</p>`,
    buttonText: 'Acessar Minha Conta',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do professor', example: 'Maria Santos' },
      { name: 'email', placeholder: '{{email}}', description: 'Email do professor', example: 'maria@email.com' },
      { name: 'senha', placeholder: '{{senha}}', description: 'Senha temporária', example: '********' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login', example: 'https://meupersonalfranquia.com.br/professor/login' }
    ]
  },
  {
    slug: 'student-linked',
    name: 'Aluno Vinculado',
    description: 'Email enviado quando um aluno é vinculado a um novo professor',
    title: 'Você foi vinculado a um novo professor!',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Você foi vinculado ao professor <strong>{{professor_nome}}</strong> na plataforma Meu Personal.</p>

<p style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #065f46;">✅ Vínculo realizado com sucesso!</strong><br>
  Agora você pode agendar aulas com este professor.
</p>

<p><strong>O que você pode fazer agora:</strong></p>
<ul>
  <li>Ver a disponibilidade do professor</li>
  <li>Agendar suas aulas</li>
  <li>Entrar em contato pelo chat</li>
</ul>

<p>Bons treinos!</p>`,
    buttonText: 'Ver Professor',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do aluno', example: 'João Silva' },
      { name: 'professor_nome', placeholder: '{{professor_nome}}', description: 'Nome do professor', example: 'Maria Santos' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login', example: 'https://meupersonalfranquia.com.br/aluno/login' }
    ]
  },
  {
    slug: 'teacher-approved',
    name: 'Professor Aprovado',
    description: 'Email enviado quando um professor é aprovado na plataforma',
    title: 'Cadastro Aprovado! 🎉',
    content: `<p>Olá <strong>{{nome}}</strong>!</p>

<p>Temos uma ótima notícia! 🎉</p>

<p style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #065f46;">✅ Seu cadastro foi aprovado!</strong><br>
  Você já pode começar a atender alunos na plataforma Meu Personal.
</p>

<p><strong>O que você pode fazer agora:</strong></p>
<ul>
  <li>Configurar sua disponibilidade de horários</li>
  <li>Receber agendamentos de alunos</li>
  <li>Realizar check-in via QR Code nas aulas</li>
  <li>Acompanhar seus ganhos na carteira</li>
</ul>

<p>Estamos muito felizes em ter você na nossa equipe!</p>

<p>Bons treinos e sucesso!</p>`,
    buttonText: 'Acessar Minha Conta',
    buttonUrl: '{{login_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do professor', example: 'Maria Santos' },
      { name: 'login_url', placeholder: '{{login_url}}', description: 'URL de login', example: 'https://meupersonalfranquia.com.br/professor/login' }
    ]
  },
  {
    slug: 'teacher-rejected',
    name: 'Professor Rejeitado',
    description: 'Email enviado quando um professor é rejeitado na plataforma',
    title: 'Atualização do seu cadastro',
    content: `<p>Olá <strong>{{nome}}</strong>,</p>

<p>Infelizmente, precisamos informar que seu cadastro como professor na plataforma <strong>Meu Personal</strong> não foi aprovado neste momento.</p>

<p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #991b1b;">Motivo:</strong><br>
  {{motivo}}
</p>

<p><strong>O que você pode fazer:</strong></p>
<ul>
  <li>Verificar se todos os dados do seu cadastro estão corretos</li>
  <li>Conferir se o CREF está válido e atualizado</li>
  <li>Entrar em contato com a franquia para mais informações</li>
</ul>

<p>Se você acredita que houve um engano ou deseja mais informações, entre em contato com a administração.</p>

<p>Atenciosamente,<br>Equipe Meu Personal</p>`,
    buttonText: undefined,
    buttonUrl: undefined,
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do professor', example: 'Maria Santos' },
      { name: 'motivo', placeholder: '{{motivo}}', description: 'Motivo da rejeição', example: 'Documentação incompleta' }
    ]
  },
  {
    slug: 'password-reset',
    name: 'Redefinição de Senha',
    description: 'Email enviado quando o usuário solicita redefinição de senha',
    title: 'Redefinição de Senha',
    content: `<p>Olá <strong>{{nome}}</strong>,</p>

<p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Meu Personal</strong>.</p>

<p style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: ${PRIMARY_COLOR};">🔐 Clique no botão abaixo para criar uma nova senha</strong><br>
  Este link é válido por 24 horas.
</p>

<p>Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá a mesma.</p>

<p>Atenciosamente,<br>Equipe Meu Personal</p>`,
    buttonText: 'Redefinir Senha',
    buttonUrl: '{{reset_url}}',
    variables: [
      { name: 'nome', placeholder: '{{nome}}', description: 'Nome do usuário', example: 'João Silva' },
      { name: 'reset_url', placeholder: '{{reset_url}}', description: 'URL de redefinição de senha', example: 'https://meupersonalfranquia.com.br/redefinir-senha?token=abc123' }
    ]
  },
  {
    slug: 'policy-published',
    name: 'Nova Política Publicada',
    description: 'Email enviado às franquias quando uma nova política é publicada',
    title: 'Nova Política de Operação - Versão {{version}}',
    content: `<p>Olá <strong>{{academyName}}</strong>,</p>

<p>A <strong>{{franqueadoraName}}</strong> publicou uma nova versão das políticas de operação.</p>

<p style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: ${PRIMARY_COLOR};">📋 Versão {{version}}</strong><br>
  Vigente a partir de: {{effectiveFrom}}
</p>

<p>Acesse o dashboard para ver todos os detalhes das novas políticas.</p>

<p>Atenciosamente,<br>Equipe Meu Personal</p>`,
    buttonText: 'Acessar Dashboard',
    buttonUrl: '{{dashboardUrl}}',
    variables: [
      { name: 'academyName', placeholder: '{{academyName}}', description: 'Nome da franquia', example: 'Academia Fitness Center' },
      { name: 'franqueadoraName', placeholder: '{{franqueadoraName}}', description: 'Nome da franqueadora', example: 'Meu Personal' },
      { name: 'version', placeholder: '{{version}}', description: 'Número da versão', example: '5' },
      { name: 'effectiveFrom', placeholder: '{{effectiveFrom}}', description: 'Data de vigência', example: '13/12/2025' },
      { name: 'dashboardUrl', placeholder: '{{dashboardUrl}}', description: 'URL do dashboard', example: 'https://app.meupersonal.com/franquia/dashboard' }
    ]
  },
  {
    slug: 'policy-rollback',
    name: 'Rollback de Política',
    description: 'Email enviado às franquias quando há rollback de política',
    title: 'Política Revertida - Versão {{newVersion}}',
    content: `<p>Olá <strong>{{academyName}}</strong>,</p>

<p>A <strong>{{franqueadoraName}}</strong> reverteu as políticas de operação para uma versão anterior.</p>

<p style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #92400e;">⚠️ Rollback Realizado</strong><br>
  Nova versão: {{newVersion}}<br>
  Revertido para: Versão {{rolledBackTo}}
</p>

{{#if comment}}
<p><strong>Motivo:</strong> {{comment}}</p>
{{/if}}

<p>Acesse o dashboard para ver todos os detalhes.</p>

<p>Atenciosamente,<br>Equipe Meu Personal</p>`,
    buttonText: 'Acessar Dashboard',
    buttonUrl: '{{dashboardUrl}}',
    variables: [
      { name: 'academyName', placeholder: '{{academyName}}', description: 'Nome da franquia', example: 'Academia Fitness Center' },
      { name: 'franqueadoraName', placeholder: '{{franqueadoraName}}', description: 'Nome da franqueadora', example: 'Meu Personal' },
      { name: 'newVersion', placeholder: '{{newVersion}}', description: 'Nova versão criada', example: '6' },
      { name: 'rolledBackTo', placeholder: '{{rolledBackTo}}', description: 'Versão revertida', example: '3' },
      { name: 'comment', placeholder: '{{comment}}', description: 'Motivo do rollback', example: 'Valores anteriores causaram problemas' },
      { name: 'dashboardUrl', placeholder: '{{dashboardUrl}}', description: 'URL do dashboard', example: 'https://app.meupersonal.com/franquia/dashboard' }
    ]
  }
]


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default template by slug
 */
function getDefaultTemplate(slug: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.slug === slug)
}

/**
 * Replace variables in content with example values
 */
export function replaceVariablesWithExamples(content: string, variables: Variable[]): string {
  let result = content
  for (const variable of variables) {
    const regex = new RegExp(variable.placeholder.replace(/[{}]/g, '\\$&'), 'g')
    result = result.replace(regex, variable.example)
  }
  return result
}

/**
 * Replace variables in content with actual values
 */
export function replaceVariables(content: string, values: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }
  return result
}

/**
 * Convert database row to EmailTemplate
 */
function dbRowToEmailTemplate(row: any, defaultTemplate: DefaultTemplate): EmailTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    title: row.title,
    content: row.content,
    buttonText: row.button_text,
    buttonUrl: row.button_url,
    variables: defaultTemplate.variables,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    isCustom: true
  }
}

/**
 * Convert default template to EmailTemplate
 */
function defaultToEmailTemplate(defaultTemplate: DefaultTemplate): EmailTemplate {
  return {
    slug: defaultTemplate.slug,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    title: defaultTemplate.title,
    content: defaultTemplate.content,
    buttonText: defaultTemplate.buttonText,
    buttonUrl: defaultTemplate.buttonUrl,
    variables: defaultTemplate.variables,
    isCustom: false
  }
}

// ============================================================================
// EmailTemplateService
// ============================================================================

export const emailTemplateService = {
  /**
   * Get all templates (custom + defaults merged)
   * Requirements: 1.1, 1.2
   */
  async getAllTemplates(): Promise<EmailTemplate[]> {
    // Fetch all custom templates from database
    const { data: customTemplates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[EmailTemplateService] Error fetching templates:', error)
      throw new Error('Erro ao buscar templates de email')
    }

    // Create a map of custom templates by slug
    const customMap = new Map<string, any>()
    if (customTemplates) {
      for (const ct of customTemplates) {
        customMap.set(ct.slug, ct)
      }
    }

    // Merge with defaults - custom templates take priority
    const result: EmailTemplate[] = []
    for (const defaultTemplate of DEFAULT_TEMPLATES) {
      const customRow = customMap.get(defaultTemplate.slug)
      if (customRow) {
        result.push(dbRowToEmailTemplate(customRow, defaultTemplate))
      } else {
        result.push(defaultToEmailTemplate(defaultTemplate))
      }
    }

    return result
  },

  /**
   * Get single template by slug
   * Requirements: 5.1, 5.3
   */
  async getTemplate(slug: string): Promise<EmailTemplate> {
    const defaultTemplate = getDefaultTemplate(slug)
    if (!defaultTemplate) {
      throw new Error('Template não encontrado')
    }

    // Try to fetch custom template from database
    const { data: customTemplate, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[EmailTemplateService] Error fetching template:', error)
      throw new Error('Erro ao buscar template de email')
    }

    if (customTemplate) {
      return dbRowToEmailTemplate(customTemplate, defaultTemplate)
    }

    return defaultToEmailTemplate(defaultTemplate)
  },

  /**
   * Update template content
   * Requirements: 2.3, 2.4
   */
  async updateTemplate(slug: string, data: UpdateTemplateDTO, updatedBy?: string): Promise<EmailTemplate> {
    const defaultTemplate = getDefaultTemplate(slug)
    if (!defaultTemplate) {
      throw new Error('Template não encontrado')
    }

    // Validate required fields
    if (!data.title || data.title.trim() === '') {
      throw new Error('Título é obrigatório')
    }
    if (!data.content || data.content.trim() === '') {
      throw new Error('Conteúdo é obrigatório')
    }

    // Upsert to database
    const { data: result, error } = await supabase
      .from('email_templates')
      .upsert({
        slug,
        title: data.title.trim(),
        content: data.content.trim(),
        button_text: data.buttonText?.trim() || null,
        button_url: data.buttonUrl?.trim() || null,
        variables: defaultTemplate.variables,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null
      }, {
        onConflict: 'slug'
      })
      .select()
      .single()

    if (error) {
      console.error('[EmailTemplateService] Error updating template:', error)
      throw new Error('Erro ao salvar template de email')
    }

    return dbRowToEmailTemplate(result, defaultTemplate)
  },

  /**
   * Reset template to default
   * Requirements: 5.2
   */
  async resetTemplate(slug: string): Promise<EmailTemplate> {
    const defaultTemplate = getDefaultTemplate(slug)
    if (!defaultTemplate) {
      throw new Error('Template não encontrado')
    }

    // Delete custom template from database
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('slug', slug)

    if (error) {
      console.error('[EmailTemplateService] Error resetting template:', error)
      throw new Error('Erro ao resetar template de email')
    }

    return defaultToEmailTemplate(defaultTemplate)
  },

  /**
   * Get template for sending (custom or default)
   * Requirements: 5.1, 5.3
   */
  async getTemplateForSending(slug: string): Promise<EmailTemplateContent> {
    const template = await this.getTemplate(slug)
    return {
      title: template.title,
      content: template.content,
      buttonText: template.buttonText,
      buttonUrl: template.buttonUrl
    }
  },

  /**
   * Get rendered preview with example values
   * Requirements: 3.1, 3.2, 3.3
   */
  async getPreview(slug: string, customContent?: Partial<UpdateTemplateDTO>): Promise<string> {
    const defaultTemplate = getDefaultTemplate(slug)
    if (!defaultTemplate) {
      throw new Error('Template não encontrado')
    }

    // Use custom content if provided, otherwise fetch from DB or use default
    let title: string
    let content: string
    let buttonText: string | undefined
    let buttonUrl: string | undefined

    if (customContent) {
      title = customContent.title || defaultTemplate.title
      content = customContent.content || defaultTemplate.content
      buttonText = customContent.buttonText ?? defaultTemplate.buttonText
      buttonUrl = customContent.buttonUrl ?? defaultTemplate.buttonUrl
    } else {
      const template = await this.getTemplate(slug)
      title = template.title
      content = template.content
      buttonText = template.buttonText
      buttonUrl = template.buttonUrl
    }

    // Replace variables with example values in all content including inline button URLs
    const variables = defaultTemplate.variables
    const previewTitle = replaceVariablesWithExamples(title, variables)
    const previewContent = replaceVariablesWithExamples(content, variables)
    const previewButtonUrl = buttonUrl ? replaceVariablesWithExamples(buttonUrl, variables) : undefined

    // Render with base template
    return getHtmlEmailTemplate(previewTitle, previewContent, previewButtonUrl, buttonText)
  },

  /**
   * Validate if a slug is a valid system template
   */
  isValidSlug(slug: string): boolean {
    return SYSTEM_TEMPLATE_SLUGS.includes(slug as SystemTemplateSlug)
  },

  /**
   * Get all default templates (for reference)
   */
  getDefaultTemplates(): DefaultTemplate[] {
    return [...DEFAULT_TEMPLATES]
  }
}
