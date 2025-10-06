import { LoginTemplate } from '@/components/auth/login-template'

const copy = {
  heroTitle: 'Bem-vindo de volta à',
  heroHighlight: 'sua jornada como aluno',
  heroDescription: 'Acompanhe seus treinos, créditos e aulas personalizadas com os melhores professores.',
  pageTitle: 'Área do aluno',
  pageSubtitle: 'Entre com seu email e senha para acessar o painel do aluno.',
  mobileTitle: 'Entrar como aluno',
  mobileSubtitle: 'Acesse agenda, créditos e treinos',
  backLinkLabel: 'Voltar ao início',
  backLinkHref: '/',
  rememberMeLabel: 'Manter conectado',
  submitLabel: 'Entrar como aluno',
  loadingLabel: 'Entrando...',
  forgotPasswordLabel: 'Esqueci minha senha',
  forgotPasswordHref: '/esqueci-senha?role=aluno',
  signupPrompt: 'Ainda não tem conta?',
  signupCtaLabel: 'Criar conta de aluno',
  signupHref: '/aluno/cadastro',
  successMessage: 'Login do aluno realizado com sucesso!',
  roleMismatchMessage: 'Use este acesso apenas com uma conta de aluno.',
  invalidCredentialsMessage: 'Email ou senha do aluno incorretos.',
  genericErrorMessage: 'Não foi possível entrar. Tente novamente.',
} as const

export default function AlunoLoginPage() {
  return (
    <LoginTemplate
      expectedRole="STUDENT"
      defaultRedirect="/aluno/inicio"
      copy={copy}
    />
  )
}