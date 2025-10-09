'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ProfessorLayout from '@/components/layout/professor-layout'
import { toast } from 'sonner'
import {
  QrCode,
  Camera,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  ArrowLeft
} from 'lucide-react'

// Tipagem global para o script externo html5-qrcode
declare global {
  interface Window {
    Html5Qrcode: any
  }
}

export default function ProfessorCheckinScanPage() {
  const router = useRouter()
  const readerId = 'qr-reader'
  const html5QrRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [usingBarcodeDetector, setUsingBarcodeDetector] = useState(false)
  const [notSecureContext, setNotSecureContext] = useState(false)

  const loadAndStart = useCallback(async () => {
    let mounted = true
    setLoading(true)
    setCameraReady(false)
    await stopScanner()
    try {
      // Aviso de contexto não seguro (HTTPS)
      if (typeof window !== 'undefined') {
        const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost'
        setNotSecureContext(insecure)
      }

      // 1) Tentar BarcodeDetector primeiro (melhor UX no Chrome/Android)
      const bdOk = await startBarcodeDetector()
      if (bdOk) return

      // 2) Tentar html5-qrcode via CDN
      const libLoaded = await ensureHtml5QrcodeLoaded()
      if (!mounted) return
      if (libLoaded) {
        const Html5Qrcode = window.Html5Qrcode
        html5QrRef.current = new Html5Qrcode(readerId)
        await html5QrRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          onScanSuccess,
          onScanFailure
        )
        setCameraReady(true)
      } else {
        toast.error('Não foi possível carregar o leitor de QR. Use a entrada manual abaixo.')
      }
    } catch (err) {
      console.warn('Falha ao iniciar o scanner:', err)
      const success = await startBarcodeDetector()
      if (!success) toast.error('Não foi possível acessar a câmera. Use a entrada manual abaixo.')
    } finally {
      setLoading(false)
    }
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    loadAndStart().then(ret => {
      if (typeof ret === 'function') cleanup = ret
    })
    return () => {
      if (cleanup) cleanup()
      stopScanner()
    }
  }, [loadAndStart])

  async function ensureHtml5QrcodeLoaded(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (window.Html5Qrcode) return true

    const CDNS = [
      'https://unpkg.com/html5-qrcode@2.3.10/minified/html5-qrcode.min.js',
      'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.10/minified/html5-qrcode.min.js',
      // ESM fallback (alguns navegadores antigos podem não suportar)
      'https://esm.sh/html5-qrcode@2.3.10?bundle'
    ]

    for (const src of CDNS) {
      try {
        await loadScript(src, 12000)
        if (window.Html5Qrcode) return true
      } catch (err) {
        // tentar próximo CDN
      }
    }
    return false
  }

  function loadScript(src: string, timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.crossOrigin = 'anonymous'
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error(`Timeout carregando script: ${src}`))
      }, timeoutMs)
      function cleanup() {
        window.clearTimeout(timeout)
        script.onload = null
        script.onerror = null
      }
      script.onload = () => {
        cleanup()
        resolve()
      }
      script.onerror = () => {
        cleanup()
        reject(new Error(`Erro ao carregar script: ${src}`))
      }
      document.body.appendChild(script)
    })
  }

  async function stopScanner() {
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop()
        await html5QrRef.current.clear()
        html5QrRef.current = null
      }
      // Parar BarcodeDetector
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    } catch (e) {
      // ignore
    }
  }

  function onScanFailure(_error: unknown) {
    // Ignorar falhas de frame
  }

  async function onScanSuccess(decodedText: string) {
    await stopScanner()
    handleDecoded(decodedText)
  }

  async function startBarcodeDetector(): Promise<boolean> {
    try {
      const hasBD = typeof (window as any).BarcodeDetector !== 'undefined'
      if (!hasBD) return false

      const BarcodeDetector = (window as any).BarcodeDetector
      const detector = new BarcodeDetector({ formats: ['qr_code'] })

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      mediaStreamRef.current = stream
      setUsingBarcodeDetector(true)

      if (!videoRef.current) return false
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraReady(true)

      const loop = async () => {
        rafRef.current = requestAnimationFrame(loop)
        if (!videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes && barcodes.length > 0) {
            const value = barcodes[0].rawValue || ''
            if (value) {
              await stopScanner()
              handleDecoded(value)
            }
          }
        } catch {
          // ignore
        }
      }
      rafRef.current = requestAnimationFrame(loop)
      return true
    } catch (err) {
      console.warn('BarcodeDetector fallback indisponível:', err)
      return false
    }
  }

  function handleDecoded(text: string) {
    try {
      // 1) Tentar JSON com academyId
      const data = JSON.parse(text)
      const acad = data.academyId || data.academy_id
      if (acad) {
        toast.success('QR lido! Redirecionando...')
        router.replace(`/checkin/a/${acad}`)
        return
      }
    } catch {
      // não é JSON, continuar
    }

    // 2) Tentar URL completa contendo /checkin/a/
    const raw = text.trim()
    if (raw.includes('/checkin/a/')) {
      try {
        // Tentar extrair o path
        const idx = raw.indexOf('/checkin/a/')
        const path = raw.substring(idx)
        toast.success('QR lido! Redirecionando...')
        router.replace(path)
        return
      } catch {
        // segue para próximo passo
      }
    }

    // 3) Tentar path direto
    if (raw.startsWith('/checkin/a/')) {
      toast.success('QR lido! Redirecionando...')
      router.replace(raw)
      return
    }

    toast.error('QR inválido. Informe o link manualmente abaixo.')
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = manualValue.trim()
    if (!v) return
    if (v.startsWith('/checkin/a/')) {
      router.replace(v)
      return
    }
    try {
      const url = new URL(v)
      if (url.pathname.startsWith('/checkin/a/')) {
        router.replace(url.pathname)
        return
      }
    } catch {
      // not a full URL
    }
    toast.error('Valor inválido. Informe um link /checkin/a/{academyId} ou URL contendo esse caminho.')
  }

  return (
    <ProfessorLayout>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-8 md:px-6">
        <Card className="w-full max-w-xl p-6 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>

          <div className="mb-4 text-center md:mb-6">
            <QrCode className="mx-auto mb-2 h-10 w-10 text-meu-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Check-in - Ler QR Code</h1>
            <p className="text-gray-600">
              Aponte a câmera para o QR Code da portaria
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black/5">
            <div id={readerId} className="flex aspect-video w-full items-center justify-center">
              {loading && (
                <div className="py-16 text-center text-gray-600">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
                  Iniciando câmera...
                </div>
              )}
              {!loading && !cameraReady && (
                <div className="py-10 text-center text-gray-600">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6" />
                  Não foi possível acessar a câmera. Use a entrada manual abaixo.
                  {notSecureContext && (
                    <div className="mt-2 text-xs text-amber-700">
                      Dica: Ative HTTPS (ou use localhost) para liberar a câmera neste navegador.
                    </div>
                  )}
                  <div className="mt-4">
                    <Button variant="outline" onClick={loadAndStart}>
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}
              {/* Vídeo para fallback com BarcodeDetector */}
              {usingBarcodeDetector && (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Camera className="h-4 w-4" />
              <span>
                Se a câmera não abrir, verifique as permissões do navegador ou use a entrada
                manual.
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Cole aqui o link /checkin/a/{academyId} ou a URL lida do QR"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-meu-primary"
              />
              <Button type="submit" variant="outline" className="shrink-0">
                <LinkIcon className="mr-2 h-4 w-4" /> Abrir
              </Button>
            </form>
            <div className="text-xs text-gray-500">
              Entrada manual = cole o endereço que o QR representa. Ex.:{' '}
              <code>/checkin/a/SEU_ACADEMY_ID</code> ou a URL completa contendo esse caminho.
            </div>
          </div>
        </Card>
      </div>
    </ProfessorLayout>
  )
}
