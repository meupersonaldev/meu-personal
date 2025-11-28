"use client"

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, GraduationCap, Loader2, Users, Shield, Clock, Trophy, ClipboardList, Activity, Heart, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/ui/logo"
import { useAuthStore, UserRole } from "@/lib/stores/auth-store"
import { isStrongPassword, validateCpfCnpj } from '@/lib/utils'

const FEATURE_ICON_MAP = {
  shield: Shield,
  clock: Clock,
  trophy: Trophy,
  users: Users,
  clipboard: ClipboardList,
  activity: Activity,
  heart: Heart,
  sparkles: Sparkles,
} as const

export type RegisterFeatureIcon = keyof typeof FEATURE_ICON_MAP

type AccessibleRole = Extract<UserRole, "STUDENT" | "TEACHER">

type RegisterFeature = {
  title: string
  description: string
  icon: RegisterFeatureIcon
  accentClass?: string
}

type RegisterCopy = {
  heroTitle: string
  heroHighlight: string
  heroDescription: string
  pageTitle: string
  pageSubtitle: string
  mobileTitle?: string
  mobileSubtitle?: string
  backLinkLabel?: string
  backLinkHref?: string
  submitLabel?: string
  loadingLabel?: string
  loginPrompt?: string
  loginCtaLabel?: string
  loginHref?: string
  features?: RegisterFeature[]
}

type RegisterTemplateProps = {
  initialRole: AccessibleRole
  lockedRole?: AccessibleRole | null
  allowRoleSwitch?: boolean
  copy: RegisterCopy
  successRedirect: string | ((role: AccessibleRole) => string)
  extraFields?: ReactNode
  backgroundImageUrl?: string
}

type FormState = {
  name: string
  email: string
  phone: string
  cpf: string
  password: string
  confirmPassword: string
  role: AccessibleRole
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY' | ''
}

