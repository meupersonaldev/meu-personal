import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, GraduationCap, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

const options = [
  {
    title: 'Sou aluno',
    description: 'Acesse seus créditos, acompanhe aulas e encontre professores.',
    href: '/aluno/login',
    icon: User,
    accentClass: 'bg-meu-accent/10 text-meu-accent'
  },
  {
    title: 'Sou professor',
    description: 'Gerencie sua agenda, confirme check-ins e acompanhe alunos.',
    href: '/professor/login',
    icon: GraduationCap,
    accentClass: 'bg-meu-cyan/10 text-meu-cyan'
  }
] as const

export default function LoginSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(/images/photo-1571019613454-1cb2f99b2d8b-bg.jpg)"
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary/90 to-meu-primary-dark/80" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-meu-accent/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-meu-cyan/10 rounded-full blur-2xl animate-pulse delay-1000" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white space-y-8">
          <Image
            src="/images/logo.png"
            alt="Meu Personal"
            width={64}
            height={64}
            className="object-contain"
          />
          <h1 className="text-5xl font-bold leading-tight">
            Escolha sua forma de entrar
            <span className="text-meu-accent block">Meu Personal</span>
          </h1>
          <p className="text-xl text-white/80 max-w-md leading-relaxed">
            Selecione se você é aluno ou professor para acessar a experiência ideal para o seu objetivo.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8 lg:p-16">
        <div className="w-full max-w-2xl mx-auto my-auto space-y-10">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Link>

          <div className="text-center lg:text-left space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Como você quer entrar?</h2>
            <p className="text-gray-600 text-lg">
              Escolha o painel correspondente ao seu perfil. Você pode alternar a qualquer momento voltando para esta página.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {options.map((option) => (
              <div
                key={option.href}
                className="border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${option.accentClass}`}>
                  <option.icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{option.title}</h3>
                <p className="text-gray-600 flex-1 mb-6">{option.description}</p>
                <Button asChild className="w-full bg-meu-primary hover:bg-meu-primary-dark">
                  <Link href={option.href}>Continuar</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}