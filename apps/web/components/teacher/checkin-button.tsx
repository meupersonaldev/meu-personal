'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Zap } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

export interface CheckinResult {
  success: boolean
  message: string
  booking: {
    id: string
    status_canonical: string
    date: string
    duration: number
  }
  credits: {
    hours_credited: number
    new_balance: number
  }
}

export interface CheckinButtonProps {
  bookingId: string
  bookingDate: Date
  status: string
  toleranceMinutes?: number
  onSuccess?: (result: CheckinResult) => void
  onError?: (error: string) => void
  variant?: 'default' | 'private' | 'platform'
  className?: string
}

/**
 * CheckinButton component for performing manual check-in on bookings.
 * 
 * Requirements: 2.3 - Display check-in button for PAID bookings
 * 
 * @param bookingId - The ID of the booking to check-in
 * @param bookingDate - The date/time of the booking
 * @param status - Current booking status (should be PAID for check-in)
 * @param toleranceMinutes - Minutes before booking time when check-in is allowed (default: 30)
 * @param onSuccess - Callback when check-in succeeds
 * @param onError - Callback when check-in fails
 * @param variant - Visual variant for the button
 * @param className - Additional CSS classes
 */
export function CheckinButton({
  bookingId,
  bookingDate,
  status,
  toleranceMinutes = 30,
  onSuccess,
  onError,
  variant = 'default',
  className = ''
}: CheckinButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFakeLoading, setIsFakeLoading] = useState(false)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const { token } = useAuthStore()

  // Verificar se está em localhost (apenas client-side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1')
    }
  }, [])

  // Check if check-in is allowed based on time window
  const now = new Date()
  const bookingTime = new Date(bookingDate)
  const toleranceMs = toleranceMinutes * 60 * 1000
  const windowStart = new Date(bookingTime.getTime() - toleranceMs)
  
  const isWithinWindow = now >= windowStart
  const isPaid = status === 'PAID' || status === 'paid'
  const isDisabled = !isPaid || !isWithinWindow || isLoading

  const handleCheckin = async () => {
    if (isDisabled || !token) return

    setIsLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ method: 'MANUAL' })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Erro ao realizar check-in'
        toast.error(errorMessage)
        onError?.(errorMessage)
        return
      }

      // Success
      toast.success(data.message || `Check-in realizado! ${data.credits?.hours_credited || 1} hora(s) creditada(s).`)
      onSuccess?.(data as CheckinResult)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao realizar check-in'
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Fake check-in para testes em localhost
  const handleFakeCheckin = async () => {
    if (!token) return

    setIsFakeLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/fake-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Erro ao realizar fake check-in'
        toast.error(errorMessage)
        onError?.(errorMessage)
        return
      }

      toast.success('🧪 Fake Check-in realizado! (apenas para testes)')
      onSuccess?.(data as CheckinResult)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao realizar fake check-in'
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsFakeLoading(false)
    }
  }

  // Get button styling based on variant
  const getButtonClasses = () => {
    const baseClasses = 'w-full h-8 rounded-lg font-bold shadow-sm transition-all active:scale-[0.98] text-xs'
    
    if (variant === 'private') {
      return `${baseClasses} bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200`
    }
    
    if (variant === 'platform') {
      return `${baseClasses} bg-meu-primary hover:bg-[#003f70] text-white shadow-blue-200`
    }
    
    return `${baseClasses} bg-meu-primary hover:bg-[#003f70] text-white`
  }

  // Get disabled message
  const getDisabledTitle = () => {
    if (!isPaid) return 'Check-in disponível apenas para aulas pagas'
    if (!isWithinWindow) return `Check-in disponível ${toleranceMinutes} minutos antes do horário`
    return ''
  }

  // Mostrar fake check-in apenas em localhost e para bookings PAID
  const showFakeCheckin = isLocalhost && isPaid

  return (
    <div className={`flex gap-1 ${className}`}>
      <Button
        onClick={handleCheckin}
        disabled={isDisabled}
        className={getButtonClasses()}
        title={getDisabledTitle()}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Check-in
          </>
        )}
      </Button>

      {/* Fake Check-in - apenas em localhost para testes */}
      {showFakeCheckin && (
        <Button
          onClick={handleFakeCheckin}
          disabled={isFakeLoading}
          className="h-8 px-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold"
          title="🧪 Fake Check-in (apenas dev)"
        >
          {isFakeLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
        </Button>
      )}
    </div>
  )
}

export default CheckinButton
