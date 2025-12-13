'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Clock, Edit2, History, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

interface Variable {
  name: string
  placeholder: string
  description: string
  example: string
}

interface EmailTemplate {
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

export default function EmailTemplatesPage() {
  const router = useRouter()
  const { token, isAuthenticated } = useFranqueadoraStore()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/email-templates`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar templates')
      }

      const data = await response.json()
      setTemplates(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const formatLastModified = (date?: string) => {
    if (!date) return 'Nunca modificado'
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Carregando templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="bg-red-50 text-red-900 p-4 rounded-xl mb-6 border border-red-100">
            <p className="font-medium">{error}</p>
          </div>
          <Button onClick={fetchTemplates} variant="outline" className="min-w-[150px]">Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 space-y-6">
        {/* Header Desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-1">Comunicação</p>
            <h1 className="text-3xl font-bold text-meu-primary tracking-tight">Templates de Email</h1>
            <p className="text-gray-500 mt-1">Personalize os emails transacionais do sistema</p>
          </div>
          <Button
            variant="outline"
            className="w-full lg:w-auto"
            onClick={() => router.push('/franqueadora/dashboard/emails/historico')}
          >
            <History className="h-4 w-4 mr-2" />
            Ver Histórico de Envios
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {templates.map((template) => (
            <Card
              key={template.slug}
              className="group hover:shadow-lg hover:border-meu-primary/30 transition-all cursor-pointer overflow-hidden border-gray-200"
              onClick={() => router.push(`/franqueadora/dashboard/emails/${template.slug}`)}
            >
              <CardHeader className="pb-3 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-meu-primary group-hover:scale-105 transition-transform">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900 leading-tight">
                        {template.name}
                      </CardTitle>
                      {template.isCustom && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 mt-1.5 text-[10px] h-5 border-none">
                          Personalizado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-300 group-hover:text-meu-primary transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <CardDescription className="mb-4 line-clamp-2 text-sm text-gray-600">
                  {template.description}
                </CardDescription>
                <div className="flex items-center text-xs text-gray-400 font-medium">
                  <Clock className="h-3 w-3 mr-1.5" />
                  {template.isCustom
                    ? formatLastModified(template.updatedAt)
                    : 'Padrão do sistema'
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum template encontrado</h3>
            <p className="text-gray-500 text-sm">Parece que ainda não há templates configurados.</p>
          </div>
        )}
      </div>
    </FranqueadoraGuard>
  )
}