export function RegisterTemplate({
  initialRole,
  lockedRole = null,
  allowRoleSwitch = false,
  copy,
  successRedirect,
  extraFields,
  backgroundImageUrl = '/images/photo-1571019613454-1cb2f99b2d8b-bg.jpg',
}: RegisterTemplateProps) {
  const router = useRouter()
  const { register } = useAuthStore()
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
    role: lockedRole ?? initialRole,
    gender: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [teacherCref, setTeacherCref] = useState('')
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  
  const [crefCardFile, setCrefCardFile] = useState<File | null>(null)

  useEffect(() => {
    if (!lockedRole) return
    setFormData((prev) =>
      prev.role === lockedRole ? prev : { ...prev, role: lockedRole }
    )
  }, [lockedRole])

  useEffect(() => {
    if (lockedRole) return
    setFormData((prev) =>
      prev.role === initialRole ? prev : { ...prev, role: initialRole }
    )
  }, [initialRole, lockedRole])

  useEffect(() => {
    if (formData.password === formData.confirmPassword) {
      setPasswordMismatch(false)
    }
  }, [formData.password, formData.confirmPassword])

  const effectiveRole = useMemo<AccessibleRole>(() => formData.role, [formData.role])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setPasswordMismatch(true)
      return
    }

    if (!isStrongPassword(formData.password)) {
      toast.error('Senha fraca. Use no mínimo 6 caracteres, com letras maiúsculas, minúsculas, números e símbolos.')
      return
    }

    if (!formData.gender) {
      toast.error('Selecione seu gênero')
      return
    }

    // Validar CPF
    const cleanCpf = formData.cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      toast.error("CPF inválido. Deve conter 11 dígitos.")
      return
    }

    // Validar dígitos verificadores do CPF
    if (!validateCpfCnpj(cleanCpf)) {
      toast.error("CPF inválido. Verifique os dígitos e tente novamente.")
      return
    }

    setIsLoading(true)

    try {
      if (effectiveRole === 'TEACHER') {
        if (!teacherCref.trim()) {
          toast.error('CREF é obrigatório para professores')
          setIsLoading(false)
          return
        }
        if (!crefCardFile) {
          toast.error('Envie a carteirinha (CREF) para continuar')
          setIsLoading(false)
          return
        }
      }
      const teacherPayload = effectiveRole === 'TEACHER'
        ? {
            teacher: {
              cref: teacherCref.trim() || undefined,
            },
          }
        : {}
      const success = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cpf: cleanCpf, // Enviar CPF sem formatação
        password: formData.password,
        passwordConfirmation: formData.confirmPassword,
        gender: formData.gender as any,
        role: effectiveRole,
        ...(teacherPayload as any),
      })

      if (!success) {
        toast.error("Erro ao criar conta. Tente novamente.")
        return
      }

      // Upload opcional da carteirinha, se informado e usuário autenticado
      try {
        const { user, token } = useAuthStore.getState()
        if (user?.id && token && crefCardFile) {
          const form = new FormData()
          form.append('file', crefCardFile)
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const resp = await fetch(`${API_URL}/api/users/${user.id}/cref-card`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
          })
          if (!resp.ok) {
            const data = await resp.json().catch(() => ({}))
            toast.error(data?.error || 'Falha ao enviar carteirinha. Tente novamente.')
            setIsLoading(false)
            return
          }
        }
      } catch {
        toast.error('Erro ao enviar carteirinha. Tente novamente.')
        setIsLoading(false)
        return
      }

      toast.success("Conta criada com sucesso!")

      const nextRoute =
        typeof successRedirect === "function"
          ? successRedirect(effectiveRole)
          : successRedirect

      router.push(nextRoute)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao criar conta. Tente novamente."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Validação automática do CREF removida (MVP com aprovação manual da franqueadora)

  const renderFeatures = () => {
    if (!copy.features?.length) return null

    return (
      <div className="space-y-6">
        {copy.features.map((feature) => {
          const IconComponent = FEATURE_ICON_MAP[feature.icon] ?? Users

          return (
            <div key={feature.title} className="flex items-center space-x-4">
              <div
                className={
                  `w-12 h-12 rounded-xl flex items-center justify-center ${
                    feature.accentClass ?? "bg-white/10 text-white"
                  }`
                }
              >
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold text-white">{feature.title}</div>
                <div className="text-white/70 text-sm">{feature.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-meu-primary via-meu-primary-dark to-meu-primary relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-meu-primary/90 to-meu-primary-dark/80"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-meu-accent/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-meu-cyan/10 rounded-full blur-2xl animate-pulse delay-1000"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <Logo
              size="md"
              variant="default"
              showText={false}
              className="mb-[-50px]"
            />
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              {copy.heroTitle}
              <span className="text-meu-accent block">{copy.heroHighlight}</span>
            </h1>
            <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
              {copy.heroDescription}
            </p>
            {renderFeatures()}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto">
          <Link
            href={copy.backLinkHref ?? '/'}
            className="inline-flex items-center text-gray-600 hover:text-meu-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {copy.backLinkLabel ?? 'Voltar'}
          </Link>

          <div className="lg:hidden text-center mb-12">
            <div className="flex justify-center mt-[-86px] mb-[-53px]">
              <Logo
                size="lg"
                variant="dark"
                showText={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{copy.mobileTitle ?? copy.pageTitle}</h1>
            <p className="text-gray-600">{copy.mobileSubtitle ?? copy.pageSubtitle}</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">{copy.pageTitle}</h2>
            <p className="text-gray-600 text-lg">{copy.pageSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="Seu nome completo"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '') // Remove não-números
                  if (value.length <= 11) {
                    if (value.length <= 2) {
                      value = value
                    } else if (value.length <= 6) {
                      // (11) 1234
                      value = value.replace(/(\d{2})(\d+)/, '($1) $2')
                    } else if (value.length <= 10) {
                      // (11) 1234-5678 (fixo)
                      value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
                    } else {
                      // (11) 91234-5678 (celular com 9º dígito)
                      value = value.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
                    }
                  }
                  setFormData(prev => ({ ...prev, phone: value }))
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="(11) 91234-5678"
                maxLength={15}
                required
              />
              <p className="text-xs text-gray-500">Celular: (11) 91234-5678 | Fixo: (11) 1234-5678</p>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Gênero
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent bg-white"
                required
              >
                <option value="" disabled>Selecione</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="NON_BINARY">Não binário</option>
                <option value="OTHER">Outro</option>
                <option value="PREFER_NOT_TO_SAY">Prefiro não informar</option>
              </select>
              <p className="text-xs text-gray-500">Informação interna para perfil e estatísticas</p>
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
                CPF
              </label>
              <Input
                id="cpf"
                type="text"
                value={formData.cpf}
                onChange={(e) => {
  let value = e.target.value.replace(/\D/g, '')
  if (value.length <= 11) {
    if (value.length <= 3) {
      value = value
    } else if (value.length <= 6) {
      value = value.replace(/(\d{3})(\d+)/, '$1.$2')
    } else if (value.length <= 9) {
      value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
    } else {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4')
    }
  }
  setFormData(prev => ({ ...prev, cpf: value }))
}}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
              <p className="text-xs text-gray-500">Apenas números serão considerados</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="Crie uma senha forte"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Mínimo 6 caracteres, com maiúscula, minúscula, número e símbolo.</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="Repita sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordMismatch && <p className="text-sm text-red-500">As senhas não coincidem.</p>}
            </div>

            {/* Role Selection */}
            {!lockedRole && allowRoleSwitch && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de conta
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'STUDENT' }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === 'STUDENT'
                        ? 'border-meu-primary bg-meu-primary/10 text-meu-primary'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-meu-primary/50'
                    }`}
                  >
                    <GraduationCap className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Aluno</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'TEACHER' }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === 'TEACHER'
                        ? 'border-meu-primary bg-meu-primary/10 text-meu-primary'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-meu-primary/50'
                    }`}
                  >
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Professor</div>
                  </button>
                </div>
              </div>
            )}

            {extraFields}

          {effectiveRole === 'TEACHER' && (
            <div className="space-y-5">
              <div className="rounded-lg border border-dashed border-meu-primary/30 bg-white p-4 text-sm text-meu-primary-dark">
                Preencha suas informações profissionais. CREF e a carteirinha são obrigatórios; você poderá cadastrar suas especialidades depois no painel/admin.
              </div>
              <div className="space-y-2">
                <label htmlFor="cref" className="block text-sm font-medium text-gray-700">
                  CREF
                </label>
                <Input
                  id="cref"
                  type="text"
                  value={teacherCref}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase()
                    // Remove tudo exceto números, letras, hífen e barra
                    value = value.replace(/[^0-9A-Z\-\/]/g, '')
                    
                    // Remove CREF do início se o usuário digitar
                    if (value.startsWith('CREF')) {
                      value = value.substring(4).trim()
                    }
                    
                    // Formatar: 12345-G/SP
                    // Extrair apenas números e letras
                    const numbers = value.replace(/[^0-9]/g, '')
                    const letters = value.replace(/[^A-Z]/g, '')
                    
                    if (numbers.length > 0) {
                      let formatted = numbers.substring(0, 6) // Máx 6 dígitos
                      
                      if (letters.length > 0) {
                        formatted += '-' + letters.charAt(0) // Primeira letra após o hífen
                        
                        if (letters.length > 1) {
                          formatted += '/' + letters.substring(1, 3) // UF (2 letras)
                        }
                      } else if (numbers.length > 5) {
                        formatted = numbers.substring(0, 5) + '-' + numbers.substring(5, 6)
                      }
                      
                      value = formatted
                    }
                    
                    setTeacherCref(value)
                  }}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                  placeholder="12345-G/SP"
                  maxLength={13}
                  required
                />
                <p className="text-xs text-gray-500">Formato: 12345-G/SP (número-categoria/UF)</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="crefCard" className="block text-sm font-medium text-gray-700">
                  Upload da carteirinha (obrigatório)
                </label>
                <input
                  id="crefCard"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setCrefCardFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg p-2 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-meu-primary/10 file:text-meu-primary file:rounded-md"
                  required
                />
                <p className="text-xs text-gray-500">Aceitamos imagens (JPG, PNG, WEBP) ou PDF. Máx 8MB.</p>
              </div>
              {/* Validação automática do CREF removida; aprovação será feita pela franqueadora */}
            </div>
          )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (formData.role === 'TEACHER' && !crefCardFile)}
              className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {copy.loadingLabel || "Criando conta..."}
                </>
              ) : (
                copy.submitLabel || "Criar conta"
              )}
            </Button>
          </form>

          {/* Back Link - Desktop */}
          {copy.backLinkLabel && copy.backLinkHref && (
            <div className="hidden lg:block text-center mt-6">
              <Link
                href={copy.backLinkHref}
                className="text-gray-600 hover:text-meu-primary inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {copy.backLinkLabel}
              </Link>
            </div>
          )}

          {/* Login Prompt */}
          {copy.loginPrompt && copy.loginCtaLabel && copy.loginHref && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {copy.loginPrompt}{' '}
                <Link
                  href={copy.loginHref}
                  className="text-meu-primary hover:text-meu-primary-dark font-medium transition-colors"
                >
                  {copy.loginCtaLabel}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
