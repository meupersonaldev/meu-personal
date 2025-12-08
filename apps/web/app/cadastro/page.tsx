'use client'



import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { RegisterTemplate } from "@/components/auth/register-template"

const defaultFeatures = [
  {
    title: "100% gratuito",
    description: "Cadastro sem custos",
    icon: "shield" as const,
    accentClass: "bg-green-500/20 text-green-400",
  },
  {
    title: "Ativacao instantanea",
    description: "Comece a usar agora mesmo",
    icon: "clock" as const,
    accentClass: "bg-meu-cyan/20 text-meu-cyan",
  },
  {
    title: "Professores premium",
    description: "Acesso aos melhores profissionais",
    icon: "trophy" as const,
    accentClass: "bg-yellow-400/20 text-yellow-400",
  },
]

function CadastroPageContent() {
  const searchParams = useSearchParams()
  const roleParam = searchParams?.get("role") ?? ""

  const initialRole = useMemo(() => {
    const normalized = roleParam.toLowerCase()
    if (normalized === "professor" || normalized === "teacher") {
      return "TEACHER" as const
    }
    return "STUDENT" as const
  }, [roleParam])

  return (
    <RegisterTemplate
      initialRole={initialRole}
      allowRoleSwitch
      copy={{
        heroTitle: "Sua jornada fitness",
        heroHighlight: "comeca aqui",
        heroDescription:
          "Cadastre-se gratuitamente e tenha acesso aos melhores personal trainers da sua regiao.",
        pageTitle: "Criar conta",
        pageSubtitle: "Comece sua jornada fitness conosco hoje mesmo.",
        mobileTitle: "Criar conta",
        mobileSubtitle: "Escolha entre perfil de aluno ou professor",
        backLinkLabel: "Voltar ao inicio",
        backLinkHref: "/",
        submitLabel: "Criar conta gratuita",
        loadingLabel: "Criando conta...",
        loginPrompt: "Ja tem uma conta?",
        loginCtaLabel: "Fazer login",
        loginHref: "/login",
        features: defaultFeatures,
      }}
      successRedirect={(role) =>
        role === "STUDENT" ? "/aluno/inicio" : "/professor/dashboard"
      }
    />
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div />}>
      <CadastroPageContent />
    </Suspense>
  )
}

