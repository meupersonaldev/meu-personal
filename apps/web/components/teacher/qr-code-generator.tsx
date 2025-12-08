'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { QrCode, X, Download } from 'lucide-react'

export interface QRCodeGeneratorProps {
  bookingId: string
  academyId: string
  studentName?: string
  bookingDate?: string
  className?: string
}

/**
 * QRCodeGenerator component for generating QR codes for booking check-in.
 * 
 * Requirements: 5.1, 5.2 - Generate QR with booking_id and academy_id
 * 
 * @param bookingId - The ID of the booking
 * @param academyId - The ID of the academy
 * @param studentName - Optional student name for display
 * @param bookingDate - Optional booking date for display
 * @param className - Additional CSS classes
 */
export function QRCodeGenerator({
  bookingId,
  academyId,
  studentName,
  bookingDate,
  className = ''
}: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Generate QR code content as JSON with booking_id and academy_id
  // This format is validated by Property 8: QR code content validation
  const qrContent = JSON.stringify({
    booking_id: bookingId,
    academy_id: academyId,
    type: 'checkin'
  })

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-${bookingId}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      
      const downloadLink = document.createElement('a')
      downloadLink.download = `checkin-qr-${bookingId.slice(0, 8)}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={`h-8 text-xs ${className}`}
        title="Gerar QR Code para check-in"
      >
        <QrCode className="w-3 h-3 mr-1.5" />
        Gerar QR
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center text-lg font-bold text-gray-900">
            QR Code para Check-in
          </DialogTitle>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {/* QR Code Display */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <QRCode
                id={`qr-code-${bookingId}`}
                value={qrContent}
                size={200}
                level="H"
                className="w-full h-auto"
              />
            </div>

            {/* Booking Info */}
            <div className="text-center space-y-1">
              {studentName && (
                <p className="text-sm font-medium text-gray-700">
                  Aluno: {studentName}
                </p>
              )}
              {bookingDate && (
                <p className="text-xs text-gray-500">
                  {new Date(bookingDate).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            {/* Instructions */}
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Peça ao aluno para escanear este QR Code para confirmar a presença na aula.
            </p>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-meu-primary hover:bg-[#003f70]"
              >
                <X className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default QRCodeGenerator
