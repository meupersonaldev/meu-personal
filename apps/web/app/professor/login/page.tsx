import { LoginTemplate } from '@/components/auth/login-template'

const copy = {
  heroTitle: 'Bem-vindo de volta ao',
  heroHighlight: 'painel do professor',
  heroDescription: 'Gerencie sua agenda, acompanhe alunos e organize seus horários em um só lugar.',
  pageTitle: 'Área do professor',
  pageSubtitle: 'Entre com seu email e senha para continuar atendendo seus alunos.',
  mobileTitle: 'Entrar como professor',
  mobileSubtitle: 'Acesse agenda, check-ins e aulas',
  backLinkLabel: 'Voltar ao início',
  backLinkHref: '/',
  rememberMeLabel: 'Manter conectado',
  submitLabel: 'Entrar como professor',
  loadingLabel: 'Entrando...',
  forgotPasswordLabel: 'Esqueci minha senha',
  forgotPasswordHref: '/esqueci-senha?role=professor',
  signupPrompt: 'Primeira vez aqui?',
  signupCtaLabel: 'Criar conta de professor',
  signupHref: '/professor/cadastro',
  successMessage: 'Login do professor realizado com sucesso!',
  roleMismatchMessage: 'Use este acesso apenas com uma conta de professor.',
  invalidCredentialsMessage: 'Email ou senha do professor incorretos.',
  genericErrorMessage: 'Não foi possível entrar. Tente novamente.',
} as const

export default function ProfessorLoginPage() {
  return (
    <LoginTemplate
      expectedRole="TEACHER"
      defaultRedirect="/professor/dashboard"
      copy={copy}
    />
  )
}