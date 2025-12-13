'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw, Copy, Check, Info, Plus, Link2, Type, Bold, List, AlertCircle, ExternalLink } from 'lucide-react'
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

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <TooltipProvider>
        <div className="p-3 sm:p-4 lg:p-6 min-h-screen bg-gray-50">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/franqueadora/dashboard/emails')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                <p className="text-gray-600">{template.description}</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isResetting || !template.isCustom}
                  title={!template.isCustom ? 'Template já está usando valores padrão' : ''}
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                  Restaurar Padrão
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-meu-primary hover:bg-meu-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content - Split Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Side - Editor */}
            <div className="space-y-6">
              {/* Edit Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Editar Template</CardTitle>
                  <CardDescription>
                    Personalize o conteúdo do email. O layout base (cabeçalho e rodapé) não pode ser alterado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Email *</Label>
                    <Input
                      id="title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Bem-vindo ao Meu Personal!"
                    />
                  </div>

                  {/* Content with Toolbar */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo *</Label>
                    
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-1 p-2 bg-gray-100 rounded-t-lg border border-b-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertFormatting('bold')}
                            className="h-8 w-8 p-0"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Negrito</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertFormatting('paragraph')}
                            className="h-8 w-8 p-0"
                          >
                            <Type className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Parágrafo</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertFormatting('list')}
                            className="h-8 w-8 p-0"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lista</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertFormatting('highlight')}
                            className="h-8 w-8 p-0"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Caixa de Destaque</TooltipContent>
                      </Tooltip>
                      
                      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              saveCursorPosition()
                              setShowButtonModal(true)
                            }}
                            className="h-8 px-2 gap-1"
                          >
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
                      className="min-h-[300px] font-mono text-sm rounded-t-none"
                    />
                    <p className="text-xs text-gray-500">
                      Suporta HTML básico. Use a toolbar ou as variáveis para personalizar o conteúdo.
                    </p>
                  </div>

                  {/* Main Button Section */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                      <Label className="text-blue-900 font-medium">Botão Principal (rodapé do email)</Label>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Este botão aparece no final do email, antes do rodapé. Deixe em branco para não exibir.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="buttonText" className="text-sm">Texto do Botão</Label>
                        <Input
                          id="buttonText"
                          value={formButtonText}
                          onChange={(e) => setFormButtonText(e.target.value)}
                          placeholder="Ex: Acessar Minha Conta"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="buttonUrl" className="text-sm">Link do Botão</Label>
                        <Input
                          id="buttonUrl"
                          value={formButtonUrl}
                          onChange={(e) => setFormButtonUrl(e.target.value)}
                          placeholder="Ex: {{login_url}}"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Variables Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Variáveis Disponíveis
                  </CardTitle>
                  <CardDescription>
                    Clique em uma variável para inserir no conteúdo na posição do cursor.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {template.variables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.placeholder)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                              {variable.placeholder}
                            </code>
                            {copiedVariable === variable.placeholder && (
                              <span className="text-green-600 text-xs flex items-center">
                                <Check className="h-3 w-3 mr-1" />
                                Inserido!
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Exemplo: {variable.example}
                          </p>
                        </div>
                        <Copy className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Preview */}
            <div className="xl:sticky xl:top-6 xl:self-start">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                  <CardDescription>
                    Veja como o email ficará com dados de exemplo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meu-primary"></div>
                    </div>
                  ) : previewHtml ? (
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full h-[600px] border-0"
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      Preencha o título e conteúdo para ver a pré-visualização
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Inline Button Modal */}
          <Dialog open={showButtonModal} onOpenChange={setShowButtonModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inserir Botão no Conteúdo</DialogTitle>
                <DialogDescription>
                  Adicione um botão clicável no meio do conteúdo do email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inlineButtonText">Texto do Botão *</Label>
                  <Input
                    id="inlineButtonText"
                    value={inlineButtonText}
                    onChange={(e) => setInlineButtonText(e.target.value)}
                    placeholder="Ex: Ver Detalhes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inlineButtonUrl">Link do Botão *</Label>
                  <Input
                    id="inlineButtonUrl"
                    value={inlineButtonUrl}
                    onChange={(e) => setInlineButtonUrl(e.target.value)}
                    placeholder="Ex: https://exemplo.com ou {{login_url}}"
                  />
                  <p className="text-xs text-gray-500">
                    Você pode usar variáveis como {`{{login_url}}`} no link.
                  </p>
                </div>
                
                {/* Preview */}
                {inlineButtonText && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Pré-visualização:</p>
                    <div className="text-center">
                      <span className="inline-block bg-[#002C4E] text-white px-6 py-3 rounded-lg font-bold text-sm">
                        {inlineButtonText}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowButtonModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInsertInlineButton} className="bg-meu-primary hover:bg-meu-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Inserir Botão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </FranqueadoraGuard>
  )
}
