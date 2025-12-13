'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  TrendingUp,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Activity,
  Download
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertModal } from '@/components/ui/alert-modal'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function RelatoriosPage() {
  const router = useRouter()
  const { academies, analytics, isAuthenticated, fetchAcademies, fetchAnalytics, franqueadora } = useFranqueadoraStore()
  const reportRef = useRef<HTMLDivElement>(null)
  
  // Hydration fix
  const [hydrated, setHydrated] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // Modal states
  const [modal, setModal] = useState<{
    isOpen: boolean
    type: 'success' | 'error'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  })
  
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      fetchAcademies()
      fetchAnalytics()
    }
  }, [hydrated, isAuthenticated, fetchAcademies, fetchAnalytics])

  // Calcular dados dos últimos 12 meses
  const getMonthlyData = () => {
    const now = new Date()
    const monthsData = []

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

      const newFranchises = academies.filter(a => {
        if (!a.created_at) return false
        const createdDate = new Date(a.created_at)
        return createdDate >= monthDate && createdDate < nextMonthDate
      }).length

      const totalUntilMonth = academies.filter(a => {
        if (!a.created_at) return false
        const createdDate = new Date(a.created_at)
        return createdDate < nextMonthDate
      }).length

      monthsData.push({
        month: format(monthDate, 'MMM/yy', { locale: ptBR }),
        fullMonth: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
        newFranchises,
        totalFranchises: totalUntilMonth,
        date: monthDate
      })
    }

    return monthsData
  }

  const monthlyData = getMonthlyData()
  const maxNewFranchises = Math.max(...monthlyData.map(m => m.newFranchises), 1)

  // Estatísticas por região
  const getRegionStats = () => {
    const regionMap = new Map()
    
    academies.forEach(academy => {
      const region = academy.state || 'Não informado'
      if (!regionMap.has(region)) {
        regionMap.set(region, {
          count: 0,
          revenue: 0,
          cities: new Set()
        })
      }
      
      const data = regionMap.get(region)
      data.count++
      data.revenue += Number(academy.monthly_revenue || 0)
      data.cities.add(academy.city || 'Não informado')
    })

    return Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      count: data.count,
      revenue: data.revenue,
      cities: data.cities.size
    })).sort((a, b) => b.count - a.count)
  }

  const regionStats = getRegionStats()

  // Função para exportar PDF
  const exportToPDF = async () => {
    if (!reportRef.current) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Gerar PDF',
        message: 'Conteúdo do relatório não encontrado. Recarregue a página e tente novamente.'
      })
      return
    }
    
    setIsExporting(true)
    
    try {
      // Importar bibliotecas dinamicamente
      console.log('Importando bibliotecas...')
      
      const jsPDFModule = await import('jspdf').catch(err => {
        console.error('Erro ao importar jsPDF:', err)
        throw new Error('Falha ao carregar biblioteca jsPDF')
      })
      
      const html2canvasModule = await import('html2canvas').catch(err => {
        console.error('Erro ao importar html2canvas:', err)
        throw new Error('Falha ao carregar biblioteca html2canvas')
      })
      
      const jsPDF = jsPDFModule.default
      const html2canvas = html2canvasModule.default
      
      if (!jsPDF || !html2canvas) {
        throw new Error('Bibliotecas não carregaram corretamente')
      }
      
      console.log('Bibliotecas carregadas, gerando canvas...')
      
      // Configurar o canvas com configurações mais simples
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        imageTimeout: 15000,
        ignoreElements: (element) => {
          // Ignorar elementos que podem causar problemas
          return element.classList?.contains('animate-spin') || 
                 element.tagName === 'SCRIPT' ||
                 element.tagName === 'STYLE'
        },
        onclone: (clonedDoc) => {
          try {
            // Remover TODOS os estilos existentes para evitar problemas
            const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]')
            existingStyles.forEach(style => style.remove())
            
            // Limpar estilos problemáticos no documento clonado
            const clonedElement = clonedDoc.querySelector('[data-pdf-content]')
            if (clonedElement) {
              clonedElement.style.display = 'block'
              clonedElement.style.visibility = 'visible'
              
              // Remover TODAS as classes CSS para evitar problemas
              const allElements = clonedElement.querySelectorAll('*')
              allElements.forEach(el => {
                // Limpar completamente as classes
                if (el.classList) {
                  el.className = ''
                }
                
                // Aplicar estilos inline básicos diretamente
                el.style.cssText = ''
                
                // Definir estilos básicos baseados no tipo de elemento
                if (el.tagName === 'H1') {
                  el.style.fontSize = '24px'
                  el.style.fontWeight = 'bold'
                  el.style.color = '#002C4E'
                  el.style.marginBottom = '16px'
                } else if (el.tagName === 'H2') {
                  el.style.fontSize = '20px'
                  el.style.fontWeight = 'bold'
                  el.style.color = '#002C4E'
                  el.style.marginBottom = '12px'
                } else if (el.tagName === 'H3') {
                  el.style.fontSize = '18px'
                  el.style.fontWeight = 'bold'
                  el.style.color = '#111827'
                  el.style.marginBottom = '8px'
                } else if (el.tagName === 'P') {
                  el.style.fontSize = '14px'
                  el.style.color = '#374151'
                  el.style.marginBottom = '8px'
                } else if (el.tagName === 'TD' || el.tagName === 'TH') {
                  el.style.padding = '8px'
                  el.style.borderBottom = '1px solid #e5e7eb'
                  el.style.fontSize = '12px'
                  el.style.color = '#374151'
                } else if (el.tagName === 'TABLE') {
                  el.style.width = '100%'
                  el.style.borderCollapse = 'collapse'
                } else {
                  el.style.color = '#374151'
                }
                
                // Garantir fundo branco para cards
                if (el.getAttribute('data-card') || el.classList?.contains('card')) {
                  el.style.backgroundColor = '#ffffff'
                  el.style.border = '1px solid #e5e7eb'
                  el.style.borderRadius = '8px'
                  el.style.padding = '16px'
                  el.style.marginBottom = '16px'
                }
              })
            }
            
            // Adicionar CSS ultra-básico e seguro
            const style = clonedDoc.createElement('style')
            style.textContent = `
              * {
                box-sizing: border-box;
                font-family: Arial, sans-serif !important;
              }
              body {
                margin: 0;
                padding: 20px;
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .space-y-6 > * + * {
                margin-top: 24px;
              }
              .grid {
                display: grid;
                gap: 16px;
              }
              .grid-cols-4 {
                grid-template-columns: repeat(4, 1fr);
              }
              .flex {
                display: flex;
              }
              .items-center {
                align-items: center;
              }
              .justify-between {
                justify-content: space-between;
              }
            `
            clonedDoc.head.appendChild(style)
          } catch (error) {
            console.warn('Erro ao limpar estilos:', error)
          }
        }
      })
      
      console.log('Canvas gerado, criando PDF...')
      
      const imgData = canvas.toDataURL('image/png', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Calcular dimensões
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const canvasAspectRatio = canvas.height / canvas.width
      
      // Calcular tamanho da imagem mantendo proporção
      let imgWidth = pdfWidth - 20 // margem de 10mm de cada lado
      let imgHeight = imgWidth * canvasAspectRatio
      
      // Se a altura for maior que a página, ajustar
      if (imgHeight > pdfHeight - 40) {
        imgHeight = pdfHeight - 40
        imgWidth = imgHeight / canvasAspectRatio
      }
      
      const imgX = (pdfWidth - imgWidth) / 2
      const imgY = 20
      
      // Adicionar cabeçalho
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Relatório Detalhado - ${franqueadora?.name || 'Meu Personal'}`, pdfWidth / 2, 15, { align: 'center' })
      
      // Adicionar imagem
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight)
      
      // Adicionar rodapé
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' })
      
      // Salvar o PDF
      const fileName = `relatorio-${franqueadora?.name?.toLowerCase().replace(/\s+/g, '-') || 'franqueadora'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      
      console.log('Salvando PDF:', fileName)
      pdf.save(fileName)
      
      // Mostrar sucesso
      setModal({
        isOpen: true,
        type: 'success',
        title: 'PDF Gerado com Sucesso!',
        message: `O relatório "${fileName}" foi baixado com sucesso.`
      })
      
    } catch (error: any) {
      console.error('Erro detalhado ao gerar PDF:', error)
      
      let errorMessage = 'Não foi possível gerar o relatório.'
      
      if (error.message?.includes('color function') || error.message?.includes('lab') || error.message?.includes('oklch')) {
        errorMessage = 'Erro de compatibilidade com estilos CSS. Tentando novamente com configurações simplificadas...'
        
        // Tentar novamente com configurações mais básicas
        setTimeout(() => {
          exportToPDFSimple()
        }, 1000)
        return
      } else if (error.message?.includes('html2canvas')) {
        errorMessage = 'Erro ao capturar o conteúdo da página. Tente recarregar a página.'
      } else if (error.message?.includes('jsPDF')) {
        errorMessage = 'Erro ao gerar o arquivo PDF. Verifique se há espaço suficiente no disco.'
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      }
      
      // Mostrar erro
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Gerar PDF',
        message: errorMessage
      })
    } finally {
      setIsExporting(false)
    }
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  // Função para exportar PDF apenas com texto (sem html2canvas)
  const exportToPDFText = async () => {
    setIsExporting(true)
    
    try {
      const { default: jsPDF } = await import('jspdf')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20
      
      // Função para adicionar texto com quebra de linha
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
        
        const lines = pdf.splitTextToSize(text, pageWidth - 40)
        
        // Verificar se precisa de nova página
        if (yPosition + (lines.length * fontSize * 0.35) > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        pdf.text(lines, 20, yPosition)
        yPosition += lines.length * fontSize * 0.35 + 5
      }
      
      // Cabeçalho
      addText(`RELATÓRIO DETALHADO - ${franqueadora?.name?.toUpperCase() || 'MEU PERSONAL'}`, 16, true)
      addText(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 10)
      yPosition += 10
      
      // Resumo Executivo
      addText('RESUMO EXECUTIVO', 14, true)
      addText(`Total de Franquias: ${academies.length}`, 12)
      addText(`Crescimento (12 meses): +${monthlyData.reduce((acc, m) => acc + m.newFranchises, 0)} franquias`, 12)
      addText(`Estados Ativos: ${regionStats.length}`, 12)
      addText(`Receita Total: R$ ${(academies.reduce((acc, a) => acc + Number(a.monthly_revenue || 0), 0) / 1000).toFixed(0)}k/mês`, 12)
      yPosition += 10
      
      // Evolução Mensal
      addText('EVOLUÇÃO MENSAL - ÚLTIMOS 12 MESES', 14, true)
      monthlyData.forEach(data => {
        addText(`${data.fullMonth}: ${data.newFranchises} novas franquias (Total: ${data.totalFranchises})`, 10)
      })
      yPosition += 10
      
      // Distribuição por Estado
      addText('DISTRIBUIÇÃO POR ESTADO', 14, true)
      regionStats.forEach((region, index) => {
        addText(`${index + 1}º ${region.region}: ${region.count} franquias, ${region.cities} cidades, R$ ${(region.revenue / 1000).toFixed(1)}k/mês`, 10)
      })
      yPosition += 10
      
      // Lista de Franquias
      addText('LISTA COMPLETA DE FRANQUIAS', 14, true)
      const sortedAcademies = academies
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 20) // Limitar para não ficar muito longo
      
      sortedAcademies.forEach((academy, index) => {
        const openDate = academy.created_at ? format(new Date(academy.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'
        const revenue = (Number(academy.monthly_revenue || 0) / 1000).toFixed(1)
        addText(`${index + 1}. ${academy.name} - ${academy.city}, ${academy.state} - Aberta: ${openDate} - R$ ${revenue}k/mês`, 9)
      })
      
      if (academies.length > 20) {
        addText(`... e mais ${academies.length - 20} franquias`, 9)
      }
      
      // Rodapé
      pdf.setFontSize(8)
      pdf.text(`Relatório gerado automaticamente pelo sistema Meu Personal`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      
      // Salvar
      const fileName = `relatorio-texto-${franqueadora?.name?.toLowerCase().replace(/\s+/g, '-') || 'franqueadora'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      pdf.save(fileName)
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'PDF Gerado com Sucesso!',
        message: `Relatório em texto salvo como "${fileName}"`
      })
      
    } catch (error) {
      console.error('Erro ao gerar PDF texto:', error)
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Gerar PDF',
        message: 'Não foi possível gerar o relatório. Use a opção "Imprimir" como alternativa.'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Função de fallback mais simples para casos de erro CSS
  const exportToPDFSimple = async () => {
    if (!reportRef.current) return
    
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])
      
      // Configuração muito básica para evitar problemas CSS
      const canvas = await html2canvas(reportRef.current, {
        scale: 1,
        useCORS: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: 1200,
        onclone: (clonedDoc) => {
          // Aplicar estilos inline básicos
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * { 
              color: #000 !important; 
              background-color: transparent !important;
              font-family: Arial, sans-serif !important;
            }
            .bg-white { background-color: #fff !important; }
          `
          clonedDoc.head.appendChild(style)
        }
      })
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 270)
      
      const fileName = `relatorio-simples-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      pdf.save(fileName)
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'PDF Gerado!',
        message: `Relatório salvo como "${fileName}" (versão simplificada)`
      })
      
    } catch (error) {
      console.error('Erro na versão simplificada:', error)
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Gerar PDF',
        message: 'Não foi possível gerar o relatório mesmo com configurações simplificadas. Tente usar a função de impressão do navegador (Ctrl+P).'
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meu-primary"></div>
      </div>
    )
  }

  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-pdf-content], [data-pdf-content] * {
            visibility: visible;
          }
          [data-pdf-content] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="p-3 sm:p-4 lg:p-8 min-h-screen space-y-6">
        <div ref={reportRef} data-pdf-content className="space-y-6 bg-white p-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/franqueadora/dashboard')} 
              className="shrink-0 rounded-full h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Relatório Detalhado</h1>
              <p className="text-gray-500 text-sm">Análise completa do crescimento da rede</p>
            </div>
          </div>
          <divtonassName="flex gap-2 w-full lg:w-auto">
            <Button 
              variant="outline" 
              className="flex-1 lg:flex-none"
              onClick={exportToPDFText}
              disabled={isExporting}
            >
              <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
              {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              Imprimir
            </Button>
          </div>
        </div>

        {/* Resumo Executivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-gray-200" data-card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Franquias</p>
                  <p className="text-2xl font-bold text-gray-900">{academies.length}</p>
                </div>
                <Building className="h-8 w-8 text-meu-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Crescimento (12m)</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{monthlyData.reduce((acc, m) => acc + m.newFranchises, 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Estados Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{regionStats.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-meu-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {(academies.reduce((acc, a) => acc + Number(a.monthly_revenue || 0), 0) / 1000).toFixed(0)}k
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Crescimento Detalhado */}
        <Card className="border-gray-200" data-card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Evolução Mensal - Últimos 12 Meses</CardTitle>
            <CardDescription>Novas franquias abertas por mês e total acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <div className="flex items-end justify-between h-full space-x-2 px-4">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="relative w-full flex flex-col items-center justify-end h-full max-w-[60px]">
                      {/* Tooltip */}
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                        <div className="text-center">
                          <div className="font-bold">{data.fullMonth}</div>
                          <div>Novas: {data.newFranchises}</div>
                          <div>Total: {data.totalFranchises}</div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>

                      {/* Barra de novas franquias */}
                      <div
                        className="w-full bg-meu-primary/80 group-hover:bg-meu-primary rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${(data.newFranchises / maxNewFranchises) * 100}%`,
                          minHeight: data.newFranchises > 0 ? '8px' : '2px'
                        }}
                      />
                    </div>
                    
                    {/* Label do mês */}
                    <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-meu-primary transition-colors">
                      {data.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise por Região */}
        <Card className="border-gray-200" data-card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Distribuição por Estado</CardTitle>
            <CardDescription>Concentração de franquias por região</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionStats.map((region, index) => (
                <div key={region.region} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-meu-primary text-white" :
                      index === 1 ? "bg-gray-200 text-gray-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{region.region}</p>
                      <p className="text-sm text-gray-500">{region.cities} cidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{region.count} franquias</p>
                    <p className="text-sm text-gray-500">
                      R$ {(region.revenue / 1000).toFixed(1)}k/mês
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lista Completa de Franquias */}
        <Card className="border-gray-200" data-card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Todas as Franquias</CardTitle>
            <CardDescription>Lista completa ordenada por data de abertura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Nome</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Localização</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Data de Abertura</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Receita Mensal</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {academies
                    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                    .map((academy) => (
                    <tr key={academy.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{academy.name}</td>
                      <td className="p-3 text-gray-600">
                        {academy.city}, {academy.state}
                      </td>
                      <td className="p-3 text-gray-600">
                        {academy.created_at ? format(new Date(academy.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        R$ {(Number(academy.monthly_revenue || 0) / 1000).toFixed(1)}k
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativa
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Modal de Alerta */}
      <AlertModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />
    </FranqueadoraGuard>
  )
}