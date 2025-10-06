'use client'

import { RegisterTemplate } from "@/components/auth/register-template"

const features = [
  {
    title: "Painel completo",
    description: "Gerencie agenda, check-ins e alunos em um lugar so.",
    icon: "users",
    accentClass: "bg-meu-cyan/20 text-meu-cyan",
  },
  {
    title: "Reconhecimento profissional",
    description: "Destaque-se para alunos que buscam especialistas verificados.",
    icon: "shield",
    accentClass: "bg-green-500/20 text-green-400",
  },
  {
    title: "Ferramentas pensadas para voce",
    description: "Organize preferencias, planos e comunicacao com facilidade.",
    icon: "clipboard",
    accentClass: "bg-yellow-400/20 text-yellow-400",
  },
] as const

export default function ProfessorCadastroPage() {
  return (
    <RegisterTemplate
      initialRole="TEACHER"
      lockedRole="TEACHER"
      copy={{
        heroTitle: "Construa sua carreira",
        heroHighlight: "como professor parceiro",
        heroDescription:
          "Cadastre-se para acessar ferramentas que ajudam a entregar experiencias inesqueciveis aos seus alunos.",
        pageTitle: "Criar conta de professor",
        pageSubtitle: "Preencha seus dados para liberar o painel do professor.",
        mobileTitle: "Criar conta",
        mobileSubtitle: "Painel dedicado para profissionais",
        backLinkLabel: "Voltar ao login",
        backLinkHref: "/professor/login",
        submitLabel: "Criar conta de professor",
        loadingLabel: "Criando conta...",
        loginPrompt: "Ja e parceiro?",
        loginCtaLabel: "Entrar no painel do professor",
        loginHref: "/professor/login",
        features,
      }}
      successRedirect="/professor/dashboard"
      extraFields={
        <div className="rounded-lg border border-dashed border-meu-cyan/40 bg-meu-cyan/5 p-4 text-sm text-meu-cyan">
          Em breve vamos solicitar informacoes profissionais adicionais (como CREF e especialidades) para completar seu perfil.
        </div>
      }
    />
  )
}

