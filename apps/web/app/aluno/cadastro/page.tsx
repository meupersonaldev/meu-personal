'use client'

import { RegisterTemplate } from "@/components/auth/register-template"

const features = [
  {
    title: "Encontre os melhores espaços",
    description: "Descubra academias e estúdios com a estrutura ideal para seus treinos.",
    icon: "activity",
    accentClass: "bg-meu-accent/20 text-white",
  },
  {
    title: "Conecte-se com profissionais",
    description: "Acesse uma rede de professores qualificados para atingir seus objetivos.",
    icon: "users",
    accentClass: "bg-meu-cyan/20 text-white",
  },
  {
    title: "Acompanhe seu progresso",
    description: "Monitore suas aulas, check-ins e evolução em tempo real.",
    icon: "heart",
    accentClass: "bg-white/20 text-white",
  },
] as const

export default function AlunoCadastroPage() {
  return (
    <RegisterTemplate
      initialRole="STUDENT"
      lockedRole="STUDENT"
      copy={{
        heroTitle: "Comece sua evolucao",
        heroHighlight: "como aluno Meu Personal",
        heroDescription:
          "Cadastre-se para encontrar professores ideais, acompanhar resultados e manter a motivacao em alta.",
        pageTitle: "Criar conta de aluno",
        pageSubtitle: "Leva menos de dois minutos para liberar o painel do aluno.",
        mobileTitle: "Criar conta",
        mobileSubtitle: "Painel otimizado para alunos",
        backLinkLabel: "Voltar ao login",
        backLinkHref: "/aluno/login",
        submitLabel: "Criar conta de aluno",
        loadingLabel: "Criando conta...",
        loginPrompt: "Ja tem conta?",
        loginCtaLabel: "Entrar como aluno",
        loginHref: "/aluno/login",
        features,
      }}
      successRedirect="/aluno/inicio"
    />
  )
}

