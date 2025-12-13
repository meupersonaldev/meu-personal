"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft, DollarSign, Percent, TrendingUp } from 'lucide-react'

export interface FinancialStepData {
  franchise_fee: number
  royalty_percentage: number
  monthly_revenue: number
}

interface Props {
  data: FinancialStepData
  errors?: Record<string, string>
  onChange: (field: keyof FinancialStepData, value: number) => void
  onPrev: () => void
  onNext: () => void
}

const formatCurrencyBR = (value: number) => {
  const n = Number(value)
  if (!isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  return Number((cents / 100).toFixed(2))
}

export default function FinancialStep({ data, errors, onChange, onPrev, onNext }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> Taxa de Franquia
          </Label>
          <div className="relative">
            <Input
              value={formatCurrencyBR(data.franchise_fee)}
              onChange={(e) => onChange('franchise_fee', parseCurrencyInput(e.target.value))}
              placeholder="R$ 0,00"
              className={cn("h-12 text-lg font-medium pl-4", errors?.franchise_fee && "border-red-500 focus-visible:ring-red-500")}
            />
          </div>
          <p className="text-xs text-gray-500">Valor único pago na adesão da franquia.</p>
          {errors?.franchise_fee && <p className="text-xs text-red-600 font-medium">{errors.franchise_fee}</p>}
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
            <Percent className="w-3 h-3" /> Percentual de Royalty
          </Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Number.isFinite(data.royalty_percentage) ? data.royalty_percentage : 0}
              onChange={(e) => onChange('royalty_percentage', parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className={cn("h-12 text-lg font-medium", errors?.royalty_percentage && "border-red-500 focus-visible:ring-red-500")}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</div>
          </div>
          <p className="text-xs text-gray-500">Percentual mensal sobre o faturamento bruto.</p>
          {errors?.royalty_percentage && <p className="text-xs text-red-600 font-medium">{errors.royalty_percentage}</p>}
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Receita Mensal Estimada
          </Label>
          <div className="relative">
            <Input
              value={formatCurrencyBR(data.monthly_revenue)}
              onChange={(e) => onChange('monthly_revenue', parseCurrencyInput(e.target.value))}
              placeholder="R$ 0,00"
              className={cn("h-12 text-lg font-medium", errors?.monthly_revenue && "border-red-500 focus-visible:ring-red-500")}
            />
          </div>
          <p className="text-xs text-gray-500">Receita média mensal esperada para esta unidade.</p>
          {errors?.monthly_revenue && <p className="text-xs text-red-600 font-medium">{errors.monthly_revenue}</p>}
        </div>

      </div>

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onPrev} className="h-10 px-6">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="bg-meu-primary hover:bg-meu-primary-dark text-white px-8 h-10 shadow-lg shadow-meu-primary/20 transition-all hover:scale-105 active:scale-95">
          Próximo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
