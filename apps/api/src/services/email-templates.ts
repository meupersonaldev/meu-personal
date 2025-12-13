import { emailTemplateService, replaceVariables, SystemTemplateSlug } from './email-template.service'

// Logo URL - hospedada no Supabase Storage para garantir acesso em emails
const LOGO_URL = 'https://fstbhakmmznfdeluyexc.supabase.co/storage/v1/object/public/assets/logo.png'
const PRIMARY_COLOR = '#002C4E'

// ============================================================================
// New Template Functions using EmailTemplateService
// These functions fetch custom templates from DB, falling back to defaults
// ============================================================================

/**
 * Get rendered email HTML using EmailTemplateService
 * Fetches custom template if exists, falls back to default
 * Requirements: 5.1, 5.3
 */
export async function getEmailFromTemplate(
  slug: SystemTemplateSlug,
  variables: Record<string, string>
): Promise<string> {
  try {
    const template = await emailTemplateService.getTemplateForSending(slug)
    
    // Replace variables in content
    const title = replaceVariables(template.title, variables)
    const content = replaceVariables(template.content, variables)
    const buttonUrl = template.buttonUrl ? replaceVariables(template.buttonUrl, variables) : undefined
    
    return getHtmlEmailTemplate(title, content, buttonUrl, template.buttonText)
  } catch (error) {
    console.error(`[EMAIL-TEMPLATES] Error fetching template ${slug}:`, error)
    // Re-throw to let caller handle the error
    throw error
  }
}

/**
 * Get welcome student email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getWelcomeStudentEmail(name: string, loginUrl: string): Promise<string> {
  return getEmailFromTemplate('welcome-student', {
    nome: name,
    login_url: loginUrl
  })
}

/**
 * Get welcome teacher email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getWelcomeTeacherEmail(name: string, loginUrl: string): Promise<string> {
  return getEmailFromTemplate('welcome-teacher', {
    nome: name,
    login_url: loginUrl
  })
}

/**
 * Get welcome student created (with password) email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getWelcomeStudentCreatedEmail(
  name: string, 
  email: string, 
  password: string, 
  loginUrl: string
): Promise<string> {
  return getEmailFromTemplate('welcome-student-created', {
    nome: name,
    email: email,
    senha: password,
    login_url: loginUrl
  })
}

/**
 * Get welcome teacher created (with password) email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getWelcomeTeacherCreatedEmail(
  name: string, 
  email: string, 
  password: string, 
  loginUrl: string
): Promise<string> {
  return getEmailFromTemplate('welcome-teacher-created', {
    nome: name,
    email: email,
    senha: password,
    login_url: loginUrl
  })
}

/**
 * Get student linked email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getStudentLinkedEmail(
  studentName: string, 
  teacherName: string, 
  loginUrl: string
): Promise<string> {
  return getEmailFromTemplate('student-linked', {
    nome: studentName,
    professor_nome: teacherName,
    login_url: loginUrl
  })
}

/**
 * Get teacher approved email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getTeacherApprovedEmail(name: string, loginUrl: string): Promise<string> {
  return getEmailFromTemplate('teacher-approved', {
    nome: name,
    login_url: loginUrl
  })
}

/**
 * Get teacher rejected email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getTeacherRejectedEmail(name: string, reason?: string): Promise<string> {
  return getEmailFromTemplate('teacher-rejected', {
    nome: name,
    motivo: reason || 'Não especificado'
  })
}

/**
 * Get password reset email using EmailTemplateService
 * Requirements: 5.1, 5.3
 */
export async function getPasswordResetEmail(name: string, resetUrl: string): Promise<string> {
  return getEmailFromTemplate('password-reset', {
    nome: name,
    reset_url: resetUrl
  })
}

// ============================================================================
// Legacy Template Functions (kept for backward compatibility)
// These will be deprecated in favor of the async versions above
// ============================================================================

