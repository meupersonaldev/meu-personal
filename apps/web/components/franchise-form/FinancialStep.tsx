"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Taxa de Franquia (R$)</label>
          <Input
            value={formatCurrencyBR(data.franchise_fee)}
            onChange={(e) => onChange('franchise_fee', parseCurrencyInput(e.target.value))}
            placeholder="R$ 50.000,00"
          />
          <p className="text-xs text-gray-500 mt-1">Pagamento único de adesão</p>
          {errors?.franchise_fee && <p className="text-xs text-red-600 mt-1">{errors.franchise_fee}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Percentual de Royalty (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={Number.isFinite(data.royalty_percentage) ? data.royalty_percentage : 0}
            onChange={(e) => onChange('royalty_percentage', parseFloat(e.target.value) || 0)}
            placeholder="8.5"
          />
          <p className="text-xs text-gray-500 mt-1">Percentual mensal sobre a receita da unidade</p>
          {errors?.royalty_percentage && <p className="text-xs text-red-600 mt-1">{errors.royalty_percentage}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Receita Mensal Estimada (R$)</label>
          <Input
            value={formatCurrencyBR(data.monthly_revenue)}
            onChange={(e) => onChange('monthly_revenue', parseCurrencyInput(e.target.value))}
            placeholder="R$ 25.000,00"
          />
          {errors?.monthly_revenue && <p className="text-xs text-red-600 mt-1">{errors.monthly_revenue}</p>}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} className="bg-meu-primary text-white">Próximo</Button>
      </div>
    </div>
  )
}
