'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Clock, Edit2, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTemplates}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8">
        {/* Header Desktop */}
        <div className="hidden lg:flex lg:items-center lg:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Configurações</p>
            <h1 className="text-3xl font-bold text-gray-900">Templates de Email</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/franqueadora/dashboard/emails/historico')}
          >
            <History className="h-4 w-4 mr-2" />
            Histórico de Envios
          </Button>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Templates de Email</h2>
              <p className="text-sm text-gray-600">Personalize os emails do sistema</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/franqueadora/dashboard/emails/historico')}
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-gray-600">
            Personalize o conteúdo dos emails enviados pelo sistema. O layout base (cabeçalho, rodapé e estilo) 
            permanece fixo para manter a identidade visual.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {templates.map((template) => (
            <Card 
              key={template.slug} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => router.push(`/franqueadora/dashboard/emails/${template.slug}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-meu-primary/10 rounded-lg">
                      <Mail className="h-5 w-5 text-meu-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.isCustom && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                          Personalizado
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3 line-clamp-2">
                  {template.description}
                </CardDescription>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {template.isCustom 
                    ? formatLastModified(template.updatedAt)
                    : 'Usando padrão do sistema'
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum template encontrado</p>
          </div>
        )}
      </div>
    </FranqueadoraGuard>
  )
}