export const getHtmlEmailTemplate = (
  title: string,
  content: string,
  buttonUrl?: string,
  buttonText?: string
) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
    }
  </style>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  <div style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
    <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="background-color: ${PRIMARY_COLOR}; padding: 15px 29px; text-align: center; overflow: hidden;">
        <img id="1765109664553154100_imgsrc_url_0" alt="Meu Personal" style="height: 40px; width: auto; max-width: 200px;" src="${LOGO_URL}" />
      </div>

      <!-- Content -->
      <div class="content" style="padding: 40px; color: #374151; line-height: 1.6;">
        <!-- Title -->
        <h1 style="color: ${PRIMARY_COLOR}; margin-top: 0; font-size: 24px; text-align: center; margin-bottom: 24px;">${title}</h1>
        
        <!-- Body -->
        <div style="font-size: 16px;">
          ${content}
        </div>
        
        <!-- Action Button -->
        ${
          buttonUrl
            ? `
          <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
            <a href="${buttonUrl}" target="_blank" style="display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${buttonText || 'Acessar Plataforma'}
            </a>
          </div>
          <p style="text-align: center; font-size: 14px; color: #9ca3af; margin-top: 30px;">
            Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
            <a href="${buttonUrl}" target="_blank" style="color: ${PRIMARY_COLOR}; word-break: break-all;">${buttonUrl}</a>
          </p>
        `
            : ''
        }
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 font-weight: 600;">Meu Personal</p>
        <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Todos os direitos reservados.</p>
        <p style="margin: 10px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

// Template de boas-vindas para alunos
export const getWelcomeStudentEmailTemplate = (name: string, loginUrl: string) => {
  const content = `
    <p>Olá <strong>${name}</strong>!</p>
    
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
    
    <p>Bons treinos!</p>
  `

  return getHtmlEmailTemplate(
    'Bem-vindo ao Meu Personal!',
    content,
    loginUrl,
    'Acessar Minha Conta'
  )
}

// Template de boas-vindas para professores
export const getWelcomeTeacherEmailTemplate = (name: string, loginUrl: string) => {
  const content = `
    <p>Olá <strong>${name}</strong>!</p>
    
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
    
    <p>Sucesso na sua jornada!</p>
  `

  return getHtmlEmailTemplate(
    'Bem-vindo ao Meu Personal!',
    content,
    loginUrl,
    'Acessar Minha Conta'
  )
}

// Template de aprovação de professor
export const getTeacherApprovedEmailTemplate = (name: string, loginUrl: string) => {
  const content = `
    <p>Olá <strong>${name}</strong>!</p>
    
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
    
    <p>Bons treinos e sucesso!</p>
  `

  return getHtmlEmailTemplate(
    'Cadastro Aprovado! 🎉',
    content,
    loginUrl,
    'Acessar Minha Conta'
  )
}

// Template de rejeição de professor
export const getTeacherRejectedEmailTemplate = (name: string, reason?: string) => {
  const content = `
    <p>Olá <strong>${name}</strong>,</p>
    
    <p>Infelizmente, precisamos informar que seu cadastro como professor na plataforma <strong>Meu Personal</strong> não foi aprovado neste momento.</p>
    
    ${reason ? `
    <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <strong style="color: #991b1b;">Motivo:</strong><br>
      ${reason}
    </p>
    ` : ''}
    
    <p><strong>O que você pode fazer:</strong></p>
    <ul>
      <li>Verificar se todos os dados do seu cadastro estão corretos</li>
      <li>Conferir se o CREF está válido e atualizado</li>
      <li>Entrar em contato com a franquia para mais informações</li>
    </ul>
    
    <p>Se você acredita que houve um engano ou deseja mais informações, entre em contato com a administração.</p>
    
    <p>Atenciosamente,<br>Equipe Meu Personal</p>
  `

  return getHtmlEmailTemplate(
    'Atualização do seu cadastro',
    content
  )
}
