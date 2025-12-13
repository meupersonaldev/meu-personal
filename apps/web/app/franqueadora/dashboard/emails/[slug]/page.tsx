'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw, Copy, Check, Info, Plus, Link2, Type, Bold, List, AlertCircle, ExternalLink, Eye, PenTool } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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

export default function EmailTemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { token, isAuthenticated } = useFranqueadoraStore()

  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<string>('editor')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formButtonText, setFormButtonText] = useState('')
  const [formButtonUrl, setFormButtonUrl] = useState('')

  // Modal state for inline button
  const [showButtonModal, setShowButtonModal] = useState(false)
  const [inlineButtonText, setInlineButtonText] = useState('')
  const [inlineButtonUrl, setInlineButtonUrl] = useState('')

  // Ref for textarea to insert variables at cursor
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const cursorPositionRef = useRef<number>(0)

  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'


  // Fetch template data
  const fetchTemplate = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/email-templates/${slug}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Template não encontrado')
        }
        throw new Error('Erro ao carregar template')
      }

      const data = await response.json()
      const templateData = data.data as EmailTemplate
      setTemplate(templateData)
      setFormTitle(templateData.title)
      setFormContent(templateData.content)
      setFormButtonText(templateData.buttonText || '')
      setFormButtonUrl(templateData.buttonUrl || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [slug, token, API_URL])

  // Fetch preview
  const fetchPreview = useCallback(async () => {
    if (!formTitle || !formContent) return

    try {
      setIsLoadingPreview(true)
      const queryParams = new URLSearchParams({
        title: formTitle,
        content: formContent,
        ...(formButtonText && { buttonText: formButtonText }),
        ...(formButtonUrl && { buttonUrl: formButtonUrl })
      })

      const response = await fetch(
        `${API_URL}/api/email-templates/${slug}/preview?${queryParams.toString()}`,
        {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPreviewHtml(data.data?.html || '')
      }
    } catch (err) {
      console.error('Error fetching preview:', err)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [slug, formTitle, formContent, formButtonText, formButtonUrl, token, API_URL])

  useEffect(() => {
    if (hydrated && isAuthenticated && slug) {
      fetchTemplate()
    }
  }, [hydrated, isAuthenticated, slug, fetchTemplate])

  // Debounced preview update
  useEffect(() => {
    if (!template) return
    const timer = setTimeout(() => {
      fetchPreview()
    }, 500)
    return () => clearTimeout(timer)
  }, [formTitle, formContent, formButtonText, formButtonUrl, template, fetchPreview])

  // Save template
  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    if (!formContent.trim()) {
      toast.error('Conteúdo é obrigatório')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`${API_URL}/api/email-templates/${slug}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          buttonText: formButtonText || undefined,
          buttonUrl: formButtonUrl || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao salvar template')
      }

      const data = await response.json()
      setTemplate(data.data)
      toast.success('Template salvo com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar template')
    } finally {
      setIsSaving(false)
    }
  }

  // Reset template
  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja restaurar o template para os valores padrão?')) {
      return
    }

    try {
      setIsResetting(true)
      const response = await fetch(`${API_URL}/api/email-templates/${slug}/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        throw new Error('Erro ao resetar template')
      }

      const data = await response.json()
      const templateData = data.data as EmailTemplate
      setTemplate(templateData)
      setFormTitle(templateData.title)
      setFormContent(templateData.content)
      setFormButtonText(templateData.buttonText || '')
      setFormButtonUrl(templateData.buttonUrl || '')
      toast.success('Template restaurado para os valores padrão!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar template')
    } finally {
      setIsResetting(false)
    }
  }

  // Save cursor position before opening modal
  const saveCursorPosition = () => {
    if (contentRef.current) {
      cursorPositionRef.current = contentRef.current.selectionStart
    }
  }

  // Insert text at cursor position
  const insertAtCursor = (text: string) => {
    const position = cursorPositionRef.current
    const newContent = formContent.substring(0, position) + text + formContent.substring(position)
    setFormContent(newContent)

    // Set cursor position after inserted text
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus()
        const newPosition = position + text.length
        contentRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  // Insert variable at cursor position
  const insertVariable = (placeholder: string) => {
    saveCursorPosition()
    insertAtCursor(placeholder)

    // Show copied feedback
    setCopiedVariable(placeholder)
    setTimeout(() => setCopiedVariable(null), 1500)
  }

  // Insert inline button
  const handleInsertInlineButton = () => {
    if (!inlineButtonText.trim() || !inlineButtonUrl.trim()) {
      toast.error('Preencha o texto e o link do botão')
      return
    }

    // Generate button HTML
    const buttonHtml = `<div style="text-align: center; margin: 24px 0;">
  <a href="${inlineButtonUrl}" target="_blank" style="display: inline-block; background-color: #002C4E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">${inlineButtonText}</a>
</div>`

    insertAtCursor(buttonHtml)

    // Reset and close modal
    setInlineButtonText('')
    setInlineButtonUrl('')
    setShowButtonModal(false)
    toast.success('Botão inserido!')
  }

  // Insert formatting
  const insertFormatting = (type: 'bold' | 'paragraph' | 'list' | 'highlight') => {
    saveCursorPosition()

    const formats: Record<string, string> = {
      bold: '<strong>texto em negrito</strong>',
      paragraph: '<p>Novo parágrafo aqui</p>',
      list: `<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>`,
      highlight: `<p style="background-color: #f0f9ff; border-left: 4px solid #002C4E; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #002C4E;">💡 Destaque</strong><br>
  Texto em destaque aqui
</p>`
    }

    insertAtCursor(formats[type])
  }


  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando template...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/franqueadora/dashboard/emails')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  const editorContent = (
    <div className="space-y-6">
      {/* Edit Form */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <CardTitle className="text-lg text-meu-primary">Editor de Conteúdo</CardTitle>
          <CardDescription>
            Personalize o corpo do email. Cabeçalho e rodapé são fixos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700 font-medium">Título do Email *</Label>
            <Input
              id="title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: Bem-vindo ao Meu Personal!"
              className="bg-white"
            />
          </div>

          {/* Content with Toolbar */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-gray-700 font-medium">Conteúdo *</Label>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 p-1.5 bg-gray-100 rounded-t-lg border border-gray-300 border-b-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting('bold')} className="h-8 w-8 p-0 hover:bg-white text-gray-700">
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Negrito</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting('paragraph')} className="h-8 w-8 p-0 hover:bg-white text-gray-700">
                    <Type className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Parágrafo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting('list')} className="h-8 w-8 p-0 hover:bg-white text-gray-700">
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lista</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => insertFormatting('highlight')} className="h-8 w-8 p-0 hover:bg-white text-gray-700">
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Caixa de Destaque</TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-gray-300 mx-1 self-center" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { saveCursorPosition(); setShowButtonModal(true) }} className="h-8 px-2 gap-1 hover:bg-white text-gray-700">
                    <Plus className="h-3 w-3" />
                    <Link2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Inserir Botão</TooltipContent>
              </Tooltip>
            </div>

            <Textarea
              id="content"
              ref={contentRef}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Digite o conteúdo do email..."
              className="min-h-[300px] font-mono text-sm rounded-t-none border-gray-300 leading-relaxed"
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Info className="h-3 w-3" /> Suporta HTML básico.
            </p>
          </div>

          {/* Main Button Section */}
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="h-4 w-4 text-meu-primary" />
              <Label className="text-meu-primary font-bold">Botão de Rodapé (Opcional)</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="buttonText" className="text-xs font-semibold text-gray-600 uppercase">Texto do Botão</Label>
                <Input
                  id="buttonText"
                  value={formButtonText}
                  onChange={(e) => setFormButtonText(e.target.value)}
                  placeholder="Ex: Acessar"
                  className="bg-white h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buttonUrl" className="text-xs font-semibold text-gray-600 uppercase">Link</Label>
                <Input
                  id="buttonUrl"
                  value={formButtonUrl}
                  onChange={(e) => setFormButtonUrl(e.target.value)}
                  placeholder="Ex: {{login_url}}"
                  className="bg-white h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variables Panel */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3">
          <CardTitle className="flex items-center gap-2 text-base text-gray-800">
            <Info className="h-4 w-4 text-meu-primary" />
            Variáveis Dinâmicas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {template.variables.map((variable) => (
              <button
                key={variable.name}
                onClick={() => insertVariable(variable.placeholder)}
                className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono border border-gray-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
                      {variable.placeholder}
                    </code>
                    {copiedVariable === variable.placeholder && (
                      <span className="text-green-600 text-[10px] font-bold uppercase tracking-wider flex items-center animate-in fade-in zoom-in">
                        <Check className="h-3 w-3 mr-0.5" /> Inserido
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{variable.description}</p>
                </div>
                <Copy className="h-4 w-4 text-gray-300 group-hover:text-meu-primary flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mobile only: extra space for fab/buttons */}
      <div className="h-20 xl:hidden"></div>
    </div>
  )

  const previewContent = (
    <Card className="h-full shadow-sm border-gray-200 flex flex-col">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-500" /> Pré-visualização
        </CardTitle>
        <CardDescription>Visualização aproximada do email final.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden relative min-h-[500px] bg-gray-100/50">
        {isLoadingPreview ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meu-primary"></div>
          </div>
        ) : null}

        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full border-0 absolute inset-0 bg-white"
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
            <Eye className="h-12 w-12 mb-3 opacity-20" />
            <p>Preencha o conteúdo para visualizar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <TooltipProvider>
        <div className="p-3 sm:p-4 lg:p-6 min-h-screen bg-gray-50/50">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/franqueadora/dashboard/emails')}
              className="w-fit -ml-2 text-gray-500 hover:text-meu-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>

            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{template.name}</h1>
                <p className="text-gray-500 text-sm mt-1">{template.description}</p>
              </div>

              <div className="flex items-center gap-2 w-full xl:w-auto">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isResetting || !template.isCustom}
                  className="flex-1 xl:flex-none"
                  size="sm"
                >
                  <RotateCcw className={`h-3.5 w-3.5 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                  Restaurar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 xl:flex-none bg-meu-primary hover:bg-meu-primary/90 text-white shadow-sm"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout (Split View) */}
          <div className="hidden xl:grid grid-cols-2 gap-6 items-start">
            <div>{editorContent}</div>
            <div className="sticky top-6">{previewContent}</div>
          </div>

          {/* Mobile Layout (Tabs) */}
          <div className="xl:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white p-1 border border-gray-200 rounded-xl shadow-sm">
                <TabsTrigger value="editor" className="data-[state=active]:bg-meu-primary data-[state=active]:text-white rounded-lg transition-all">
                  <PenTool className="h-4 w-4 mr-2" /> Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-meu-primary data-[state=active]:text-white rounded-lg transition-all">
                  <Eye className="h-4 w-4 mr-2" /> Visualizar
                </TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="mt-0 focus-visible:ring-0">
                {editorContent}
              </TabsContent>
              <TabsContent value="preview" className="mt-0 focus-visible:ring-0 h-[600px]">
                {previewContent}
              </TabsContent>
            </Tabs>
          </div>

          {/* Inline Button Modal */}
          <Dialog open={showButtonModal} onOpenChange={setShowButtonModal}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Inserir Botão de Ação</DialogTitle>
                <DialogDescription>
                  Adicione um botão destacado no corpo do email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inlineButtonText" className="text-xs font-semibold uppercase text-gray-500">Texto do Botão</Label>
                  <Input
                    id="inlineButtonText"
                    value={inlineButtonText}
                    onChange={(e) => setInlineButtonText(e.target.value)}
                    placeholder="Ex: Confirmar Agora"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inlineButtonUrl" className="text-xs font-semibold uppercase text-gray-500">URL de Destino</Label>
                  <Input
                    id="inlineButtonUrl"
                    value={inlineButtonUrl}
                    onChange={(e) => setInlineButtonUrl(e.target.value)}
                    placeholder="Ex: {{login_url}}"
                    className="h-10"
                  />
                  <p className="text-[10px] text-gray-400">
                    Use variáveis como {`{{login_url}}`} para links dinâmicos.
                  </p>
                </div>

                {/* Preview */}
                {inlineButtonText && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-gray-400 mb-3 uppercase tracking-wider font-bold">Pré-visualização</p>
                    <div className="px-6 py-3 bg-meu-primary text-white font-bold text-sm rounded-lg shadow-sm">
                      {inlineButtonText}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setShowButtonModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInsertInlineButton} className="bg-meu-primary hover:bg-meu-primary/90 text-white">
                  Concluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </FranqueadoraGuard>
  )
}
